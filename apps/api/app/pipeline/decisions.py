"""Business decision generation via real model perturbation.

Decision options are built from the customer's own data, not a fixed menu:

- Only levers the dataset actually contains (and that actually vary over
  time) are considered: price, marketing spend, discount, inventory.
- Each lever is tested in both directions. Every region x category is moved
  to the level its own history says is normal for it (its 80th / 20th
  percentile month), and only where it has drifted beyond that. So a
  recommendation never asks for a level the business hasn't operated at,
  and it naturally targets the regions that drifted (e.g. where marketing
  was cut).

Every revenue impact is a real prediction from the trained model on the
latest period with that change applied. Confidence is derived from the
model's cross-validated R2. Cost/ROI remain heuristic estimates (there is no
connected cost-accounting system) and are labelled as such.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

DeltaDict = dict[str, float]


def get_baseline_frame(encoded: pd.DataFrame) -> pd.DataFrame:
    latest_period = encoded["period"].max()
    return encoded[encoded["period"] == latest_period].copy()


def predict_total(model, frame: pd.DataFrame, feature_columns: list[str]) -> float:
    X = frame[feature_columns].astype(float)
    return float(model.predict(X).sum())


def apply_deltas(frame: pd.DataFrame, deltas: DeltaDict, regions: list[str] | None = None) -> pd.DataFrame:
    """Apply a scenario to model-ready rows. With `regions`, only rows in
    those regions change; the rest stay at baseline."""
    if regions:
        mask = frame["region"].isin(regions)
        changed = apply_deltas(frame[mask], deltas)
        out = frame.copy()
        out.loc[mask, changed.columns] = changed
        return out
    f = frame.copy()
    if deltas.get("price_delta_pct"):
        f["avg_unit_price"] = f["avg_unit_price"] * (1 + deltas["price_delta_pct"] / 100)
        f["price_to_competitor_ratio"] = f["avg_unit_price"] / f["avg_competitor_price_index"].replace(0, 1)
    if deltas.get("marketing_delta_pct"):
        f["marketing_spend"] = f["marketing_spend"] * (1 + deltas["marketing_delta_pct"] / 100)
    if deltas.get("discount_delta_pct"):
        f["avg_discount_pct"] = (f["avg_discount_pct"] + deltas["discount_delta_pct"] / 100).clip(0, 0.9)
    if deltas.get("inventory_delta_pct"):
        f["avg_inventory"] = f["avg_inventory"] * (1 + deltas["inventory_delta_pct"] / 100)
        f["stockout_rate"] = (f["stockout_rate"] * (1 - deltas["inventory_delta_pct"] / 200)).clip(0, 1)
    if deltas.get("inflation_delta_pct"):
        f["avg_inflation_index"] = f["avg_inflation_index"] * (1 + deltas["inflation_delta_pct"] / 100)
    if deltas.get("demand_delta_pct"):
        f["order_count"] = f["order_count"] * (1 + deltas["demand_delta_pct"] / 100)
        f["revenue_lag1"] = f["revenue_lag1"] * (1 + deltas["demand_delta_pct"] / 100)
        f["revenue_rolling3"] = f["revenue_rolling3"] * (1 + deltas["demand_delta_pct"] / 100)
    if deltas.get("churn_delta_pct"):
        f["churn_rate"] = (f["churn_rate"] * (1 + deltas["churn_delta_pct"] / 100)).clip(0, 1)
    return f


def apply_raw_deltas(df: pd.DataFrame, deltas: DeltaDict, seed: int = 7, available: set[str] | None = None) -> pd.DataFrame:
    """Apply a what-if scenario to the raw transaction-level dataframe, for a
    Lock-In re-run. Revenue and cost are rescaled by how much price x
    quantity (and the inflation index, for cost) changed on each row, so the
    original KPI keeps its scale even when it isn't exactly price x quantity.
    Levers the data doesn't contain (`available`) are left untouched.
    """
    f = df.copy()
    if "cost" not in f.columns:
        f["cost"] = 0.0
    rng = np.random.default_rng(seed)

    def has(role: str) -> bool:
        return available is None or role in available

    old_price = f["unit_price"].astype(float).copy()
    old_quantity = f["quantity"].astype(float).copy()
    old_inflation = f["inflation_index"].astype(float).copy()

    if deltas.get("price_delta_pct") and has("unit_price"):
        f["unit_price"] = f["unit_price"] * (1 + deltas["price_delta_pct"] / 100)

    if deltas.get("discount_delta_pct") and has("discount_pct"):
        old_discount = f["discount_pct"].clip(upper=0.95)
        new_discount = (old_discount + deltas["discount_delta_pct"] / 100).clip(0, 0.95)
        adjustment = (1 - new_discount) / (1 - old_discount)
        f["unit_price"] = f["unit_price"] * adjustment
        f["discount_pct"] = new_discount

    if deltas.get("marketing_delta_pct") and has("marketing_spend"):
        f["marketing_spend"] = f["marketing_spend"] * (1 + deltas["marketing_delta_pct"] / 100)

    if deltas.get("inflation_delta_pct") and has("inflation_index"):
        f["inflation_index"] = f["inflation_index"] * (1 + deltas["inflation_delta_pct"] / 100)

    if deltas.get("demand_delta_pct"):
        if has("quantity"):
            f["quantity"] = (f["quantity"] * (1 + deltas["demand_delta_pct"] / 100)).round().clip(lower=0)
        else:
            f["revenue"] = f["revenue"] * (1 + deltas["demand_delta_pct"] / 100)

    if deltas.get("inventory_delta_pct") and has("inventory_level"):
        f["inventory_level"] = (f["inventory_level"] * (1 + deltas["inventory_delta_pct"] / 100)).clip(lower=0)
        if has("stockout_flag"):
            shift = deltas["inventory_delta_pct"] / 200
            flip_mask = rng.random(len(f)) < min(abs(shift), 1.0)
            if shift > 0:
                f.loc[flip_mask & f["stockout_flag"], "stockout_flag"] = False
            elif shift < 0:
                f.loc[flip_mask & ~f["stockout_flag"], "stockout_flag"] = True

    if deltas.get("churn_delta_pct") and has("churn_flag"):
        shift = deltas["churn_delta_pct"] / 200
        flip_mask = rng.random(len(f)) < min(abs(shift), 1.0)
        if shift > 0:
            f.loc[flip_mask & ~f["churn_flag"], "churn_flag"] = True
        elif shift < 0:
            f.loc[flip_mask & f["churn_flag"], "churn_flag"] = False

    old_value = (old_price * old_quantity).replace(0, np.nan)
    value_ratio = (f["unit_price"] * f["quantity"] / old_value).fillna(1.0)
    inflation_ratio = (f["inflation_index"] / old_inflation.replace(0, np.nan)).fillna(1.0)
    f["revenue"] = f["revenue"] * value_ratio
    f["cost"] = f["cost"] * (f["quantity"] / old_quantity.replace(0, np.nan)).fillna(1.0) * inflation_ratio
    f["margin"] = f["revenue"] - f["cost"]

    return f


# Lever -> how to read it, move it, and describe it. `role` is the column
# role from pipeline.schema that must be present in the data.
LEVERS = {
    "price": {
        "role": "unit_price", "feature": "avg_unit_price", "delta_key": "price_delta_pct",
        "lever": "pricing", "noun": "prices", "difficulty": "Low", "timeline": "1-2 weeks",
    },
    "marketing": {
        "role": "marketing_spend", "feature": "marketing_spend", "delta_key": "marketing_delta_pct",
        "lever": "marketing", "noun": "marketing spend", "difficulty": "Low", "timeline": "1-2 weeks",
    },
    "discount": {
        "role": "discount_pct", "feature": "avg_discount_pct", "delta_key": "discount_delta_pct",
        "lever": "pricing", "noun": "discounts", "difficulty": "Low", "timeline": "1-2 weeks",
    },
    "inventory": {
        "role": "inventory_level", "feature": "avg_inventory", "delta_key": "inventory_delta_pct",
        "lever": "operations", "noun": "inventory", "difficulty": "Medium", "timeline": "3-6 weeks",
    },
}

MAX_DECISIONS = 6
MIN_MOVE_PCT = 3.0          # smaller moves aren't worth a decision card


def _risk_level(deltas: DeltaDict) -> str:
    magnitude = max(abs(v) for v in deltas.values())
    if magnitude < 15:
        return "Low"
    if magnitude < 60:
        return "Medium"
    return "High"


GROUP_KEYS = ["region", "category"]


def _lever_targets(encoded: pd.DataFrame, baseline: pd.DataFrame, feature: str) -> dict[str, pd.Series]:
    """Per baseline row, the level its own region x category history says is
    realistic: the 80th percentile month ("up") and the 20th ("down"). A row
    already beyond that level is left where it is, so only the parts of the
    business that have drifted from their usual range move."""
    history = encoded.groupby(GROUP_KEYS)[feature]
    high = history.quantile(0.8).rename("high")
    low = history.quantile(0.2).rename("low")
    bounds = baseline[GROUP_KEYS].join(high, on=GROUP_KEYS).join(low, on=GROUP_KEYS)
    current = baseline[feature].astype(float)
    up = np.maximum(current, bounds["high"].to_numpy())
    down = np.minimum(current, bounds["low"].to_numpy())
    # Cap any single row's move at +100% / -60% of where it is now.
    up = np.minimum(up, np.where(current > 0, current * 2.0, up))
    down = np.maximum(down, np.where(current > 0, current * 0.4, down))
    return {"up": pd.Series(up, index=baseline.index), "down": pd.Series(down, index=baseline.index)}


def apply_targets(frame: pd.DataFrame, feature: str, new_values: pd.Series) -> pd.DataFrame:
    """Set one lever's feature to new per-row values, keeping the features
    derived from it consistent (price ratio, stockout rate)."""
    f = frame.copy()
    old = f[feature].astype(float)
    f[feature] = new_values
    if feature == "avg_unit_price":
        f["price_to_competitor_ratio"] = f["avg_unit_price"] / f["avg_competitor_price_index"].replace(0, 1)
    if feature == "avg_inventory":
        row_pct = ((new_values - old) / old.replace(0, np.nan)).fillna(0) * 100
        f["stockout_rate"] = (f["stockout_rate"] * (1 - row_pct / 200)).clip(0, 1)
    return f


def _title(key: str, direction: str, overall: float, regions: list[str] | None, local: float) -> str:
    spec = LEVERS[key]
    noun = spec["noun"]
    its = "their" if noun.endswith("s") else "its"
    verb = {"up": "Raise", "down": "Lower"}[direction]
    if key == "inventory":
        verb = {"up": "Increase", "down": "Reduce"}[direction]
    usual = "usual high" if direction == "up" else "usual low"
    unit = " points" if key == "discount" else "%"
    if regions:
        return f"{verb} {noun} in {', '.join(regions)} to {its} {usual} ({local:+.0f}{unit} there)"
    return f"{verb} {noun} to {its} {usual} ({overall:+.0f}{unit} overall)"


def _estimate_cost(key: str, delta: float, baseline_revenue: float, frame: pd.DataFrame) -> float:
    """Heuristic one-period cost. Moves that save money (cutting spend,
    stock, or discounts) or earn it (raising price) cost nothing here."""
    if key == "marketing" and delta > 0:
        spend = frame["marketing_spend"]
        # The demo data repeats one regional budget across categories; don't
        # count it once per category.
        if frame.groupby("region")["marketing_spend"].nunique().max() == 1:
            spend = frame.drop_duplicates("region")["marketing_spend"]
        return float(spend.sum() * delta / 100)
    if key == "price" and delta < 0:
        return float(baseline_revenue * abs(delta) / 100 * 0.3)
    if key == "inventory" and delta > 0:
        extra_units = float(frame["avg_inventory"].sum() * delta / 100)
        return extra_units * 4.5  # assumed per-unit holding/replenishment cost
    if key == "discount" and delta > 0:
        return float(baseline_revenue * delta / 100)
    return 0.0


def generate_decisions(
    model,
    encoded: pd.DataFrame,
    feature_columns: list[str],
    cv_r2_mean: float,
    available: set[str] | None = None,
) -> list[dict]:
    baseline_frame = get_baseline_frame(encoded)
    baseline_revenue = predict_total(model, baseline_frame, feature_columns)
    base_confidence = max(5.0, min(97.0, cv_r2_mean * 100))
    all_regions = sorted(baseline_frame["region"].astype(str).unique())

    candidates: list[dict] = []
    for key, spec in LEVERS.items():
        if available is not None and spec["role"] not in available:
            continue
        feature = spec["feature"]
        current = baseline_frame[feature].astype(float)
        if encoded[feature].nunique() < 2:
            continue  # never varies in this data: nothing to learn or move
        for direction, target in _lever_targets(encoded, baseline_frame, feature).items():
            # Only rows that have drifted meaningfully move (5%+, or 1+
            # discount point); small wobbles stay put so the scenario is
            # about the parts of the business that are actually off-pattern.
            if key == "discount":
                moved = (target - current).abs() >= 0.01
            else:
                moved = ((target - current).abs() / current.abs().replace(0, np.nan)).fillna(0) >= 0.05
            if not moved.any():
                continue
            target = target.where(moved, current)
            if key == "discount":
                overall = float((target - current).mean() * 100)          # percentage points
                local = float((target - current)[moved].mean() * 100) if moved.any() else 0.0
                big_enough = abs(overall) >= 0.5
            else:
                base = float(current.sum())
                overall = float((target.sum() - base) / base * 100) if base else 0.0
                local_base = float(current[moved].sum())
                local = float((target[moved].sum() - local_base) / local_base * 100) if local_base else 0.0
                big_enough = abs(overall) >= MIN_MOVE_PCT
            if not big_enough:
                continue

            moved_regions = sorted(baseline_frame.loc[moved, "region"].astype(str).unique())
            regions = moved_regions if 0 < len(moved_regions) < len(all_regions) and len(moved_regions) <= 3 else None
            frame = apply_targets(baseline_frame, feature, target)
            delta = predict_total(model, frame, feature_columns) - baseline_revenue
            candidates.append({
                "key": key, "direction": direction, "delta": delta, "regions": regions,
                "overall": round(overall, 1), "local": round(local, 1),
                "deltas": {spec["delta_key"]: round(overall, 1)},
                "moved_frame": baseline_frame[moved], "target": target[moved],
            })

    candidates.sort(key=lambda c: c["delta"], reverse=True)

    decisions = []
    for c in candidates[:MAX_DECISIONS]:
        key, deltas, delta = c["key"], c["deltas"], c["delta"]
        spec = LEVERS[key]
        delta_pct = round(100 * delta / baseline_revenue, 2) if baseline_revenue else 0.0
        cost_frame = c["moved_frame"]
        revenue_share = baseline_revenue * (len(cost_frame) / max(len(baseline_frame), 1))
        cost = round(_estimate_cost(key, c["local"], revenue_share, cost_frame), 2)
        roi = round(delta / cost, 2) if cost > 0 else None
        risk = _risk_level({"move": c["local"]})
        confidence = round(max(5.0, base_confidence - (5 if risk == "High" else 2 if risk == "Medium" else 0)), 1)

        direction = "increase" if delta >= 0 else "decrease"
        pros = [f"Model projects a {abs(delta_pct):.1f}% {direction} in the KPI (${abs(delta):,.0f})."]
        cons = []
        if cost > 0:
            pros.append(f"Estimated cost of ${cost:,.0f} to implement.")
        elif key in ("marketing", "inventory", "discount") and c["direction"] == "down":
            pros.append(f"Reduces {spec['noun']}, so it costs nothing to implement.")
        if roi is not None:
            (pros if roi > 1 else cons).append(f"Estimated ROI of {roi:.1f}x on the projected change.")
        if risk != "Low":
            cons.append(f"{risk} risk: a {abs(c['local']):.0f}% move where it applies.")
        if delta < 0:
            cons.append("Model projects this would reduce the KPI relative to baseline.")

        where = (
            f"in {', '.join(c['regions'])}, the regions that have drifted from their usual range"
            if c["regions"] else "in each region and category that has drifted from its usual range"
        )
        usual = "80th" if c["direction"] == "up" else "20th"
        decisions.append(
            {
                "id": f"{key}-{c['direction']}",
                "title": _title(key, c["direction"], c["overall"], c["regions"], c["local"]),
                "lever": spec["lever"],
                "deltas": deltas,
                "regions": c["regions"],
                "confidence_pct": confidence,
                "predicted_revenue_delta": round(delta, 2),
                "predicted_revenue_delta_pct": delta_pct,
                "risk": risk,
                "estimated_cost": cost,
                "estimated_roi": roi,
                "implementation_difficulty": spec["difficulty"],
                "timeline": spec["timeline"],
                "pros": pros,
                "cons": cons or ["No material downside identified by the model at this size."],
                "methodology": (
                    f"Sized from your data: moves {spec['noun']} {where} to its own {usual} percentile "
                    "month. The impact is a prediction from the trained model on the latest period with "
                    "this change applied. Cost and ROI are heuristic estimates; there is no connected "
                    "cost-accounting system."
                ),
            }
        )

    return decisions

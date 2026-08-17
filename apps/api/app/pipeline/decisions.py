"""Business decision generation via real model perturbation.

Each decision option is produced by taking the actual latest-period feature
rows, applying a concrete scenario change (e.g. price -8%), and reading the
*real* predicted revenue delta back out of the trained model. Confidence is
derived from the model's real cross-validated R2. Cost/ROI are explicitly
labelled as heuristic estimates (there is no connected cost-accounting
system to source them from) so nothing is presented as more precise than it
is.
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


def apply_deltas(frame: pd.DataFrame, deltas: DeltaDict) -> pd.DataFrame:
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


def apply_raw_deltas(df: pd.DataFrame, deltas: DeltaDict, seed: int = 7) -> pd.DataFrame:
    """Apply a what-if scenario to the raw transaction-level dataframe, for a
    Lock-In re-run. Recomputes revenue/cost/margin from the adjusted drivers
    using the same relationships the data was generated with (unit_price *
    quantity = revenue, unit_cost * quantity * inflation = cost) — a real,
    if simplified, re-simulation rather than a lookup of canned numbers.
    """
    f = df.copy()
    rng = np.random.default_rng(seed)

    safe_quantity = f["quantity"].replace(0, np.nan)
    unit_cost = (f["cost"] / safe_quantity).fillna(0)

    if deltas.get("price_delta_pct"):
        f["unit_price"] = f["unit_price"] * (1 + deltas["price_delta_pct"] / 100)

    if deltas.get("discount_delta_pct"):
        old_discount = f["discount_pct"].clip(upper=0.95)
        new_discount = (old_discount + deltas["discount_delta_pct"] / 100).clip(0, 0.95)
        adjustment = (1 - new_discount) / (1 - old_discount)
        f["unit_price"] = f["unit_price"] * adjustment
        f["discount_pct"] = new_discount

    if deltas.get("marketing_delta_pct"):
        f["marketing_spend"] = f["marketing_spend"] * (1 + deltas["marketing_delta_pct"] / 100)

    if deltas.get("inflation_delta_pct"):
        f["inflation_index"] = f["inflation_index"] * (1 + deltas["inflation_delta_pct"] / 100)

    if deltas.get("demand_delta_pct"):
        f["quantity"] = (f["quantity"] * (1 + deltas["demand_delta_pct"] / 100)).round().clip(lower=0).astype(int)

    if deltas.get("inventory_delta_pct"):
        f["inventory_level"] = (f["inventory_level"] * (1 + deltas["inventory_delta_pct"] / 100)).clip(lower=0).astype(int)
        shift = deltas["inventory_delta_pct"] / 200
        flip_mask = rng.random(len(f)) < min(abs(shift), 1.0)
        if shift > 0:
            f.loc[flip_mask & f["stockout_flag"], "stockout_flag"] = False
        elif shift < 0:
            f.loc[flip_mask & ~f["stockout_flag"], "stockout_flag"] = True

    if deltas.get("churn_delta_pct"):
        shift = deltas["churn_delta_pct"] / 200
        flip_mask = rng.random(len(f)) < min(abs(shift), 1.0)
        if shift > 0:
            f.loc[flip_mask & ~f["churn_flag"], "churn_flag"] = True
        elif shift < 0:
            f.loc[flip_mask & f["churn_flag"], "churn_flag"] = False

    f["cost"] = unit_cost * f["quantity"] * f["inflation_index"]
    f["revenue"] = f["unit_price"] * f["quantity"]
    f["margin"] = f["revenue"] - f["cost"]

    return f


SCENARIOS = [
    {
        "id": "fix-inventory",
        "title": "Fix inventory allocation in affected regions",
        "deltas": {"inventory_delta_pct": 150},
        "difficulty": "Medium",
        "timeline": "3-6 weeks",
        "lever": "operations",
    },
    {
        "id": "ease-pricing",
        "title": "Ease pricing back toward pre-Q2 levels",
        "deltas": {"price_delta_pct": -8},
        "difficulty": "Low",
        "timeline": "1-2 weeks",
        "lever": "pricing",
    },
    {
        "id": "restore-marketing",
        "title": "Restore marketing investment to baseline",
        "deltas": {"marketing_delta_pct": 80},
        "difficulty": "Low",
        "timeline": "1 week",
        "lever": "marketing",
    },
    {
        "id": "targeted-discounts",
        "title": "Introduce targeted promotional discounts",
        "deltas": {"discount_delta_pct": 10},
        "difficulty": "Low",
        "timeline": "1-2 weeks",
        "lever": "pricing",
    },
]


def _risk_level(deltas: DeltaDict) -> str:
    magnitude = max(abs(v) for v in deltas.values())
    if magnitude < 15:
        return "Low"
    if magnitude < 60:
        return "Medium"
    return "High"


def _estimate_cost(scenario_id: str, deltas: DeltaDict, baseline_revenue: float, baseline_frame: pd.DataFrame) -> float:
    if scenario_id == "restore-marketing":
        # marketing_spend is a per-region monthly budget, constant across
        # categories within a region — dedupe by region before summing so
        # the estimate isn't inflated by the category grain of the frame.
        region_budgets = baseline_frame.drop_duplicates("region")["marketing_spend"]
        return float(region_budgets.sum() * (deltas["marketing_delta_pct"] / 100))
    if scenario_id == "ease-pricing":
        return float(baseline_revenue * abs(deltas["price_delta_pct"]) / 100 * 0.3)
    if scenario_id == "fix-inventory":
        extra_units = float(baseline_frame["avg_inventory"].sum() * (deltas["inventory_delta_pct"] / 100))
        return extra_units * 4.5  # assumed per-unit holding/replenishment cost
    if scenario_id == "targeted-discounts":
        return float(baseline_revenue * deltas["discount_delta_pct"] / 100)
    return 0.0


def generate_decisions(model, encoded: pd.DataFrame, feature_columns: list[str], cv_r2_mean: float) -> list[dict]:
    baseline_frame = get_baseline_frame(encoded)
    baseline_revenue = predict_total(model, baseline_frame, feature_columns)
    base_confidence = max(5.0, min(97.0, cv_r2_mean * 100))

    decisions = []
    for scenario in SCENARIOS:
        scenario_frame = apply_deltas(baseline_frame, scenario["deltas"])
        scenario_revenue = predict_total(model, scenario_frame, feature_columns)
        delta = scenario_revenue - baseline_revenue
        delta_pct = round(100 * delta / baseline_revenue, 2) if baseline_revenue else 0.0

        risk = _risk_level(scenario["deltas"])
        cost = round(_estimate_cost(scenario["id"], scenario["deltas"], baseline_revenue, baseline_frame), 2)
        roi = round(delta / cost, 2) if cost > 0 else None
        confidence = round(max(5.0, base_confidence - (5 if risk == "High" else 2 if risk == "Medium" else 0)), 1)

        direction = "increase" if delta >= 0 else "decrease"
        pros = [f"Model projects a {abs(delta_pct):.1f}% {direction} in revenue (${abs(delta):,.0f})."]
        cons = []
        if cost > 0:
            pros.append(f"Estimated cost of ${cost:,.0f} to implement.")
        if roi is not None:
            (pros if roi > 1 else cons).append(f"Estimated ROI of {roi:.1f}x on the projected revenue change.")
        if risk != "Low":
            cons.append(f"{risk} risk — this is a larger change than the model was densely trained on.")
        if delta < 0:
            cons.append("Model projects this scenario would reduce revenue relative to baseline.")

        decisions.append(
            {
                "id": scenario["id"],
                "title": scenario["title"],
                "lever": scenario["lever"],
                "confidence_pct": confidence,
                "predicted_revenue_delta": round(delta, 2),
                "predicted_revenue_delta_pct": delta_pct,
                "risk": risk,
                "estimated_cost": cost,
                "estimated_roi": roi,
                "implementation_difficulty": scenario["difficulty"],
                "timeline": scenario["timeline"],
                "pros": pros,
                "cons": cons or ["No material downside identified by the model at this scenario size."],
                "methodology": (
                    "Revenue impact is a real prediction from the trained model applied to this "
                    "scenario's inputs. Cost and ROI are heuristic estimates sized from the scenario "
                    "— there is no connected cost-accounting system in this environment."
                ),
            }
        )

    decisions.sort(key=lambda d: d["predicted_revenue_delta"], reverse=True)
    return decisions

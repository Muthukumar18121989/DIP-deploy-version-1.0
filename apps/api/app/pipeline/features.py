"""Feature engineering: aggregates raw order-line data to a monthly
region x category grain (the level business stakeholders actually reason
about) and derives model-ready features, including real lag/rolling terms.
"""

from __future__ import annotations

import pandas as pd

REQUIRED_SALES_COLUMNS = {
    "region", "category", "year", "month", "quarter", "revenue", "unit_price",
    "quantity", "marketing_spend", "discount_pct", "inventory_level",
    "stockout_flag", "competitor_price_index", "customer_satisfaction", "churn_flag",
    # Also genuinely required — aggregate_monthly() needs order_id/inflation_index,
    # and orchestrator.build_dashboard() needs customer_segment/channel — but all
    # four were missing from this set, so a CSV with only the columns above passed
    # the upload's "schema match" check and then crashed the pipeline anyway.
    "order_id", "inflation_index", "customer_segment", "channel",
}

GROUP_KEYS = ["region", "category", "year", "month"]

CATEGORICAL_COLS = ["region", "category"]

NUMERIC_FEATURE_COLS = [
    "avg_unit_price",
    "avg_discount_pct",
    "marketing_spend",
    "stockout_rate",
    "avg_inventory",
    "avg_competitor_price_index",
    "avg_inflation_index",
    "avg_satisfaction",
    "churn_rate",
    "order_count",
    "quarter",
    "revenue_lag1",
    "revenue_rolling3",
    "price_to_competitor_ratio",
]

TARGET_COL = "revenue"


def aggregate_monthly(df: pd.DataFrame) -> pd.DataFrame:
    agg = (
        df.groupby(GROUP_KEYS)
        .agg(
            revenue=("revenue", "sum"),
            quantity=("quantity", "sum"),
            avg_unit_price=("unit_price", "mean"),
            avg_discount_pct=("discount_pct", "mean"),
            marketing_spend=("marketing_spend", "mean"),
            stockout_rate=("stockout_flag", "mean"),
            avg_inventory=("inventory_level", "mean"),
            avg_competitor_price_index=("competitor_price_index", "mean"),
            avg_inflation_index=("inflation_index", "mean"),
            avg_satisfaction=("customer_satisfaction", "mean"),
            churn_rate=("churn_flag", "mean"),
            order_count=("order_id", "count"),
            quarter=("quarter", "first"),
        )
        .reset_index()
    )
    agg["period"] = pd.to_datetime(dict(year=agg["year"], month=agg["month"], day=1))
    agg = agg.sort_values(["region", "category", "period"])
    return agg


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    agg = aggregate_monthly(df)

    group = agg.groupby(["region", "category"], group_keys=False)
    agg["revenue_lag1"] = group["revenue"].shift(1)
    agg["revenue_rolling3"] = group["revenue"].apply(lambda s: s.shift(1).rolling(3).mean())
    agg["price_to_competitor_ratio"] = agg["avg_unit_price"] / agg["avg_competitor_price_index"].replace(0, 1)

    features = agg.dropna(subset=["revenue_lag1", "revenue_rolling3"]).reset_index(drop=True)
    return features


def encode_features(features: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    encoded = pd.get_dummies(features, columns=CATEGORICAL_COLS, prefix=CATEGORICAL_COLS)
    dummy_cols = [c for c in encoded.columns if c.startswith(tuple(f"{k}_" for k in CATEGORICAL_COLS))]
    feature_columns = NUMERIC_FEATURE_COLS + dummy_cols
    # Keep the original (un-dummified) dimension columns too, purely for
    # grouping/display — they are not part of feature_columns fed to models.
    encoded["region"] = features["region"].to_numpy()
    encoded["category"] = features["category"].to_numpy()
    return encoded, feature_columns

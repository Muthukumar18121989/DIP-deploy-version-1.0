"""Synthetic Sales dataset generator with a genuine, recoverable causal structure.

The dataset is not just random noise dressed up as a table: a subset of
regions experience a real Q2 2025 shock (price increase + marketing cut +
inventory stockouts), which measurably depresses demand and revenue for
those rows. This means a model trained on the data can legitimately recover
"why sales dropped in Q2" from feature importance and simulation, rather
than the platform having to fabricate an explanation.

Usage (full-scale, matching the original 1M+ row spec):

    python -m app.data_generation.sales --rows 1000000 --out data/sales_full.parquet
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

CATEGORIES = [
    "Electronics",
    "Home & Kitchen",
    "Apparel",
    "Sports & Outdoors",
    "Beauty",
    "Office Supplies",
]

REGIONS = [
    "North America",
    "EMEA",
    "APAC",
    "LATAM",
    "UK & Ireland",
    "DACH",
    "ANZ",
    "Southeast Asia",
]

SEGMENTS = ["Consumer", "Business", "Enterprise"]
SEGMENT_WEIGHTS = [0.6, 0.3, 0.1]
CHANNELS = ["Online", "Retail", "Wholesale"]
CHANNEL_WEIGHTS = [0.55, 0.30, 0.15]

START_DATE = "2024-01-01"
MONTHS = 24
N_PRODUCTS = 60
SHOCK_YEAR = 2025
SHOCK_QUARTER = 2
N_SHOCKED_REGIONS = 3


def generate_sales_dataset(n_rows: int = 150_000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    # --- Dimensions -------------------------------------------------------
    product_category = rng.choice(CATEGORIES, size=N_PRODUCTS)
    category_price_range = {
        "Electronics": (80, 900),
        "Home & Kitchen": (20, 250),
        "Apparel": (15, 150),
        "Sports & Outdoors": (25, 400),
        "Beauty": (10, 120),
        "Office Supplies": (5, 90),
    }
    base_price = np.array(
        [rng.uniform(*category_price_range[c]) for c in product_category]
    )
    base_cost = base_price * rng.uniform(0.4, 0.7, size=N_PRODUCTS)
    product_names = [
        f"{cat.split(' ')[0]} {chr(65 + i % 26)}{i // 26 + 1}"
        for i, cat in enumerate(product_category)
    ]

    n_regions = len(REGIONS)
    shocked_region_idx = rng.choice(n_regions, size=N_SHOCKED_REGIONS, replace=False)

    n_customers = max(5_000, n_rows // 20)
    customer_segment = rng.choice(SEGMENTS, size=n_customers, p=SEGMENT_WEIGHTS)
    customer_region_idx = rng.integers(0, n_regions, size=n_customers)

    # --- Transactions -------------------------------------------------------
    order_product_idx = rng.integers(0, N_PRODUCTS, size=n_rows)
    order_customer_idx = rng.integers(0, n_customers, size=n_rows)
    order_region_idx = customer_region_idx[order_customer_idx]

    end_date = pd.Timestamp(START_DATE) + pd.DateOffset(months=MONTHS) - pd.Timedelta(days=1)
    total_days = (end_date - pd.Timestamp(START_DATE)).days + 1
    day_offset = rng.integers(0, total_days, size=n_rows)
    dates = pd.Timestamp(START_DATE) + pd.to_timedelta(day_offset, unit="D")
    dates = pd.DatetimeIndex(dates)
    quarter = dates.quarter
    year = dates.year

    is_shock_period = (year == SHOCK_YEAR) & (quarter == SHOCK_QUARTER)
    in_shocked_region = np.isin(order_region_idx, shocked_region_idx)
    shock_mask = is_shock_period & in_shocked_region

    base_p = base_price[order_product_idx]
    base_c = base_cost[order_product_idx]

    price_multiplier = np.where(shock_mask, 1.12, 1.0)
    discount_pct = rng.uniform(0, 0.15, size=n_rows) * np.where(shock_mask, 0.4, 1.0)
    unit_price = base_p * price_multiplier * (1 - discount_pct)

    seasonality = 1 + 0.15 * np.sin(2 * np.pi * (dates.month.to_numpy() / 12))

    # Marketing spend is a real per-region monthly budget (not per-order
    # noise), so it aggregates to an honest dollar total a decision's cost
    # estimate can be sized from.
    month_starts = pd.date_range(START_DATE, periods=MONTHS, freq="MS")
    region_month_budget = rng.normal(loc=80_000, scale=15_000, size=(n_regions, MONTHS)).clip(min=10_000)
    shock_month_mask = (month_starts.year == SHOCK_YEAR) & (month_starts.quarter == SHOCK_QUARTER)
    region_month_budget[np.ix_(shocked_region_idx, np.where(shock_month_mask)[0])] *= 0.5

    month_since_start = (dates.year - month_starts[0].year) * 12 + (dates.month - month_starts[0].month)
    marketing_spend = region_month_budget[order_region_idx, month_since_start]

    stockout_prob = np.where(shock_mask, 0.35, 0.03)
    stockout_flag = rng.random(n_rows) < stockout_prob
    inventory_level = rng.integers(0, 500, size=n_rows)
    inventory_level = np.where(stockout_flag, rng.integers(0, 10, size=n_rows), inventory_level)

    competitor_price_index = rng.normal(1.0, 0.05, size=n_rows)
    inflation_index = 1 + rng.normal(0.03, 0.01, size=n_rows)

    satisfaction = rng.normal(4.2, 0.5, size=n_rows)
    satisfaction = np.where(shock_mask, satisfaction - 0.6, satisfaction)
    satisfaction = np.clip(satisfaction, 1, 5)

    price_elasticity_effect = np.clip(1 - 1.8 * (price_multiplier - 1), 0.2, 1.5)
    marketing_effect = 0.7 + 0.3 * np.clip(marketing_spend / 80_000, 0, 2)
    stockout_effect = np.where(stockout_flag, rng.uniform(0.0, 0.3, size=n_rows), 1.0)

    base_quantity = rng.poisson(lam=8, size=n_rows) + 1
    quantity = np.round(
        base_quantity * seasonality * price_elasticity_effect * marketing_effect * stockout_effect
    ).clip(min=0).astype(int)

    revenue = unit_price * quantity
    cost = base_c * quantity * inflation_index
    margin = revenue - cost

    churn_flag = rng.random(n_rows) < np.where(shock_mask, 0.18, 0.05)
    channel = rng.choice(CHANNELS, size=n_rows, p=CHANNEL_WEIGHTS)

    df = pd.DataFrame(
        {
            "order_id": np.arange(1, n_rows + 1),
            "order_date": dates,
            "year": year,
            "quarter": quarter,
            "month": dates.month.to_numpy(),
            "product_id": order_product_idx,
            "product_name": np.array(product_names)[order_product_idx],
            "category": product_category[order_product_idx],
            "region": np.array(REGIONS)[order_region_idx],
            "customer_id": order_customer_idx,
            "customer_segment": customer_segment[order_customer_idx],
            "channel": channel,
            "base_price": np.round(base_p, 2),
            "unit_price": np.round(unit_price, 2),
            "discount_pct": np.round(discount_pct, 4),
            "quantity": quantity,
            "revenue": np.round(revenue, 2),
            "cost": np.round(cost, 2),
            "margin": np.round(margin, 2),
            "marketing_spend": np.round(marketing_spend, 2),
            "inventory_level": inventory_level,
            "stockout_flag": stockout_flag,
            "competitor_price_index": np.round(competitor_price_index, 4),
            "inflation_index": np.round(inflation_index, 4),
            "customer_satisfaction": np.round(satisfaction, 2),
            "churn_flag": churn_flag,
        }
    )

    return df.sort_values("order_date").reset_index(drop=True)


def shocked_region_names(seed: int = 42) -> list[str]:
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(REGIONS), size=N_SHOCKED_REGIONS, replace=False)
    return [REGIONS[i] for i in idx]


def _main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rows", type=int, default=150_000)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", type=str, default="data/sales_demo.parquet")
    args = parser.parse_args()

    df = generate_sales_dataset(n_rows=args.rows, seed=args.seed)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out_path, index=False)
    print(f"Wrote {len(df):,} rows to {out_path}")
    print(f"Shocked regions (Q2 {SHOCK_YEAR}): {shocked_region_names(args.seed)}")


if __name__ == "__main__":
    _main()

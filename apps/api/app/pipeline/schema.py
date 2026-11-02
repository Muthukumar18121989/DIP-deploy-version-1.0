"""Column mapping: turns a customer's own spreadsheet into the canonical
table the pipeline works on.

The pipeline was written against one fixed Sales layout (see
features.REQUIRED_SALES_COLUMNS). Rather than rewrite every stage, an upload
is translated once, at mapping time:

- The user (helped by `suggest_mapping`) says which of their columns plays
  each role: the date, the KPI to explain, the dimensions, and the levers.
- `apply_mapping` renames those columns to the canonical names, derives
  year/month/quarter from the date, and fills every role the user doesn't
  have with a neutral constant.
- Which roles were genuinely present is recorded as `available` in the use
  case's `data_meta`. A filled-in constant never varies, so models give it no
  weight, and downstream code (decisions, dashboard) reads `available` so it
  never proposes moving a lever, or reports a KPI, the data doesn't contain.
"""

from __future__ import annotations

import re

import numpy as np
import pandas as pd

from app.pipeline.features import REQUIRED_SALES_COLUMNS

# Minimum history the pipeline needs: lag/rolling features consume the first
# 3 months of every series, and cross-validation needs rows left over.
MIN_MONTHS = 6

ROLES: list[dict] = [
    {"key": "date", "label": "Date", "group": "time", "kind": "date",
     "help": "One date per row (order date, invoice date, or month). Map this, or Year and Month.",
     "synonyms": ["date", "orderdate", "transactiondate", "invoicedate", "saledate", "salesdate", "period", "day", "week", "monthstart", "datetime", "timestamp"]},
    {"key": "year", "label": "Year", "group": "time", "kind": "number",
     "help": "Only needed if you have no Date column.", "synonyms": ["year", "yr", "fiscalyear"]},
    {"key": "month", "label": "Month (1-12)", "group": "time", "kind": "number",
     "help": "Only needed if you have no Date column.", "synonyms": ["month", "mon", "monthnumber", "monthnum"]},
    {"key": "revenue", "label": "KPI to explain", "group": "kpi", "kind": "number", "required": True,
     "help": "The numeric result you want explained and forecast, such as revenue or sales.",
     "synonyms": ["revenue", "sales", "netsales", "grosssales", "totalsales", "amount", "salesamount", "totalamount", "turnover", "gmv", "income", "value", "total"]},
    {"key": "region", "label": "Region", "group": "dimension", "kind": "category",
     "help": "Where the sale happened: region, territory, market, country or store.",
     "synonyms": ["region", "territory", "area", "market", "zone", "country", "state", "location", "store", "branch"]},
    {"key": "category", "label": "Product category", "group": "dimension", "kind": "category",
     "help": "What was sold: category, product line or brand.",
     "synonyms": ["category", "productcategory", "productline", "product", "line", "brand", "department", "sku"]},
    {"key": "customer_segment", "label": "Customer segment", "group": "dimension", "kind": "category",
     "help": "Customer type, such as Enterprise or Consumer.",
     "synonyms": ["customersegment", "segment", "customertype", "customergroup", "tier"]},
    {"key": "channel", "label": "Sales channel", "group": "dimension", "kind": "category",
     "help": "Online, retail, partner and so on.",
     "synonyms": ["channel", "saleschannel", "source", "medium"]},
    {"key": "order_id", "label": "Order ID", "group": "dimension", "kind": "id",
     "help": "Used to count orders. Each row counts as one order if left out.",
     "synonyms": ["orderid", "order", "transactionid", "invoiceid", "invoice", "invoiceno", "orderno", "ordernumber", "id"]},
    {"key": "unit_price", "label": "Unit price", "group": "lever", "kind": "number",
     "help": "Selling price per unit. Enables pricing recommendations.",
     "synonyms": ["unitprice", "price", "avgprice", "sellingprice", "listprice", "priceperunit"]},
    {"key": "quantity", "label": "Quantity", "group": "lever", "kind": "number",
     "help": "Units sold.", "synonyms": ["quantity", "qty", "units", "unitssold", "volume", "count"]},
    {"key": "marketing_spend", "label": "Marketing spend", "group": "lever", "kind": "number",
     "help": "Enables marketing recommendations.",
     "synonyms": ["marketingspend", "marketing", "adspend", "advertising", "advertisingspend", "mediaspend", "marketingcost", "promospend", "spend"]},
    {"key": "discount_pct", "label": "Discount", "group": "lever", "kind": "number",
     "help": "Discount as a fraction (0.1) or a percent (10). Enables discount recommendations.",
     "synonyms": ["discountpct", "discount", "discountrate", "discountpercent", "promodiscount", "markdown"]},
    {"key": "inventory_level", "label": "Inventory level", "group": "lever", "kind": "number",
     "help": "Units on hand. Enables inventory recommendations.",
     "synonyms": ["inventorylevel", "inventory", "stock", "stocklevel", "onhand", "unitsonhand"]},
    {"key": "competitor_price_index", "label": "Competitor price index", "group": "driver", "kind": "number",
     "help": "Competitor price relative to yours.", "synonyms": ["competitorpriceindex", "competitorprice", "competitorindex", "pricecompetitiveness"]},
    {"key": "inflation_index", "label": "Inflation index", "group": "driver", "kind": "number",
     "help": "CPI or another cost index.", "synonyms": ["inflationindex", "inflation", "cpi", "costindex"]},
    {"key": "customer_satisfaction", "label": "Customer satisfaction", "group": "driver", "kind": "number",
     "help": "CSAT or rating.", "synonyms": ["customersatisfaction", "satisfaction", "csat", "rating", "score"]},
    {"key": "stockout_flag", "label": "Stockout flag", "group": "driver", "kind": "flag",
     "help": "Yes/no or 1/0: was the item out of stock.", "synonyms": ["stockoutflag", "stockout", "outofstock", "oos"]},
    {"key": "churn_flag", "label": "Churn flag", "group": "driver", "kind": "flag",
     "help": "Yes/no or 1/0: did the customer churn.", "synonyms": ["churnflag", "churn", "churned", "lost"]},
    {"key": "cost", "label": "Cost", "group": "driver", "kind": "number",
     "help": "Cost of goods for the row.", "synonyms": ["cost", "cogs", "costofgoods", "totalcost", "unitcost"]},
]

ROLE_BY_KEY = {r["key"]: r for r in ROLES}

# Neutral values for roles the user doesn't have. Constant columns carry no
# signal, so models ignore them; `available` keeps them out of decisions.
_DEFAULTS = {
    "region": "All",
    "category": "All",
    "customer_segment": "All",
    "channel": "All",
    "unit_price": 1.0,
    "quantity": 1.0,
    "marketing_spend": 0.0,
    "discount_pct": 0.0,
    "inventory_level": 0.0,
    "competitor_price_index": 1.0,
    "inflation_index": 1.0,
    "customer_satisfaction": 0.0,
    "stockout_flag": False,
    "churn_flag": False,
    "cost": 0.0,
}

_TRUE_WORDS = {"1", "1.0", "true", "yes", "y", "t"}


class MappingError(ValueError):
    """A mapping the data can't support, with a message meant for the user."""


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(name).lower())


def suggest_mapping(columns: list[str]) -> dict[str, str]:
    """Best-guess role -> column from column names. Exact canonical names win,
    then each role's synonyms in order; a column is never used twice."""
    normalized = {col: _norm(col) for col in columns}
    used: set[str] = set()
    mapping: dict[str, str] = {}
    for role in ROLES:
        candidates = [_norm(role["key"])] + role["synonyms"]
        for candidate in candidates:
            match = next((c for c, n in normalized.items() if n == candidate and c not in used), None)
            if match is not None:
                mapping[role["key"]] = match
                used.add(match)
                break
    if "date" in mapping:
        # A real date column makes separate year/month guesses redundant and
        # risks mapping something like "month_name" as a number.
        mapping.pop("year", None)
        mapping.pop("month", None)
    return mapping


def _to_number(series: pd.Series, label: str) -> pd.Series:
    if series.dtype == object:
        series = series.astype(str).str.replace(r"[,$€£₹%\s]", "", regex=True)
    numbers = pd.to_numeric(series, errors="coerce")
    if numbers.notna().mean() < 0.5:
        raise MappingError(f"Most values in the column mapped to {label} aren't numbers.")
    return numbers


def _parse_dates(series: pd.Series) -> pd.Series:
    """Parse dates, telling 03/04/2025 day-first from month-first by looking
    at the whole column: if any leading number is above 12 the file is
    day-first; if any middle number is, it's month-first."""
    if pd.api.types.is_datetime64_any_dtype(series):
        return series
    text = series.astype(str).str.strip()
    parts = text.str.extract(r"^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})")
    dayfirst = False
    if parts[0].notna().any():
        first = pd.to_numeric(parts[0], errors="coerce")
        second = pd.to_numeric(parts[1], errors="coerce")
        dayfirst = bool((first > 12).any() and not (second > 12).any())
    return pd.to_datetime(text, errors="coerce", format="mixed", dayfirst=dayfirst)


def _to_flag(series: pd.Series) -> pd.Series:
    if pd.api.types.is_bool_dtype(series):
        return series.fillna(False)
    return series.astype(str).str.strip().str.lower().isin(_TRUE_WORDS)


def apply_mapping(df: pd.DataFrame, mapping: dict[str, str]) -> tuple[pd.DataFrame, dict]:
    """Return (canonical dataframe, data_meta) or raise MappingError."""
    mapping = {role: col for role, col in mapping.items() if col}
    unknown_roles = set(mapping) - set(ROLE_BY_KEY)
    if unknown_roles:
        raise MappingError(f"Unknown roles: {', '.join(sorted(unknown_roles))}.")
    missing_cols = [col for col in mapping.values() if col not in df.columns]
    if missing_cols:
        raise MappingError(f"These columns aren't in the file: {', '.join(missing_cols)}.")
    if len(set(mapping.values())) != len(mapping):
        raise MappingError("Each column can only be used for one role.")
    if "revenue" not in mapping:
        raise MappingError("Choose the column with the KPI to explain.")
    has_date = "date" in mapping
    if not has_date and not ("year" in mapping and "month" in mapping):
        raise MappingError("Choose a Date column, or both Year and Month.")

    out = pd.DataFrame(index=df.index)

    if has_date:
        dates = _parse_dates(df[mapping["date"]])
        if dates.notna().mean() < 0.8:
            raise MappingError("Most values in the Date column couldn't be read as dates.")
        out["year"] = dates.dt.year
        out["month"] = dates.dt.month
    else:
        out["year"] = _to_number(df[mapping["year"]], "Year")
        out["month"] = _to_number(df[mapping["month"]], "Month")
        if not out["month"].dropna().between(1, 12).all():
            raise MappingError("Month must be a number from 1 to 12.")

    out["revenue"] = _to_number(df[mapping["revenue"]], ROLE_BY_KEY["revenue"]["label"])

    available: list[str] = ["revenue"]
    for role in ROLES:
        key = role["key"]
        if key in ("date", "year", "month", "revenue"):
            continue
        if key in mapping:
            source = df[mapping[key]]
            if role["kind"] == "number":
                out[key] = _to_number(source, role["label"])
            elif role["kind"] == "flag":
                out[key] = _to_flag(source)
            else:
                out[key] = source.astype(str).str.strip().replace({"": "Unknown", "nan": "Unknown"})
            available.append(key)
        elif key == "order_id":
            out[key] = np.arange(len(df))
        else:
            out[key] = _DEFAULTS[key]

    out = out.dropna(subset=["year", "month", "revenue"]).copy()
    # Remaining gaps in mapped numeric columns: fill with the column median
    # so one blank cell doesn't drop a whole row from every model.
    for role in ROLES:
        if role["kind"] == "number" and role["key"] in available and role["key"] != "revenue":
            col = out[role["key"]]
            out[role["key"]] = col.fillna(col.median() if col.notna().any() else 0.0)

    if "discount_pct" in available and out["discount_pct"].max() > 1:
        out["discount_pct"] = out["discount_pct"] / 100  # given as percent

    out["year"] = out["year"].astype(int)
    out["month"] = out["month"].astype(int)
    out["quarter"] = (out["month"] - 1) // 3 + 1
    out["margin"] = out["revenue"] - out["cost"]

    months = out[["year", "month"]].drop_duplicates()
    if len(months) < MIN_MONTHS:
        raise MappingError(
            f"The pipeline needs at least {MIN_MONTHS} months of history; this file covers {len(months)}."
        )

    meta = {
        "mapping": mapping,
        "available": available,
        "kpi_column": mapping["revenue"],
        "month_count": int(len(months)),
        "row_count": int(len(out)),
    }
    return out.reset_index(drop=True), meta


def synthetic_meta(df: pd.DataFrame) -> dict:
    """data_meta for the built-in generator, which has every role."""
    return {
        "mapping": {},
        "available": [r["key"] for r in ROLES if r["key"] not in ("date", "year", "month")],
        "kpi_column": "revenue",
        "month_count": int(len(df[["year", "month"]].drop_duplicates())),
        "row_count": int(len(df)),
    }


def matches_canonical_schema(columns: list[str]) -> bool:
    return REQUIRED_SALES_COLUMNS.issubset(set(columns))


def available_roles(meta: dict | None) -> set[str]:
    """Roles genuinely present in the data. Datasets saved before mapping
    existed (no data_meta) were always the full Sales layout."""
    if not meta:
        return {r["key"] for r in ROLES if r["key"] not in ("date", "year", "month")}
    return set(meta.get("available") or [])


def real_columns_frame(df: pd.DataFrame, meta: dict | None) -> pd.DataFrame:
    """The dataframe without the constant placeholder columns, for profiling
    and correlations (a constant column has no correlation to report)."""
    available = available_roles(meta)
    placeholders = [k for k in _DEFAULTS if k not in available and k in df.columns]
    if "cost" in placeholders and "margin" in df.columns:
        placeholders.append("margin")
    return df.drop(columns=placeholders)

"""Real, pandas-computed data profiling — no hand-authored numbers.

Every figure returned here (missing %, outlier counts, correlations,
distributions) is read directly off the actual dataframe passed in.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

ID_LIKE_TOKENS = ("id", "_id", "code")
DATE_LIKE_TOKENS = ("date", "time", "month", "year", "quarter")
PRICE_LIKE_TOKENS = ("price", "revenue", "cost", "margin", "spend", "discount")
REGION_LIKE_TOKENS = ("region", "category", "segment", "channel", "product")


def _classify_column(name: str, series: pd.Series) -> str:
    lname = name.lower()
    if pd.api.types.is_bool_dtype(series):
        return "boolean flag"
    if any(tok in lname for tok in ID_LIKE_TOKENS):
        return "identifier"
    if pd.api.types.is_datetime64_any_dtype(series) or any(tok in lname for tok in DATE_LIKE_TOKENS):
        return "date / time"
    if any(tok in lname for tok in PRICE_LIKE_TOKENS):
        return "financial metric"
    if any(tok in lname for tok in REGION_LIKE_TOKENS):
        return "business dimension"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric measure"
    return "categorical"


def _outlier_count(series: pd.Series) -> int:
    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    if iqr == 0:
        return 0
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    return int(((series < lower) | (series > upper)).sum())


def profile_dataframe(df: pd.DataFrame) -> dict:
    n_rows = len(df)
    columns_report = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    total_missing = 0
    total_outliers = 0

    for col in df.columns:
        series = df[col]
        missing = int(series.isna().sum())
        total_missing += missing
        classification = _classify_column(col, series)
        entry = {
            "column": col,
            "classification": classification,
            "dtype": str(series.dtype),
            "missing_count": missing,
            "missing_pct": round(100 * missing / n_rows, 2) if n_rows else 0.0,
            "unique_count": int(series.nunique()),
        }
        if col in numeric_cols:
            outliers = _outlier_count(series.dropna())
            total_outliers += outliers
            entry.update(
                {
                    "outlier_count": outliers,
                    "outlier_pct": round(100 * outliers / n_rows, 2) if n_rows else 0.0,
                    "mean": round(float(series.mean()), 2),
                    "median": round(float(series.median()), 2),
                    "std": round(float(series.std()), 2),
                    "min": round(float(series.min()), 2),
                    "max": round(float(series.max()), 2),
                }
            )
        else:
            top = series.value_counts().head(5)
            entry["top_values"] = [{"value": str(k), "count": int(v)} for k, v in top.items()]
        columns_report.append(entry)

    correlation = {}
    if len(numeric_cols) > 1:
        corr_matrix = df[numeric_cols].corr(numeric_only=True).round(3)
        correlation = {
            row: {col: (None if pd.isna(val) else val) for col, val in corr_matrix.loc[row].items()}
            for row in corr_matrix.index
        }

    duplicate_rows = int(df.duplicated().sum())
    missing_rate = total_missing / (n_rows * len(df.columns)) if n_rows else 0
    outlier_rate = total_outliers / (n_rows * max(len(numeric_cols), 1)) if n_rows else 0
    duplicate_rate = duplicate_rows / n_rows if n_rows else 0
    quality_score = round(
        100 * (1 - 0.5 * missing_rate - 0.3 * outlier_rate - 0.2 * duplicate_rate), 1
    )
    quality_score = max(0.0, min(100.0, quality_score))

    return {
        "row_count": n_rows,
        "column_count": len(df.columns),
        "duplicate_rows": duplicate_rows,
        "data_quality_score": quality_score,
        "columns": columns_report,
        "correlation": correlation,
        "summary_plain_english": (
            f"We looked at {n_rows:,} records across {len(df.columns)} fields. "
            f"{'No missing information was found.' if total_missing == 0 else f'{total_missing:,} values were missing and have been accounted for.'} "
            f"{'No unusual values stood out.' if total_outliers == 0 else f'{total_outliers:,} unusually high or low values were flagged for review.'} "
            f"Overall, the data is {quality_score:.0f} out of 100 ready to use."
        ),
    }

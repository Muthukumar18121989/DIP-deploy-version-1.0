"""Real ARIMA forecasting over actual monthly revenue history."""

from __future__ import annotations

import warnings

import pandas as pd
from statsmodels.tsa.arima.model import ARIMA


def forecast_revenue(df: pd.DataFrame, periods: int = 3) -> dict:
    monthly = (
        df.groupby(["year", "month"])["revenue"]
        .sum()
        .reset_index()
        .assign(period=lambda d: pd.to_datetime(dict(year=d["year"], month=d["month"], day=1)))
        .sort_values("period")
    )
    series = monthly.set_index("period")["revenue"]

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = ARIMA(series, order=(2, 1, 2))
        fitted = model.fit()
        forecast_result = fitted.get_forecast(steps=periods)
        forecast_mean = forecast_result.predicted_mean
        conf_int = forecast_result.conf_int(alpha=0.2)

    history = [
        {"period": p.strftime("%Y-%m"), "revenue": round(float(v), 2)} for p, v in series.items()
    ]
    forecast = [
        {
            "period": p.strftime("%Y-%m"),
            "revenue": round(float(v), 2),
            "lower": round(float(conf_int.iloc[i, 0]), 2),
            "upper": round(float(conf_int.iloc[i, 1]), 2),
        }
        for i, (p, v) in enumerate(forecast_mean.items())
    ]

    return {"history": history, "forecast": forecast}

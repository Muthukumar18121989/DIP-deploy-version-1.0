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

    method = "ARIMA(2,1,2)"
    try:
        if len(series) < 10:
            raise ValueError("too short for ARIMA")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            model = ARIMA(series, order=(2, 1, 2))
            fitted = model.fit()
            forecast_result = fitted.get_forecast(steps=periods)
            forecast_mean = forecast_result.predicted_mean
            conf_int = forecast_result.conf_int(alpha=0.2)
    except Exception:
        # Short or irregular histories: carry the recent average forward with
        # a band from recent month-to-month variation, and say so.
        method = "3-month average (history too short for ARIMA)"
        recent = series.iloc[-3:]
        level = float(recent.mean())
        spread = float(series.diff().dropna().std() or 0.0) * 1.28
        index = pd.date_range(series.index[-1] + pd.offsets.MonthBegin(1), periods=periods, freq="MS")
        forecast_mean = pd.Series([level] * periods, index=index)
        conf_int = pd.DataFrame(
            {"lower": [level - spread * (i + 1) ** 0.5 for i in range(periods)],
             "upper": [level + spread * (i + 1) ** 0.5 for i in range(periods)]},
            index=index,
        )

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

    return {"history": history, "forecast": forecast, "method": method}

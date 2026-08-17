"""What-if simulation: re-runs the trained model with adjusted inputs.

Used by both the Scenario Simulator sliders and the Decision Sandbox —
every response here is a live model prediction on the perturbed baseline,
not a cached or interpolated value.
"""

from __future__ import annotations

import pandas as pd

from app.pipeline.decisions import apply_deltas, get_baseline_frame, predict_total


def run_simulation(model, encoded: pd.DataFrame, feature_columns: list[str], deltas: dict) -> dict:
    baseline_frame = get_baseline_frame(encoded)
    baseline_revenue = predict_total(model, baseline_frame, feature_columns)

    scenario_frame = apply_deltas(baseline_frame, deltas)
    scenario_frame["predicted_revenue"] = model.predict(scenario_frame[feature_columns].astype(float))
    scenario_revenue = float(scenario_frame["predicted_revenue"].sum())

    by_region = (
        scenario_frame.groupby("region")["predicted_revenue"].sum().round(2).sort_values(ascending=False).to_dict()
    )

    baseline_by_region_frame = baseline_frame.copy()
    baseline_by_region_frame["predicted_revenue"] = model.predict(
        baseline_by_region_frame[feature_columns].astype(float)
    )
    baseline_by_region = (
        baseline_by_region_frame.groupby("region")["predicted_revenue"].sum().round(2).to_dict()
    )

    delta = scenario_revenue - baseline_revenue
    delta_pct = round(100 * delta / baseline_revenue, 2) if baseline_revenue else 0.0

    return {
        "baseline_revenue": round(baseline_revenue, 2),
        "predicted_revenue": round(scenario_revenue, 2),
        "predicted_revenue_delta": round(delta, 2),
        "predicted_revenue_delta_pct": delta_pct,
        "revenue_by_region": by_region,
        "baseline_revenue_by_region": baseline_by_region,
        "deltas_applied": deltas,
    }

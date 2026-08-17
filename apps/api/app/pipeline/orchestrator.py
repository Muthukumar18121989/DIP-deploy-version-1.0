"""Orchestrates the full pipeline and yields one real event dict per stage.

This drives the "AI thinking" visual pipeline in the UI. Stages are not
paced with artificial sleeps — the animation timing is however long the
real computation for that stage actually takes.

Yields plain dicts (not pre-formatted SSE strings) so the router can both
format them for streaming *and* react to specific stages (e.g. persisting
Strategy rows when decisions are generated) without re-parsing JSON.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

import pandas as pd

from app.pipeline import store
from app.pipeline.decisions import generate_decisions
from app.pipeline.features import encode_features, engineer_features
from app.pipeline.forecasting import forecast_revenue
from app.pipeline.profiling import profile_dataframe
from app.pipeline.training import MODEL_REGISTRY, train_and_compare


def _event(stage: str, label: str, status: str, what_happened: str, why: str, ai_doing: str, data: Any = None) -> dict:
    return {
        "stage": stage,
        "label": label,
        "status": status,
        "what_happened": what_happened,
        "why": why,
        "ai_doing": ai_doing,
        "data": data,
    }


def run_pipeline(experiment_id: str, use_case_id: str, use_case: dict) -> Iterator[dict]:
    yield _event(
        "understanding_intent", "Understanding Intent", "running",
        "Reading your business problem, objective, and target KPI.",
        "The AI needs to know what 'success' means before touching any data.",
        f"Parsing: “{use_case['objective']}”, tracking KPI “{use_case['kpi']}”.",
    )
    yield _event(
        "understanding_intent", "Understanding Intent", "complete",
        f"Identified this as a revenue-driver analysis for the KPI “{use_case['kpi']}”.",
        "Business problems map to different AI approaches — this one needs a regression model that explains what drives the KPI, plus a forecast.",
        "Selected approach: regression + feature-importance analysis + time-series forecast.",
        {"kpi": use_case["kpi"], "objective": use_case["objective"]},
    )

    raw_df = store.load_raw_df(use_case_id)
    if raw_df is None:
        raise ValueError("No data attached to this use case yet.")

    yield _event(
        "reading_data", "Reading Data", "running",
        "Loading the connected dataset into memory.",
        "AI can't analyze what it hasn't read yet.",
        "Scanning columns and row count.",
    )
    yield _event(
        "reading_data", "Reading Data", "complete",
        f"Loaded {len(raw_df):,} records across {len(raw_df.columns)} fields.",
        "Knowing the shape of the data determines what's even possible to compute next.",
        "Indexed all columns and inferred their data types.",
        {"row_count": len(raw_df), "column_count": len(raw_df.columns)},
    )

    yield _event(
        "cleaning_data", "Cleaning Data", "running",
        "Checking for missing values, unusual outliers, and duplicate records.",
        "Bad or missing data quietly wrecks model accuracy if it isn't caught first.",
        "Running statistical checks column by column.",
    )
    profiling = profile_dataframe(raw_df)
    store.save_json(experiment_id, "profiling", profiling)
    yield _event(
        "cleaning_data", "Cleaning Data", "complete",
        profiling["summary_plain_english"],
        "A data quality score below 100 doesn't block analysis, but it tells us how much to trust the result.",
        "Computed a data quality score and flagged any risky columns.",
        {"data_quality_score": profiling["data_quality_score"], "duplicate_rows": profiling["duplicate_rows"]},
    )

    yield _event(
        "feature_selection", "Feature Engineering", "running",
        "Turning raw transactions into monthly business signals (price, marketing spend, inventory, etc.).",
        "Models learn from patterns, not raw rows — this step builds the signals that actually explain revenue.",
        "Aggregating to region x category x month, and building trend features.",
    )
    features = engineer_features(raw_df)
    encoded, feature_columns = encode_features(features)
    store.save_encoded(experiment_id, encoded, feature_columns)
    yield _event(
        "feature_selection", "Feature Engineering", "complete",
        f"Built {len(feature_columns)} features from {len(encoded)} monthly region/category records.",
        "More relevant features (like last month's revenue, or stockout rate) let the model explain cause, not just correlation.",
        "Selected price, marketing, inventory, discount, competitor, and seasonality signals.",
        {"feature_count": len(feature_columns), "sample_count": len(encoded)},
    )

    yield _event(
        "correlation_discovery", "Correlation Discovery", "running",
        "Checking which signals move together with revenue.",
        "A feature that never moves with the KPI is unlikely to help predict it.",
        "Computing a correlation matrix across all numeric signals.",
    )
    strongest = _strongest_correlations(profiling.get("correlation", {}))
    yield _event(
        "correlation_discovery", "Correlation Discovery", "complete",
        "Strongest relationships with revenue: " + ", ".join(strongest) + "." if strongest else "No strong linear relationships stood out.",
        "Correlation doesn't prove cause, but it narrows down what's worth testing as a business lever.",
        "Ranked every numeric signal by its correlation with revenue.",
        {"correlation": profiling.get("correlation", {})},
    )

    model_names = list(MODEL_REGISTRY.keys())
    yield _event(
        "model_selection", "Model Selection", "running",
        "Selecting candidate algorithms suited to this type of problem.",
        "Different algorithms make different trade-offs between accuracy and interpretability — trying several finds the best fit.",
        f"Shortlisted: {', '.join(model_names)}.",
        {"candidates": model_names},
    )
    yield _event(
        "model_selection", "Model Selection", "complete",
        f"{len(model_names)} candidate algorithms selected for this regression problem.",
        "This is a numeric-prediction (regression) problem, so classification-only algorithms were excluded.",
        "Preparing to train and cross-validate all candidates.",
        {"candidates": model_names},
    )

    yield _event(
        "training", "Model Training", "running",
        "Training each candidate model and testing it with 5-fold cross-validation.",
        "Cross-validation checks the model on data it hasn't seen, so we don't fool ourselves with a model that just memorized the past.",
        "Fitting Linear Regression, Random Forest, Gradient Boosting, and XGBoost.",
    )
    training_result = train_and_compare(encoded, feature_columns)
    store.save_model(experiment_id, training_result["best_model"])
    comparison_for_json = training_result["comparison"]
    store.save_json(experiment_id, "training", {
        "comparison": comparison_for_json,
        "best_model_name": training_result["best_model_name"],
        "feature_importances": training_result["feature_importances"],
    })
    yield _event(
        "training", "Model Training", "complete",
        f"{training_result['best_model_name']} performed best, explaining {training_result['test_r2']*100:.1f}% of the variation in revenue.",
        "The model with the highest held-out accuracy is the one we trust to power decisions and simulations.",
        "Ranked all candidates by held-out accuracy.",
        {"comparison": comparison_for_json, "best_model_name": training_result["best_model_name"], "confidence_pct": round(training_result["cv_r2_mean"] * 100, 1)},
    )

    yield _event(
        "evaluation", "Model Evaluation", "running",
        "Checking which factors the winning model relies on most.",
        "Knowing what drives the prediction is what turns a model into a business explanation.",
        "Ranking feature importances from the trained model.",
    )
    top_features = (training_result["feature_importances"] or [])[:5]
    yield _event(
        "evaluation", "Model Evaluation", "complete",
        "Top revenue drivers identified: " + ", ".join(f["feature"] for f in top_features) + ".",
        "These are the levers a business decision should pull — everything else has a smaller measurable effect.",
        "Computed feature importance ranking from the trained model.",
        {"top_features": top_features},
    )

    yield _event(
        "decision_generation", "Decision Generation", "running",
        "Testing what happens to predicted revenue under a few realistic business changes.",
        "A model is only useful if it's turned into concrete options a business can choose between.",
        "Simulating price, inventory, marketing, and discount scenarios through the trained model.",
    )
    decisions = generate_decisions(
        training_result["best_model"], encoded, feature_columns, training_result["cv_r2_mean"]
    )
    store.save_json(experiment_id, "decisions", decisions)
    top_decision = decisions[0] if decisions else None
    yield _event(
        "decision_generation", "Decision Generation", "complete",
        f"Generated {len(decisions)} ranked decision options.",
        "Ranking by projected revenue impact surfaces the highest-leverage action first.",
        "Scored each option by projected impact, risk, cost, and confidence.",
        {"decisions": decisions},
    )

    yield _event(
        "business_simulation", "Business Simulation", "running",
        "Summarizing the strongest option in plain English.",
        "Executives need a headline recommendation, not just a table of numbers.",
        "Writing a plain-English recommendation from the top-ranked decision.",
    )
    if top_decision:
        headline = (
            f"Recommended: {top_decision['title']} — projected to change revenue by "
            f"{top_decision['predicted_revenue_delta_pct']:+.1f}% "
            f"with {top_decision['confidence_pct']:.0f}% model confidence."
        )
    else:
        headline = "No decision options could be generated."
    store.save_json(experiment_id, "recommendation_headline", headline)
    yield _event(
        "business_simulation", "Business Simulation", "complete",
        headline,
        "This is the single action with the best projected trade-off between impact, cost, and risk.",
        "Selected the top-ranked decision as the headline recommendation.",
        {"headline": headline},
    )

    yield _event(
        "scenario_testing", "Scenario Testing", "running",
        "Projecting revenue forward for the next 3 months.",
        "Decision-makers need to see where the trend is heading, not just where it's been.",
        "Fitting a time-series forecast model to monthly revenue history.",
    )
    forecast = forecast_revenue(raw_df)
    store.save_json(experiment_id, "forecast", forecast)
    yield _event(
        "scenario_testing", "Scenario Testing", "complete",
        f"Forecast complete for the next {len(forecast['forecast'])} months.",
        "A forward-looking view lets the business judge whether recommended actions are urgent.",
        "Generated a 3-month revenue forecast with confidence bands.",
        {"forecast": forecast},
    )

    yield _event(
        "final_recommendation", "Final Recommendation", "running",
        "Finalizing the ranked recommendation set for the Decision Library.",
        "Every decision option becomes a reusable, trackable strategy from here.",
        "Preparing each option to be saved as a versioned strategy.",
    )
    yield _event(
        "final_recommendation", "Final Recommendation", "complete",
        f"{len(decisions)} strategies are ready in the Decision Library.",
        "Saving them as persisted strategies means they can be compared, sandboxed, and published later.",
        "Decisions handed off to the Decision Library.",
        {"decision_count": len(decisions)},
    )

    yield _event(
        "final_dashboard", "Dashboard Generation", "running",
        "Assembling the executive dashboard from everything computed so far.",
        "All this analysis is only useful once it's visible in one place.",
        "Aggregating regional, category, and trend views for the dashboard.",
    )
    dashboard = build_dashboard(raw_df, features, profiling, decisions, forecast)
    store.save_json(experiment_id, "dashboard", dashboard)
    yield _event(
        "final_dashboard", "Dashboard Generation", "complete",
        "Executive dashboard is ready.",
        "This closes the loop from raw data to a decision-ready view.",
        "Pipeline complete.",
        {"ready": True},
    )


def _strongest_correlations(correlation: dict, target: str = "revenue", top_n: int = 3) -> list[str]:
    row = correlation.get(target, {})
    ranked = sorted(
        ((col, val) for col, val in row.items() if col != target and val is not None),
        key=lambda kv: abs(kv[1]),
        reverse=True,
    )
    return [f"{col} ({val:+.2f})" for col, val in ranked[:top_n]]


def build_dashboard(raw_df: pd.DataFrame, features: pd.DataFrame, profiling: dict, decisions: list[dict], forecast: dict) -> dict:
    by_region = (
        raw_df.groupby("region")["revenue"].sum().sort_values(ascending=False).round(2).to_dict()
    )
    by_category = (
        raw_df.groupby("category")["revenue"].sum().sort_values(ascending=False).round(2).to_dict()
    )
    monthly = (
        raw_df.groupby(["year", "month"])["revenue"].sum().reset_index()
    )
    monthly["period"] = pd.to_datetime(dict(year=monthly["year"], month=monthly["month"], day=1)).dt.strftime("%Y-%m")
    monthly_trend = monthly[["period", "revenue"]].round(2).to_dict("records")

    total_revenue = float(raw_df["revenue"].sum())
    total_orders = int(len(raw_df))
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0
    stockout_rate = round(float(raw_df["stockout_flag"].mean()) * 100, 2)
    churn_rate = round(float(raw_df["churn_flag"].mean()) * 100, 2)
    avg_satisfaction = round(float(raw_df["customer_satisfaction"].mean()), 2)

    segment_mix = raw_df.groupby("customer_segment")["revenue"].sum().round(2).to_dict()
    channel_mix = raw_df.groupby("channel")["revenue"].sum().round(2).to_dict()

    return {
        "kpis": {
            "total_revenue": round(total_revenue, 2),
            "total_orders": total_orders,
            "avg_order_value": avg_order_value,
            "stockout_rate_pct": stockout_rate,
            "churn_rate_pct": churn_rate,
            "avg_satisfaction": avg_satisfaction,
            "data_quality_score": profiling["data_quality_score"],
        },
        "revenue_by_region": by_region,
        "revenue_by_category": by_category,
        "monthly_trend": monthly_trend,
        "segment_mix": segment_mix,
        "channel_mix": channel_mix,
        "correlation": profiling["correlation"],
        "top_decision": decisions[0] if decisions else None,
        "forecast": forecast,
    }

"""Real model training and comparison via cross-validation.

Every metric returned (R2, MAE, MAPE) comes from actually fitting these
scikit-learn / XGBoost estimators on the engineered features and scoring
them on a held-out split — nothing here is a stand-in number.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from xgboost import XGBRegressor

MODEL_REGISTRY = {
    "Linear Regression": lambda: LinearRegression(),
    "Random Forest": lambda: RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42, n_jobs=-1),
    "Gradient Boosting": lambda: GradientBoostingRegressor(n_estimators=150, max_depth=3, random_state=42),
    "XGBoost": lambda: XGBRegressor(
        n_estimators=200, max_depth=4, learning_rate=0.08, random_state=42, n_jobs=-1
    ),
}


def train_and_compare(encoded: pd.DataFrame, feature_columns: list[str], target_col: str = "revenue") -> dict:
    X = encoded[feature_columns].astype(float)
    y = encoded[target_col].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    comparison = []
    fitted_models = {}

    for name, factory in MODEL_REGISTRY.items():
        model = factory()
        cv_r2 = cross_val_score(model, X_train, y_train, cv=kf, scoring="r2")
        cv_mae = -cross_val_score(model, X_train, y_train, cv=kf, scoring="neg_mean_absolute_error")

        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        test_r2 = float(1 - np.sum((y_test - preds) ** 2) / np.sum((y_test - y_test.mean()) ** 2))
        test_mae = float(np.mean(np.abs(y_test - preds)))
        test_mape = float(np.mean(np.abs((y_test - preds) / y_test.replace(0, np.nan)).dropna()) * 100)

        fitted_models[name] = model
        comparison.append(
            {
                "model": name,
                "cv_r2_mean": round(float(cv_r2.mean()), 4),
                "cv_r2_std": round(float(cv_r2.std()), 4),
                "cv_mae_mean": round(float(cv_mae.mean()), 2),
                "test_r2": round(test_r2, 4),
                "test_mae": round(test_mae, 2),
                "test_mape": round(test_mape, 2),
            }
        )

    comparison.sort(key=lambda r: r["test_r2"], reverse=True)
    best_name = comparison[0]["model"]
    best_model = fitted_models[best_name]

    importances = None
    if hasattr(best_model, "feature_importances_"):
        raw = best_model.feature_importances_
        importances = sorted(
            [{"feature": f, "importance": round(float(v), 4)} for f, v in zip(feature_columns, raw)],
            key=lambda r: r["importance"],
            reverse=True,
        )
    elif hasattr(best_model, "coef_"):
        raw = np.abs(best_model.coef_)
        total = raw.sum() or 1
        importances = sorted(
            [{"feature": f, "importance": round(float(v / total), 4)} for f, v in zip(feature_columns, raw)],
            key=lambda r: r["importance"],
            reverse=True,
        )

    return {
        "comparison": comparison,
        "best_model_name": best_name,
        "best_model": best_model,
        "feature_importances": importances,
        "test_r2": comparison[0]["test_r2"],
        "cv_r2_mean": comparison[0]["cv_r2_mean"],
    }

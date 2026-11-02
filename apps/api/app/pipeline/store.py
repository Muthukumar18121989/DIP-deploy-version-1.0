"""Disk-backed artifact store, keyed by artifact_id.

Two kinds of artifact share this store, keyed differently:
- The raw connected dataset is a **use-case-level** asset (keyed by
  use_case_id) — it doesn't change between pipeline runs.
- Everything a pipeline *run* produces (encoded features, the trained
  model, profiling/training/decisions/forecast/dashboard JSON) is an
  **experiment-level** asset (keyed by experiment_id) — every AI re-run
  gets its own immutable slot instead of overwriting the last one, which
  is what makes versioning and side-by-side comparison possible.

Persisted to disk (not just an in-memory dict) so state survives the
uvicorn --reload worker restarting mid-development. A small in-memory
cache avoids re-reading from disk on every request within a process.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.config import DATA_DIR

_CACHE: dict[str, dict[str, Any]] = {}


def artifact_dir(artifact_id: str) -> Path:
    d = DATA_DIR / artifact_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _cache(artifact_id: str) -> dict[str, Any]:
    return _CACHE.setdefault(artifact_id, {})


def save_raw_df(use_case_id: str, df: pd.DataFrame) -> None:
    df.to_parquet(artifact_dir(use_case_id) / "raw.parquet", index=False)
    _cache(use_case_id)["raw_df"] = df


def load_raw_df(use_case_id: str) -> pd.DataFrame | None:
    cached = _cache(use_case_id).get("raw_df")
    if cached is not None:
        return cached
    path = artifact_dir(use_case_id) / "raw.parquet"
    if not path.exists():
        return None
    df = pd.read_parquet(path)
    _cache(use_case_id)["raw_df"] = df
    return df


def save_encoded(experiment_id: str, encoded: pd.DataFrame, feature_columns: list[str]) -> None:
    encoded.to_parquet(artifact_dir(experiment_id) / "encoded.parquet", index=False)
    save_json(experiment_id, "feature_columns", feature_columns)
    _cache(experiment_id)["encoded"] = encoded
    _cache(experiment_id)["feature_columns"] = feature_columns


def load_encoded(experiment_id: str) -> tuple[pd.DataFrame | None, list[str] | None]:
    c = _cache(experiment_id)
    if c.get("encoded") is not None:
        return c["encoded"], c["feature_columns"]
    path = artifact_dir(experiment_id) / "encoded.parquet"
    cols = load_json(experiment_id, "feature_columns")
    if not path.exists() or cols is None:
        return None, None
    encoded = pd.read_parquet(path)
    c["encoded"] = encoded
    c["feature_columns"] = cols
    return encoded, cols


def save_model(experiment_id: str, model: Any) -> None:
    joblib.dump(model, artifact_dir(experiment_id) / "model.joblib")
    _cache(experiment_id)["model"] = model


def load_model(experiment_id: str) -> Any | None:
    cached = _cache(experiment_id).get("model")
    if cached is not None:
        return cached
    path = artifact_dir(experiment_id) / "model.joblib"
    if not path.exists():
        return None
    model = joblib.load(path)
    _cache(experiment_id)["model"] = model
    return model


def save_json(artifact_id: str, name: str, data: Any) -> None:
    path = artifact_dir(artifact_id) / f"{name}.json"
    path.write_text(json.dumps(data, default=str), encoding="utf-8")
    _cache(artifact_id)[name] = data


def load_json(artifact_id: str, name: str) -> Any | None:
    cached = _cache(artifact_id).get(name)
    if cached is not None:
        return cached
    path = artifact_dir(artifact_id) / f"{name}.json"
    if not path.exists():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    _cache(artifact_id)[name] = data
    return data


def delete_artifacts(artifact_id: str) -> None:
    """Remove an artifact directory tree entirely (used by use-case delete)."""
    import shutil

    _CACHE.pop(artifact_id, None)
    path = DATA_DIR / artifact_id
    if path.exists():
        shutil.rmtree(path)


def save_df(artifact_id: str, name: str, df: pd.DataFrame) -> None:
    """A named dataframe that isn't the pipeline's raw input (e.g. an upload
    still waiting for its columns to be mapped)."""
    df.to_parquet(artifact_dir(artifact_id) / f"{name}.parquet", index=False)


def load_df(artifact_id: str, name: str) -> pd.DataFrame | None:
    path = artifact_dir(artifact_id) / f"{name}.parquet"
    if not path.exists():
        return None
    return pd.read_parquet(path)

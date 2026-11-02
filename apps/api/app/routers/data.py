import io

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import DEMO_ROW_COUNT
from app.data_generation.sales import generate_sales_dataset, shocked_region_names
from app.db import get_db
from app.deps import get_use_case_or_404
from app.models import UseCase
from app.pipeline import store
from app.pipeline.profiling import profile_dataframe
from app.pipeline.schema import (
    ROLES,
    MappingError,
    apply_mapping,
    matches_canonical_schema,
    real_columns_frame,
    suggest_mapping,
    synthetic_meta,
)
from app.schemas import ColumnMappingIn

router = APIRouter(prefix="/api/use-cases/{use_case_id}/data", tags=["data"])


@router.post("/generate")
def generate_demo_data(
    use_case_id: str,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    df = generate_sales_dataset(n_rows=DEMO_ROW_COUNT)
    store.save_raw_df(use_case_id, df)
    store.save_json(use_case_id, "data_meta", synthetic_meta(df))
    _clear_cached_profiling(use_case_id)

    use_case.status = "data_ready"
    use_case.data_source = "synthetic"
    use_case.row_count = len(df)
    db.commit()

    return {
        "row_count": len(df),
        "columns": list(df.columns),
        "shocked_regions": shocked_region_names(),
        "message": f"Generated {len(df):,} synthetic sales transactions across 24 months, "
        f"with a realistic Q2 demand shock baked into {', '.join(shocked_region_names())}.",
    }


def _clear_cached_profiling(use_case_id: str) -> None:
    path = store.artifact_dir(use_case_id) / "profiling.json"
    if path.exists():
        path.unlink()
    store._cache(use_case_id).pop("profiling", None)


def _roles_payload() -> list[dict]:
    return [
        {k: role[k] for k in ("key", "label", "group", "kind", "help")} | {"required": bool(role.get("required"))}
        for role in ROLES
    ]


@router.post("/upload")
async def upload_csv(
    use_case_id: str,
    file: UploadFile,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    raw = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(raw))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {exc}") from exc
    if df.empty:
        raise HTTPException(status_code=400, detail="The file has no rows.")

    columns = [str(c) for c in df.columns]
    df.columns = columns
    use_case.data_source = "csv_upload"
    use_case.row_count = len(df)

    if matches_canonical_schema(columns):
        # Already in DIP's own layout: no mapping step needed.
        store.save_raw_df(use_case_id, df)
        meta = synthetic_meta(df)
        meta["available"] = [k for k in meta["available"] if k in columns]
        store.save_json(use_case_id, "data_meta", meta)
        _clear_cached_profiling(use_case_id)
        use_case.status = "data_ready"
        db.commit()
        return {
            "row_count": len(df),
            "columns": columns,
            "schema_match": True,
            "needs_mapping": False,
            "message": "Upload received. Columns match DIP's layout, so it's ready for the AI pipeline.",
        }

    store.save_df(use_case_id, "upload", df)
    use_case.status = "needs_mapping"
    db.commit()
    suggested = suggest_mapping(columns)
    return {
        "row_count": len(df),
        "columns": columns,
        "schema_match": False,
        "needs_mapping": True,
        "suggested_mapping": suggested,
        "roles": _roles_payload(),
        "message": "Upload received. Match your columns to what each one means, then confirm.",
    }


@router.get("/mapping")
def get_mapping(use_case_id: str, use_case: UseCase = Depends(get_use_case_or_404)):
    """What the mapping screen needs: the uploaded file's columns with a few
    sample values, the roles, a suggested mapping, and the saved one if any."""
    df = store.load_df(use_case_id, "upload")
    if df is None:
        raise HTTPException(status_code=404, detail="No uploaded file is waiting to be mapped.")
    meta = store.load_json(use_case_id, "data_meta") or {}
    samples = {
        col: [str(v) for v in df[col].dropna().astype(str).unique()[:3]] for col in df.columns
    }
    return {
        "columns": list(df.columns),
        "samples": samples,
        "row_count": len(df),
        "roles": _roles_payload(),
        "suggested_mapping": suggest_mapping(list(df.columns)),
        "current_mapping": meta.get("mapping") or None,
    }


@router.post("/mapping")
def save_mapping(
    use_case_id: str,
    payload: ColumnMappingIn,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    df = store.load_df(use_case_id, "upload")
    if df is None:
        raise HTTPException(status_code=404, detail="No uploaded file is waiting to be mapped.")
    try:
        canonical, meta = apply_mapping(df, {k: v for k, v in payload.mapping.items() if v})
    except MappingError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    store.save_raw_df(use_case_id, canonical)
    store.save_json(use_case_id, "data_meta", meta)
    _clear_cached_profiling(use_case_id)
    use_case.status = "data_ready"
    use_case.row_count = len(canonical)
    db.commit()

    levers = [r["label"] for r in ROLES if r["group"] == "lever" and r["key"] in meta["available"]]
    return {
        "row_count": len(canonical),
        "month_count": meta["month_count"],
        "available": meta["available"],
        "message": (
            f"Mapped {len(canonical):,} rows across {meta['month_count']} months. "
            + (f"Recommendations will test: {', '.join(levers)}." if levers else
               "No levers (price, marketing, discount, inventory) were mapped, so DIP can explain and "
               "forecast the KPI but won't suggest actions.")
        ),
    }


@router.get("/quality")
def data_quality(use_case_id: str, use_case: UseCase = Depends(get_use_case_or_404)):
    if use_case.status == "needs_mapping":
        raise HTTPException(status_code=409, detail="Map the uploaded file's columns first.")
    cached = store.load_json(use_case_id, "profiling")
    if cached:
        return cached

    df = store.load_raw_df(use_case_id)
    if df is None:
        raise HTTPException(status_code=404, detail="No data attached to this use case yet.")
    profiling = profile_dataframe(real_columns_frame(df, store.load_json(use_case_id, "data_meta")))
    store.save_json(use_case_id, "profiling", profiling)
    return profiling

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
from app.pipeline.features import REQUIRED_SALES_COLUMNS
from app.pipeline.profiling import profile_dataframe

router = APIRouter(prefix="/api/use-cases/{use_case_id}/data", tags=["data"])


@router.post("/generate")
def generate_demo_data(
    use_case_id: str,
    db: Session = Depends(get_db),
    use_case: UseCase = Depends(get_use_case_or_404),
):
    df = generate_sales_dataset(n_rows=DEMO_ROW_COUNT)
    store.save_raw_df(use_case_id, df)

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

    store.save_raw_df(use_case_id, df)
    use_case.status = "data_ready"
    use_case.data_source = "csv_upload"
    use_case.row_count = len(df)
    db.commit()

    missing = REQUIRED_SALES_COLUMNS - set(df.columns)
    schema_match = not missing

    return {
        "row_count": len(df),
        "columns": list(df.columns),
        "schema_match": schema_match,
        "message": (
            "Upload received and profiled."
            if schema_match
            else "Upload received and profiled, but this file doesn't match the Sales schema "
            "this vertical slice's ML pipeline expects, so the full AI pipeline won't be able to "
            f"run on it. Missing columns: {', '.join(sorted(missing))}. Use 'Generate Synthetic "
            "Dataset' instead to try the full pipeline."
        ),
    }


@router.get("/quality")
def data_quality(use_case_id: str, use_case: UseCase = Depends(get_use_case_or_404)):
    cached = store.load_json(use_case_id, "profiling")
    if cached:
        return cached

    df = store.load_raw_df(use_case_id)
    if df is None:
        raise HTTPException(status_code=404, detail="No data attached to this use case yet.")
    profiling = profile_dataframe(df)
    store.save_json(use_case_id, "profiling", profiling)
    return profiling

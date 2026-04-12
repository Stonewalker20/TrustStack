from fastapi import APIRouter, HTTPException

from app.schemas import StandardTestRunResponse
from app.services.standard_suite import run_standard_suite

router = APIRouter(tags=["evaluation"])


@router.post("/evaluation/standard-run", response_model=StandardTestRunResponse)
def run_standardized_evaluation():
    try:
        result = run_standard_suite()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Standardized evaluation failed: {exc}") from exc
    return StandardTestRunResponse(**result)

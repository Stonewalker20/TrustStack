from fastapi import APIRouter, HTTPException

from app.schemas import (
    StandardBatchBenchmarkResponse,
    StandardReportArtifactsRequest,
    StandardReportArtifactsResponse,
    StandardTestRunResponse,
)
from app.services.report_export import build_report_artifacts
from app.services.standard_suite import run_standard_batch_benchmark, run_standard_suite

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


@router.post("/evaluation/standard-run/report-artifacts", response_model=StandardReportArtifactsResponse)
def build_standardized_report_artifacts():
    try:
        suite = run_standard_suite()
        artifacts = build_report_artifacts(suite)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report artifact generation failed: {exc}") from exc
    return StandardReportArtifactsResponse(**artifacts)


@router.post("/evaluation/report-artifacts", response_model=StandardReportArtifactsResponse)
def export_standard_report_artifacts(request: StandardReportArtifactsRequest):
    try:
        artifacts = build_report_artifacts(request.suite)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report export failed: {exc}") from exc
    return StandardReportArtifactsResponse(**artifacts)


@router.post("/evaluation/standard-run/batch", response_model=StandardBatchBenchmarkResponse)
def run_standardized_batch_benchmark():
    try:
        result = run_standard_batch_benchmark()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Batch benchmark failed: {exc}") from exc
    return StandardBatchBenchmarkResponse(**result)

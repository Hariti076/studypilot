"""StudyPilot HTTP API."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.ml.predictor import get_model_service
from api.schemas import PlanRequest, ProfileIn
from api.services.study_plan import predict_student, schedule_plan

logger = logging.getLogger("studypilot")

DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Fail at startup if a model file is missing, not on the first student.
    get_model_service()
    yield


app = FastAPI(title="StudyPilot API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=DEV_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError):
    parts = []
    for err in exc.errors():
        loc = " ".join(str(item) for item in err.get("loc", []) if item != "body")
        message = err.get("msg", "Invalid input")
        parts.append(f"{loc}: {message}" if loc else message)
    text = "; ".join(parts) or "Invalid input"
    return JSONResponse(status_code=422, content={"detail": text, "message": text})


@app.get("/api/health")
def health():
    service = get_model_service()
    return {
        "status": "ok",
        "models": {
            "score": service.meta["best_models"]["regressor"],
            "risk": service.meta["best_models"]["classifier"],
            "persona": f"K-Means (k={service.meta['best_models']['clusters']})",
        },
    }


def _error(status: int, text: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"detail": text, "message": text})


@app.post("/api/predict")
def create_prediction(profile: ProfileIn):
    try:
        return predict_student(profile)
    except ValueError as exc:
        return _error(400, str(exc))
    except Exception:
        logger.exception("Prediction failed")
        return _error(500, "The models could not score this profile. Please try again.")


@app.post("/api/plan")
def create_plan(request: PlanRequest):
    try:
        return schedule_plan(request)
    except ValueError as exc:
        return _error(400, str(exc))
    except Exception:
        logger.exception("Study plan generation failed")
        return _error(500, "The planner could not build a week from this prediction. Please try again.")

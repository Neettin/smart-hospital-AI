from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine
from .models import Base
from .ml_loader import load_all_models
from .routes import patients, doctors, appointments
from .services.summary import generate_summary as _generate_summary
from .services.triage import predict_specialization as _predict_specialization
from .schemas import SummaryRequest, SummaryResponse, TriageRequest, TriageResponse
from fastapi import HTTPException


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    load_all_models()
    yield


app = FastAPI(
    title="Smart Hospital AI",
    description="AI-powered hospital system with Smart Triage, No-Show Prediction, and Medical Summary generation.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.vercel.app",   
        "*"                              
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)


@app.post("/generate-summary", response_model=SummaryResponse)
def generate_summary_endpoint(request: SummaryRequest):
    result = _generate_summary(request.notes)
    return result


@app.post("/predict-specialization", response_model=TriageResponse)
def predict_specialization_endpoint(request: TriageRequest):
    if not request.symptoms:
        raise HTTPException(status_code=400, detail="At least one symptom is required.")
    try:
        result = _predict_specialization(request.symptoms)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return TriageResponse(**result)


@app.get("/")
def root():
    return {"message": "Smart Hospital AI Running"}
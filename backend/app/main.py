from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import nltk

from .database import engine
from .models import Base
from .ml_loader import load_all_models
from .routes import patients, doctors, appointments
from .services.summary_service import generate_summary as _generate_summary
from .services.triage import predict_specialization as _predict_specialization
from .schemas import SummaryRequest, SummaryResponse, TriageRequest, TriageResponse


#  CREATE APP FIRST
app = FastAPI(
    title="Smart Hospital AI",
    description="AI-powered hospital system with Smart Triage, No-Show Prediction, and Medical Summary generation.",
    version="1.0.0",
    lifespan=None,
)

#  THEN startup event
@app.on_event("startup")
def startup_event():
    nltk.download("punkt")


# lifespan (optional but fine)
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    load_all_models()
    yield


# attach lifespan AFTER definition
app.router.lifespan_context = lifespan


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://smart-hospital-ai.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# routers
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)


# endpoints
@app.post("/generate-summary", response_model=SummaryResponse)
def generate_summary_endpoint(request: SummaryRequest):
    return _generate_summary(request.notes)


@app.post("/predict-specialization", response_model=TriageResponse)
def predict_specialization_endpoint(request: TriageRequest):
    if not request.symptoms:
        raise HTTPException(status_code=400, detail="At least one symptom is required.")

    result = _predict_specialization(request.symptoms)
    return TriageResponse(**result)


@app.get("/")
def root():
    return {"message": "Smart Hospital AI Running"}
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ════════════════════════════════════════════════════════════════════════════════
# Patient
# ════════════════════════════════════════════════════════════════════════════════

class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    contact: str
    chronic_conditions: Optional[str] = None
    medical_history: Optional[str] = None


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int

    class Config:
        from_attributes = True


# ════════════════════════════════════════════════════════════════════════════════
# Doctor
# ════════════════════════════════════════════════════════════════════════════════

class DoctorBase(BaseModel):
    name: str
    specialization: str
    experience_years: int
    availability_slots: str
    rating: float


class DoctorCreate(DoctorBase):
    pass


class DoctorResponse(DoctorBase):
    id: int

    class Config:
        from_attributes = True


# ════════════════════════════════════════════════════════════════════════════════
# Appointment
# ════════════════════════════════════════════════════════════════════════════════

class AppointmentBase(BaseModel):
    patient_id: int
    doctor_id: int
    reason_for_visit: str


class AppointmentCreate(AppointmentBase):
    appointment_datetime: Optional[datetime] = None


class AppointmentResponse(AppointmentBase):
    id: int
    appointment_datetime: datetime
    status: str
    no_show_probability: float

    class Config:
        from_attributes = True


# ════════════════════════════════════════════════════════════════════════════════
# ML – Triage
# ════════════════════════════════════════════════════════════════════════════════

class TriageRequest(BaseModel):
    symptoms: list[str]
    # e.g. ["fever", "cough", "fatigue", "headache"]


class TriageResponse(BaseModel):
    disease:        str
    specialization: str
    confidence:     Optional[float] = None


# ════════════════════════════════════════════════════════════════════════════════
# ML – No-Show
# ════════════════════════════════════════════════════════════════════════════════

class NoShowRequest(BaseModel):
    patient_id:           int
    appointment_datetime: datetime          # ISO format: "2025-06-15T10:30:00"
    sms_received:         int  = 0          # 0 or 1
    scholarship:          int  = 0
    hipertension:         int  = 0
    diabetes:             int  = 0
    alcoholism:           int  = 0
    handcap:              int  = 0


class NoShowResponse(BaseModel):
    patient_id:          int
    no_show_probability: float
    risk_level:          str   # Low / Medium / High
    waiting_days:        int


# ════════════════════════════════════════════════════════════════════════════════
# ML – Summary
# ════════════════════════════════════════════════════════════════════════════════

class SummaryRequest(BaseModel):
    notes: str   # raw doctor / clinical notes


class SummaryResponse(BaseModel):
    summary: str
    backend: str
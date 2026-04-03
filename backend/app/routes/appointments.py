from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.services.noshow import predict_noshow
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/appointments", tags=["appointments"])


# ── PATCH schema (all fields optional) ───────────────────────────────────────
class AppointmentUpdate(BaseModel):
    status:               Optional[str]      = None
    doctor_id:            Optional[int]      = None
    reason_for_visit:     Optional[str]      = None
    appointment_datetime: Optional[datetime] = None


# ── CREATE ────────────────────────────────────────────────────────────────────
@router.post("/", response_model=schemas.AppointmentResponse)
def create_appointment(appt: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first()
    doctor  = db.query(models.Doctor).filter(models.Doctor.id  == appt.doctor_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # use frontend-provided datetime if given, else default to tomorrow
    if hasattr(appt, 'appointment_datetime') and appt.appointment_datetime:
        appointment_datetime = appt.appointment_datetime
    else:
        appointment_datetime = datetime.now() + timedelta(days=1)

    # predict no-show probability
    try:
        noshow_input = schemas.NoShowRequest(
            patient_id=appt.patient_id,
            appointment_datetime=appointment_datetime,
        )
        noshow_result       = predict_noshow(noshow_input)
        no_show_probability = noshow_result["no_show_probability"]
    except Exception:
        no_show_probability = 0.0

    db_appt = models.Appointment(
        patient_id=appt.patient_id,
        doctor_id=appt.doctor_id,
        reason_for_visit=appt.reason_for_visit,
        appointment_datetime=appointment_datetime,
        status="scheduled",
        no_show_probability=no_show_probability,
    )
    db.add(db_appt)
    db.commit()
    db.refresh(db_appt)
    return db_appt


# ── READ ALL ──────────────────────────────────────────────────────────────────
@router.get("/", response_model=list[schemas.AppointmentResponse])
def get_appointments(db: Session = Depends(get_db)):
    return db.query(models.Appointment).all()


# ── READ ONE ──────────────────────────────────────────────────────────────────
@router.get("/{appointment_id}", response_model=schemas.AppointmentResponse)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


# ── UPDATE (PATCH — partial update) ──────────────────────────────────────────
@router.patch("/{appointment_id}", response_model=schemas.AppointmentResponse)
def update_appointment(appointment_id: int, updates: AppointmentUpdate, db: Session = Depends(get_db)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    VALID_STATUSES = {"scheduled", "ongoing", "completed", "cancelled"}

    if updates.status is not None:
        if updates.status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
        appt.status = updates.status

    if updates.doctor_id is not None:
        doctor = db.query(models.Doctor).filter(models.Doctor.id == updates.doctor_id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        appt.doctor_id = updates.doctor_id

    if updates.reason_for_visit is not None:
        appt.reason_for_visit = updates.reason_for_visit

    if updates.appointment_datetime is not None:
        appt.appointment_datetime = updates.appointment_datetime

    db.commit()
    db.refresh(appt)
    return appt


# ── DELETE ────────────────────────────────────────────────────────────────────
@router.delete("/{appointment_id}")
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appt)
    db.commit()
    return { "message": f"Appointment #{appointment_id} deleted successfully" }
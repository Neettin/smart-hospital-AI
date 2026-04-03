from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.post("/", response_model=schemas.DoctorResponse)
def create_doctor(doctor: schemas.DoctorCreate, db: Session = Depends(get_db)):
    db_doctor = models.Doctor(**doctor.dict())
    db.add(db_doctor)
    db.commit()
    db.refresh(db_doctor)
    return db_doctor


@router.get("/", response_model=list[schemas.DoctorResponse])
def get_doctors(db: Session = Depends(get_db)):
    return db.query(models.Doctor).all()


@router.get("/{doctor_id}", response_model=schemas.DoctorResponse)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.get("/specialization/{spec}", response_model=list[schemas.DoctorResponse])
def get_doctors_by_specialization(spec: str, db: Session = Depends(get_db)):
    doctors = db.query(models.Doctor).filter(
        models.Doctor.specialization.ilike(f"%{spec}%")
    ).all()
    if not doctors:
        raise HTTPException(status_code=404, detail=f"No doctors found for specialization: {spec}")
    return doctors
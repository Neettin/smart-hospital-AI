from sqlalchemy import Column, Integer, String, ForeignKey, Date, Time, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
from datetime import datetime

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    contact = Column(String)
    chronic_conditions = Column(String)
    medical_history = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    appointments = relationship("Appointment", back_populates="patient")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialization = Column(String, index=True)
    experience_years = Column(Integer)
    availability_slots = Column(String)
    rating = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    appointments = relationship("Appointment", back_populates="doctor")



class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))

    # Automatically store full timestamp
    appointment_datetime = Column(
        DateTime(timezone=True),
        default=datetime.utcnow
    )

    reason_for_visit = Column(String)

    status = Column(String, default="Pending")  # Pending / Completed / No-Show
    no_show_probability = Column(Float, default=0.0)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
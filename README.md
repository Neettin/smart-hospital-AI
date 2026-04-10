Smart Hospital AI

Smart Hospital AI is a full-stack system that helps hospitals manage patient triage, appointments, and clinical summaries using Machine Learning and NLP.

Live Demo

https://smart-hospital-ai.vercel.app

Features
Predicts the right medical specialist based on patient symptoms
Generates clinical summaries for doctors
Manages doctor appointments with availability handling
Predicts appointment no-show risk using ML
Admin dashboard to manage doctors, patients, and appointments
Tech Stack

Frontend:

Next.js
TypeScript
Tailwind CSS

Backend:

FastAPI
PostgreSQL
SQLAlchemy

Machine Learning:

Scikit-learn (Logistic Regression)
XGBoost
NLP (Sumy / Flan-T5 during development)

Deployment:

Vercel (Frontend)
Render (Backend)
Neon (Database)
API
Generate Summary

POST /generate-summary

{
  "notes": "Patient has fever and cough for 3 days..."
}
Predict Specialization

POST /predict-specialization

Project Structure
frontend/
backend/
  ├── services/
  ├── routes/
  ├── models/
  └── main.py
Author

Nitin Gupta

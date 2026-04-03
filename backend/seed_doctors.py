"""
seed_doctors.py — Inserts all doctors directly into the DB via SQLAlchemy.
NO uvicorn / backend server needed. Just run with venv active.

Usage (from the backend/ folder):
    python seed_doctors.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app.models import Base, Doctor

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

DOCTORS = [
    # ── Cardiologist ────────────────────────────────────────────────────
    {"name":"Dr. Arjun Mehta",      "specialization":"Cardiologist",                  "availability_slots":"Mon-Fri 9am-1pm",  "rating":4.9, "experience_years":18},
    {"name":"Dr. Priya Sharma",     "specialization":"Cardiologist",                  "availability_slots":"Tue-Sat 2pm-6pm",  "rating":4.8, "experience_years":14},
    {"name":"Dr. Ravi Nair",        "specialization":"Cardiologist",                  "availability_slots":"Mon-Wed 10am-4pm", "rating":4.7, "experience_years":11},

    # ── Neurologist ─────────────────────────────────────────────────────
    {"name":"Dr. Sneha Kulkarni",   "specialization":"Neurologist",                   "availability_slots":"Mon-Fri 8am-12pm", "rating":4.9, "experience_years":16},
    {"name":"Dr. Vikram Rao",       "specialization":"Neurologist",                   "availability_slots":"Wed-Sun 1pm-5pm",  "rating":4.7, "experience_years":12},
    {"name":"Dr. Ananya Desai",     "specialization":"Neurologist",                   "availability_slots":"Mon-Thu 3pm-7pm",  "rating":4.8, "experience_years":9},

    # ── Dermatologist ───────────────────────────────────────────────────
    {"name":"Dr. Pooja Iyer",       "specialization":"Dermatologist",                 "availability_slots":"Mon-Sat 10am-2pm", "rating":4.8, "experience_years":13},
    {"name":"Dr. Karan Malhotra",   "specialization":"Dermatologist",                 "availability_slots":"Tue-Fri 3pm-7pm",  "rating":4.6, "experience_years":8},

    # ── Gastroenterologist ──────────────────────────────────────────────
    {"name":"Dr. Suresh Patel",     "specialization":"Gastroenterologist",            "availability_slots":"Mon-Fri 9am-1pm",  "rating":4.8, "experience_years":17},
    {"name":"Dr. Meena Joshi",      "specialization":"Gastroenterologist",            "availability_slots":"Tue-Sat 2pm-6pm",  "rating":4.7, "experience_years":10},
    {"name":"Dr. Rahul Ghosh",      "specialization":"Gastroenterologist",            "availability_slots":"Mon-Thu 11am-3pm", "rating":4.9, "experience_years":20},

    # ── Orthopedist ─────────────────────────────────────────────────────
    {"name":"Dr. Amit Verma",       "specialization":"Orthopedist",                   "availability_slots":"Mon-Fri 8am-12pm", "rating":4.8, "experience_years":15},
    {"name":"Dr. Lakshmi Reddy",    "specialization":"Orthopedist",                   "availability_slots":"Wed-Sun 2pm-6pm",  "rating":4.7, "experience_years":11},

    # ── Pulmonologist ───────────────────────────────────────────────────
    {"name":"Dr. Sanjay Gupta",     "specialization":"Pulmonologist",                 "availability_slots":"Mon-Fri 9am-1pm",  "rating":4.8, "experience_years":14},
    {"name":"Dr. Divya Menon",      "specialization":"Pulmonologist",                 "availability_slots":"Tue-Sat 3pm-7pm",  "rating":4.7, "experience_years":9},

    # ── Endocrinologist ─────────────────────────────────────────────────
    {"name":"Dr. Neha Kapoor",      "specialization":"Endocrinologist",               "availability_slots":"Mon-Fri 10am-2pm", "rating":4.9, "experience_years":16},
    {"name":"Dr. Rajesh Singh",     "specialization":"Endocrinologist",               "availability_slots":"Mon-Thu 4pm-8pm",  "rating":4.7, "experience_years":12},

    # ── Hematologist ────────────────────────────────────────────────────
    {"name":"Dr. Sunita Shah",      "specialization":"Hematologist",                  "availability_slots":"Mon-Fri 9am-1pm",  "rating":4.8, "experience_years":13},
    {"name":"Dr. Anil Kumar",       "specialization":"Hematologist",                  "availability_slots":"Tue-Sat 2pm-5pm",  "rating":4.6, "experience_years":8},

    # ── Urologist ───────────────────────────────────────────────────────
    {"name":"Dr. Vishal Tiwari",    "specialization":"Urologist",                     "availability_slots":"Mon-Fri 8am-12pm", "rating":4.7, "experience_years":10},
    {"name":"Dr. Kavitha Nair",     "specialization":"Urologist",                     "availability_slots":"Wed-Sat 1pm-5pm",  "rating":4.8, "experience_years":14},

    # ── Nephrologist ────────────────────────────────────────────────────
    {"name":"Dr. Prakash Iyer",     "specialization":"Nephrologist",                  "availability_slots":"Mon-Fri 10am-2pm", "rating":4.8, "experience_years":15},
    {"name":"Dr. Geeta Pillai",     "specialization":"Nephrologist",                  "availability_slots":"Tue-Fri 3pm-7pm",  "rating":4.7, "experience_years":11},

    # ── Psychiatrist ────────────────────────────────────────────────────
    {"name":"Dr. Rohan Bajaj",      "specialization":"Psychiatrist",                  "availability_slots":"Mon-Sat 9am-1pm",  "rating":4.9, "experience_years":18},
    {"name":"Dr. Preethi Nambiar",  "specialization":"Psychiatrist",                  "availability_slots":"Mon-Thu 4pm-8pm",  "rating":4.8, "experience_years":13},

    # ── Infectious Disease Specialist ───────────────────────────────────
    {"name":"Dr. Sameer Khanna",    "specialization":"Infectious Disease Specialist",  "availability_slots":"Mon-Fri 9am-3pm",  "rating":4.8, "experience_years":12},
    {"name":"Dr. Tanya Bose",       "specialization":"Infectious Disease Specialist",  "availability_slots":"Tue-Sat 12pm-6pm", "rating":4.7, "experience_years":9},

    # ── General Physician ───────────────────────────────────────────────
    {"name":"Dr. Sunil Jain",       "specialization":"General Physician",             "availability_slots":"Mon-Sat 8am-8pm",  "rating":4.7, "experience_years":20},
    {"name":"Dr. Anita Soni",       "specialization":"General Physician",             "availability_slots":"Mon-Fri 9am-5pm",  "rating":4.8, "experience_years":15},
    {"name":"Dr. Manoj Shukla",     "specialization":"General Physician",             "availability_slots":"Tue-Sun 10am-4pm", "rating":4.6, "experience_years":10},

    # ── General Surgeon ─────────────────────────────────────────────────
    {"name":"Dr. Deepak Saxena",    "specialization":"General Surgeon",               "availability_slots":"Mon-Fri 7am-11am", "rating":4.8, "experience_years":16},
    {"name":"Dr. Shalini Mishra",   "specialization":"General Surgeon",               "availability_slots":"Mon-Thu 2pm-6pm",  "rating":4.7, "experience_years":11},
]


def seed():
    print("\n🏥  SmartHospital — Doctor Seed Script (Direct DB)")
    print("─" * 52)

    db = SessionLocal()
    ok = 0; skip = 0; fail = 0

    try:
        for doc in DOCTORS:
            try:
                # Skip if doctor with same name already exists
                existing = db.query(Doctor).filter(Doctor.name == doc["name"]).first()
                if existing:
                    print(f"  ⏭️   {doc['name']:<32} [already exists]")
                    skip += 1
                    continue

                db_doc = Doctor(**doc)
                db.add(db_doc)
                db.commit()
                db.refresh(db_doc)
                print(f"  ✅  {doc['name']:<32} [{doc['specialization']}]")
                ok += 1

            except Exception as e:
                db.rollback()
                print(f"  ❌  {doc['name']:<32} [ERROR] {str(e)[:80]}")
                fail += 1

    finally:
        db.close()

    print("─" * 52)
    print(f"  Done — ✅ {ok} added  |  ⏭️  {skip} skipped  |  ❌ {fail} failed\n")


if __name__ == "__main__":
    seed()
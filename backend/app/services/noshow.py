import pandas as pd
from datetime import datetime, date
from app import ml_loader

NOSHOW_FEATURES = [
    "age",
    "gender",
    "scholarship",
    "hipertension",
    "diabetes",
    "alcoholism",
    "handcap",
    "sms_received",
    "waiting_days",
    "is_same_day",
    "day_of_week",
    "prev_noshows_cumsum",
    "noshow_rate",
]


def _encode_gender(gender: str) -> int:
    return 1 if gender.strip().lower() in ("male", "m") else 0


def _waiting_days(appointment_datetime: datetime) -> int:
    appt_date = appointment_datetime.date() if isinstance(appointment_datetime, datetime) else appointment_datetime
    return max((appt_date - date.today()).days, 0)


def _day_of_week(appointment_datetime: datetime) -> int:
    return appointment_datetime.weekday() if isinstance(appointment_datetime, datetime) \
           else datetime.combine(appointment_datetime, datetime.min.time()).weekday()


def predict_noshow(
    age: int,
    gender: str,
    appointment_datetime: datetime,
    sms_received: int = 0,
    scholarship: int = 0,
    hipertension: int = 0,
    diabetes: int = 0,
    alcoholism: int = 0,
    handcap: int = 0,
) -> dict:
    if ml_loader.noshow_model is None:
        raise RuntimeError("No-show model not loaded. Call load_all_models() first.")

    waiting = _waiting_days(appointment_datetime)

    row = {
        "age": age,
        "gender": _encode_gender(gender),
        "scholarship": scholarship,
        "hipertension": hipertension,
        "diabetes": diabetes,
        "alcoholism": alcoholism,
        "handcap": handcap,
        "sms_received": sms_received,
        "waiting_days": waiting,
        "is_same_day": 1 if waiting == 0 else 0,
        "day_of_week": _day_of_week(appointment_datetime),
        "prev_noshows_cumsum": 0,   # default for new patients
        "noshow_rate": 0.0,         # default for new patients
    }
    X = pd.DataFrame([row])[NOSHOW_FEATURES]

    proba = ml_loader.noshow_model.predict_proba(X)[0][1]
    probability = round(float(proba), 4)

    if probability < 0.35:
        risk = "Low"
    elif probability < 0.65:
        risk = "Medium"
    else:
        risk = "High"

    return {
        "no_show_probability": probability,
        "risk_level": risk,
        "waiting_days": int(X["waiting_days"].iloc[0]),
    }
import joblib
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.join(BASE_DIR, "..", "ml_models")

triage_model = None
feature_columns = None
noshow_model = None


def _load(filename: str):
    path = os.path.join(ML_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Model file not found: {path}")
    return joblib.load(path)


def load_all_models():
    global triage_model, feature_columns, noshow_model

    print("Loading ML models...")

    triage_model = _load("triage_model.pkl")
    feature_columns = _load("feature_columns.pkl")
    print("Triage model loaded")

    noshow_model = _load("ultimate_noshow_model.pkl")
    print("No-show model loaded")

    print("All models ready.")
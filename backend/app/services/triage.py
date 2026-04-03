import pandas as pd
from app import ml_loader

DISEASE_TO_SPECIALIST = {
    # ── Cardiology ────────────────────────────────────────────────────────────
    "Heart attack":                               "Cardiologist",
    "Hypertension":                               "Cardiologist",
    "Coronary artery disease":                    "Cardiologist",
    "Myocardial infarction":                      "Cardiologist",
    "Artery disease":                             "Cardiologist",
    "Arterial disease":                           "Cardiologist",
    "Atherosclerosis":                            "Cardiologist",
    "Angina":                                     "Cardiologist",
    "Heart failure":                              "Cardiologist",
    "Cardiac arrhythmia":                         "Cardiologist",

    # ── Neurology ─────────────────────────────────────────────────────────────
    "Migraine":                                   "Neurologist",
    "Epilepsy":                                   "Neurologist",
    "Stroke":                                     "Neurologist",
    "Paralysis (brain hemorrhage)":               "Neurologist",
    "Parkinson's disease":                        "Neurologist",
    "Multiple sclerosis":                         "Neurologist",
    "Alzheimer's disease":                        "Neurologist",
    "Meningitis":                                 "Neurologist",

    # ── Dermatology ───────────────────────────────────────────────────────────
    "Psoriasis":                                  "Dermatologist",
    "Acne":                                       "Dermatologist",
    "Fungal infection":                           "Dermatologist",
    "Ringworm":                                   "Dermatologist",
    "Eczema":                                     "Dermatologist",
    "Impetigo":                                   "Dermatologist",

    # ── Gastroenterology ──────────────────────────────────────────────────────
    "GERD":                                       "Gastroenterologist",
    "Peptic ulcer disease":                       "Gastroenterologist",
    "Chronic cholestasis":                        "Gastroenterologist",
    "Hepatitis A":                                "Gastroenterologist",
    "Hepatitis B":                                "Gastroenterologist",
    "Hepatitis C":                                "Gastroenterologist",
    "Hepatitis D":                                "Gastroenterologist",
    "Hepatitis E":                                "Gastroenterologist",
    "Alcoholic hepatitis":                        "Gastroenterologist",
    "Jaundice":                                   "Gastroenterologist",
    "Gastroenteritis":                            "Gastroenterologist",
    "Choledocholithiasis":                        "Gastroenterologist",
    "Gallstones":                                 "Gastroenterologist",
    "Cirrhosis":                                  "Gastroenterologist",
    "Liver disease":                              "Gastroenterologist",
    "Liver cirrhosis":                            "Gastroenterologist",
    "Pancreatitis":                               "Gastroenterologist",
    "Crohn's disease":                            "Gastroenterologist",
    "Ulcerative colitis":                         "Gastroenterologist",
    "Irritable bowel syndrome":                   "Gastroenterologist",

    # ── Orthopedics ───────────────────────────────────────────────────────────
    "Osteoarthritis":                             "Orthopedist",
    "Arthritis":                                  "Orthopedist",
    "Cervical spondylosis":                       "Orthopedist",
    "Osteoporosis":                               "Orthopedist",
    "Rheumatoid arthritis":                       "Orthopedist",
    "Gout":                                       "Orthopedist",
    "Sciatica":                                   "Orthopedist",

    # ── Pulmonology ───────────────────────────────────────────────────────────
    "Pneumonia":                                  "Pulmonologist",
    "Tuberculosis":                               "Pulmonologist",
    "Bronchial Asthma":                           "Pulmonologist",
    "Chronic obstructive pulmonary disease":      "Pulmonologist",
    "Asthma":                                     "Pulmonologist",
    "Bronchitis":                                 "Pulmonologist",
    "Pleurisy":                                   "Pulmonologist",
    "Pulmonary embolism":                         "Pulmonologist",

    # ── Endocrinology ─────────────────────────────────────────────────────────
    "Diabetes":                                   "Endocrinologist",
    "Diabetes mellitus":                          "Endocrinologist",
    "Diabetes mellitus type 1":                   "Endocrinologist",
    "Diabetes mellitus type 2":                   "Endocrinologist",
    "Type 1 diabetes":                            "Endocrinologist",
    "Type 2 diabetes":                            "Endocrinologist",
    "Hypoglycemia":                               "Endocrinologist",
    "Hyperthyroidism":                            "Endocrinologist",
    "Hypothyroidism":                             "Endocrinologist",
    "Thyroid disorder":                           "Endocrinologist",
    "Cushing's syndrome":                         "Endocrinologist",
    "Addison's disease":                          "Endocrinologist",
    "Polycystic ovary syndrome":                  "Endocrinologist",

    # ── Hematology ────────────────────────────────────────────────────────────
    "Iron deficiency anemia":                     "Hematologist",
    "Pernicious anemia":                          "Hematologist",
    "Anemia":                                     "Hematologist",
    "Vitamin b12 deficiency":                     "Hematologist",
    "Vitamin B12 deficiency":                     "Hematologist",
    "Thalassemia":                                "Hematologist",
    "Aplastic anemia":                            "Hematologist",
    "Hemolytic anemia":                           "Hematologist",
    "Sickle cell anemia":                         "Hematologist",
    "Leukemia":                                   "Hematologist",
    "Lymphoma":                                   "Hematologist",

    # ── Nephrology — kidney-related anemias go HERE ───────────────────────────
    "Anemia due to chronic kidney disease":       "Nephrologist",
    "Anemia due to kidney disease":               "Nephrologist",
    "Renal anemia":                               "Nephrologist",
    "Chronic kidney disease":                     "Nephrologist",
    "Kidney disease":                             "Nephrologist",
    "Renal failure":                              "Nephrologist",
    "Acute kidney injury":                        "Nephrologist",
    "Polycystic kidney disease":                  "Nephrologist",
    "Nephrotic syndrome":                         "Nephrologist",
    "Glomerulonephritis":                         "Nephrologist",

    # ── Urology ───────────────────────────────────────────────────────────────
    "Urinary tract infection":                    "Urologist",
    "Kidney stones":                              "Urologist",
    "Benign prostatic hyperplasia":               "Urologist",
    "Prostate cancer":                            "Urologist",

    # ── Psychiatry ────────────────────────────────────────────────────────────
    "Anxiety":                                    "Psychiatrist",
    "Depression":                                 "Psychiatrist",
    "Bipolar disorder":                           "Psychiatrist",
    "Schizophrenia":                              "Psychiatrist",
    "Obsessive compulsive disorder":              "Psychiatrist",
    "Post-traumatic stress disorder":             "Psychiatrist",
    "Eating disorder":                            "Psychiatrist",

    # ── Infectious Disease ────────────────────────────────────────────────────
    "AIDS":                                       "Infectious Disease Specialist",
    "HIV":                                        "Infectious Disease Specialist",
    "Sepsis":                                     "Infectious Disease Specialist",
    "Septicemia":                                 "Infectious Disease Specialist",
    "Bacteremia":                                 "Infectious Disease Specialist",
    "sepsis":                                     "Infectious Disease Specialist",
    "septicemia":                                 "Infectious Disease Specialist",
    "Malaria":                                    "General Physician",
    "Dengue":                                     "General Physician",
    "Typhoid":                                    "General Physician",
    "Chickenpox":                                 "General Physician",
    "Common Cold":                                "General Physician",
    "Allergy":                                    "General Physician",
    "Drug Reaction":                              "General Physician",
    "Influenza":                                  "General Physician",

    # ── Surgery ───────────────────────────────────────────────────────────────
    "Dimorphic hemmorhoids(piles)":               "General Surgeon",
    "Varicose veins":                             "General Surgeon",
    "Appendicitis":                               "General Surgeon",
    "Hernia":                                     "General Surgeon",
}


def _build_symptom_vector(symptoms: list[str]) -> pd.DataFrame:
    feature_cols = ml_loader.feature_columns
    symptoms_clean = {s.strip().lower() for s in symptoms}
    row = {col: 1 if col.lower() in symptoms_clean else 0 for col in feature_cols}
    return pd.DataFrame([row])


# ── Symptom keyword override rules ───────────────────────────────────────────
# If the ML model gets confused, these rules catch common symptom patterns
# and force the correct specialist. Rules are checked AFTER ML prediction
# and only override when confidence is below threshold OR specialist is generic.

SYMPTOM_OVERRIDE_RULES = [
    # Neurology — headache-dominant patterns
    {
        "require_any": ["headache", "frontal headache"],
        "boost":       ["dizziness", "nausea", "vomiting", "disturbance of memory", "fainting"],
        "min_boost":   1,
        "specialist":  "Neurologist",
        "disease":     "Migraine",
    },
    {
        "require_any": ["seizures"],
        "boost":       [],
        "min_boost":   0,
        "specialist":  "Neurologist",
        "disease":     "Epilepsy",
    },
    # Cardiology — chest pain dominant
    {
        "require_any": ["sharp chest pain", "burning chest pain", "chest tightness"],
        "boost":       ["palpitations", "increased heart rate", "irregular heartbeat", "shortness of breath"],
        "min_boost":   1,
        "specialist":  "Cardiologist",
        "disease":     "Hypertension",
    },
    # Pulmonology — breathing dominant
    {
        "require_any": ["difficulty breathing", "shortness of breath"],
        "boost":       ["fever", "chills", "sweating", "recent weight loss", "weakness"],
        "min_boost":   2,
        "specialist":  "Pulmonologist",
        "disease":     "Tuberculosis",
    },
    # Gastroenterology — jaundice dominant
    {
        "require_any": ["jaundice"],
        "boost":       ["itching of skin", "fatigue", "decreased appetite", "nausea"],
        "min_boost":   1,
        "specialist":  "Gastroenterologist",
        "disease":     "Jaundice",
    },
    # Endocrinology — polyuria dominant
    {
        "require_any": ["polyuria", "frequent urination"],
        "boost":       ["thirst", "excessive appetite", "recent weight loss", "fatigue", "weakness"],
        "min_boost":   2,
        "specialist":  "Endocrinologist",
        "disease":     "Diabetes",
    },
    # Orthopedics — joint dominant
    {
        "require_any": ["joint pain", "joint swelling", "joint stiffness or tightness"],
        "boost":       ["knee pain", "hip pain", "muscle weakness", "back pain"],
        "min_boost":   1,
        "specialist":  "Orthopedist",
        "disease":     "Arthritis",
    },
    # Dermatology — skin dominant
    {
        "require_any": ["skin rash", "itching of skin", "acne or pimples"],
        "boost":       ["skin lesion", "skin pain", "skin swelling", "skin dryness, peeling, scaliness, or roughness"],
        "min_boost":   1,
        "specialist":  "Dermatologist",
        "disease":     "Eczema",
    },
    # Psychiatry — anxiety/insomnia dominant
    {
        "require_any": ["anxiety and nervousness", "insomnia"],
        "boost":       ["disturbance of memory", "fatigue", "weakness", "sleepiness"],
        "min_boost":   2,
        "specialist":  "Psychiatrist",
        "disease":     "Anxiety",
    },
]


def _apply_override(symptoms_set: set, ml_specialization: str, ml_confidence: float | None) -> tuple[str, str] | None:
    """
    Returns (disease, specialization) override if a rule matches, else None.
    Only overrides when ML gave a generic result OR confidence is low (<60%).
    """
    is_generic    = ml_specialization in ("General Physician", "General Surgeon")
    is_low_conf   = ml_confidence is not None and ml_confidence < 0.60

    if not (is_generic or is_low_conf):
        return None  # ML is confident and specific — trust it

    for rule in SYMPTOM_OVERRIDE_RULES:
        has_required = any(r in symptoms_set for r in rule["require_any"])
        if not has_required:
            continue
        boost_count = sum(1 for b in rule["boost"] if b in symptoms_set)
        if boost_count >= rule["min_boost"]:
            return rule["disease"], rule["specialist"]

    return None


def predict_specialization(symptoms: list[str]) -> dict:
    if ml_loader.triage_model is None:
        raise RuntimeError("Triage model not loaded. Call load_all_models() first.")

    X = _build_symptom_vector(symptoms)
    model = ml_loader.triage_model
    disease = model.predict(X)[0]

    try:
        confidence = round(float(model.predict_proba(X).max()), 4)
    except AttributeError:
        confidence = None

    # case-insensitive lookup — tries exact, then title case, then lowercase
    specialization = (
        DISEASE_TO_SPECIALIST.get(disease)
        or DISEASE_TO_SPECIALIST.get(disease.title())
        or DISEASE_TO_SPECIALIST.get(disease.lower())
        or "General Physician"
    )

    # apply override rules if ML result is generic or low confidence
    symptoms_set = {s.strip().lower() for s in symptoms}
    override = _apply_override(symptoms_set, specialization, confidence)
    if override:
        disease, specialization = override

    return {
        "disease": disease,
        "specialization": specialization,
        "confidence": confidence,
    }
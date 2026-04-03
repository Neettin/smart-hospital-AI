"""
Medical Summary Service
-----------------------
Uses google/flan-t5-base with a clinical SOAP-style prompt.
Matches the _summary_model.ipynb notebook exactly.
"""

import os
import torch
from functools import lru_cache

# Suppress HuggingFace warnings
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
from transformers.utils import logging as hf_logging
hf_logging.set_verbosity_error()

BACKEND = "flan-t5"


@lru_cache(maxsize=1)
def _load_model():
    """Load flan-t5-base once and cache — matches notebook."""
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

    model_name = "google/flan-t5-base"
    print("🔄 Loading flan-t5-base clinical model…")

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model     = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    model.eval()

    print("✅ flan-t5-base ready.")
    return tokenizer, model


def _summarize(notes: str) -> str:
    """
    Exact same prompt + generation params as the notebook.
    Output: compressed clinical summary (not full SOAP, but clinically clean).
    """
    tokenizer, model = _load_model()

    # Same prompt as notebook
    prompt = (
        "Summarize the following patient note into a SOAP format. "
        "Output in clear sections: Subjective, Objective, Assessment, Plan. "
        "Be concise and clinically accurate:\n\n" + notes
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        max_length=512,
        truncation=True,
    )

    with torch.no_grad():
        outputs = model.generate(
            inputs["input_ids"],
            max_length=150,    # slightly higher than notebook for richer output
            min_length=40,
            num_beams=6,
            length_penalty=1.0,
            no_repeat_ngram_size=2,
            early_stopping=True,
        )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def generate_summary(notes: str) -> dict:
    """
    Called by /generate-summary endpoint in main.py.

    Returns
    -------
    { "summary": str, "backend": str }
    """
    if not notes or not notes.strip():
        return {"summary": "No notes provided.", "backend": BACKEND}

    summary = _summarize(notes)
    return {"summary": summary, "backend": BACKEND}
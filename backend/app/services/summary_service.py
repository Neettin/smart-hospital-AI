"""
Medical Summary Service (FREE LSA VERSION)
Uses Sumy LSA summarizer (lightweight + Render-safe)
No ML models, no APIs, no memory crashes
"""

from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer

import nltk

# Ensure required NLTK resources (safe for Render)
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")


BACKEND = "sumy-lsa"


def _summarize(text: str) -> str:
    """
    LSA-based summarization (lightweight NLP, no transformers)
    """

    if not text or not text.strip():
        return "No notes provided."

    # Parse text
    parser = PlaintextParser.from_string(text, Tokenizer("english"))

    # Initialize summarizer
    summarizer = LsaSummarizer()

    # Number of sentences in summary (adjust if needed)
    summary_sentences = 4

    summary = summarizer(parser.document, summary_sentences)

    # Convert to string
    result = " ".join(str(sentence) for sentence in summary)

    return result if result else text[:300]


def generate_summary(notes: str) -> dict:
    """
    Fast API response wrapper
    """

    summary = _summarize(notes)

    return {
        "summary": summary,
        "backend": BACKEND
    }
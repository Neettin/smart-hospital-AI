"""
Medical Summary Service (FREE LSA VERSION)
Uses Sumy LSA summarizer (lightweight + Render-safe)
No ML models, no APIs, no memory crashes
"""

from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.lsa import LsaSummarizer

import nltk

def setup_nltk():
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt")

    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab")

setup_nltk()


BACKEND = "sumy-lsa"


def _summarize(text: str) -> str:
    if not text or not text.strip():
        return "No notes provided."

    try:
        parser = PlaintextParser.from_string(text, Tokenizer("english"))
        summarizer = LsaSummarizer()

        summary_sentences = summarizer(parser.document, 2)

        result = " ".join(str(sentence) for sentence in summary_sentences)

        return result if result else text[:300]

    except Exception as e:
        return f"Summary error: {str(e)}"


def generate_summary(notes: str) -> dict:
    """
    Fast API response wrapper
    """

    summary = _summarize(notes)

    return {
        "summary": summary,
        "backend": BACKEND
    }
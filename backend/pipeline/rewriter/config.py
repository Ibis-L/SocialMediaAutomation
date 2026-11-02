from dotenv import load_dotenv, find_dotenv
import os
from pathlib import Path

# Search parent directories for .env
load_dotenv(find_dotenv())

# Explicitly check project root and backend folder
for env_candidate in [
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",
]:
    if env_candidate.exists():
        load_dotenv(env_candidate)

DEFAULT_GROQ_API_KEY = "gsk_XXX"
DEFAULT_MODEL = "openai/gpt-oss-120b"

def clean_env_var(val):
    if not val:
        return ""
    import re
    return re.sub(r'^[\\\'"\s]+|[\\\'"\s]+$', '', str(val))

GROQ_API_KEY = clean_env_var(os.getenv("GROQ_API_KEY")) or DEFAULT_GROQ_API_KEY

MODEL = clean_env_var(os.getenv("GROQ_MODEL")) or DEFAULT_MODEL
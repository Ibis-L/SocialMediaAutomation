import hashlib
import re

def normalize_title(title: str) -> str:
    if not title:
        return ""
    # Lowercase
    title = title.lower()
    # Remove punctuation
    title = re.sub(r'[^\w\s]', '', title)
    # Collapse whitespace
    title = re.sub(r'\s+', ' ', title).strip()
    return title

def title_to_hash(title: str) -> str:
    normalized = normalize_title(title)
    if not normalized:
        return ""
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

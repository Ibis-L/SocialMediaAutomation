def chunk_text(text, max_words=800):
    paragraphs = text.split("\n")
    chunks = []
    current = []
    words = 0

    for p in paragraphs:
        p = p.strip()
        if not p:
            continue

        wc = len(p.split())

        if words + wc > max_words and current:
            chunks.append("\n\n".join(current))
            current = []
            words = 0

        current.append(p)
        words += wc

    if current:
        chunks.append("\n\n".join(current))

    return chunks
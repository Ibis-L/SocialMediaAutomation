from chunker import chunk_text

from rewriter import rewrite_chunk, generate_metadata


def rewrite_article(text, style):

    chunks = chunk_text(text)

    rewritten = []

    for chunk in chunks:
        if not chunk.strip():
            continue
        print("Rewriting chunk...")
        rewritten.append(rewrite_chunk(chunk, style))

    return "\n\n".join(rewritten)


if __name__ == "__main__":

    with open("C:/Users/acer/OneDrive/Desktop/mediatechtemple/Mediatech/news-portal/pipeline/rewriter/article.txt", encoding="utf8") as f:
        article = f.read()

    output = rewrite_article(article, "humanized")

    with open("C:/Users/acer/OneDrive/Desktop/mediatechtemple/Mediatech/news-portal/pipeline/rewriter/output.txt", "w", encoding="utf8") as f:
        f.write(output)
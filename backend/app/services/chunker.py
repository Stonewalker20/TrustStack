def _chunk_text(text: str, chunk_size: int = 1200, overlap: int = 200) -> list[str]:
    text = " ".join(text.split())
    if not text:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks


def chunk_pages(pages: list[dict], filename: str) -> list[dict]:
    all_chunks: list[dict] = []
    for page in pages:
        page_num = page.get("page_num")
        for piece in _chunk_text(page.get("text", "")):
            all_chunks.append({"filename": filename, "page_num": page_num, "text": piece})
    return all_chunks

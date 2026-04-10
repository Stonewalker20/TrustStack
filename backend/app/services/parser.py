from pathlib import Path

from docx import Document as DocxDocument
from pypdf import PdfReader


def parse_pdf(path: Path) -> list[dict]:
    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            pages.append({"page_num": i, "text": text})
    return pages


def parse_docx(path: Path) -> list[dict]:
    doc = DocxDocument(str(path))
    text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    return [{"page_num": None, "text": text}] if text.strip() else []


def parse_txt(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    return [{"page_num": None, "text": text}] if text.strip() else []


def parse_uploaded_file(path: Path) -> list[dict]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return parse_pdf(path)
    if suffix == ".docx":
        return parse_docx(path)
    if suffix in {".txt", ".md"}:
        return parse_txt(path)
    raise ValueError(f"Unsupported file type: {suffix}")

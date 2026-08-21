import fitz  # PyMuPDF


def parse_pdf(file_path: str) -> str:
    """Extract text from a PDF file."""
    text = []
    try:
        doc = fitz.open(file_path)
        for page in doc:
            text.append(page.get_text("text"))
        doc.close()
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {e}")
    return "\n".join(text)

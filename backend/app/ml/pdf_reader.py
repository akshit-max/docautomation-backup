import fitz
import os
import tempfile
from app.ml.ocr_service import extract_text_from_image

def extract_text_from_pdf (pdf_path:str)->str:
    """
    Reads every page of a PDF and extracts all text.
    Uses PyMuPDF(fitz) - works on text-based and most scanned PDFs.

    Args:
    pdf_path: path to the uploaded PDF file

    Returns:
    Full extracted text as a single string
    """

    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    
    doc = fitz.open(pdf_path)
    text = ""

    try:
        for page_index in range(len(doc)):
            page_num = page_index + 1
            page = doc[page_index]
            page_text = str(page.get_text("text"))
            
            if not page_text.strip():
                # Fallback to OCR for scanned pages
                pix = page.get_pixmap(dpi=200)
                img_path = os.path.join(tempfile.gettempdir(), f"page_{page_num}.png")
                pix.save(img_path)
                try:
                    page_text = extract_text_from_image(img_path)
                finally:
                    if os.path.exists(img_path):
                        os.remove(img_path)
                        
            if page_text.strip():
                text += f"\n--- Page {page_num} ---\n{page_text}"
    finally:
        doc.close()

    cleaned = text.strip()

    if not cleaned:
        raise ValueError(
            "No text extracted from PDF. "
            "The PDF may be image-only - try uploading a JPG/PNG instead."
        )
    return cleaned

def get_pdf_metadata(pdf_path:str)->dict:
    """
    Returns page count and basic PDF metadata.
    """
    doc = fitz.open(pdf_path)
    metadata = doc.metadata or {}
    meta = {
        "page_count": doc.page_count,
        "title": metadata.get("title", ""),
        "author": metadata.get("author", ""),
    }
    doc.close()
    return meta

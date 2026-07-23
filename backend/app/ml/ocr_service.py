from PIL import Image
import os


def extract_text_from_image(image_path: str) -> str:
    """
    Tesseract OCR for image uploads only.
    NOT called for PDFs — PDFs use pdf_reader.py instead.
    """
    import pytesseract
    from app.config.settings import settings

    # Set tesseract path only on Windows
    if settings.tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = settings.tesseract_cmd

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"File not found: {image_path}")

    ext = image_path.rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "tiff", "bmp", "webp"):
        return f"Unsupported image type: {ext}"

    try:
        image = Image.open(image_path).convert("L")
        text  = pytesseract.image_to_string(image, lang="eng")
        return text.strip()
    except pytesseract.TesseractNotFoundError:
        raise RuntimeError(
            f"Tesseract not found at: {settings.tesseract_cmd}\n"
            "Install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki\n"
            "Default Windows path: C:\\Program Files\\Tesseract-OCR\\tesseract.exe\n"
            "Then update TESSERACT_CMD in your .env file."
        )
    except Exception as e:
        return f"OCR failed: {str(e)}"

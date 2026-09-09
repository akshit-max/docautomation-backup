import fitz
import os

uploads_dir = r"..\backend\uploads"
for filename in os.listdir(uploads_dir):
    if filename.endswith(".pdf"):
        path = os.path.join(uploads_dir, filename)
        doc = fitz.open(path)
        text = doc[0].get_text("text")
        if "Subtotal" in text or "FRONTEND" in text or "Unit Price" in text:
            print(f"FOUND INVOICE: {filename}")
            break

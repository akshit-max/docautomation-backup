from fastapi import APIRouter, UploadFile, File, HTTPException
from app.ml.pdf_reader import extract_text_from_pdf
import shutil, os, uuid

router = APIRouter()

PDF_TYPES   = {"application/pdf"}
IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/tiff", "image/bmp"}
ALL_ALLOWED = PDF_TYPES | IMAGE_TYPES
MAX_SIZE_MB = 20

@router.post("/extract")
async def extract_file(file: UploadFile = File(...)):
    import traceback
    try:
        if file.content_type not in ALL_ALLOWED:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: '{file.content_type}'. Upload a PDF or image."
            )

        safe_filename = file.filename or "unknown.pdf"
        ext       = safe_filename.rsplit(".", 1)[-1].lower() if "." in safe_filename else "pdf"
        filename  = f"{uuid.uuid4()}.{ext}"
        save_path = os.path.join("./uploads", filename)

        os.makedirs("./uploads", exist_ok=True)
        with open(save_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        size_mb = os.path.getsize(save_path) / (1024 * 1024)
        if size_mb > MAX_SIZE_MB:
            os.remove(save_path)
            raise HTTPException(
                status_code=413,
                detail=f"File too large: {size_mb:.1f}MB. Maximum is {MAX_SIZE_MB}MB."
            )

        try:
            if file.content_type in PDF_TYPES:
                extracted_text = extract_text_from_pdf(save_path)
            else:
                from app.ml.ocr_service import extract_text_from_image
                extracted_text = extract_text_from_image(save_path)

        except Exception as e:
            if os.path.exists(save_path):
                os.remove(save_path)
            raise HTTPException(
                status_code=422,
                detail=f"Text extraction failed: {str(e)}"
            )
        finally:
            # Cleanup uploaded file after extraction
            if os.path.exists(save_path):
                os.remove(save_path)

        if not extracted_text.strip():
            raise HTTPException(
                status_code=422,
                detail="Could not extract text. Try a text-based PDF."
            )

        return {
            "extracted_text": extracted_text,
            "char_count": len(extracted_text)
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        err_detail = f"Python unhandled error: {str(e)}\n{traceback.format_exc()}"
        print(err_detail)
        raise HTTPException(status_code=500, detail=err_detail)

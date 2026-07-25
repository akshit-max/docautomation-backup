from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ── Tesseract ─────────────────────────────────────────────────────
    # Windows path to tesseract.exe
    # Mac/Linux: leave as empty string — tesseract is found automatically
    # tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    tesseract_cmd: str = ""
    
    # ── CORS ──────────────────────────────────────────────────────────
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

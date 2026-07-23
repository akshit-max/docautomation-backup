from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    
    OPENROUTER_API_KEY: str
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_SITE_URL: str = "http://localhost:5173"
    OPENROUTER_SITE_NAME: str = "Doc Automation"
    
    # Primary — best JSON accuracy
    # LLM_MODEL: str = "meta-llama/llama-3.3-70b-instruct:free"
    LLM_MODEL : str = "openai/gpt-oss-20b:free"
    CLASSIFIER_MODEL: str = "openai/gpt-oss-20b:free"

# Fallback — agar primary slow ho
# LLM_MODEL_FALLBACK=meta-llama/llama-4-maverick:free

    # ── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./docautomation.db"

    # ── File paths ────────────────────────────────────────────────────
    output_path:  str = "./output"
    upload_path:  str = "./uploads"

    # ── Tesseract ─────────────────────────────────────────────────────
    # Windows path to tesseract.exe
    # Mac/Linux: leave as empty string — tesseract is found automatically
    # tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    tesseract_cmd: str = ""
    # ── Server ────────────────────────────────────────────────────────
    port: int = 8000

    class Config:
        env_file = ".env"

settings = Settings()

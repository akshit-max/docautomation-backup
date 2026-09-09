from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import extract
import os

app = FastAPI(
    title="MakeWithUs — OCR Microservice",
    description="Python OCR microservice for extracting text from PDFs and images.",
    version="3.0.0"
)

# ── CORS ──────────────────────────────────────────────────────────────────
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("./uploads", exist_ok=True)

# ── Health Check ──────────────────────────────────────────────────────────
@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "makewithus-ocr", "version": "3.0.0"}

app.include_router(extract.router, prefix="", tags=["Extract"])
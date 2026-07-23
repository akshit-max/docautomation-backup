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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Internal microservice or behind firewall, but allow all for simplicity in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("./uploads", exist_ok=True)

app.include_router(extract.router, prefix="", tags=["Extract"])
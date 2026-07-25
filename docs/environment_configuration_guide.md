# Environment Configuration Audit & Deployment Checklist

This document provides a comprehensive audit of all environment variables actively referenced in the codebase, categorizing them by environment requirements and identifying unused or legacy variables.

## 1. Required for Local Development

To successfully run the project locally, you only need the following variables in `web/.env.local`:

- **Firebase (Database & Storage)**
  - `FIREBASE_PROJECT_ID=<your-project-id>`
  - `FIREBASE_CLIENT_EMAIL=<your-client-email>`
  - `FIREBASE_PVT_KEY=<your-private-key>`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<your-storage-bucket>`
  *Why:* The Next.js API routes use the Firebase Admin SDK to perform all CRUD operations on documents, track batch progress, and store file metadata.

- **AI Service (OpenRouter)**
  - `OPENROUTER_API_KEY=<your-api-key>`
  *Why:* Required for document classification, JSON generation, and the interactive document chat.

- **Storage Provider**
  - `STORAGE_PROVIDER="local"`
  *Why:* By defaulting to local, you avoid needing Cloudinary credentials for local development. *(Note: Batch processing is unsupported with the local provider and will fail fast).*

## 2. Required for Production Deployment

### Required Secrets
- `FIREBASE_PVT_KEY=<your-private-key>` (Ensure newlines `\n` are handled correctly by your hosting provider)
- `FIREBASE_CLIENT_EMAIL=<your-client-email>`
- `OPENROUTER_API_KEY=<your-api-key>`
- `CLOUDINARY_API_KEY=<your-api-key>`
- `CLOUDINARY_API_SECRET=<your-api-secret>`
- `INTERNAL_API_SECRET=<your-api-secret>` (Required to secure `/api` endpoints against unauthorized server-to-server invocations, e.g., external cron jobs).

### Required Public Variables
- `FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `CLOUDINARY_CLOUD_NAME`
- `STORAGE_PROVIDER="cloudinary"` (Mandatory in production for batch staging support)
- `ALLOWED_ORIGINS` (In the Python backend, to restrict CORS to your Next.js domain)

### Optional / Recommended Variables
- `PYTHON_OCR_URL`: Recommended if your Python microservice is hosted on a separate domain (e.g., Render, Railway) rather than localhost.
- `LLM_MODEL`: Optional. Defaults to `openai/gpt-oss-20b:free`.
- `NEXT_PUBLIC_API_URL`: Optional. Defaults to `/api`.

### Variables that must differ between Dev and Prod
- `STORAGE_PROVIDER`: `local` in dev, `cloudinary` in prod.
- `ALLOWED_ORIGINS`: `http://localhost:3000` in dev, `https://your-domain.com` in prod.
- `PYTHON_OCR_URL`: `http://localhost:8000/ocr` in dev, `https://ocr.your-domain.com/ocr` in prod.

## 3. Currently Unused Variables

The following variables are defined in the Python backend (`backend/app/config/settings.py`) but are **never read** by the active codebase. They belong to legacy features prior to the Next.js architectural shift and **have safely been deleted**:

- `OPENROUTER_API_KEY=<your-api-key>` (in Python)
- `OPENROUTER_BASE_URL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_SITE_NAME`
- `LLM_MODEL` (in Python)
- `CLASSIFIER_MODEL`
- `DATABASE_URL` (SQLite is no longer used)
- `output_path`
- `upload_path`
- `port`

## 4. Missing Variables

No undocumented variables were found. The codebase gracefully falls back to default values for optional variables (e.g., `LLM_MODEL`, `PYTHON_OCR_URL`).

## 5. Incorrect Variables

- **Duplication:** `OPENROUTER_API_KEY=<your-api-key>` and `LLM_MODEL` were historically duplicated in both the Next.js and Python environments. Since Python is now strictly an OCR microservice, the Python copies are obsolete.
- **Action:** All AI and DB related variables have been removed from `backend/app/config/settings.py` to prevent confusion.

## 6. Security Audit

- **Safe:** `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is the only variable prefixed with `NEXT_PUBLIC_`. This is safe as bucket names are public identifiers in Firebase.
- **Risk:** `FIREBASE_PVT_KEY=<your-private-key>` is a highly sensitive secret. Ensure it is injected securely via Vercel/Render environment settings and never committed to source control.
- **Risk:** `INTERNAL_API_SECRET=<your-api-secret>` must be set in production to prevent arbitrary external hosts from triggering your API routes.

## 7. Deliverables

Clean, heavily commented `.env.example` files have been written directly to the filesystem at:
- `web/.env.example`
- `backend/.env.example`

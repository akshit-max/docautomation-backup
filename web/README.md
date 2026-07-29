# DocAutomation Platform

DocAutomation is an intelligent platform that ingests unstructured documents (PDFs, images) and extracts structured data using OCR and AI.

## Core Features
- **OCR & Extraction**: Uses Python microservices for OCR and OpenRouter LLMs for structured data extraction.
- **Document Management**: Editor with PDF preview, direct edits, and AI Chat for document interrogation.
- **Advanced Export**: Export documents to PDF, JSON, CSV, and Excel seamlessly.
- **Version History**: Full rollback capabilities for any changes made to documents.
- **Batch Processing**: Upload and process up to 10 documents simultaneously in the background.
- **Analytics & Activity**: Dashboard metrics and real-time activity tracking for auditing.

## Architecture
This project is built using a strict **Service Layer** architecture.
- **Frontend/API**: Next.js 14 App Router, React, TypeScript.
- **Database**: Firebase / Firestore
- **Storage**: Cloudinary
- **AI**: OpenRouter (GPT-4o / open-source alternatives)
- **OCR**: Python (FastAPI + PyMuPDF/Tesseract)

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed technical overview.

## Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive setup and deployment instructions.

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with the required API keys (see `DEPLOYMENT.md`).

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser.

<!-- Deployment test trigger -->

# DocAutomation - Deployment Guide

This guide outlines how to deploy the DocAutomation platform for production.

## Prerequisites
- **Node.js**: v18 or newer
- **Firebase Project**: Firestore and Firebase Admin SDK credentials
- **Cloudinary Account**: For cloud file storage
- **OpenRouter API Key**: For LLM processing
- **Python OCR Service**: A running instance of the Python OCR microservice

## Environment Variables
Create a `.env.local` (or configure these in your deployment platform):

```env
# Firebase Admin
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="your-client-email"
FIREBASE_PVT_KEY="your-private-key"

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="your-cloud"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# LLM Generation
OPENROUTER_API_KEY="your-openrouter-key"
LLM_MODEL="openai/gpt-4o-mini" # or preferred model

# Python OCR
PYTHON_OCR_URL="http://your-ocr-service/ocr"
```

## Option 1: Vercel (Recommended)
Since this is a Next.js (App Router) application, Vercel is the most native deployment platform.
1. Connect your GitHub repository to Vercel.
2. Add all the Environment Variables in the Vercel dashboard.
3. Deploy! Vercel will automatically run `npm run build` and provision serverless functions for the API routes.

## Option 2: Node.js Server (Docker/VM)
If you need to deploy this to a private cloud (AWS EC2, DigitalOcean):
1. Clone the repository.
2. Run `npm install`.
3. Build the application: `npm run build`.
4. Start the production server: `npm run start`.

To keep the process running, it is recommended to use PM2 or Docker:
```bash
pm2 start npm --name "docautomation" -- start
```

## Scaling Considerations
- **API Routes**: API routes handle LLM stream processing and OCR pass-through. Ensure Vercel function timeouts are increased if using large LLMs, as the default is 10s.
- **Storage**: Cloudinary acts as the cold storage for PDFs. No local disk is strictly required, allowing seamless horizontal scaling of the Node process.

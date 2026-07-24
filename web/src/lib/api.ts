import axios from "axios";

// ── Base config ───────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || '/api';

// Axios instance with default headers + timeout
const client = axios.create({
  baseURL: API,
  timeout: 120000, // 120s — AI generation can take a long time on free tier models
  headers: {
    "Content-Type": "application/json",
    // No shared secret here — browser requests are same-origin and allowed
    // by middleware without a secret. The secret is server-side only.
  },
});

export const createDocument = (templateType: string) =>
  client.post("/doc/create", { template_type: templateType });

// ── Request interceptor — log in development ──────────────────────────────
client.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — normalize errors ───────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Something went wrong. Please try again.";

    // Attach a clean message to the error
    error.friendlyMessage = message;
    return Promise.reject(error);
  }
);

// ══════════════════════════════════════════════════════════════════════════
// UPLOAD
// ══════════════════════════════════════════════════════════════════════════

export const uploadPDF = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return client.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000, // 90s for file upload and OCR
  });
};

// ══════════════════════════════════════════════════════════════════════════
// GENERATE
// ══════════════════════════════════════════════════════════════════════════

export const generateDoc = async (rawText: string, templateType?: string) => {
  return client.post("/generate", {
    raw_input: rawText,
    template_type: templateType,
  });
};

export const listTemplateTypes = () =>
  client.get("/templates");

// ══════════════════════════════════════════════════════════════════════════
// DOCUMENTS — CRUD
// ══════════════════════════════════════════════════════════════════════════

export const getDocument = (docId: string) =>
  client.get(`/doc/${docId}`);

export const updateDocument = (docId: string, content: any) =>
  client.put(`/doc/${docId}`, { content });

export const listDocuments = () =>
  client.get("/documents");

export const deleteDocument = (docId: string) =>
  client.delete(`/doc/${docId}`);

// ══════════════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════════════

export const previewUrl = (docId: string) =>
  `${API}/doc/${docId}/preview`;

export const editUrl = (docId: string) =>
  typeof window !== 'undefined' ? `${window.location.origin}/doc/${docId}` : `/doc/${docId}`;

export const refillDocument = (docId: string, prompt: string) =>
  client.post(`/doc/${docId}/refill`, { prompt });

export const translateDocument = (docId: string, language: string) =>
  client.post(`/doc/${docId}/translate`, { language });

export const checkHealth = () =>
  axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/`, { timeout: 5000 });

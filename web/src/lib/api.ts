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
    timeout: 90000,
  });
};

// ══════════════════════════════════════════════════════════════════════════
// BATCH UPLOAD (Phase 9)
// ══════════════════════════════════════════════════════════════════════════

export const createBatch = (totalDocuments: number, templateType: string = "auto") => {
  return client.post("/batch/create", { totalDocuments, template_type: templateType });
};

export const uploadBatchFile = (batchId: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  // Using a short timeout because this only uploads to staging and creates a task
  return client.post(`/batch/${batchId}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });
};

export const getBatch = (batchId: string) => {
  return client.get(`/batch/${batchId}`);
};

export const cancelBatch = (batchId: string) => {
  return client.post(`/batch/${batchId}/cancel`);
};

// ══════════════════════════════════════════════════════════════════════════
// GENERATE
// ══════════════════════════════════════════════════════════════════════════

export const generateDoc = async (rawText: string, templateType?: string, sourceFile?: any) => {
  return client.post("/generate", {
    raw_input: rawText,
    template_type: templateType,
    source_file: sourceFile
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

export const listDocuments = (params?: Record<string, string | number | undefined>) => {
  let queryStr = "";
  if (params) {
    const definedParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== "")
    );
    queryStr = "?" + new URLSearchParams(definedParams as any).toString();
  }
  return client.get(`/documents${queryStr}`);
};

export const deleteDocument = (docId: string) =>
  client.delete(`/doc/${docId}`);

export const exportDocument = async (id: string, format = "pdf", type = "document") => {
  return client.post(`/documents/${id}/export`, { format, type }, { responseType: "blob" });
};

// ══════════════════════════════════════════════════════════════════════════
// VERSIONS
// ══════════════════════════════════════════════════════════════════════════

export const getVersions = async (id: string) => {
  return client.get(`/doc/${id}/versions`);
};

export const getVersion = async (id: string, versionId: string) => {
  return client.get(`/doc/${id}/versions/${versionId}`);
};

export const saveVersion = async (id: string, reason?: string) => {
  return client.post(`/doc/${id}/versions`, { reason });
};

export const restoreVersion = async (id: string, versionId: string) => {
  return client.post(`/doc/${id}/restore`, { versionId });
};

// ══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════

export const getAnalytics = async () => {
  return client.get('/analytics');
};

// ══════════════════════════════════════════════════════════════════════════
// ACTIVITY
// ══════════════════════════════════════════════════════════════════════════

export const getActivities = async (limit: number = 20) => {
  return client.get(`/activity?limit=${limit}`);
};

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

export const summarizeDocument = (docId: string) =>
  client.post(`/doc/${docId}/summary`);

export const checkHealth = () =>
  axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/`, { timeout: 5000 });

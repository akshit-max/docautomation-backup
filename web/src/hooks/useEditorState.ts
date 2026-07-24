import { useState, useEffect } from "react";
import { getDocument, updateDocument, refillDocument } from "@/lib/api";

// Returns the URL for the server-side preview route.
// The preview route reads current Firestore content and renders fresh HTML —
// never relies on the stale html_content field stored in Firestore.
export function previewRouteUrl(id: string) {
  return `/api/doc/${id}/preview`;
}

function getBlankContent(type: string) {
  switch (type) {
    case "receipt_template":
      return {
        receipt_number: "",
        date: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
        for_service: "",
        payment_mode: "",
        client_name: "",
        client_phone: "",
        amount_received: "",
        amount_in_words: "",
        balance: "",
        line_items: [],
        subtotal: "0",
        gst_percent: 0,
        gst_amount: "0",
        total: "0",
        payment_status: "",
        paid_on: "",
        bank_name: "",
        upi_phone: "",
        upi_id: "",
      };
    case "client_doc":
      return {
        client_name: "",
        client_organisation: "",
        client_place: "",
        date: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
        sender_name: "",
        sender_designation: "",
        body_paragraphs: [],
        quotation_number: "",
        project_name: "",
        line_items: [],
        gst_percent: 0,
        gst_amount: "0",
        subtotal: "0",
        total: "0",
      };
    case "compliance":
      return {
        client_name: "",
        client_designation: "Client Representative",
        provider_name: "MAKEWITHUS PVT LTD",
        provider_role: "Authorized Representative",
        company_phone: "+91 88385 14202",
        company_email: "contact@makewithus.in",
        company_website: "makewithus.in",
      };
    case "invoice":
      return {
        invoice_number: "",
        date: new Date().toLocaleDateString("en-GB").replace(/\//g, "-"),
        project_name: "",
        client_name: "",
        client_phone: "",
        client_email: "",
        client_address: "",
        project_description: "",
        line_items: [],
        gst_percent: 0,
        gst_amount: "0",
        subtotal: "0",
        total: "0",
        payment_status: "",
        payment_date: "",
        due_date: "",
        bank_name: "",
        account_name: "",
        upi_phone: "",
        upi_id: "",
        notes: "",
      };
    case "timeline":
      return {
        project_name: "",
        project_description: "",
        client_name: "",
        timeline_items: [],
        total_time: "",
        expected_dev_time: "",
        expected_closure: "",
        closure_date: "",
      };
    default:
      return {};
  }
}

export function useEditorState(id: string) {
  const [doc, setDoc] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  // previewKey is incremented after every save/refill to force the iframe
  // to re-fetch from /api/doc/[id]/preview, always showing fresh content.
  const [previewKey, setPreviewKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    getDocument(id)
      .then((res) => {
        setDoc(res.data);

        const blank = getBlankContent(res.data.template_type);
        const backendContent = res.data.content || {};

        if (res.data.template_type === "invoice") {
          blank.invoice_number = backendContent.invoice_number || "";
          blank.date = backendContent.date || blank.date;
        }
        if (res.data.template_type === "receipt_template") {
          blank.receipt_number = backendContent.receipt_number || "";
          blank.date = backendContent.date || blank.date;
        }

        const merged = { ...blank, ...backendContent };
        setContent(merged);
        
        // Mark as hydrated without immediately triggering an auto-save API call
        setHasHydrated(true);
      })
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [id]);

  const updateField = (key: string, val: any) => {
    setContent((p: any) => ({ ...p, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!hasHydrated || !content) return;
    setSaving(true);
    try {
      await updateDocument(id, content);
      setPreviewKey((k) => k + 1); // bump → iframe re-fetches /preview
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (!hasHydrated || !content || !dirty) return;

    const timer = setTimeout(async () => {
      try {
        await updateDocument(id, content);
        setPreviewKey((k) => k + 1);
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch {
        // Restore dirty so Save button reappears — do not silently swallow data loss
        setDirty(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [content, dirty, id, hasHydrated]);

  const handleAIAction = async (actionPromise: Promise<any>) => {
    try {
      const res = await actionPromise;
      const gc =
        res.data.content ||
        res.data.document?.content ||
        res.data.data?.content ||
        res.data;
      if (!gc || typeof gc !== "object") throw new Error("No content returned");

      setContent(gc);
      await updateDocument(id, gc);
      setPreviewKey((k) => k + 1); // refresh preview after AI fill
      setDirty(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || err.message || "Generation failed");
      throw err;
    }
  };

  const handleRefill = (prompt: string) => {
    return handleAIAction(refillDocument(id, prompt));
  };

  return {
    doc,
    content,
    previewKey,   // pass to editor — used as iframe key to force reload
    loading,
    saving,
    saved,
    dirty,
    updateField,
    handleSave,
    handleRefill,
  };
}

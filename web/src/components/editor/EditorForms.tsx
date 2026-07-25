import React, { useState, useEffect } from "react";
import Field, { SectionLabel } from "./Field";

function numberToWordsIndian(num: number | string) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  };

  const threeDigits = (n: number): string => {
    if (n > 99) {
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
    }
    return twoDigits(n);
  };

  let n = Math.floor(Number(num) || 0);
  if (n <= 0) return "";

  const crore    = Math.floor(n / 10000000); n %= 10000000;
  const lakh     = Math.floor(n / 100000);   n %= 100000;
  const thousand = Math.floor(n / 1000);     n %= 1000;
  const hundred  = n;

  let str = "";
  if (crore)    str += threeDigits(crore) + " Crore ";
  if (lakh)     str += threeDigits(lakh) + " Lakh ";
  if (thousand) str += threeDigits(thousand) + " Thousand ";
  if (hundred)  str += threeDigits(hundred);

  return str.trim();
}

export function ReceiptFields({ content, update }: { content: any, update: (k: string, v: any) => void }) {
  const [gstEnabled, setGstEnabled] = useState(parseFloat(content.gst_percent) > 0);

  useEffect(() => {
    const raw = String(content.amount_received || "").replace(/[₹,\s]/g, "");
    const amt = parseFloat(raw);
    if (amt > 0) {
      const words = numberToWordsIndian(amt);
      update("amount_in_words", `${words} only`);
    } else {
      update("amount_in_words", "");
    }
  }, [content.amount_received]);

  useEffect(() => {
    const parseAmt = (val: any) => {
      if (!val) return 0;
      return parseFloat(String(val).replace(/[₹,\s]/g, "")) || 0;
    };

    let baseAmount = 0;
    if (content.line_items && content.line_items.length > 0) {
      baseAmount = content.line_items.reduce((sum: number, item: any) => sum + parseAmt(item.amount), 0);
    } else if (content.amount_received) {
      baseAmount = parseAmt(content.amount_received);
    } else {
      baseAmount = parseAmt(content.subtotal);
    }

    const gstPercentNum = gstEnabled ? parseAmt(content.gst_percent) : 0;
    const gstAmt = (baseAmount * gstPercentNum) / 100;
    const total = baseAmount + gstAmt;

    const fmt = (n: number) => n > 0 ? `₹${n.toLocaleString("en-IN")}` : "0";

    update("subtotal", fmt(baseAmount));
    update("gst_amount", gstEnabled && gstPercentNum > 0 ? fmt(gstAmt) : "0");
    update("total", fmt(total));
  }, [content.line_items, content.amount_received, content.gst_percent, gstEnabled]);

  const updateItem = (i: number, key: string, val: any) => {
    const updated = [...(content.line_items || [])];
    updated[i] = { ...updated[i], [key]: val };

    if (key === "hours" || key === "unit_price") {
      const h = updated[i].hours;
      const u = updated[i].unit_price;
      if (h !== undefined && h !== "" && u !== undefined && u !== "") {
        updated[i].amount = (parseFloat(h) || 0) * (parseFloat(u) || 0);
      }
    }

    update("line_items", updated);
  };

  const addItem = () =>
    update("line_items", [
      ...(content.line_items || []),
      { description: "", hours: "", unit_price: "", amount: "" }
    ]);

  const removeItem = (i: number) =>
    update("line_items", (content.line_items || []).filter((_: any, idx: number) => idx !== i));

  return (
    <div style={f.wrap}>
      <SectionLabel>Receipt Info</SectionLabel>
      <Field label="Receipt number" value={content.receipt_number} onChange={v => update("receipt_number", v)} required />
      <Field label="Date"           value={content.date}           onChange={v => update("date", v)} required />
      <Field label="For service"    value={content.for_service}    onChange={v => update("for_service", v)} required />
      <Field label="Payment mode"   value={content.payment_mode}   onChange={v => update("payment_mode", v)} />

      <SectionLabel>Received From</SectionLabel>
      <Field label="Client name"    value={content.client_name}    onChange={v => update("client_name", v)} required />
      <Field label="Client phone"   value={content.client_phone}   onChange={v => update("client_phone", v)} />

      <SectionLabel>Payment</SectionLabel>
      <Field label="Amount received"  value={content.amount_received}  onChange={v => update("amount_received", v)} required />
      <Field label="Amount in words"  value={content.amount_in_words}  onChange={v => update("amount_in_words", v)} />
      <Field label="Balance"          value={content.balance}          onChange={v => update("balance", v)} />

      <SectionLabel>Line items</SectionLabel>
      {(content.line_items || []).map((item: any, i: number) => (
        <div key={i} style={f.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>Item {i + 1}</span>
            <button style={f.removeBtn} onClick={() => removeItem(i)}>✕ Remove</button>
          </div>
          <Field label="Description" value={item.description} onChange={v => updateItem(i, "description", v)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6 }}>
            {["hours", "unit_price", "amount"].map(key => (
              <div key={key} style={f.group}>
                <div style={f.label}>{key.replace("_", " ")}</div>
                <input
                  style={f.input as React.CSSProperties}
                  value={item[key] || ""}
                  onChange={e => updateItem(i, key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button style={f.addBtn} onClick={addItem}>+ Add line item</button>

      <div style={gstToggleWrap}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>Enable GST</span>
        <button
          style={{
            ...gstToggleBtn,
            background: gstEnabled ? "#111" : "#e0e0e0",
            color:      gstEnabled ? "#fff" : "#888",
          }}
          onClick={() => {
            setGstEnabled(p => !p);
            if (gstEnabled) {
              update("gst_percent", 0);
              update("gst_amount",  "0");
            }
          }}
        >
          {gstEnabled ? "ON ●──" : "OFF ○──"}
        </button>
      </div>

      {gstEnabled && (
        <Field
          label="GST %"
          value={String(content.gst_percent ?? "")}
          onChange={v => update("gst_percent", v)}
        />
      )}

      <SectionLabel>Totals (auto-calculated)</SectionLabel>
      <Field label="Subtotal"   value={content.subtotal || ""}   onChange={(v) => update("subtotal", v)} />
      <Field label="GST Amount" value={content.gst_amount || ""} onChange={(v) => update("gst_amount", v)} />
      <Field label="Total"      value={content.total || ""}      onChange={(v) => update("total", v)} />

      <SectionLabel>Status</SectionLabel>
      <Field label="Payment status" value={content.payment_status} onChange={v => update("payment_status", v)} />
      <Field label="Paid on"        value={content.paid_on}        onChange={v => update("paid_on", v)} />

      <SectionLabel>Bank / UPI</SectionLabel>
      <Field label="Bank name"  value={content.bank_name}  onChange={v => update("bank_name", v)} />
      <Field label="UPI phone"  value={content.upi_phone}  onChange={v => update("upi_phone", v)} />
      <Field label="UPI ID"     value={content.upi_id}     onChange={v => update("upi_id", v)} />
    </div>
  );
}

export function ClientDocFields({ content, update }: { content: any, update: (k: string, v: any) => void }) {
  const [gstEnabled, setGstEnabled] = useState(parseFloat(content.gst_percent) > 0);

  useEffect(() => {
    const parseAmt = (val: any) => {
      if (!val) return 0;
      return parseFloat(String(val).replace(/[₹,\s]/g, "")) || 0;
    };
    const subtotal   = (content.line_items || []).reduce((sum: number, item: any) => sum + parseAmt(item.amount), 0);
    const gstPercent = gstEnabled ? (parseFloat(content.gst_percent) || 0) : 0;
    const gstAmt     = (subtotal * gstPercent) / 100;
    const total      = subtotal + gstAmt;

    const fmt = (n: number) => n > 0 ? `₹${n.toLocaleString("en-IN")}` : "0";

    update("subtotal",   fmt(subtotal));
    update("gst_percent", gstEnabled ? gstPercent : 0);
    update("gst_amount", gstEnabled && gstPercent > 0 ? fmt(gstAmt) : "0");
    update("total",      fmt(total));
  }, [content.line_items, content.gst_percent, gstEnabled]);

  const updatePara = (i: number, val: any) => {
    const updated = [...(content.body_paragraphs || [])];
    updated[i] = val;
    update("body_paragraphs", updated);
  };

  const updateItem = (i: number, key: string, val: any) => {
    const updated = [...(content.line_items || [])];
    updated[i] = { ...updated[i], [key]: val };

    if (key === "hours" || key === "unit_price") {
      const h = updated[i].hours;
      const u = updated[i].unit_price;
      if (h !== undefined && h !== "" && u !== undefined && u !== "") {
        updated[i].amount = (parseFloat(h) || 0) * (parseFloat(u) || 0);
      }
    }

    update("line_items", updated);
  };

  const addItem = () =>
    update("line_items", [...(content.line_items || []), { description: "", hours: "", unit_price: "", amount: "" }]);

  const removeItem = (i: number) =>
    update("line_items", (content.line_items || []).filter((_: any, idx: number) => idx !== i));

  return (
    <div style={f.wrap}>
      <SectionLabel>Page 1 — Letter</SectionLabel>
      <Field label="Client name"       value={content.client_name}         onChange={v => update("client_name", v)} required />
      <Field label="Organisation"      value={content.client_organisation} onChange={v => update("client_organisation", v)} />
      <Field label="Place"             value={content.client_place}        onChange={v => update("client_place", v)} />
      <Field label="Date"              value={content.date}                onChange={v => update("date", v)} required />
      <Field label="Sender name"       value={content.sender_name}         onChange={v => update("sender_name", v)} />
      <Field label="Sender title"      value={content.sender_designation}  onChange={v => update("sender_designation", v)} />

      <SectionLabel>Letter body</SectionLabel>
      {(content.body_paragraphs || []).map((p: string, i: number) => (
        <div key={i} style={f.group}>
          <div style={f.label}>Paragraph {i + 1}</div>
          <textarea style={f.textarea as React.CSSProperties} value={p} rows={3} onChange={e => updatePara(i, e.target.value)} />
        </div>
      ))}

      <SectionLabel>Page 2 — Quotation</SectionLabel>
      <Field label="Quotation number" value={content.quotation_number} onChange={v => update("quotation_number", v)} />
      <Field label="Project name"     value={content.project_name}     onChange={v => update("project_name", v)} required />

      <SectionLabel>Line items</SectionLabel>
      {(content.line_items || []).map((item: any, i: number) => (
        <div key={i} style={f.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>Item {i + 1}</span>
            <button style={f.removeBtn} onClick={() => removeItem(i)}>✕ Remove</button>
          </div>
          <Field label="Description" value={item.description} onChange={v => updateItem(i, "description", v)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6 }}>
            {["hours", "unit_price", "amount"].map(key => (
              <div key={key} style={f.group}>
                <div style={f.label}>{key.replace("_", " ")}</div>
                <input style={f.input as React.CSSProperties} value={item[key] || ""} onChange={e => updateItem(i, key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button style={f.addBtn} onClick={addItem}>+ Add line item</button>

      <div style={gstToggleWrap}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>Enable GST</span>
        <button
          style={{
            ...gstToggleBtn,
            background: gstEnabled ? "#111" : "#e0e0e0",
            color:      gstEnabled ? "#fff" : "#888",
          }}
          onClick={() => {
            setGstEnabled(p => !p);
            if (gstEnabled) {
              update("gst_percent", 0);
              update("gst_amount",  "0");
            }
          }}
        >
          {gstEnabled ? "ON ●──" : "OFF ○──"}
        </button>
      </div>

      {gstEnabled && (
        <Field
          label="GST %"
          value={String(content.gst_percent || "")}
          onChange={v => update("gst_percent", v)}
        />
      )}

      <SectionLabel>Totals</SectionLabel>
      <Field label="Subtotal"   value={content.subtotal}   onChange={v => update("subtotal", v)} />
      <Field label="GST amount" value={content.gst_amount} onChange={v => update("gst_amount", v)} />
      <Field label="Total"      value={content.total}      onChange={v => update("total", v)} />
    </div>
  );
}

export function ComplianceFields({ content, update }: { content: any, update: (k: string, v: any) => void }) {
  return (
    <div style={f.wrap}>
      <SectionLabel>Client / Partner</SectionLabel>
      <Field label="Client name"         value={content.client_name}         onChange={v => update("client_name", v)} required />
      <Field label="Client designation"  value={content.client_designation}  onChange={v => update("client_designation", v)} />

      <SectionLabel>Service Provider</SectionLabel>
      <Field label="Provider name"  value={content.provider_name}  onChange={v => update("provider_name", v)} />
      <Field label="Provider role"  value={content.provider_role}  onChange={v => update("provider_role", v)} />

      <SectionLabel>Contact Info</SectionLabel>
      <Field label="Company phone"   value={content.company_phone}   onChange={v => update("company_phone", v)} />
      <Field label="Company email"   value={content.company_email}   onChange={v => update("company_email", v)} />
      <Field label="Company website" value={content.company_website} onChange={v => update("company_website", v)} />
    </div>
  );
}


export function InvoiceFields({ content, update }: { content: any, update: (k: string, v: any) => void }) {
  const [gstEnabled, setGstEnabled] = useState(parseFloat(content.gst_percent) > 0);

  useEffect(() => {
    const parseAmt = (val: any) => {
      if (!val) return 0;
      return parseFloat(String(val).replace(/[₹,\s]/g, "")) || 0;
    };

    const subtotal   = (content.line_items || []).reduce((sum: number, item: any) => sum + parseAmt(item.amount), 0);
    const gstPercent = gstEnabled ? (parseFloat(content.gst_percent) || 0) : 0;
    const gstAmt     = (subtotal * gstPercent) / 100;
    const total      = subtotal + gstAmt;

    const fmt = (n: number) => n > 0 ? `₹${n.toLocaleString("en-IN")}` : "0";

    update("subtotal",   fmt(subtotal));
    update("gst_percent", gstEnabled ? gstPercent : 0);
    update("gst_amount", gstEnabled && gstPercent > 0 ? fmt(gstAmt) : "0");
    update("total",      fmt(total));
  }, [content.line_items, content.gst_percent, gstEnabled]);

  const updateItem = (i: number, key: string, val: any) => {
    const updated = [...(content.line_items || [])];
    updated[i] = { ...updated[i], [key]: val };

    if (key === "hours" || key === "unit_price") {
      const h = updated[i].hours;
      const u = updated[i].unit_price;
      if (h !== undefined && h !== "" && u !== undefined && u !== "") {
        updated[i].amount = (parseFloat(h) || 0) * (parseFloat(u) || 0);
      }
    }

    update("line_items", updated);
  };

  const addItem = () =>
    update("line_items", [...(content.line_items || []), { description: "", hours: "", unit_price: "", amount: "" }]);

  const removeItem = (i: number) =>
    update("line_items", (content.line_items || []).filter((_: any, idx: number) => idx !== i));

  return (
    <div style={f.wrap}>
      <SectionLabel>Invoice info</SectionLabel>
      <Field label="Invoice number" value={content.invoice_number} onChange={v => update("invoice_number", v)} required error={!content.invoice_number} />
      <Field label="Date"           value={content.date}           onChange={v => update("date", v)} required error={!content.date} />
      <Field label="Project name"   value={content.project_name}   onChange={v => update("project_name", v)} required error={!content.project_name} />

      <SectionLabel>Client info</SectionLabel>
      <Field label="Client name"    value={content.client_name}    onChange={v => update("client_name", v)} required error={!content.client_name} />
      <Field label="Client phone"   value={content.client_phone}   onChange={v => update("client_phone", v)} />
      <Field label="Client email"   value={content.client_email}   onChange={v => update("client_email", v)} />
      <Field label="Client address" value={content.client_address} onChange={v => update("client_address", v)} />

      <SectionLabel>Project description</SectionLabel>
      <Field label="Description" value={content.project_description} onChange={v => update("project_description", v)} multiline />

      <SectionLabel>Line items</SectionLabel>
      {(content.line_items || []).map((item: any, i: number) => (
        <div key={i} style={f.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>Item {i + 1}</span>
            <button style={f.removeBtn} onClick={() => removeItem(i)}>✕ Remove</button>
          </div>
          <Field label="Description" value={item.description} onChange={v => updateItem(i, "description", v)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 6 }}>
            {["hours", "unit_price", "amount"].map(key => (
              <div key={key} style={f.group}>
                <div style={f.label}>{key.replace("_", " ")}</div>
                <input style={f.input as React.CSSProperties} value={item[key] || ""} onChange={e => updateItem(i, key, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button style={f.addBtn} onClick={addItem}>+ Add line item</button>

      <div style={gstToggleWrap}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>Enable GST</span>
        <button
          style={{
            ...gstToggleBtn,
            background: gstEnabled ? "#111" : "#e0e0e0",
            color:      gstEnabled ? "#fff" : "#888",
          }}
          onClick={() => {
            setGstEnabled(p => !p);
            if (gstEnabled) {
              update("gst_percent", 0);
              update("gst_amount",  "0");
            }
          }}
        >
          {gstEnabled ? "ON ●──" : "OFF ○──"}
        </button>
      </div>

      {gstEnabled && (
        <Field
          label="GST %"
          value={String(content.gst_percent || "")}
          onChange={v => update("gst_percent", v)}
        />
      )}

      <SectionLabel>Totals</SectionLabel>
      <Field label="Subtotal" value={content.subtotal}   onChange={v => update("subtotal", v)} />
      {gstEnabled && (
        <Field label="GST amount" value={content.gst_amount} onChange={v => update("gst_amount", v)} />
      )}
      <Field label="Total"    value={content.total}      onChange={v => update("total", v)} />

      <SectionLabel>Payment & status</SectionLabel>
      <Field label="Payment status" value={content.payment_status} onChange={v => update("payment_status", v)} />
      <Field label="Payment date"   value={content.payment_date}   onChange={v => update("payment_date", v)} />
      <Field label="Due date"       value={content.due_date}       onChange={v => update("due_date", v)} />
      <Field label="Bank name"      value={content.bank_name}      onChange={v => update("bank_name", v)} />
      <Field label="Account name"   value={content.account_name}   onChange={v => update("account_name", v)} />
      <Field label="UPI phone"      value={content.upi_phone}      onChange={v => update("upi_phone", v)} />
      <Field label="UPI ID"         value={content.upi_id}         onChange={v => update("upi_id", v)} />
      <Field label="Notes"          value={content.notes}          onChange={v => update("notes", v)} multiline />
    </div>
  );
}

export function TimelineFields({ content, update }: { content: any, update: (k: string, v: any) => void }) {
  useEffect(() => {
    let totalHours = 0;
    let hasHours = false;
    (content.timeline_items || []).forEach((item: any) => {
      if (item.hours) {
        totalHours += parseFloat(item.hours) || 0;
        hasHours = true;
      }
    });
    
    if (hasHours) {
      update("total_time", `${totalHours} hours`);
      update("expected_dev_time", `${totalHours} hours`);
    }
  }, [content.timeline_items]);

  const updateItem = (i: number, key: string, val: any) => {
    const updated = [...(content.timeline_items || [])];
    updated[i] = { ...updated[i], [key]: val };
    update("timeline_items", updated);
  };

  const addItem = () =>
    update("timeline_items", [
      ...(content.timeline_items || []),
      { description: "", timeline: "", hours: "" }
    ]);

  const removeItem = (i: number) =>
    update("timeline_items", (content.timeline_items || []).filter((_: any, idx: number) => idx !== i));

  return (
    <div style={f.wrap}>
      <SectionLabel>Project Info</SectionLabel>
      <Field label="Project name"        value={content.project_name}        onChange={v => update("project_name", v)} required />
      <Field label="Project description" value={content.project_description} onChange={v => update("project_description", v)} />
      <Field label="Client name"         value={content.client_name}         onChange={v => update("client_name", v)} required />

      <SectionLabel>Timeline Items</SectionLabel>
      {(content.timeline_items || []).map((item: any, i: number) => (
        <div key={i} style={f.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: "#aaa" }}>Phase {i + 1}</span>
            <button style={f.removeBtn} onClick={() => removeItem(i)}>✕ Remove</button>
          </div>
          <Field
            label="Description"
            value={item.description}
            onChange={v => updateItem(i, "description", v)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
            <div style={f.group}>
              <div style={f.label}>Timeline</div>
              <input
                style={f.input as React.CSSProperties}
                value={item.timeline || ""}
                onChange={e => updateItem(i, "timeline", e.target.value)}
                placeholder="e.g. 5 days"
              />
            </div>
            <div style={f.group}>
              <div style={f.label}>Hours</div>
              <input
                style={f.input as React.CSSProperties}
                value={item.hours || ""}
                onChange={e => updateItem(i, "hours", e.target.value)}
                placeholder="e.g. 20"
              />
            </div>
          </div>
        </div>
      ))}
      <button style={f.addBtn} onClick={addItem}>+ Add phase</button>

      <SectionLabel>Totals</SectionLabel>
      <Field label="Total time"        value={content.total_time}        onChange={v => update("total_time", v)} />
      <Field label="Expected dev time" value={content.expected_dev_time} onChange={v => update("expected_dev_time", v)} />
      <Field label="Expected closure"  value={content.expected_closure}  onChange={v => update("expected_closure", v)} />
      <Field label="Closure date"      value={content.closure_date}      onChange={v => update("closure_date", v)} />
    </div>
  );
}

const f: Record<string, React.CSSProperties> = {
  wrap:         { display: "flex", flexDirection: "column", gap: 10 },
  group:        { display: "flex", flexDirection: "column", gap: 4 },
  label:        { fontSize: 11, fontWeight: 600, color: "#888", textTransform: "capitalize" },
  input:        { width: "100%", border: "1px solid #e8e8e8", borderRadius: 4, padding: "7px 9px", fontSize: 12, color: "#333", outline: "none", fontFamily: "inherit", lineHeight: 1.5, background: "#fafafa" },
  textarea:     { width: "100%", border: "1px solid #e8e8e8", borderRadius: 4, padding: "7px 9px", fontSize: 12, color: "#333", outline: "none", fontFamily: "inherit", lineHeight: 1.5, resize: "vertical", background: "#fafafa" },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, paddingTop: 8, paddingBottom: 4, borderBottom: "1px solid #f0f0f0", marginBottom: 4 },
  card:         { border: "1px solid #efefef", borderRadius: 4, padding: "10px 12px", background: "#fafafa" },
  cardTitle:    { width: "100%", border: "none", borderBottom: "1px solid #e8e8e8", padding: "3px 0 6px", fontSize: 12, fontWeight: 700, outline: "none", background: "transparent", marginBottom: 8, fontFamily: "inherit" },
  pointRow:     { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  bullet:       { color: "#ccc", fontSize: 8, flexShrink: 0 },
  pointInput:   { flex: 1, border: "none", borderBottom: "1px solid #f0f0f0", fontSize: 12, padding: "2px 0", outline: "none", background: "transparent", color: "#444", fontFamily: "inherit" },
  uvpRow:       { display: "flex", alignItems: "center", gap: 4 },
  addBtn:       { width: "100%", fontSize: 12, color: "#555", background: "#fbfbfb", border: "1.5px dashed #ccc", borderRadius: 4, padding: "10px 12px", cursor: "pointer", textAlign: "center", fontFamily: "inherit", fontWeight: 600 },
  removeBtn:    { fontSize: 11, color: "#c0392b", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" },
};

const gstToggleWrap: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  padding: "8px 12px", background: "#f7f7f7", borderRadius: 4,
  border: "1px solid #efefef", marginTop: 4,
};

const gstToggleBtn: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 4,
  border: "none", cursor: "pointer", letterSpacing: "0.5px", transition: "background 0.15s",
};

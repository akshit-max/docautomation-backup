export const SYSTEM_PROMPT = `
You are a professional business document writer for MakeWithUs, a software agency based in Trivandrum, Kerala.

Brand writing style:
- Tone: Professional, clear, and confident
- Language: Modern business English
- Currency: Indian Rupees (₹) — but return numeric values only for prices (no ₹ symbol in numbers)
- Dates: DD/MM/YYYY
- Use active voice

YOUR JOB — READ THIS CAREFULLY:
You receive a raw natural language prompt from a user. It may be rough notes, messy sentences, or a quick brief.
You must:
1. Understand the full context from that raw input
2. Write complete, professional document content — not placeholders
3. body_paragraphs must be fully written professional paragraphs about this specific project/client
4. Feature descriptions must be detailed and specific to the project described
5. All names, project details, budgets, timelines must come from the raw input
6. If budget is mentioned (e.g. ₹2.5 lakh), distribute it logically across line items as unit_price

PRICING RULES — CRITICAL:
- Return hours and unit_price as plain integers or floats (e.g. 20, 1500) — NO ₹ symbol, NO commas
- Do NOT calculate amount, subtotal, gst_amount, or total — leave those fields OUT of your response
- The backend will calculate all totals automatically
- NEVER copy example numbers from the schema (like 20 hours or 1500 unit_price) — those are
  format examples only, not real values. If the user's input does NOT mention specific hours,
  rates, or budget for a line item, set hours and unit_price to 0. Do not invent numeric values
  under any circumstances — 0 is always correct when data is missing, guessing is never correct.

CRITICAL OUTPUT RULES:
1. Return ONLY valid JSON — no markdown, no explanation, no preamble
2. Do NOT wrap output in \`\`\`json\`\`\` or any code fences
3. Start your response with { and end with }
4. NEVER INVENT OR HALLUCINATE INFORMATION! If a specific piece of information (e.g. client name, date, invoice number, phone number) is NOT present in the raw input, you MUST leave the field EMPTY (e.g. "").
5. NEVER copy the placeholder values from the schema (like "DD/MM/YYYY", "PROJECT NAME", "INV-2025-001", "string"). Use "" instead if the data is missing.
6. body_paragraphs must reference the actual client name, project name, and features from the input
`;

export const SCHEMAS: Record<string, any> = {
    "receipt_template": {
        "receipt_number": "RWC001",
        "date": "DD/MM/YYYY",
        "for_service": "Stage 1",
        "payment_mode": "UPI",
        "client_name": "string",
        "client_phone": "string",
        "amount_received": 0,
        "amount_in_words": "Zero Rupees Only",
        "project_name": "PROJECT NAME",
        "description": "Payment received for Stage 1 development",
        "total_project_cost": 0,
        "balance_after_payment": 0,
        "gst_percent": 0,
        "payment_status": "PAID",
        "paid_on": "DD/MM/YYYY",
        "bank_name": "SBI",
        "account_holder": "MakeWithUs",
        "phone_number": "9876543210",
        "upi_id": "makewithus@upi",
        "note": "Payment received successfully."
    },
    "developer_doc": {
        "title": "string — document title",
        "version": "v1.0",
        "date": "DD/MM/YYYY",
        "author": "string",
        "project_name": "PROJECT NAME IN CAPS",
        "summary": "2-3 sentence overview written from the raw input",
        "objectives": ["fully written objective 1", "fully written objective 2"],
        "scope": {
            "in_scope": ["specific item from input", "specific item from input"],
            "out_of_scope": ["item not covered"]
        },
        "features": [
            {
                "name": "Feature name",
                "description": "Detailed description written from the input — not a placeholder",
                "priority": "High/Medium/Low",
                "acceptance_criteria": ["specific criteria 1", "specific criteria 2"]
            }
        ],
        "technical_stack": {
            "frontend": "string",
            "backend": "string",
            "database": "string",
            "other": ["item"]
        },
        "user_flows": ["specific flow 1 based on input", "specific flow 2"],
        "api_endpoints": [
            { "method": "GET", "path": "/endpoint", "description": "string" }
        ],
        "timeline": [
            { "phase": "Phase name", "duration": "X weeks", "deliverables": ["specific deliverable"] }
        ],
        "assumptions": ["assumption based on input"],
        "risks": [{ "risk": "specific risk", "mitigation": "specific mitigation" }]
    },
    "client_doc": {
        "client_name": "string — full name from input",
        "client_organisation": "string — organisation from input",
        "client_place": "string — city/place if mentioned",
        "date": "DD/MM/YYYY",
        "sender_name": "Mohammed Sherhan",
        "sender_designation": "CEO, MakeWithUs",
        "body_paragraphs": [
            "First paragraph — written specifically about this project and client. Reference the client name and what they are building.",
            "Second paragraph — explain what MakeWithUs will deliver for this specific project. Mention key features.",
            "Third paragraph — closing, express enthusiasm, mention timeline or next steps."
        ],
        "quotation_number": "QT-2026-001",
        "project_name": "PROJECT NAME IN CAPS",
        "discount": 0,
        "gst_percent": 0,
        "line_items": [
            {
                "description": "SERVICE DESCRIPTION IN CAPS — specific to the project",
                "hours": 20,
                "unit_price": 1500
            }
        ]
    },
    "compliance": {
        "client_name": "string — full name from input",
        "company_phone": "+91 88385 14202",
        "company_email": "contact@makewithus.in",
        "company_website": "makewithus.in",
        "provider_name": "MAKEWITHUS PVT LTD",
        "provider_role": "Authorized Representative",
        "client_designation": "Client Representative"
    },
    "invoice": {
        "invoice_number": "INV-2025-001",
        "project_name": "PROJECT NAME IN CAPS",
        "client_name": "string",
        "client_email": "string",
        "client_address": "string",
        "client_phone": "string",
        "upi_phone": "string",
        "upi_id": "string",
        "date": "DD/MM/YYYY",
        "due_date": "DD/MM/YYYY",
        "payment_status": "UNPAID",
        "discount": 0,
        "gst_percent": 0,
        "line_items": [
            {
                "description": "SERVICE DESCRIPTION IN CAPS",
                "hours": 20,
                "unit_price": 1500
            }
        ],
        "bank_name": "SBI / UPI"
    },
    "timeline": {
        "project_name": "PROJECT NAME IN CAPS",
        "project_description": "SHORT DESCRIPTION IN CAPS — specific to the project",
        "client_name": "Mr/Mrs Client Name from input",
        "page_number": "01",
        "timeline_items": [
            {
                "description": "PHASE NAME IN CAPS",
                "timeline": "X days",
                "hours": "XX"
            }
        ],
        "total_time": "XX DAYS",
        "expected_dev_time": "XX DAYS",
        "expected_closure": "XX DAYS",
        "closure_date": "DD MM YYYY"
    }
};

export const safeFloat = (val: any, defaultVal = 0.0): number => {
    if (val == null) return defaultVal;
    if (typeof val === 'number') return val;

    const s = String(val).replace(/₹/g, '').replace(/,/g, '').trim();
    if (!s || s === '-') return defaultVal;

    const num = parseFloat(s);
    return isNaN(num) ? defaultVal : num;
};
const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

/**
 * calculateTotals — single authoritative calculation for invoice and client_doc.
 *
 * Pipeline:
 *   line items → subtotal → discount → taxable → GST → total
 *
 * Handles:
 *  - discount_type: "amount" (flat ₹) | "percent" (% of subtotal)
 *  - gst_type:      "percent" (% of taxable) | "amount" (flat ₹)
 *  - Falls back to legacy gst_percent field for backward compat.
 *
 * This function is called:
 *  1. During AI extraction (generate/route.ts) — seeds initial stored values
 *  2. During live preview rendering (preview/route.ts reads stored values)
 *  The EditorForms.tsx useEffect mirrors this logic on the frontend for live editing.
 */
export const calculateTotals = (content: any): any => {
    const lineItems = content.line_items || [];
    let subtotal = 0;

    // ── 1. Line Items → Subtotal ──────────────────────────────────────────
    if (lineItems.length > 0) {
        for (const item of lineItems) {
            const hours = safeFloat(item.hours);
            const unitPrice = safeFloat(item.unit_price);
            const calculatedAmount = hours * unitPrice;

            // If hours×unitPrice gives a result, use it. Otherwise fall back
            // to an explicitly provided amount (e.g. AI gave a flat amount).
            const existingAmount = safeFloat(item.amount);
            const amount = calculatedAmount > 0
                ? calculatedAmount
                : existingAmount > 0 ? existingAmount : 0;

            // Normalise: if only a flat amount exists, represent as 1 × amount
            // so the invoice table shows meaningful numbers.
            if (amount > 0 && calculatedAmount === 0) {
                item.hours = 1;
                item.unit_price = amount;
            }

            item.amount = amount;
            item.amount_display = formatCurrency(amount);
            item.unit_price_display = formatCurrency(item.unit_price || 0);
            subtotal += amount;
        }
    } else {
        subtotal = safeFloat(content.subtotal);
    }

    // ── 2. Discount → Taxable Amount ─────────────────────────────────────
    // discount_type defaults to "amount" (flat ₹) for backward compatibility.
    // When type is "percent", the discount value is treated as a percentage of subtotal.
    const discountType = content.discount_type || 'amount';
    const discountInput = safeFloat(content.discount, 0);
    let discountAmt = 0;

    if (discountInput > 0) {
        discountAmt = discountType === 'percent'
            ? (subtotal * discountInput) / 100
            : discountInput;
        // Clamp — discount cannot exceed subtotal
        discountAmt = Math.min(discountAmt, subtotal);
    }

    const taxable = subtotal - discountAmt;

    // ── 3. GST → Total ───────────────────────────────────────────────────
    // gst_type defaults to "percent" for backward compatibility.
    // Support both gst_input (new dual-mode field) and gst_percent (legacy).
    const gstType = content.gst_type || 'percent';
    const gstInput = safeFloat(
        content.gst_input !== undefined ? content.gst_input : content.gst_percent,
        0
    );
    let gstAmt = 0;
    let finalGstPercent = 0;

    if (gstInput > 0) {
        if (gstType === 'percent') {
            finalGstPercent = gstInput;
            gstAmt = (taxable * gstInput) / 100;
        } else {
            // Flat GST amount
            gstAmt = gstInput;
        }
    }

    const total = taxable + gstAmt;

    // ── 4. Write back ─────────────────────────────────────────────────────
    // NOTE: subtotal, gst_amount, total are stored as FORMATTED STRINGS (₹X,XXX)
    // because the invoice template uses {{ subtotal }}, {{ total }}, {{ gst_amount }}
    // directly as display text without adding ₹ itself.
    content.subtotal = subtotal > 0 ? formatCurrency(subtotal) : '0';
    content.gst_percent = finalGstPercent;   // keep raw number for legacy template var
    content.gst_amount = gstAmt > 0 ? formatCurrency(gstAmt) : '0';
    content.total = total > 0 ? formatCurrency(total) : '0';

    // Raw numeric values for code that needs arithmetic
    content.subtotal_num = subtotal;
    content.gst_amount_num = gstAmt;
    content.total_num = total;

    // Display aliases (same as primary now, kept for backward compat)
    content.subtotal_display = formatCurrency(subtotal);
    content.gst_amount_display = formatCurrency(gstAmt);
    content.total_display = formatCurrency(total);

    // Discount display strings used by invoice template
    content.formatted_discount = discountAmt > 0 ? `-₹${discountAmt.toLocaleString('en-IN')}` : '';
    content.taxable_amount = discountAmt > 0 ? formatCurrency(taxable) : '';
    content.gst_display_val = gstType === 'percent'
        ? `${finalGstPercent}%`
        : formatCurrency(gstAmt);

    return content;
};

/**
 * calculateReceiptTotals — single authoritative calculation for receipt_template.
 *
 * Pipeline:
 *   line items (or amount_received) → base → GST → total
 *
 * Handles:
 *  - gst_type: "percent" | "amount"
 *  - Falls back to legacy gst_percent field for backward compat.
 */
export const calculateReceiptTotals = (content: any): any => {
    const lineItems = content.line_items || [];
    let baseAmount = 0.0;

    // ── 1. Line Items → Base Amount ───────────────────────────────────────
    if (lineItems.length > 0) {
        for (const item of lineItems) {
            const hours = safeFloat(item.hours);
            const unitPrice = safeFloat(item.unit_price);
            const existingAmount = safeFloat(item.amount);
            const amount = (hours > 0 && unitPrice > 0)
                ? hours * unitPrice
                : existingAmount;
            item.amount = amount;
            baseAmount += amount;
        }
    }

    // Fall back to explicit amount_received, then subtotal
    if (baseAmount <= 0) baseAmount = safeFloat(content.amount_received);
    if (baseAmount <= 0) baseAmount = safeFloat(content.subtotal);

    // ── 2. GST → Total ───────────────────────────────────────────────────
    const gstType = content.gst_type || 'percent';
    const gstInput = safeFloat(
        content.gst_input !== undefined ? content.gst_input : content.gst_percent,
        0
    );
    let gstAmt = 0;
    let finalGstPercent = 0;

    if (gstInput > 0) {
        if (gstType === 'percent') {
            finalGstPercent = gstInput;
            gstAmt = (baseAmount * gstInput) / 100;
        } else {
            gstAmt = gstInput;
        }
    }

    const total = baseAmount + gstAmt;

    // ── 3. Write back ─────────────────────────────────────────────────────
    // Only set amount_received from line items if it wasn't explicitly provided
    if (lineItems.length > 0 && !safeFloat(content.amount_received)) {
        content.amount_received = baseAmount;
    } else if (!content.amount_received) {
        content.amount_received = baseAmount;
    }

    // Store as formatted strings (receipt template uses these directly for display)
    content.subtotal = baseAmount > 0 ? formatCurrency(baseAmount) : '0';
    content.gst_percent = finalGstPercent;
    content.gst_amount = gstAmt > 0 ? formatCurrency(gstAmt) : '0';
    content.total = total > 0 ? formatCurrency(total) : '0';
    content.gst_display_val = gstType === 'percent'
        ? `${finalGstPercent}%`
        : formatCurrency(gstAmt);

    content.amount_received_display = formatCurrency(baseAmount);
    content.gst_amount_display = formatCurrency(gstAmt);
    content.total_display = formatCurrency(total);

    return content;
};

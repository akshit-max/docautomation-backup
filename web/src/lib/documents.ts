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
4. Every string field must be filled with real content specific to the input — never leave example placeholders
5. body_paragraphs must reference the actual client name, project name, and features from the input
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
            {"method": "GET", "path": "/endpoint", "description": "string"}
        ],
        "timeline": [
            {"phase": "Phase name", "duration": "X weeks", "deliverables": ["specific deliverable"]}
        ],
        "assumptions": ["assumption based on input"],
        "risks": [{"risk": "specific risk", "mitigation": "specific mitigation"}]
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
        "gst_percent": 18,
        "line_items": [
            {
                "description": "SERVICE DESCRIPTION IN CAPS — specific to the project",
                "hours": 20,
                "unit_price": 1500
            }
        ]
    },
    "compliance": {
        "title": "string",
        "doc_number": "HR/2025/001",
        "date": "DD/MM/YYYY",
        "from": "sender name and designation",
        "to": "recipient name and designation",
        "subject": "string — specific subject from input",
        "salutation": "Dear Sir/Madam",
        "body_paragraphs": [
            "Fully written paragraph 1 — specific to the document purpose",
            "Fully written paragraph 2 — legal/compliance details",
            "Fully written paragraph 3 — closing/obligations"
        ],
        "closing": "Yours sincerely",
        "signatory_name": "string",
        "signatory_designation": "string",
        "company_name": "MakeWithUs",
        "enclosures": []
    },
    "invoice": {
        "invoice_number": "INV-2025-001",
        "project_name": "PROJECT NAME IN CAPS",
        "client_name": "string",
        "client_phone": "string",
        "upi_phone": "string",
        "upi_id": "string",
        "date": "DD/MM/YYYY",
        "due_date": "DD/MM/YYYY",
        "payment_status": "UNPAID",
        "gst_percent": 18,
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

const safeFloat = (val: any, defaultVal = 0.0): number => {
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

export const calculateTotals = (content: any): any => {
    const lineItems = content.line_items || [];
    let subtotal = 0;

    if (lineItems.length > 0) {
        for (const item of lineItems) {
            const hours = safeFloat(item.hours);
            const unitPrice = safeFloat(item.unit_price);
            const calculatedAmount = hours * unitPrice;
            
            // If hours/unitPrice are 0 but an amount was provided by the AI, respect it
            const existingAmount = safeFloat(item.amount);
            const amount = (calculatedAmount > 0) ? calculatedAmount : (existingAmount > 0 ? existingAmount : 0);
            
            // If we used a flat amount and hours/unit_price are missing, we can optionally reverse engineer unit_price
            // so it displays nicely in the template, e.g. 1 unit of <amount>
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

    const gstPercent = safeFloat(content.gst_percent, 18);
    const gstAmount = subtotal * (gstPercent / 100);
    const total = subtotal + gstAmount;

    content.subtotal = subtotal;
    content.gst_percent = gstPercent;
    content.gst_amount = gstAmount;
    content.total = total;

    content.subtotal_display = formatCurrency(subtotal);
    content.gst_amount_display = formatCurrency(gstAmount);
    content.total_display = formatCurrency(total);

    return content;
};

export const calculateReceiptTotals = (content: any): any => {
    const lineItems = content.line_items || [];
    let baseAmount = 0.0;

    if (lineItems.length > 0) {
        for (const item of lineItems) {
            const hours = safeFloat(item.hours);
            const unitPrice = safeFloat(item.unit_price);
            const existingAmount = safeFloat(item.amount);
            
            const amount = (hours > 0 && unitPrice > 0) ? hours * unitPrice : existingAmount;
            item.amount = amount;
            baseAmount += amount;
        }
    }

    if (baseAmount <= 0) {
        baseAmount = safeFloat(content.amount_received);
    }
    
    if (baseAmount <= 0) {
        baseAmount = safeFloat(content.subtotal);
    }

    const gstPercent = safeFloat(content.gst_percent, 0);
    const gstAmount = baseAmount * (gstPercent / 100);
    const total = baseAmount + gstAmount;

    content.amount_received = baseAmount;
    content.gst_amount = gstAmount;
    content.total = total;

    content.amount_received_display = formatCurrency(baseAmount);
    content.gst_amount_display = formatCurrency(gstAmount);
    content.total_display = formatCurrency(total);

    return content;
};

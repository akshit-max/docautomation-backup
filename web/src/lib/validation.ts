export interface ValidationResult {
  missingRequired: string[];
  missingRecommended: string[];
  confidenceScore: number;
  suggestions: Suggestion[];
}

export interface Suggestion {
  id: string;
  field: string;
  message: string;
  actionLabel: string;
  apply: (content: any) => any;
}

const REQUIRED_FIELDS: Record<string, {key: string, label: string}[]> = {
  "invoice": [
    { key: "invoice_number", label: "Invoice Number" },
    { key: "date", label: "Date" },
    { key: "project_name", label: "Project Name" },
    { key: "client_name", label: "Client Name" },
  ],
  "receipt_template": [
    { key: "receipt_number", label: "Receipt Number" },
    { key: "date", label: "Date" },
    { key: "for_service", label: "For Service" },
    { key: "client_name", label: "Client Name" },
    { key: "amount_received", label: "Amount Received" },
  ],
  "client_doc": [
    { key: "client_name", label: "Client Name" },
    { key: "date", label: "Date" },
    { key: "project_name", label: "Project Name" },
  ],
  "compliance": [
    { key: "client_name", label: "Client Name" },
  ],
  "timeline": [
    { key: "project_name", label: "Project Name" },
    { key: "client_name", label: "Client Name" },
  ]
};

const RECOMMENDED_FIELDS: Record<string, {key: string, label: string}[]> = {
  "invoice": [
    { key: "client_phone", label: "Client Phone" },
    { key: "due_date", label: "Due Date" },
  ],
  "receipt_template": [
    { key: "payment_mode", label: "Payment Mode" },
  ],
  "client_doc": [
    { key: "client_organisation", label: "Client Organisation" },
  ],
  "compliance": [
    { key: "client_designation", label: "Client Designation" },
  ],
  "timeline": [
    { key: "project_description", label: "Project Description" },
  ]
};

export const validateDocument = (templateType: string, content: any): ValidationResult => {
  const missingRequired: string[] = [];
  const missingRecommended: string[] = [];
  const suggestions: Suggestion[] = [];
  
  if (!content || !templateType) {
    return { missingRequired, missingRecommended, confidenceScore: 0, suggestions };
  }

  // 1. Check Missing Fields
  const reqFields = REQUIRED_FIELDS[templateType] || [];
  let filledRequired = 0;
  
  reqFields.forEach(f => {
    const val = content[f.key];
    if (val === undefined || val === null || String(val).trim() === "") {
      missingRequired.push(f.label);
    } else {
      filledRequired++;
    }
  });

  const recFields = RECOMMENDED_FIELDS[templateType] || [];
  recFields.forEach(f => {
    const val = content[f.key];
    if (val === undefined || val === null || String(val).trim() === "") {
      missingRecommended.push(f.label);
    }
  });

  // 2. Compute Confidence Score
  // Base score on required fields. If all required are filled, it's at least 80%.
  let confidence = 0;
  if (reqFields.length > 0) {
    confidence = (filledRequired / reqFields.length) * 80;
  } else {
    confidence = 80;
  }
  
  // Add up to 20% for recommended fields
  if (recFields.length > 0) {
    const filledRec = recFields.length - missingRecommended.length;
    confidence += (filledRec / recFields.length) * 20;
  } else {
    confidence += 20; 
  }

  // Cap at 98% because AI is never 100% perfect
  confidence = Math.min(Math.round(confidence), 98);
  if (filledRequired === 0) confidence = 0;

  // 3. Generate One-click Fix Suggestions
  
  // Suggestion: Capitalize Client Name
  if (content.client_name && typeof content.client_name === 'string') {
    const isLower = content.client_name === content.client_name.toLowerCase() && content.client_name.length > 0;
    if (isLower) {
      suggestions.push({
        id: 'capitalize-client',
        field: 'client_name',
        message: 'Client name is all lowercase.',
        actionLabel: 'Capitalize',
        apply: (c) => {
          const words = c.client_name.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1));
          return { ...c, client_name: words.join(' ') };
        }
      });
    }
  }

  // Suggestion: Standardize Date Format (if using dashes instead of slashes or vice versa)
  if (content.date && typeof content.date === 'string') {
    if (content.date.includes('-')) {
      suggestions.push({
        id: 'format-date',
        field: 'date',
        message: 'Date uses dashes instead of slashes.',
        actionLabel: 'Use DD/MM/YYYY',
        apply: (c) => ({ ...c, date: c.date.replace(/-/g, '/') })
      });
    }
  }

  // Suggestion: Capitalize Project Name for timeline/invoice
  if (content.project_name && typeof content.project_name === 'string' && ['invoice', 'timeline'].includes(templateType)) {
    if (content.project_name !== content.project_name.toUpperCase()) {
      suggestions.push({
        id: 'uppercase-project',
        field: 'project_name',
        message: 'Project name is not fully uppercase as per standard.',
        actionLabel: 'Uppercase',
        apply: (c) => ({ ...c, project_name: c.project_name.toUpperCase() })
      });
    }
  }

  return {
    missingRequired,
    missingRecommended,
    confidenceScore: confidence,
    suggestions
  };
};

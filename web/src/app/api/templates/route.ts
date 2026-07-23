import { NextResponse } from 'next/server';

// GET /api/templates — returns all available template types with labels and descriptions
// Called by api.js listTemplateTypes() (used optionally by UI)

export async function GET() {
  return NextResponse.json({
    types: [
      {
        id: 'invoice',
        label: 'Invoice',
        description: 'GST invoice with line items, payment status and UPI details',
      },
      {
        id: 'receipt_template',
        label: 'Receipt Template',
        description: 'Confirmation of payment received, including service details and payment status',
      },
      {
        id: 'client_doc',
        label: 'Client Proposal',
        description: 'Project proposal with timeline, quotation and deliverables',
      },
      {
        id: 'compliance',
        label: 'Service Agreement',
        description: '3-page service provision agreement with payment terms',
      },
      {
        id: 'timeline',
        label: 'Project Timeline',
        description: 'Phase-wise project timeline with hours and closure date',
      },
      {
        id: 'developer_doc',
        label: 'Developer Document',
        description: 'Technical specification with features, scope, and acceptance criteria',
      },
    ],
  });
}

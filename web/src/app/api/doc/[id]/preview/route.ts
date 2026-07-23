import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import path from 'path';
import fs from 'fs';

import nunjucks from 'nunjucks';

// Create a custom Nunjucks environment
const env = new nunjucks.Environment(null, { autoescape: true });

// Add custom Python/Jinja2 equivalent filters
env.addFilter('float', function(val: any, def = 0) {
  const f = parseFloat(val);
  return isNaN(f) ? def : f;
});

env.addFilter('max', function(arr: any[]) {
  if (!Array.isArray(arr)) return arr;
  return Math.max(...arr);
});

env.addFilter('format', function(str: string, val: any) {
  if (str === '%.0f') {
    return Math.round(parseFloat(val) || 0).toString();
  }
  return str.replace('%s', val);
});

function renderTemplate(templateSource: string, context: Record<string, any>): string {
  return env.renderString(templateSource, context);
}

// GET /api/doc/[id]/preview  — renders the document as HTML for iframe preview
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const autoprint = searchParams.get('autoprint') === '1';

    const docRef = adminDb.collection('documents').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return new NextResponse('<h1>Document not found</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const data = docSnap.data();
    if (data?.isDeleted) {
      return new NextResponse('<h1>Document not found</h1>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    const templateType = data?.template_type || 'developer_doc';

    // Try to load the Jinja2-style HTML template from the backend templates directory
    // In production this should be bundled or served from a known path.
    const templatePath = path.join(
      process.cwd(),
      '..',
      'backend',
      'templates',
      templateType,
      'layout.html'
    );

    let html: string;

    if (fs.existsSync(templatePath)) {
      const templateSource = fs.readFileSync(templatePath, 'utf-8');
      const content = data?.content || {};
      html = renderTemplate(templateSource, content);
    } else {
      // Fallback: render a clean, modern UI for missing templates
      const content = data?.content || {};
      
      const renderValue = (val: any): string => {
        if (Array.isArray(val)) {
          return `<ul class="fallback-list">${val.map(item => `<li>${renderValue(item)}</li>`).join('')}</ul>`;
        }
        if (typeof val === 'object' && val !== null) {
          return `<div class="fallback-dict">${Object.entries(val).map(([k, v]) => `<div><span class="dict-key">${k}:</span> ${renderValue(v)}</div>`).join('')}</div>`;
        }
        return `<span class="fallback-text">${String(val).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
      };

      const rows = Object.entries(content)
        .map(([k, v]) => `
          <div class="content-row">
            <div class="row-key">${k.replace(/_/g, ' ')}</div>
            <div class="row-val">${renderValue(v)}</div>
          </div>
        `).join('');

      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${data?.project_name || 'Document'}</title>
  <style>
    :root {
      --bg: #fafafa;
      --surface: #ffffff;
      --border: #e8e8e8;
      --text: #1a1a1a;
      --text-muted: #666;
      --primary: #111;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .header {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--primary);
    }
    h1 {
      font-size: 32px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      overflow: hidden;
    }
    .content-row {
      display: flex;
      border-bottom: 1px solid var(--border);
    }
    .content-row:last-child {
      border-bottom: none;
    }
    .row-key {
      flex: 0 0 200px;
      padding: 20px;
      background: #fcfcfc;
      font-weight: 600;
      font-size: 13px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-right: 1px solid var(--border);
    }
    .row-val {
      flex: 1;
      padding: 20px;
      font-size: 15px;
    }
    .fallback-list {
      margin: 0;
      padding-left: 20px;
      color: var(--text);
    }
    .fallback-list li {
      margin-bottom: 8px;
    }
    .fallback-list li:last-child {
      margin-bottom: 0;
    }
    .fallback-dict {
      background: #f9f9f9;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #eee;
    }
    .dict-key {
      font-weight: 600;
      color: var(--primary);
    }
    .fallback-text {
      white-space: pre-wrap;
    }
    @media (max-width: 600px) {
      .content-row { flex-direction: column; }
      .row-key { border-right: none; border-bottom: 1px solid var(--border); }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data?.project_name || 'Document'}</h1>
  </div>
  <div class="content-card">
    ${rows}
  </div>
</body>
</html>`;
    }

    if (autoprint) {
      html = html.replace('</body>', '<script>window.onload=function(){window.print()}</script></body>');
    }

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error rendering preview:', error);
    return new NextResponse('<h1>Preview failed</h1>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

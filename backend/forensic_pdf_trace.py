"""
FORENSIC DIAGNOSTIC — Invoice PDF Text Extraction

This script renders a minimal invoice HTML (same as our template, same values
as the user's screenshot), converts it to PDF using the backend's own printing 
mechanism, then extracts text via PyMuPDF — exactly as the re-upload pipeline does.

Run: python forensic_pdf_trace.py

Requirements: pip install pymupdf (fitz), weasyprint OR use puppeteer/wkhtmltopdf
"""
import sys
import os

# Try PyMuPDF
try:
    import fitz
    print("✓ PyMuPDF (fitz) available")
except ImportError:
    print("✗ PyMuPDF not available — run: pip install pymupdf")
    sys.exit(1)

# Try to find an existing generated invoice PDF in uploads
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
pdf_files = []
if os.path.exists(uploads_dir):
    pdf_files = [f for f in os.listdir(uploads_dir) if f.endswith('.pdf')]
    print(f"Found {len(pdf_files)} PDFs in uploads/: {pdf_files[:5]}")

# If no PDFs in uploads, create a minimal HTML invoice and extract from it
# We'll simulate with a plain text version first to understand the extraction format

# The exact values from the user's screenshot:
# FRONTEND | 15 | ₹20 | ₹300
# BACKEND  | 20 | ₹20 | ₹400
# DATABASE | 20 | ₹5  | ₹100
# Subtotal ₹800
# Discount -₹20
# Taxable ₹780
# GST 80
# Total ₹880

# We need to simulate what PyMuPDF sees when it reads the invoice PDF.
# The critical question: does PyMuPDF concatenate adjacent columns?

# Let's create a minimal HTML, convert to PDF, and extract text
minimal_html = """<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
body { font-family: Arial, sans-serif; margin: 20px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 5px; font-size: 10pt; }
td.r { text-align: right; }
td.lc { text-align: right; padding-right: 10px; }
td.ac { text-align: right; }
</style>
</head>
<body>
<h2>INVOICE MWU-INV-XXX</h2>
<table>
  <thead>
    <tr>
      <th style="width:50%;text-align:left">Description</th>
      <th style="width:12%;text-align:right">Hours</th>
      <th style="width:19%;text-align:right">Unit Price</th>
      <th style="width:19%;text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>FRONTEND</td>
      <td class="r">15</td>
      <td class="r">₹20</td>
      <td class="r">₹300</td>
    </tr>
    <tr>
      <td>BACKEND</td>
      <td class="r">20</td>
      <td class="r">₹20</td>
      <td class="r">₹400</td>
    </tr>
    <tr>
      <td>DATABASE</td>
      <td class="r">20</td>
      <td class="r">₹5</td>
      <td class="r">₹100</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="2"></td>
      <td class="lc">Subtotal</td>
      <td class="ac">₹800</td>
    </tr>
    <tr>
      <td colspan="2"></td>
      <td class="lc">Discount</td>
      <td class="ac">-₹20</td>
    </tr>
    <tr>
      <td colspan="2"></td>
      <td class="lc">Taxable</td>
      <td class="ac">₹780</td>
    </tr>
    <tr>
      <td colspan="2"></td>
      <td class="lc">GST</td>
      <td class="ac">₹80</td>
    </tr>
    <tr>
      <td colspan="2"></td>
      <td class="lc">Total</td>
      <td class="ac">₹880</td>
    </tr>
  </tfoot>
</table>
</body>
</html>"""

# Write the HTML
html_path = "/tmp/test_invoice.html"
pdf_path  = "/tmp/test_invoice.pdf"

with open(html_path, "w", encoding="utf-8") as f:
    f.write(minimal_html)
print(f"\n✓ Wrote test HTML to {html_path}")

# Try to convert HTML to PDF using wkhtmltopdf, weasyprint, or puppeteer
pdf_created = False

# Try weasyprint first
try:
    from weasyprint import HTML
    HTML(string=minimal_html).write_pdf(pdf_path)
    print(f"✓ PDF created with WeasyPrint: {pdf_path}")
    pdf_created = True
except ImportError:
    print("  WeasyPrint not available")
except Exception as e:
    print(f"  WeasyPrint error: {e}")

if not pdf_created:
    # Try wkhtmltopdf
    import subprocess
    result = subprocess.run(
        ["wkhtmltopdf", "--encoding", "utf-8", html_path, pdf_path],
        capture_output=True, text=True
    )
    if result.returncode == 0 and os.path.exists(pdf_path):
        print(f"✓ PDF created with wkhtmltopdf: {pdf_path}")
        pdf_created = True
    else:
        print(f"  wkhtmltopdf not available or failed: {result.stderr[:200]}")

if not pdf_created:
    print("\n⚠ Could not create test PDF — analyzing existing PDFs only")

# Now extract text from the PDF (if available)
def extract_and_analyze(path: str, label: str):
    print(f"\n{'='*60}")
    print(f"EXTRACTING: {label}")
    print(f"{'='*60}")
    
    doc = fitz.open(path)
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        
        # Method 1: Simple text extraction (what our pipeline uses)
        raw_text = page.get_text("text")
        print(f"\n[RAW TEXT - page.get_text('text')]:\n{raw_text}")
        
        # Method 2: Word-level extraction to see positions
        words = page.get_text("words")
        print(f"\n[WORD POSITIONS (x0,y0,x1,y1,text,block,line,word)]:")
        for w in words:
            x0, y0, x1, y1, text, block_no, line_no, word_no = w
            print(f"  ({x0:.1f},{y0:.1f}) → ({x1:.1f},{y1:.1f}) [{block_no},{line_no},{word_no}] = {repr(text)}")
        
        # Method 3: Dict for block/line structure
        blocks = page.get_text("dict")["blocks"]
        print(f"\n[BLOCK STRUCTURE]:")
        for block in blocks:
            if block.get("type") == 0:  # text block
                for line in block.get("lines", []):
                    line_texts = [span["text"] for span in line["spans"]]
                    bbox = line["bbox"]
                    print(f"  y={bbox[1]:.1f} | {''.join(line_texts)}")
    
    doc.close()

if pdf_created:
    extract_and_analyze(pdf_path, "Test Invoice (minimal HTML)")

# Also analyze any existing PDFs
for pdf_file in pdf_files[:2]:  # max 2
    extract_and_analyze(os.path.join(uploads_dir, pdf_file), f"Existing: {pdf_file}")

print("\n" + "="*60)
print("ANALYSIS COMPLETE")
print("="*60)
print("""
KEY THINGS TO CHECK:
1. Does '₹20' appear as '₹20' or is it split/merged with adjacent values?
2. Does the hours column value (e.g. '15') merge with unit price '₹20' → '15₹20'?
3. Does unit price '₹20' merge with amount '₹300' → '₹20₹300' or '20300'?
4. Does 'Discount' label merge with '-₹20' → 'Discount-₹20'?
5. Is GST text visible in the raw extraction?

If ₹20 → ₹220, the likely cause is:
  - PDF text order: hours=20, then unit_price=₹20 extracted as '20₹20' → AI reads 220
  - Or: unit_price column and amount column merged: '₹20₹300' → AI reads 220+0
""")

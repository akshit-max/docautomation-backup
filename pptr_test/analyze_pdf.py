import fitz
import sys

def analyze_pdf(path):
    with open('analysis_output.txt', 'w', encoding='utf-8') as f:
        f.write(f"\n--- ANALYZING: {path} ---\n")
        doc = fitz.open(path)
        page = doc[0]
        
        # 1. Fonts used
        f.write("\n[FONTS EMBEDDED]\n")
        for font in page.get_fonts():
            f.write(str(font) + "\n")
            
        # 2. Text blocks
        f.write("\n[TEXT BLOCKS]\n")
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block.get("type") == 0:
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span["text"]
                        f.write(f"Font: {span['font']} | Size: {span['size']:.1f} | Text: '{text}'\n")

if len(sys.argv) > 1:
    analyze_pdf(sys.argv[1])
else:
    analyze_pdf('test_invoice.pdf')

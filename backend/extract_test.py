import os
import fitz

uploads_dir = 'uploads'
for filename in os.listdir(uploads_dir):
    if filename.endswith('.pdf'):
        filepath = os.path.join(uploads_dir, filename)
        try:
            doc = fitz.open(filepath)
            text = ""
            for page in doc:
                text += page.get_text("text")
            
            if "FRONTEND" in text or "₹" in text or "20" in text:
                print(f"--- {filename} ---")
                lines = text.split('\n')
                for i, line in enumerate(lines):
                    if "FRONTEND" in line or "BACKEND" in line or "DATABASE" in line:
                        start = max(0, i - 2)
                        end = min(len(lines), i + 10)
                        print("\n".join(lines[start:end]))
                        break
        except Exception as e:
            print(f"Error reading {filename}: {e}")

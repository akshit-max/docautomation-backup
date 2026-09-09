import firebase_admin
from firebase_admin import credentials, firestore
import urllib.request
import time

cred = credentials.Certificate(r"..\backend\service-account.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

doc_data = {
    "title": "Test Invoice 20",
    "template_type": "invoice",
    "status": "Draft",
    "content": {
        "project_name": "TEST PROJECT",
        "client_name": "TEST CLIENT",
        "line_items": [
            {"description": "FRONTEND", "hours": "15", "unit_price": 20, "amount": 300},
            {"description": "BACKEND", "hours": "20", "unit_price": 20, "amount": 400},
            {"description": "DATABASE", "hours": "20", "unit_price": 5, "amount": 100}
        ],
        "subtotal": 800,
        "discount": 20,
        "taxable_amount": 780,
        "gst_percent": 10,
        "gst_amount": 78,
        "total": 858
    }
}

_, doc_ref = db.collection('documents').add(doc_data)
doc_id = doc_ref.id
print(f"Created doc: {doc_id}")

time.sleep(2)

print("Requesting PDF generation...")
backend_url = f"http://localhost:8000/generate-pdf/{doc_id}"

try:
    with urllib.request.urlopen(backend_url) as response:
        if response.status == 200:
            pdf_path = f"test_invoice_new.pdf"
            with open(pdf_path, "wb") as f:
                f.write(response.read())
            print(f"PDF saved to {pdf_path}")
        else:
            print(f"Failed to generate PDF: {response.status}")
except Exception as e:
    print(f"Error: {e}")

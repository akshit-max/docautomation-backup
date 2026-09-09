import urllib.request
import json
import mimetypes
import uuid

def post_multipart(url, filename, filepath):
    boundary = uuid.uuid4().hex
    with open(filepath, 'rb') as f:
        file_content = f.read()
    
    body = bytearray()
    body.extend(f"--{boundary}\r\n".encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode('utf-8'))
    body.extend(b'Content-Type: application/pdf\r\n\r\n')
    body.extend(file_content)
    body.extend(f"\r\n--{boundary}--\r\n".encode('utf-8'))
    
    req = urllib.request.Request(url, data=body)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    with urllib.request.urlopen(req) as response:
        with open("ocr_response.json", "w", encoding="utf-8") as out:
            out.write(response.read().decode('utf-8'))

post_multipart("http://localhost:8000/ocr", "test_invoice.pdf", "test_invoice.pdf")

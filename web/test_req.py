import urllib.request, json
url = 'https://openrouter.ai/api/v1/chat/completions'
headers = {
    'Authorization': 'Bearer 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',
    'Content-Type': 'application/json'
}
prompt = '''You are an AI document classifier.
Classify the following text into ONE of these types:
- receipt_template
- developer_doc
- client_doc
- compliance
- invoice
- timeline

Rules:
- Return ONLY the exact type string. No explanation.
- If it looks like a payment receipt, return "receipt_template"
- If it's a technical spec or developer task, return "developer_doc"
- If it's a client proposal or quotation, return "client_doc"
- If it's an HR or legal compliance document, return "compliance"
- If it's an invoice, return "invoice"
- If it's a project timeline, return "timeline"

Text to classify:
INVOICE NO. MWU-INV-003
DATE: 2026-07-23
PROJECT NAME: Web Dev
DESCRIPTION: Build website
TOTAL: 500'''

data = {
    'model': 'openai/gpt-oss-20b:free',
    'temperature': 0.1,
    'max_tokens': 10,
    'messages': [{'role': 'user', 'content': prompt}]
}
req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
try:
    response = urllib.request.urlopen(req)
    print(response.read().decode('utf-8'))
except Exception as e:
    print('Error:', e)

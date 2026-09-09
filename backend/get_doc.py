from google.cloud import firestore
import json

db = firestore.Client(project="makewithus-document-automation")
docs = db.collection('documents').where('template_type', '==', 'invoice').limit(1).stream()
for doc in docs:
    print(doc.id)
    print(json.dumps(doc.to_dict()['content'], indent=2))

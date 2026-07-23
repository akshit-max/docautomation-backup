import sys

def clean_documents():
    path = r"d:\MWU Documentation\docautomation\backend\app\api\documents.py"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    start_str = "from fastapi import APIRouter, HTTPException, Depends"
    start_idx = content.find(start_str)
    
    if start_idx != -1:
        new_content = content[start_idx:]
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print("Cleaned documents.py")
    else:
        print("start_str not found in documents.py")

clean_documents()

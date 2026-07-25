export class OCRService {
  /**
   * Sends a file buffer to the Python OCR microservice and returns the extracted text.
   */
  static async extractText(fileBuffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const pythonFormData = new FormData();
    // Wrap Buffer in Uint8Array for Blob compatibility in TS
    pythonFormData.append('file', new Blob([new Uint8Array(fileBuffer)], { type: mimeType }), filename);

    const pythonUrl = process.env.PYTHON_OCR_URL || 'http://localhost:8000/ocr';
    
    const ocrTimeout = new AbortController();
    const ocrTimeoutId = setTimeout(() => ocrTimeout.abort(), 90000); // 90s timeout

    let ocrResponse;
    try {
      ocrResponse = await fetch(pythonUrl, {
        method: 'POST',
        body: pythonFormData,
        signal: ocrTimeout.signal,
      });
      clearTimeout(ocrTimeoutId);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('OCR service timed out. The document may be too large.');
      }
      throw new Error('OCR service unreachable. Make sure the OCR server is running.');
    }

    if (!ocrResponse.ok) {
      const errText = await ocrResponse.text();
      let detail = 'OCR processing failed';
      try {
        const errObj = JSON.parse(errText);
        if (errObj.detail) detail = errObj.detail;
      } catch {
        detail = errText || detail;
      }
      throw new Error(detail);
    }

    const ocrData = await ocrResponse.json();
    return ocrData.extracted_text;
  }
}

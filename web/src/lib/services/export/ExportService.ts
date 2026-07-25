import { Parser } from 'json2csv';
import * as xlsx from 'xlsx';

export class ExportService {
  
  /**
   * Generates a raw JSON string of the content.
   */
  static exportJson(content: Record<string, any>): string {
    return JSON.stringify(content, null, 2);
  }

  /**
   * Generates a CSV representation of the content.
   * Flattens arrays gracefully by serializing them as readable text.
   */
  static exportCsv(content: Record<string, any>): string {
    const flatContent = this.prepareFlatObject(content);
    
    // Ensure we have an array to parse even if it's a single object
    const data = [flatContent];
    
    try {
      const parser = new Parser();
      return parser.parse(data);
    } catch (err) {
      console.error("Failed to generate CSV:", err);
      throw new Error("Failed to generate CSV");
    }
  }

  /**
   * Generates an Excel workbook (Buffer) of the content.
   */
  static exportExcel(content: Record<string, any>): Buffer {
    const flatContent = this.prepareFlatObject(content);
    
    // Create worksheet from JSON
    const ws = xlsx.utils.json_to_sheet([flatContent]);
    
    // Create a new workbook and append the worksheet
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Document Data');
    
    // Write workbook to buffer
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Helper to serialize nested arrays and objects into simple text strings
   * so they appear cleanly in CSV and Excel columns instead of [object Object].
   */
  private static prepareFlatObject(content: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(content)) {
      if (Array.isArray(value)) {
        // If it's an array of objects (like Invoice items or Contract clauses)
        // we serialize them as a readable text block.
        if (value.length > 0 && typeof value[0] === 'object') {
          result[key] = value.map(item => {
            return Object.entries(item)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ');
          }).join(' | ');
        } else {
          // Simple array of strings/numbers
          result[key] = value.join(', ');
        }
      } else if (typeof value === 'object' && value !== null) {
        // Flat string serialization for nested objects
        result[key] = JSON.stringify(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}

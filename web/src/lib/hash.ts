import crypto from 'crypto';

/**
 * Deterministically stringifies an object by sorting its keys.
 * Handles nested objects and arrays.
 */
function deterministicStringify(obj: any): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') return `"${obj}"`;
    return String(obj);
  }
  
  if (Array.isArray(obj)) {
    const arrayElements = obj.map((el) => deterministicStringify(el)).join(',');
    return `[${arrayElements}]`;
  }
  
  const sortedKeys = Object.keys(obj).sort();
  const objectElements = sortedKeys.map((key) => {
    return `"${key}":${deterministicStringify(obj[key])}`;
  }).join(',');
  
  return `{${objectElements}}`;
}

/**
 * Generates a SHA-256 hash for a given content object.
 * The object is deterministically stringified before hashing,
 * ensuring identical objects produce the same hash regardless of key order.
 */
export function generateContentHash(content: any): string {
  const stableString = deterministicStringify(content);
  return crypto.createHash('sha256').update(stableString).digest('hex');
}

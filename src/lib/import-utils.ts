/**
 * Detects the CSV separator (comma or semicolon).
 */
export function detectSeparator(text: string): string {
  const lines = text.split('\n').slice(0, 5);
  let commaCount = 0;
  let semicolonCount = 0;

  lines.forEach((line) => {
    commaCount += (line.match(/,/g) || []).length;
    semicolonCount += (line.match(/;/g) || []).length;
  });

  return semicolonCount > commaCount ? ';' : ',';
}

/**
 * Normalizes a string value from CSV:
 * - Trims whitespace
 * - Converts empty strings to null
 * - Normalizes French decimals (12,34 -> 12.34) if it looks like a number
 */
export function normalizeValue(value: string | null | undefined): string | number | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  // Check if it's a French number (e.g. "12,34")
  // Regex: matches optional sign, followed by digits, then optional comma/dot and more digits.
  // We only replace if there's exactly one comma and it's surrounded by digits.
  if (/^-?\d+,\d+$/.test(trimmed)) {
    return parseFloat(trimmed.replace(',', '.'));
  }

  // Check if it's a standard number
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  return trimmed;
}

/**
 * Normalizes headers (trim, lowercase, remove quotes)
 */
export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/^["']|["']$/g, '');
}

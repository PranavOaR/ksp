import { z } from 'zod';
import { CaseInputSchema, type CaseInput } from './intel/createCase';

/** Minimal RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

export const CSV_TEMPLATE_HEADER =
  'crime_type,district,occurred_at,status,modus_operandi,description,accused_names,victim_names';

export const CSV_TEMPLATE_EXAMPLE =
  'Theft,Mysuru,2026-06-14T21:30,Open,Two-wheeler drive-by snatching,"Gold chain snatched near market","Ramesh K;Suresh P","Lakshmi D"';

export interface CsvRowResult {
  rowNumber: number;
  ok: boolean;
  error?: string;
  input?: CaseInput;
}

function namesToPersons(cell: string): Array<{ name: string; age: number; gender: 'Unknown'; occupation: string }> {
  return cell
    .split(';')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, age: 0, gender: 'Unknown' as const, occupation: 'Unknown' }));
}

/** Maps parsed CSV rows onto validated case inputs, reporting per-row errors. */
export function rowsToCaseInputs(rows: string[][]): CsvRowResult[] {
  if (rows.length === 0) return [];
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const expected = CSV_TEMPLATE_HEADER.split(',');
  const indexOf = (column: string) => header.indexOf(column);
  const missing = expected.filter((column) => !header.includes(column));
  if (missing.length > 0) {
    return [{ rowNumber: 1, ok: false, error: `Missing columns: ${missing.join(', ')}` }];
  }

  return rows.slice(1).map((row, index) => {
    const rowNumber = index + 2; // 1-based, after header
    const cell = (column: string) => (row[indexOf(column)] ?? '').trim();
    const candidate = {
      crimeType: cell('crime_type'),
      district: cell('district'),
      occurredAt: cell('occurred_at'),
      status: cell('status') || 'Open',
      modusOperandi: cell('modus_operandi'),
      description: cell('description'),
      accused: namesToPersons(cell('accused_names')),
      victims: namesToPersons(cell('victim_names')),
      assets: [],
    };
    const parsed = CaseInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        rowNumber,
        ok: false,
        error: `${firstIssue.path.join('.')}: ${firstIssue.message}`,
      };
    }
    return { rowNumber, ok: true, input: parsed.data };
  });
}

export type { CaseInput };
export { z };

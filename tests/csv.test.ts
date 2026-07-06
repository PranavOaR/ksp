import { describe, expect, test } from 'vitest';
import { CSV_TEMPLATE_EXAMPLE, CSV_TEMPLATE_HEADER, parseCsv, rowsToCaseInputs } from '@/lib/csv';

describe('parseCsv', () => {
  test('parses quoted fields containing commas and escaped quotes', () => {
    const rows = parseCsv('a,"b, with comma","say ""hi"""\nc,d,e');

    expect(rows).toEqual([
      ['a', 'b, with comma', 'say "hi"'],
      ['c', 'd', 'e'],
    ]);
  });

  test('handles CRLF line endings and skips blank lines', () => {
    const rows = parseCsv('a,b\r\n\r\nc,d\r\n');

    expect(rows).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});

describe('rowsToCaseInputs', () => {
  test('accepts the shipped template example', () => {
    const rows = parseCsv(`${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}`);

    const results = rowsToCaseInputs(rows);

    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(true);
    expect(results[0].input?.crimeType).toBe('Theft');
    expect(results[0].input?.accused).toHaveLength(2);
    expect(results[0].input?.victims).toHaveLength(1);
  });

  test('rejects rows with invalid values but keeps valid rows', () => {
    const csv = [
      CSV_TEMPLATE_HEADER,
      'Theft,Mysuru,2026-06-14T21:30,Open,Chain snatching,Valid case,"A B","C D"',
      'Jaywalking,Mysuru,2026-06-14T21:30,Open,Whatever,Invalid crime type,"A B",',
    ].join('\n');

    const results = rowsToCaseInputs(parseCsv(csv));

    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(false);
    expect(results[1].error).toContain('crimeType');
    expect(results[1].rowNumber).toBe(3);
  });

  test('reports missing columns instead of guessing', () => {
    const results = rowsToCaseInputs(parseCsv('crime_type,district\nTheft,Mysuru'));

    expect(results[0].ok).toBe(false);
    expect(results[0].error).toContain('Missing columns');
  });
});

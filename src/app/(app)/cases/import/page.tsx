'use client';

import { useState } from 'react';
import { CSV_TEMPLATE_EXAMPLE, CSV_TEMPLATE_HEADER } from '@/lib/csv';
import { Card, PageHeader } from '@/components/ui';
import { RoleGate } from '@/components/RoleGate';

interface ImportResult {
  imported: number;
  rejected: Array<{ row: number; reason: string }>;
}

function ImportPageInner() {
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const downloadTemplate = () => {
    const blob = new Blob([`${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}\n`], {
      type: 'text/csv',
    });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'drishti-case-template.csv';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setCsvText(await file.text());
  };

  const submit = async () => {
    setError(null);
    setResult(null);
    setIsBusy(true);
    try {
      const response = await fetch('/api/import', { method: 'POST', body: csvText });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) {
        setError(body?.error ?? 'Import failed.');
        return;
      }
      setResult(body.data as ImportResult);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Bulk Import"
        subtitle="Onboard your unit's case records from CSV — each row is validated before it touches the database"
      />

      <Card title="1 · Get the template">
        <p className="mb-3 text-sm text-[var(--text-secondary)]">
          Columns: <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-xs">{CSV_TEMPLATE_HEADER}</code>
          <br />
          Multiple accused/victims are separated with semicolons.
        </p>
        <button type="button" onClick={downloadTemplate} className="btn-ghost px-4 py-2 text-xs">
          ⬇ Download template CSV
        </button>
      </Card>

      <Card title="2 · Upload or paste">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFile(event.target.files?.[0])}
          className="mb-3 block text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent-soft)] file:px-4 file:py-2 file:text-xs file:font-semibold file:text-[var(--accent-deep)]"
        />
        <textarea
          rows={8}
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          placeholder={`${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_EXAMPLE}`}
          className="w-full resize-y rounded-lg border border-[var(--border-1)] bg-white px-3 py-2.5 font-mono text-xs outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isBusy || !csvText.trim()}
          className="btn-primary mt-3 px-6 py-2.5 text-sm disabled:opacity-50"
        >
          {isBusy ? 'Importing…' : 'Validate & import →'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      {result && (
        <Card title="3 · Result">
          <p className="text-sm text-[var(--text-primary)]">
            <strong className="text-emerald-700">{result.imported} imported</strong>
            {' · '}
            <strong className={result.rejected.length ? 'text-red-600' : ''}>
              {result.rejected.length} rejected
            </strong>
          </p>
          {result.rejected.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
              {result.rejected.slice(0, 20).map((rejection) => (
                <li key={rejection.row}>
                  Row {rejection.row}: <span className="text-red-600">{rejection.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <RoleGate allow={['Supervisor', 'Administrator']}>
      <ImportPageInner />
    </RoleGate>
  );
}

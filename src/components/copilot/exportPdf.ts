import type { ChatTurn } from './types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function turnToHtml(turn: ChatTurn): string {
  if (!turn.response) return '';
  const { response } = turn;
  const evidence = response.evidence
    .map((reference) => `<span class="evidence">${escapeHtml(reference)}</span>`)
    .join(' ');
  const firRows = response.firs
    .slice(0, 10)
    .map(
      (fir) =>
        `<tr><td>${escapeHtml(fir.fir_number)}</td><td>${escapeHtml(fir.crime_type)}</td><td>${escapeHtml(
          fir.district
        )}</td><td>${escapeHtml(fir.occurred_at.slice(0, 10))}</td><td>${escapeHtml(fir.status)}</td></tr>`
    )
    .join('');

  return `
  <section class="turn">
    <div class="meta">${escapeHtml(new Date(turn.askedAt).toLocaleString('en-IN'))} · confidence ${Math.round(
      response.confidence * 100
    )}% · ${response.engine === 'claude' ? 'Claude AI' : 'Rule engine'}</div>
    <div class="question">Q: ${escapeHtml(turn.question)}</div>
    <div class="answer">${escapeHtml(response.answer)}</div>
    ${
      firRows
        ? `<table><thead><tr><th>FIR</th><th>Type</th><th>District</th><th>Date</th><th>Status</th></tr></thead><tbody>${firRows}</tbody></table>`
        : ''
    }
    ${evidence ? `<div class="evidence-row">Evidence: ${evidence}</div>` : ''}
  </section>`;
}

/**
 * Conversation report as a self-contained printable HTML document (PRD A5).
 * Printing to PDF via the browser keeps Kannada text rendering correct
 * without embedding fonts.
 */
export function buildConversationHtml(turns: readonly ChatTurn[]): string {
  const body = turns.map(turnToHtml).join('\n');
  const generatedAt = new Date().toLocaleString('en-IN');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>DRISHTI Conversation Report</title>
<style>
  body { font-family: Georgia, 'Noto Serif Kannada', serif; color: #111827; margin: 40px; }
  header { border-bottom: 3px solid #1c5cab; padding-bottom: 12px; margin-bottom: 24px; }
  h1 { margin: 0; font-size: 22px; color: #1c5cab; letter-spacing: 2px; }
  .subtitle { color: #6b7280; font-size: 12px; margin-top: 4px; }
  .turn { margin-bottom: 22px; page-break-inside: avoid; border-left: 3px solid #e5e7eb; padding-left: 14px; }
  .meta { font-size: 10px; color: #9ca3af; margin-bottom: 4px; }
  .question { font-weight: bold; margin-bottom: 6px; }
  .answer { margin-bottom: 8px; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; margin-bottom: 8px; }
  th, td { border: 1px solid #d1d5db; padding: 4px 8px; text-align: left; }
  th { background: #f3f4f6; }
  .evidence-row { font-size: 10px; color: #6b7280; }
  .evidence { font-family: monospace; background: #f3f4f6; padding: 1px 5px; border-radius: 3px; margin-right: 4px; }
  footer { margin-top: 30px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
</style>
</head>
<body>
<header>
  <h1>DRISHTI</h1>
  <div class="subtitle">KSP Crime Intelligence Copilot — Conversation Report · Generated ${escapeHtml(
    generatedAt
  )} · Synthetic demonstration data</div>
</header>
${body}
<footer>All queries and exports are recorded in the DRISHTI audit trail (Module J2). This report contains evidence references for every AI-generated answer (Module I1).</footer>
</body>
</html>`;
}

/** Opens the report in a new window and triggers the browser print-to-PDF dialog. */
export function exportConversationPdf(turns: readonly ChatTurn[]): void {
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) return;
  reportWindow.document.write(buildConversationHtml(turns));
  reportWindow.document.close();
  reportWindow.focus();
  // Give the new document a beat to lay out before invoking print
  reportWindow.setTimeout(() => reportWindow.print(), 300);
}

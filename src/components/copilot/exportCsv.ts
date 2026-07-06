import type { ChatTurn } from './types';

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Conversation export with evidence references and timestamps (PRD A5). */
export function conversationToCsv(turns: readonly ChatTurn[]): string {
  const header = ['timestamp', 'question', 'answer', 'confidence', 'evidence_references'];
  const rows = turns
    .filter((turn) => turn.response)
    .map((turn) =>
      [
        turn.askedAt,
        turn.question,
        turn.response!.answer,
        `${Math.round(turn.response!.confidence * 100)}%`,
        turn.response!.evidence.join('; '),
      ]
        .map(csvEscape)
        .join(',')
    );
  return [header.join(','), ...rows].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

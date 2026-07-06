'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/clientApi';
import type { QueryFilter } from '@/lib/intel/types';
import { LoadingState, PageHeader } from '@/components/ui';
import { ResponseCard } from '@/components/copilot/ResponseCard';
import { conversationToCsv, downloadCsv } from '@/components/copilot/exportCsv';
import type { ChatResponse, ChatTurn } from '@/components/copilot/types';

const SUGGESTIONS = [
  'Show all burglary FIRs in Bengaluru during March 2026',
  'List repeat offenders involved in cybercrime',
  'Show theft cases in Mysuru',
  'Only solved cases',
  'How many murders in Belagavi in 2025?',
];

function CopilotChat() {
  const searchParams = useSearchParams();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const contextRef = useRef<QueryFilter | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialQueryHandled = useRef(false);

  const ask = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setIsBusy(true);
    const turnId = Date.now();
    const askedAt = new Date().toISOString();
    setTurns((previous) => [
      ...previous,
      { id: turnId, question: trimmed, askedAt, response: null, error: null },
    ]);
    try {
      const response = await apiFetch<ChatResponse>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed, context: contextRef.current }),
      });
      contextRef.current = response.filter;
      setTurns((previous) =>
        previous.map((turn) => (turn.id === turnId ? { ...turn, response } : turn))
      );
    } catch (error) {
      setTurns((previous) =>
        previous.map((turn) =>
          turn.id === turnId
            ? { ...turn, error: error instanceof Error ? error.message : 'Query failed' }
            : turn
        )
      );
    } finally {
      setIsBusy(false);
    }
  }, []);

  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery && !initialQueryHandled.current) {
      initialQueryHandled.current = true;
      void ask(initialQuery);
    }
  }, [searchParams, ask]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void ask(input);
    setInput('');
  };

  const handleExport = () => {
    downloadCsv(`drishti-conversation-${Date.now()}.csv`, conversationToCsv(turns));
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-4xl flex-col">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Intelligence Copilot"
          subtitle="Ask in plain English — follow-ups refine the previous question (Modules A & I)"
        />
        <button
          type="button"
          onClick={handleExport}
          disabled={turns.every((turn) => !turn.response)}
          className="shrink-0 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--series-1)] hover:text-[var(--text-primary)] disabled:opacity-40"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="card flex-1 space-y-5 overflow-y-auto p-5">
        {turns.length === 0 && (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">
            <p className="mb-4">Start with one of these:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  className="rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--series-1)] hover:text-[var(--text-primary)]"
                >
                  “{suggestion}”
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#1c5cab] px-4 py-2 text-sm text-white">
                {turn.question}
              </div>
            </div>
            <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-[var(--border-1)] bg-[var(--surface-2)]/60 px-4 py-3">
              {turn.error ? (
                <p className="text-sm text-red-400">{turn.error}</p>
              ) : turn.response ? (
                <ResponseCard response={turn.response} />
              ) : (
                <p className="animate-pulse text-sm text-[var(--text-muted)]">Analysing…</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder='e.g. "Show theft cases in Mysuru" … then "Only solved cases"'
          className="flex-1 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--series-1)]"
          disabled={isBusy}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className="rounded-xl bg-[#1c5cab] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <CopilotChat />
    </Suspense>
  );
}

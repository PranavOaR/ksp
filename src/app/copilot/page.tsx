'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/clientApi';
import type { QueryFilter } from '@/lib/intel/types';
import { LoadingState, PageHeader } from '@/components/ui';
import { ResponseCard } from '@/components/copilot/ResponseCard';
import { conversationToCsv, downloadCsv } from '@/components/copilot/exportCsv';
import { exportConversationPdf } from '@/components/copilot/exportPdf';
import { useVoice, type VoiceLanguage } from '@/components/copilot/useVoice';
import type { ChatResponse, ChatTurn } from '@/components/copilot/types';

const SUGGESTIONS = [
  'Show all burglary FIRs in Bengaluru during March 2026',
  'List repeat offenders involved in cybercrime',
  'Show theft cases in Mysuru',
  'Only solved cases',
  'How many murders in Belagavi in 2025?',
  'ಮೈಸೂರಿನಲ್ಲಿ ಕಳ್ಳತನ ಪ್ರಕರಣಗಳನ್ನು ತೋರಿಸಿ',
];

function CopilotChat() {
  const searchParams = useSearchParams();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  // One language setting drives voice recognition, spoken answers AND answer text
  const [language, setLanguage] = useState<'en' | 'kn'>('en');
  const [shouldSpeakAnswers, setShouldSpeakAnswers] = useState(false);
  const contextRef = useRef<QueryFilter | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialQueryHandled = useRef(false);
  const shouldSpeakRef = useRef(false);
  shouldSpeakRef.current = shouldSpeakAnswers;
  const languageRef = useRef<'en' | 'kn'>('en');
  languageRef.current = language;
  const voiceLanguage: VoiceLanguage = language === 'kn' ? 'kn-IN' : 'en-IN';

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
        body: JSON.stringify({
          message: trimmed,
          context: contextRef.current,
          answerLanguage: languageRef.current,
        }),
      });
      contextRef.current = response.filter;
      setTurns((previous) =>
        previous.map((turn) => (turn.id === turnId ? { ...turn, response } : turn))
      );
      if (shouldSpeakRef.current) {
        voiceRef.current?.speak(response.answer, response.language === 'kn' ? 'kn-IN' : 'en-IN');
      }
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

  const voice = useVoice((transcript) => {
    setInput('');
    void ask(transcript);
  });
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

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

  const logExport = (action: 'export_pdf' | 'export_csv') => {
    void apiFetch('/api/audit', {
      method: 'POST',
      body: JSON.stringify({ action, detail: `${turns.length} conversation turns` }),
    }).catch(() => undefined);
  };

  const handleCsvExport = () => {
    downloadCsv(`drishti-conversation-${Date.now()}.csv`, conversationToCsv(turns));
    logExport('export_csv');
  };

  const handlePdfExport = () => {
    exportConversationPdf(turns);
    logExport('export_pdf');
  };

  const hasExportableTurns = turns.some((turn) => turn.response);
  const isKannada = language === 'kn';

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-4xl flex-col">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Intelligence Copilot"
          subtitle="Ask in English or ಕನ್ನಡ — typed or spoken. Follow-ups refine the previous question."
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleCsvExport}
            disabled={!hasExportableTurns}
            className="rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--series-1)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            ⬇ CSV
          </button>
          <button
            type="button"
            onClick={handlePdfExport}
            disabled={!hasExportableTurns}
            className="rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:border-[var(--series-1)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            ⬇ PDF
          </button>
        </div>
      </div>

      <div className="card flex-1 space-y-5 overflow-y-auto p-5">
        {turns.length === 0 && (
          <div className="py-10 text-center text-sm text-[var(--text-muted)]">
            <p className="mb-4">Start with one of these, or tap the mic:</p>
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

      <form onSubmit={handleSubmit} className="mt-4 space-y-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLanguage(isKannada ? 'en' : 'kn')}
            title={`Language for answers and voice input: ${isKannada ? 'Kannada' : 'English'}. Click to switch.`}
            className={`rounded-xl border px-3 text-sm transition-colors ${
              isKannada
                ? 'border-[var(--series-1)] bg-[var(--series-1)]/15 text-[var(--series-1)]'
                : 'border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--series-1)]'
            }`}
          >
            {isKannada ? 'ಕನ್ನಡ' : 'EN'}
          </button>
          <button
            type="button"
            disabled={!voice.isSupported}
            onClick={() =>
              voice.isListening ? voice.stopListening() : voice.startListening(voiceLanguage)
            }
            title={
              !voice.isSupported
                ? 'Voice input needs Chrome or Edge'
                : voice.isListening
                  ? 'Stop listening'
                  : `Ask by voice (${isKannada ? 'Kannada' : 'English'})`
            }
            className={`rounded-xl border px-3 text-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              voice.isListening
                ? 'animate-pulse border-red-500 bg-red-500/15 text-red-400'
                : 'border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--series-1)]'
            }`}
          >
            {voice.isListening ? '◼' : '🎤'}
          </button>
          <input
            value={voice.isListening && voice.interimTranscript ? voice.interimTranscript : input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={
              voice.isListening
                ? isKannada
                  ? 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ…'
                  : 'Listening…'
                : 'e.g. "Show theft cases in Mysuru" … then "Only solved cases"'
            }
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
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={shouldSpeakAnswers}
              onChange={(event) => {
                setShouldSpeakAnswers(event.target.checked);
                if (!event.target.checked) voice.stopSpeaking();
              }}
              className="accent-[#1c5cab]"
            />
            🔊 Read answers aloud
          </label>
          {voice.recognitionError && (
            <p className="text-xs text-red-400">{voice.recognitionError}</p>
          )}
          {shouldSpeakAnswers && isKannada && !voice.hasKannadaVoice && (
            <p className="text-xs text-amber-400">
              No Kannada text-to-speech voice is installed in this browser, so Kannada answers
              can&apos;t be read aloud. On macOS: System Settings → Accessibility → Spoken Content →
              System Voice → Manage Voices → add Kannada. English read-aloud still works.
            </p>
          )}
        </div>
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

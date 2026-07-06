import { describe, expect, test } from 'vitest';
import { buildConversationHtml } from '@/components/copilot/exportPdf';
import type { ChatTurn } from '@/components/copilot/types';

function makeTurn(overrides: Partial<ChatTurn> = {}): ChatTurn {
  return {
    id: 1,
    question: 'Show theft cases in Mysuru',
    askedAt: '2026-07-06T10:00:00.000Z',
    error: null,
    response: {
      answer: 'Found 3 Theft cases in Mysuru.',
      kind: 'firs',
      firs: [
        {
          id: 4,
          fir_number: 'FIR/2026/MYS/0004',
          crime_type: 'Theft',
          district: 'Mysuru',
          station_name: 'Mysuru North PS',
          description: 'Theft reported',
          modus_operandi: 'Lock-picking of parked vehicles',
          occurred_at: '2026-02-06T22:00:00',
          status: 'Open',
        },
      ],
      offenders: [],
      totalCount: 3,
      evidence: ['FIR/2026/MYS/0004'],
      reasoningTrail: ['Crime type Theft'],
      confidence: 0.85,
      isRefinement: false,
      filter: { intent: 'listFirs' },
      engine: 'claude',
      language: 'en',
    },
    ...overrides,
  };
}

describe('buildConversationHtml (A5 PDF export)', () => {
  test('includes question, answer, evidence and FIR table rows', () => {
    const html = buildConversationHtml([makeTurn()]);

    expect(html).toContain('Show theft cases in Mysuru');
    expect(html).toContain('Found 3 Theft cases in Mysuru.');
    expect(html).toContain('FIR/2026/MYS/0004');
    expect(html).toContain('confidence 85%');
    expect(html).toContain('Claude AI');
  });

  test('escapes HTML in user-controlled content', () => {
    const html = buildConversationHtml([
      makeTurn({ question: '<script>alert("xss")</script>' }),
    ]);

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  test('skips turns that have no response', () => {
    const html = buildConversationHtml([
      makeTurn({ response: null, error: 'failed' }),
    ]);

    expect(html).not.toContain('Show theft cases');
  });

  test('preserves Kannada text as-is', () => {
    const turn = makeTurn();
    turn.response!.answer = 'ಮೈಸೂರಿನಲ್ಲಿ 3 ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು ಕಂಡುಬಂದಿವೆ.';

    const html = buildConversationHtml([turn]);

    expect(html).toContain('ಮೈಸೂರಿನಲ್ಲಿ 3 ಕಳ್ಳತನ ಪ್ರಕರಣಗಳು');
  });
});

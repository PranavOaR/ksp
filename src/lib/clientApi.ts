'use client';

import type { ApiEnvelope } from './api';

/**
 * Fetch wrapper: unwraps the API envelope and throws on failure. Identity
 * travels via the httpOnly session cookie only — never client-set headers.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!envelope || !envelope.success || envelope.data === null) {
    throw new Error(envelope?.error ?? `Request to ${path} failed (${response.status})`);
  }
  return envelope.data;
}

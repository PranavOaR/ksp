'use client';

import type { ApiEnvelope } from './api';

const ROLE_STORAGE_KEY = 'drishti-role';

export function getStoredRole(): string {
  if (typeof window === 'undefined') return 'Investigator';
  return window.localStorage.getItem(ROLE_STORAGE_KEY) ?? 'Investigator';
}

export function setStoredRole(role: string): void {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
}

/** Fetch wrapper: unwraps the API envelope and throws on failure. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-drishti-role': getStoredRole(),
      ...init?.headers,
    },
  });
  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!envelope || !envelope.success || envelope.data === null) {
    throw new Error(envelope?.error ?? `Request to ${path} failed (${response.status})`);
  }
  return envelope.data;
}

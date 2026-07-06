'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CRIME_TYPES, DISTRICTS, FIR_STATUSES } from '@/lib/constants';
import { apiFetch } from '@/lib/clientApi';
import { Card, PageHeader } from '@/components/ui';

interface PersonRow {
  name: string;
  age: string;
  gender: string;
  occupation: string;
}

interface AssetRow {
  type: 'phone' | 'vehicle' | 'bank_account';
  identifier: string;
}

const EMPTY_PERSON: PersonRow = { name: '', age: '', gender: 'Unknown', occupation: '' };

function PersonListEditor({
  label,
  rows,
  onChange,
}: {
  label: string;
  rows: PersonRow[];
  onChange: (rows: PersonRow[]) => void;
}) {
  const update = (index: number, patch: Partial<PersonRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onChange([...rows, { ...EMPTY_PERSON }])}
          className="btn-ghost px-3 py-1 text-xs"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_70px_110px_1fr_32px] gap-2">
            <input
              value={row.name}
              onChange={(event) => update(index, { name: event.target.value })}
              placeholder="Full name"
              className="rounded-lg border border-[var(--border-1)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <input
              value={row.age}
              onChange={(event) => update(index, { age: event.target.value.replace(/\D/g, '') })}
              placeholder="Age"
              inputMode="numeric"
              className="rounded-lg border border-[var(--border-1)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <select
              value={row.gender}
              onChange={(event) => update(index, { gender: event.target.value })}
              className="rounded-lg border border-[var(--border-1)] bg-white px-2 py-2 text-sm outline-none"
            >
              {['Unknown', 'Male', 'Female', 'Other'].map((gender) => (
                <option key={gender}>{gender}</option>
              ))}
            </select>
            <input
              value={row.occupation}
              onChange={(event) => update(index, { occupation: event.target.value })}
              placeholder="Occupation"
              className="rounded-lg border border-[var(--border-1)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="text-sm text-red-600 hover:text-red-700"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">None added yet.</p>
        )}
      </div>
    </div>
  );
}

export default function NewCasePage() {
  const router = useRouter();
  const [crimeType, setCrimeType] = useState<string>(CRIME_TYPES[0]);
  const [district, setDistrict] = useState<string>(DISTRICTS[0]);
  const [occurredAt, setOccurredAt] = useState('');
  const [status, setStatus] = useState<string>('Open');
  const [modusOperandi, setModusOperandi] = useState('');
  const [description, setDescription] = useState('');
  const [accused, setAccused] = useState<PersonRow[]>([]);
  const [victims, setVictims] = useState<PersonRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const toPersonPayload = (rows: PersonRow[]) =>
    rows
      .filter((row) => row.name.trim().length >= 2)
      .map((row) => ({
        name: row.name.trim(),
        age: Number(row.age) || 0,
        gender: row.gender as 'Male' | 'Female' | 'Other' | 'Unknown',
        occupation: row.occupation.trim() || 'Unknown',
      }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    try {
      const created = await apiFetch<{ id: number; firNumber: string }>('/api/cases', {
        method: 'POST',
        body: JSON.stringify({
          crimeType,
          district,
          occurredAt,
          status,
          modusOperandi: modusOperandi.trim(),
          description: description.trim(),
          accused: toPersonPayload(accused),
          victims: toPersonPayload(victims),
          assets: assets.filter((asset) => asset.identifier.trim().length >= 3),
        }),
      });
      router.push(`/cases/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the case file.');
      setIsBusy(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-[var(--border-1)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="New Case File"
        subtitle="Registered under your identity and immediately available to every intelligence module"
      />

      <form onSubmit={submit} className="space-y-6">
        <Card title="Incident">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Crime type
              <select value={crimeType} onChange={(e) => setCrimeType(e.target.value)} className={`${inputClass} mt-1`}>
                {CRIME_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              District
              <select value={district} onChange={(e) => setDistrict(e.target.value)} className={`${inputClass} mt-1`}>
                {DISTRICTS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Occurred at
              <input
                type="datetime-local"
                required
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-xs font-medium text-[var(--text-secondary)]">
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mt-1`}>
                {FIR_STATUSES.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-xs font-medium text-[var(--text-secondary)]">
            Modus operandi
            <input
              required
              minLength={3}
              maxLength={200}
              value={modusOperandi}
              onChange={(e) => setModusOperandi(e.target.value)}
              placeholder="e.g. Night-time break-in via rear entry"
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="mt-4 block text-xs font-medium text-[var(--text-secondary)]">
            Description
            <textarea
              required
              minLength={3}
              maxLength={1000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief factual description of the incident"
              className={`${inputClass} mt-1 resize-y`}
            />
          </label>
        </Card>

        <Card title="People">
          <div className="space-y-6">
            <PersonListEditor label="Accused" rows={accused} onChange={setAccused} />
            <PersonListEditor label="Victims" rows={victims} onChange={setVictims} />
          </div>
        </Card>

        <Card title="Linked assets" subtitle="Phones, vehicles or bank accounts connected to the case">
          <div className="space-y-2">
            {assets.map((asset, index) => (
              <div key={index} className="grid grid-cols-[140px_1fr_32px] gap-2">
                <select
                  value={asset.type}
                  onChange={(event) =>
                    setAssets(assets.map((row, i) => (i === index ? { ...row, type: event.target.value as AssetRow['type'] } : row)))
                  }
                  className="rounded-lg border border-[var(--border-1)] bg-white px-2 py-2 text-sm outline-none"
                >
                  <option value="phone">Phone</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="bank_account">Bank account</option>
                </select>
                <input
                  value={asset.identifier}
                  onChange={(event) =>
                    setAssets(assets.map((row, i) => (i === index ? { ...row, identifier: event.target.value } : row)))
                  }
                  placeholder="e.g. +91-9xxxxxxxxx / KA-01-AB-1234 / AC12345678"
                  className="rounded-lg border border-[var(--border-1)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setAssets(assets.filter((_, i) => i !== index))}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAssets([...assets, { type: 'phone', identifier: '' }])}
              className="btn-ghost px-3 py-1 text-xs"
            >
              + Add asset
            </button>
          </div>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={isBusy} className="btn-primary px-7 py-3 text-sm disabled:opacity-50">
            {isBusy ? 'Registering…' : 'Register case file →'}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-ghost px-5 py-3 text-sm">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

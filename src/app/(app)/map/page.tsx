'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/clientApi';
import { CRIME_TYPES } from '@/lib/constants';
import { ErrorState, LoadingState, PageHeader } from '@/components/ui';
import { useLanguage } from '@/lib/i18n';
import type { LayerToggles, MapData } from '@/components/map/CrimeDensityMap';

// Leaflet touches `window` — client-only render.
const CrimeDensityMap = dynamic(
  () => import('@/components/map/CrimeDensityMap').then((module) => module.CrimeDensityMap),
  { ssr: false }
);

export default function MapPage() {
  const { t } = useLanguage();
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<LayerToggles>({
    density: true,
    forecast: true,
    emerging: true,
  });
  const [crimeTypeFilter, setCrimeTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<MapData>('/api/map')
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState label={t('map.loading')} />;

  const toggle = (layer: keyof LayerToggles) =>
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));

  const layerButton = (layer: keyof LayerToggles, label: string, activeClass: string) => (
    <button
      type="button"
      onClick={() => toggle(layer)}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        layers[layer]
          ? activeClass
          : 'border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex h-full flex-col space-y-4">
      <PageHeader title={t('map.title')} subtitle={t('map.subtitle')} />

      <div className="flex flex-wrap items-center gap-2">
        {layerButton('density', t('map.layer.density'), 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]')}
        {layerButton('forecast', t('map.layer.forecast'), 'border-red-500/60 bg-red-500/10 text-red-400')}
        {layerButton('emerging', t('map.layer.emerging'), 'border-amber-500/60 bg-amber-500/10 text-amber-500')}

        <select
          value={crimeTypeFilter ?? ''}
          onChange={(event) => setCrimeTypeFilter(event.target.value || null)}
          className="ml-auto rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--text-primary)]"
        >
          <option value="">{t('map.filter.all')}</option>
          {CRIME_TYPES.map((crimeType) => (
            <option key={crimeType} value={crimeType}>
              {crimeType}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-[520px] flex-1">
        <CrimeDensityMap data={data} layers={layers} crimeTypeFilter={crimeTypeFilter} />
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">{t('map.legend.forecastNote')}</p>
    </div>
  );
}

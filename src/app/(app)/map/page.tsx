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
      className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${
        layers[layer]
          ? activeClass
          : 'border-[var(--border-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeader title={t('map.title')} subtitle={t('map.subtitle')} />

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Filter panel — all controls on one side */}
        <aside className="shrink-0 space-y-4 lg:w-56">
          <div className="card card-static space-y-2 p-4">
            <p className="kicker">{t('map.title')}</p>
            {layerButton('density', t('map.layer.density'), 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]')}
            {layerButton('forecast', t('map.layer.forecast'), 'border-red-500/60 bg-red-500/10 text-red-400')}
            {layerButton('emerging', t('map.layer.emerging'), 'border-amber-500/60 bg-amber-500/10 text-amber-500')}
          </div>

          <div className="card card-static space-y-2 p-4">
            <p className="kicker">{t('map.filter.all')}</p>
            <select
              value={crimeTypeFilter ?? ''}
              onChange={(event) => setCrimeTypeFilter(event.target.value || null)}
              className="w-full rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] px-2.5 py-2 text-xs text-[var(--text-primary)]"
            >
              <option value="">{t('map.filter.all')}</option>
              {CRIME_TYPES.map((crimeType) => (
                <option key={crimeType} value={crimeType}>
                  {crimeType}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            {t('map.legend.forecastNote')}
          </p>
        </aside>

        {/* Tall map frame — Karnataka is a tall state, give it vertical room */}
        <div className="h-[78vh] min-h-[600px] flex-1">
          <CrimeDensityMap data={data} layers={layers} crimeTypeFilter={crimeTypeFilter} />
        </div>
      </div>
    </div>
  );
}

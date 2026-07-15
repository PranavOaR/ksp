'use client';

import 'leaflet/dist/leaflet.css';
import { useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import { Circle, CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { karnatakaGeoRing } from '@/components/landing/karnatakaPath';
import type { Hotspot } from '@/lib/intel/hotspots';
import type { DistrictForecast, MapPoint } from '@/app/api/map/route';

export interface MapData {
  points: MapPoint[];
  hotspots: Array<Hotspot & { lat: number | null; lon: number | null }>;
  forecasts: DistrictForecast[];
}

export interface LayerToggles {
  density: boolean;
  forecast: boolean;
  emerging: boolean;
}

/** Karnataka framing. */
const MAP_CENTER: [number, number] = [14.6, 76.2];
const MAP_ZOOM = 7;
/** Camera stays inside Karnataka: bbox with a small margin, no country-level zoom-out. */
const MAP_BOUNDS: [[number, number], [number, number]] = [
  [11.3, 73.8],
  [18.7, 78.9],
];
const MAP_MIN_ZOOM = 6;
/** True state extent — used to fit the full state into the frame. */
const STATE_BOUNDS: [[number, number], [number, number]] = [
  [11.57, 74.09],
  [18.46, 78.58],
];
/** Outer ring for the inverse mask: world rectangle with Karnataka as a hole. */
const WORLD_RING: Array<[number, number]> = [
  [-89, -179],
  [89, -179],
  [89, 179],
  [-89, 179],
];
/** ~2km bins keep the density readable at state zoom. */
const GRID_BIN_DEGREES = 0.02;
/** OpenStreetMap raster — the CARTO CDN is unreachable on some networks. */
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface DensityBin {
  lat: number;
  lon: number;
  count: number;
  topCrimeType: string;
}

function binPoints(points: MapPoint[]): DensityBin[] {
  const bins = new Map<string, { lat: number; lon: number; count: number; types: Map<string, number> }>();
  for (const point of points) {
    const key = `${Math.round(point.lat / GRID_BIN_DEGREES)}:${Math.round(point.lon / GRID_BIN_DEGREES)}`;
    const bin =
      bins.get(key) ?? { lat: 0, lon: 0, count: 0, types: new Map<string, number>() };
    bin.lat += point.lat;
    bin.lon += point.lon;
    bin.count += 1;
    bin.types.set(point.crimeType, (bin.types.get(point.crimeType) ?? 0) + 1);
    bins.set(key, bin);
  }
  return [...bins.values()].map((bin) => ({
    lat: bin.lat / bin.count,
    lon: bin.lon / bin.count,
    count: bin.count,
    topCrimeType: [...bin.types.entries()].sort((a, b) => b[1] - a[1])[0][0],
  }));
}

/** Registers a tile-load error listener so offline demos degrade politely. */
function TileErrorWatcher({ onTileError }: { onTileError: () => void }) {
  const map = useMap();
  useMemo(() => {
    map.on('tileerror', onTileError);
  }, [map, onTileError]);
  return null;
}

export function CrimeDensityMap({
  data,
  layers,
  crimeTypeFilter,
}: {
  data: MapData;
  layers: LayerToggles;
  crimeTypeFilter: string | null;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const stateRing = useMemo(() => karnatakaGeoRing(), []);

  const bins = useMemo(() => {
    const filtered = crimeTypeFilter
      ? data.points.filter((point) => point.crimeType === crimeTypeFilter)
      : data.points;
    return binPoints(filtered);
  }, [data.points, crimeTypeFilter]);
  const maxBinCount = Math.max(...bins.map((bin) => bin.count), 1);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-[var(--border-1)]">
      {tilesFailed && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] text-amber-500">
          Basemap tiles unavailable offline — showing incident layers only
        </div>
      )}
      <button
        type="button"
        onClick={() => mapRef.current?.fitBounds(STATE_BOUNDS, { padding: [8, 8] })}
        aria-label="Reset view"
        title="Reset view"
        className="absolute left-[10px] top-[80px] z-[1000] flex h-[30px] w-[30px] items-center justify-center rounded-[4px] border-2 border-[rgba(0,0,0,0.2)] bg-white text-sm text-[#333] hover:bg-[#f4f4f4]"
      >
        ⟳
      </button>
      <MapContainer
        ref={mapRef}
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        minZoom={MAP_MIN_ZOOM}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1}
        scrollWheelZoom
        preferCanvas
        whenReady={() => mapRef.current?.fitBounds(STATE_BOUNDS, { padding: [8, 8] })}
        className="h-full w-full bg-[var(--surface-2)]"
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          updateWhenZooming={false}
          keepBuffer={4}
        />
        <TileErrorWatcher onTileError={() => setTilesFailed(true)} />

        {/* Inverse mask: hide everything outside Karnataka; draw the state border. */}
        <Polygon
          positions={[WORLD_RING, stateRing]}
          interactive={false}
          pathOptions={{
            color: '#7d7668',
            weight: 2,
            fillColor: '#f4f1ea',
            fillOpacity: 1,
            fillRule: 'evenodd',
          }}
        />

        {layers.density &&
          bins.map((bin) => (
            <CircleMarker
              key={`${bin.lat}:${bin.lon}`}
              center={[bin.lat, bin.lon]}
              radius={4 + Math.sqrt(bin.count / maxBinCount) * 14}
              pathOptions={{
                color: 'transparent',
                fillColor: '#e05a1c',
                fillOpacity: 0.25 + (bin.count / maxBinCount) * 0.5,
              }}
            >
              <Tooltip direction="top">
                {bin.count} incident{bin.count === 1 ? '' : 's'} · mostly {bin.topCrimeType}
              </Tooltip>
            </CircleMarker>
          ))}

        {layers.emerging &&
          data.hotspots
            .filter((hotspot) => hotspot.isEmerging && hotspot.lat != null && hotspot.lon != null)
            .map((hotspot) => (
              <Circle
                key={`emerging-${hotspot.region}`}
                center={[hotspot.lat!, hotspot.lon!]}
                radius={18_000}
                pathOptions={{
                  color: '#f59e0b',
                  weight: 2,
                  fillColor: '#f59e0b',
                  fillOpacity: 0.08,
                }}
              >
                <Tooltip direction="top" permanent>
                  {hotspot.region}: +{hotspot.growthPercent}% QoQ
                </Tooltip>
              </Circle>
            ))}

        {layers.forecast &&
          data.forecasts.map((forecast) => (
            <Circle
              key={`forecast-${forecast.district}`}
              center={[forecast.lat, forecast.lon]}
              radius={8_000 + Math.min(Math.max(forecast.predictedQuarter, 0), 120) * 250}
              pathOptions={{
                color: forecast.growthPercent > 0 ? '#ef4444' : '#22c55e',
                weight: 1.5,
                dashArray: '6 6',
                fillOpacity: 0,
              }}
            >
              <Tooltip direction="top">
                {forecast.district}: forecast {forecast.predictedQuarter} cases next quarter (
                {forecast.growthPercent >= 0 ? '+' : ''}
                {forecast.growthPercent}% vs last)
              </Tooltip>
            </Circle>
          ))}
      </MapContainer>
    </div>
  );
}

import { describe, expect, test } from 'vitest';
import { forecastMonthly } from '@/lib/intel/forecast';

describe('forecastMonthly (H1)', () => {
  test('projects a rising linear trend forward', () => {
    // Arrange: perfectly linear history 10, 20, 30
    const history = [
      { month: '2026-01', count: 10 },
      { month: '2026-02', count: 20 },
      { month: '2026-03', count: 30 },
    ];

    // Act
    const series = forecastMonthly(history, 2);

    // Assert
    const forecasts = series.filter((point) => point.isForecast);
    expect(forecasts).toEqual([
      { month: '2026-04', count: 40, isForecast: true },
      { month: '2026-05', count: 50, isForecast: true },
    ]);
  });

  test('rolls the month over a year boundary', () => {
    const history = [
      { month: '2025-10', count: 5 },
      { month: '2025-11', count: 5 },
      { month: '2025-12', count: 5 },
    ];

    const series = forecastMonthly(history, 1);

    expect(series.at(-1)?.month).toBe('2026-01');
  });

  test('never forecasts negative counts on a falling trend', () => {
    const history = [
      { month: '2026-01', count: 6 },
      { month: '2026-02', count: 3 },
      { month: '2026-03', count: 0 },
    ];

    const series = forecastMonthly(history, 3);

    for (const point of series.filter((entry) => entry.isForecast)) {
      expect(point.count).toBeGreaterThanOrEqual(0);
    }
  });

  test('returns history untouched when too short to fit a trend', () => {
    const history = [{ month: '2026-01', count: 4 }];

    const series = forecastMonthly(history, 3);

    expect(series).toHaveLength(1);
    expect(series[0].isForecast).toBe(false);
  });
});

export interface MonthlyPoint {
  /** e.g. "2026-03" */
  month: string;
  count: number;
}

export interface ForecastPoint extends MonthlyPoint {
  isForecast: boolean;
}

function nextMonth(month: string): string {
  const [year, mm] = month.split('-').map(Number);
  const next = mm === 12 ? `${year + 1}-01` : `${year}-${String(mm + 1).padStart(2, '0')}`;
  return next;
}

/**
 * Crime trend forecasting (PRD H1): ordinary least-squares trend over the
 * historical monthly series, projected `horizon` months ahead. Simple and
 * explainable — appropriate for an early-warning signal, not sentencing.
 */
export function forecastMonthly(history: readonly MonthlyPoint[], horizon: number): ForecastPoint[] {
  const observed: ForecastPoint[] = history.map((point) => ({ ...point, isForecast: false }));
  if (history.length < 3 || horizon <= 0) return observed;

  const n = history.length;
  const meanX = (n - 1) / 2;
  const meanY = history.reduce((sum, point) => sum + point.count, 0) / n;
  let covariance = 0;
  let variance = 0;
  history.forEach((point, index) => {
    covariance += (index - meanX) * (point.count - meanY);
    variance += (index - meanX) ** 2;
  });
  const slope = variance === 0 ? 0 : covariance / variance;
  const intercept = meanY - slope * meanX;

  const forecasts: ForecastPoint[] = [];
  let month = history[n - 1].month;
  for (let step = 1; step <= horizon; step += 1) {
    month = nextMonth(month);
    const predicted = Math.max(0, Math.round(intercept + slope * (n - 1 + step)));
    forecasts.push({ month, count: predicted, isForecast: true });
  }
  return [...observed, ...forecasts];
}

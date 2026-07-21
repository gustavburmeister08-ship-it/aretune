// Population benchmarks for the Performance Score (scoring.docx §4.2).
//
// Pilot scope (2026-07-21 research spike): only metrics with an objective,
// consistently-logged raw value can get a real percentile — most catalog
// metrics are subjective 0-10 self-ratings and are intentionally excluded
// here rather than benchmarked against invented norms. Two metrics
// qualified:
//
//   - body_sleep_sleep_duration (hours/night)
//   - vocation_finance_wealth_monthly_income (EUR/month)
//
// Each curve is reconstructed by linear interpolation between a small
// number of *real, cited* anchor points — not a fabricated distribution.
// Age/gender adjustment is NOT applied where the source data itself isn't
// split that way (documented per metric below); do not add finer-grained
// claims than the source actually supports.

interface BenchmarkPoint {
  value: number;
  percentile: number;
}

interface BenchmarkDefinition {
  unit: string;
  source: string;
  population: string;
  asOf: string;
  points: readonly BenchmarkPoint[];
}

const BENCHMARKS: Partial<Record<string, BenchmarkDefinition>> = {
  body_sleep_sleep_duration: {
    unit: 'hours',
    source:
      'CDC/MMWR "Prevalence of Healthy Sleep Duration among Adults — United States, 2014" ' +
      '(cdc.gov/mmwr/volumes/65/wr/mm6506a1.htm). Percentile curve reconstructed from the ' +
      'reported bucketed shares (≤5h 11.8%, 6h 23.0%, 7h 29.5%, 8h 27.7%, 9h 4.4%, >9h 3.6%).',
    population: 'US adults, self-reported sleep duration. Source is not split by age or gender.',
    asOf: '2014 survey data, published 2016',
    points: [
      { value: 4, percentile: 6 },
      { value: 5, percentile: 12 },
      { value: 6, percentile: 35 },
      { value: 7, percentile: 64 },
      { value: 8, percentile: 92 },
      { value: 9, percentile: 96 },
      { value: 10, percentile: 100 },
    ],
  },
  vocation_finance_wealth_monthly_income: {
    unit: 'EUR/month',
    source:
      'Destatis Pressemitteilung PD26_113_621 (April 2026), "Mittlerer Bruttojahresverdienst ' +
      'lag 2025 bei 54 066 Euro" (destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_113_621.html). ' +
      'Annual gross figures divided by 12 as an approximation of a monthly value.',
    population:
      'Germany, full-time employees, gross annual earnings (not net, not age/gender-adjusted). ' +
      'The tracked metric is a self-reported monthly figure of unspecified gross/net basis, so this ' +
      'comparison is approximate.',
    asOf: 'Reporting year 2025, published April 2026',
    points: [
      { value: 33_828 / 12, percentile: 10 },
      { value: 44_215 / 12, percentile: 30 },
      { value: 54_066 / 12, percentile: 50 },
      { value: 100_719 / 12, percentile: 90 },
      { value: 219_110 / 12, percentile: 99 },
    ],
  },
};

export interface BenchmarkResult {
  percentile: number;
  label: string;
  source: string;
  population: string;
}

export function hasBenchmark(metricId: string): boolean {
  return metricId in BENCHMARKS;
}

export function percentileFor(metricId: string, value: number): BenchmarkResult | null {
  const definition = BENCHMARKS[metricId];
  if (!definition || !Number.isFinite(value)) return null;

  const points = definition.points;
  const percentile = interpolate(points, value);
  const rounded = Math.round(Math.min(100, Math.max(0, percentile)));
  const label = rounded >= 50 ? `Top ${Math.max(1, 100 - rounded)}%` : `Bottom ${Math.max(1, rounded)}%`;

  return { percentile: rounded, label, source: definition.source, population: definition.population };
}

function interpolate(points: readonly BenchmarkPoint[], value: number): number {
  if (value <= points[0].value) return points[0].percentile;
  const last = points[points.length - 1];
  if (value >= last.value) return last.percentile;

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (value >= a.value && value <= b.value) {
      const ratio = (value - a.value) / (b.value - a.value);
      return a.percentile + ratio * (b.percentile - a.percentile);
    }
  }
  return last.percentile;
}

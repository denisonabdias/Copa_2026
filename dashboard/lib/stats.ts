export type Stats = {
  max: number;
  avg: number;
  median: number;
};

export function calcStats(values: number[]): Stats {
  if (values.length === 0) return { max: 0, avg: 0, median: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];
  const avg = parseFloat(
    (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
  );
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2))
      : sorted[mid];
  return { max, avg, median };
}

export function pct(value: number, max: number): number {
  return max === 0 ? 0 : Math.round((value / max) * 100);
}

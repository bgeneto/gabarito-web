/** Standard normal PDF at x given mean μ and std dev σ. */
export function normalPdf(x: number, mean: number, stdDev: number): number {
  if (stdDev <= 0) {
    return x === mean ? 1 : 0;
  }
  const coefficient = 1 / (stdDev * Math.sqrt(2 * Math.PI));
  const exponent = -((x - mean) ** 2) / (2 * stdDev ** 2);
  return coefficient * Math.exp(exponent);
}

export interface NormalCurvePoint {
  x: number;
  y: number;
}

export function buildNormalCurvePoints(
  mean: number,
  stdDev: number,
  minX = 0,
  maxX = 100,
  steps = 80,
): NormalCurvePoint[] {
  const effectiveStdDev = stdDev > 0 ? stdDev : 1;
  const points: NormalCurvePoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const x = minX + ((maxX - minX) * i) / steps;
    points.push({
      x,
      y: normalPdf(x, mean, effectiveStdDev),
    });
  }

  return points;
}

export function pointsToSvgPath(
  points: NormalCurvePoint[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
  maxY?: number,
): string {
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const peakY = maxY ?? Math.max(...points.map((point) => point.y), 0.0001);

  const toSvgX = (x: number) => padding.left + (x / 100) * plotWidth;
  const toSvgY = (y: number) =>
    padding.top + plotHeight - (y / peakY) * plotHeight;

  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${toSvgX(point.x).toFixed(2)} ${toSvgY(point.y).toFixed(2)}`;
    })
    .join(" ");
}

export function percentToSvgX(
  percent: number,
  width: number,
  padding: { left: number; right: number },
): number {
  const plotWidth = width - padding.left - padding.right;
  const clamped = Math.max(0, Math.min(100, percent));
  return padding.left + (clamped / 100) * plotWidth;
}

export function formatMetricPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatMetricNumber(value: number): string {
  return value.toFixed(2);
}

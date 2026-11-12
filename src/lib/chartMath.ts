/** Geometry helpers for the SVG charts. Pure so they can be tested. */

/** Arc length and dash offset for each slice of a donut drawn with stroke-dasharray. */
export function donutSegments(values: number[], circumference: number): { length: number; offset: number }[] {
  const clean = values.map((v) => Math.max(v, 0));
  const total = clean.reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  let used = 0;
  return clean.map((v) => {
    const length = (v / total) * circumference;
    const seg = { length, offset: used === 0 ? 0 : -used };
    used += length;
    return seg;
  });
}

/** Rounds a maximum up to 1, 2, 2.5 or 5 times a power of ten so axis ticks read cleanly. */
export function niceMax(max: number): number {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) if (max <= step * pow) return step * pow;
  return 10 * pow;
}

/** Screen coordinates for a line chart: x evenly spaced, y flipped so bigger values are higher. */
export function linePoints(values: number[], width: number, height: number, maxValue: number): { x: number; y: number }[] {
  const n = values.length;
  return values.map((v, i) => ({
    x: n === 1 ? width / 2 : (i / (n - 1)) * width,
    y: height - (maxValue > 0 ? (v / maxValue) * height : 0),
  }));
}

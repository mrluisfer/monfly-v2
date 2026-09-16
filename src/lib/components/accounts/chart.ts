/**
 * The geometry the accounts page draws its lines with — the balance chart and
 * each tile's sparkline — so the two curves are the same curve.
 */

type Point = readonly [x: number, y: number];

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * A smooth line through every point that never overshoots one: a monotone
 * cubic (Fritsch–Carlson, d3's `curveMonotoneX`). A balance that holds still
 * draws flat rather than bulging above what it ever was.
 */
export function monotonePath(points: readonly Point[]): string {
	const n = points.length;
	if (n === 0) return '';
	if (n === 1) return `M${round(points[0][0])},${round(points[0][1])}`;

	const h: number[] = [];
	const s: number[] = [];
	for (let i = 0; i < n - 1; i++) {
		h[i] = points[i + 1][0] - points[i][0];
		s[i] = h[i] === 0 ? 0 : (points[i + 1][1] - points[i][1]) / h[i];
	}

	// Each inner point's tangent: flat where the line turns, otherwise the
	// gentler of its two sides, so the curve stays between its neighbours.
	const t: number[] = new Array(n);
	for (let i = 1; i < n - 1; i++) {
		const p = (s[i - 1] * h[i] + s[i] * h[i - 1]) / (h[i - 1] + h[i]);
		t[i] =
			s[i - 1] * s[i] <= 0
				? 0
				: (Math.sign(s[i - 1]) + Math.sign(s[i])) *
					Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p));
	}
	t[0] = n === 2 ? s[0] : (3 * s[0] - t[1]) / 2;
	t[n - 1] = n === 2 ? s[0] : (3 * s[n - 2] - t[n - 2]) / 2;

	let d = `M${round(points[0][0])},${round(points[0][1])}`;
	for (let i = 0; i < n - 1; i++) {
		const [x0, y0] = points[i];
		const [x1, y1] = points[i + 1];
		const dx = (x1 - x0) / 3;
		d += `C${round(x0 + dx)},${round(y0 + dx * t[i])},${round(x1 - dx)},${round(y1 - dx * t[i + 1])},${round(x1)},${round(y1)}`;
	}
	return d;
}

/** The same line closed down to `base`, for the soft fill under it. */
export function areaPath(points: readonly Point[], base: number): string {
	if (points.length < 2) return '';
	const first = points[0][0];
	const last = points[points.length - 1][0];
	return `${monotonePath(points)}L${round(last)},${base}L${round(first)},${base}Z`;
}

/**
 * Round steps for an axis that covers `min`–`max` in about `count` of them:
 * 1, 2 or 5 of a power of ten, as a person would mark a ruler. The ends are
 * widened to whole steps, so the lines never touch the frame.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
	if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
	if (min === max) {
		// Nothing moved: a band around the one value, so the line runs through the middle.
		const pad = Math.max(Math.abs(min) * 0.1, 100);
		min -= pad;
		max += pad;
	}
	const raw = (max - min) / count;
	const power = 10 ** Math.floor(Math.log10(raw));
	const step = ([1, 2, 5, 10].find((m) => m * power >= raw) ?? 10) * power;
	const ticks: number[] = [];
	for (
		let v = Math.floor(min / step) * step;
		v <= Math.ceil(max / step) * step + step / 2;
		v += step
	) {
		ticks.push(Math.round(v));
	}
	return ticks;
}

/** A local day key's place on a line of days, so two keys can be subtracted. */
export const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

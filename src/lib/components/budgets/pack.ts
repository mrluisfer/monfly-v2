/**
 * Packs circles tightly around a middle, biggest first — the bubble chart's
 * layout. Each circle after the first two goes to the spot touching two
 * already placed that sits nearest the middle without overlapping any,
 * nearness measured on an ellipse `aspect` times wider than tall, so the
 * pile spreads to fill a wide box. Deterministic: the server and the browser
 * draw the same bubbles. A dozen circles make a few thousand checks.
 */

export type Placed = { x: number; y: number; r: number };

/** Circles of radius `radii`, in the order given, placed around (0, 0). */
export function pack(radii: number[], { gap = 0, aspect = 1 } = {}): Placed[] {
	const placed: Placed[] = [];
	const far = (x: number, y: number) => (x / aspect) ** 2 + y ** 2;
	const clear = (x: number, y: number, r: number) =>
		placed.every((c) => Math.hypot(x - c.x, y - c.y) >= c.r + r + gap - 1e-6);

	for (const r of radii) {
		if (placed.length === 0) {
			placed.push({ x: 0, y: 0, r });
			continue;
		}
		if (placed.length === 1) {
			const [a] = placed;
			placed.push({ x: a.r + r + gap, y: 0, r });
			continue;
		}

		let best: { x: number; y: number } | null = null;
		for (let i = 0; i < placed.length; i++) {
			for (let j = i + 1; j < placed.length; j++) {
				for (const spot of touching(placed[i], placed[j], r + gap)) {
					if (!clear(spot.x, spot.y, r)) continue;
					if (!best || far(spot.x, spot.y) < far(best.x, best.y)) best = spot;
				}
			}
		}
		// Two circles too far apart to touch both leave no spot between them;
		// failing every pair, it goes beside the one nearest the middle.
		placed.push({ ...(best ?? beside(placed, r, gap)), r });
	}
	return placed;
}

/** The two centres a circle of radius `r` can take touching both `a` and `b`. */
function touching(a: Placed, b: Placed, r: number) {
	const ra = a.r + r;
	const rb = b.r + r;
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const d = Math.hypot(dx, dy);
	if (d === 0 || d > ra + rb || d < Math.abs(ra - rb)) return [];
	const along = (ra * ra - rb * rb + d * d) / (2 * d);
	const h = Math.sqrt(Math.max(0, ra * ra - along * along));
	const mx = a.x + (dx * along) / d;
	const my = a.y + (dy * along) / d;
	return [
		{ x: mx + (dy * h) / d, y: my - (dx * h) / d },
		{ x: mx - (dy * h) / d, y: my + (dx * h) / d }
	];
}

/** A spot to the right of everything placed, level with the middle. */
function beside(placed: Placed[], r: number, gap: number) {
	const right = Math.max(...placed.map((c) => c.x + c.r));
	return { x: right + gap + r, y: 0 };
}

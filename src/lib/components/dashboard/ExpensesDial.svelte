<script lang="ts">
	import { BLOB_COLOR, type BlobColor } from '$lib/components/ui';
	import { cn } from '$lib/utils';

	type Wedge = { from: number; to: number; color: BlobColor };

	/** Angles are clockwise from 12 o'clock. */
	const wedges: Wedge[] = [
		{ from: 268, to: 358, color: 'blue' },
		{ from: 358, to: 60, color: 'violet' },
		{ from: 60, to: 132, color: 'lime' }
	];

	/** The uncategorised remainder reads as hatch, matching the mockup. */
	const hatched = { from: 132, to: 268 };

	/** Thin axis lines that end in a solid pin. */
	const pins = [0, 90, 250];

	const C = 50;
	const R = 44;

	const point = (deg: number, r = R) => {
		const a = ((deg - 90) * Math.PI) / 180;
		return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
	};

	function wedgePath({ from, to }: { from: number; to: number }) {
		const sweep = (to - from + 360) % 360;
		const [x1, y1] = point(from);
		const [x2, y2] = point(to);
		return `M${C},${C} L${x1},${y1} A${R},${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
	}

	let { class: className }: { class?: string } = $props();
</script>

<div class={cn('relative aspect-square', className)}>
	<svg viewBox="0 0 100 100" class="size-full overflow-visible" aria-hidden="true">
		<defs>
			<filter id="dial-soften" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="2.4" />
			</filter>

			<pattern id="dial-hatch" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0" y2="4" stroke="var(--hatch)" stroke-width="1" />
			</pattern>

			{#each wedges as w (w.color)}
				<radialGradient id="dial-{w.color}" cx="42%" cy="38%" r="72%">
					<stop offset="0%" stop-color={BLOB_COLOR[w.color]} stop-opacity="0.95" />
					<stop offset="55%" stop-color={BLOB_COLOR[w.color]} stop-opacity="0.7" />
					<stop offset="100%" stop-color={BLOB_COLOR[w.color]} stop-opacity="0" />
				</radialGradient>
			{/each}
		</defs>

		<path d={wedgePath(hatched)} fill="url(#dial-hatch)" />

		<g filter="url(#dial-soften)">
			{#each wedges as w (w.color)}
				<path d={wedgePath(w)} fill="url(#dial-{w.color})" />
			{/each}
		</g>

		<!-- Axis lines with pin terminals -->
		{#each pins as deg (deg)}
			{@const [x, y] = point(deg, R + 10)}
			<line x1={C} y1={C} x2={x} y2={y} stroke="var(--fg)" stroke-width="0.5" />
			<ellipse cx={x} cy={y} rx="2.9" ry="1.7" fill="var(--fg)" transform="rotate({deg} {x} {y})" />
		{/each}
		<circle cx={C} cy={C} r="1.4" fill="var(--fg)" />
	</svg>
</div>

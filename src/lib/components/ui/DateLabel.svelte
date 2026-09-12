<script module lang="ts">
	type Formats = {
		short: Intl.DateTimeFormat;
		year: Intl.DateTimeFormat;
		long: Intl.DateTimeFormat;
		time: Intl.DateTimeFormat;
	};

	/**
	 * One set per zone, not one per row: an `Intl.DateTimeFormat` is dear to
	 * build and a table asks for hundreds. A plain record, never reactive —
	 * nothing reads it but the lookup below.
	 */
	const FORMATS: Record<string, Formats> = {};

	function formats(timeZone: string): Formats {
		return (FORMATS[timeZone] ??= {
			short: new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric' }),
			year: new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' }),
			long: new Intl.DateTimeFormat('en-US', {
				timeZone,
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			}),
			time: new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
		});
	}
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * A date that reads short and tells all of itself under the pointer: "Sep 2"
	 * — with its year when it isn't this one — then "September 2, 2026 · 4:45 PM"
	 * unrolling out of it left to right, and rolling back when the pointer
	 * leaves.
	 *
	 * The short date holds the label's place. The whole one is a layer over it,
	 * on the card's own surface, clipped to nothing until asked for: it may
	 * reach past its column — a surface of its own, it covers what it passes
	 * rather than running into it — and being out of the flow, no row reflows
	 * and no column keeps room for it. Clipped shut, it isn't there to point at.
	 *
	 * Assistive tech reads the whole date once, and `datetime` carries the
	 * machine-readable instant.
	 *
	 * <DateLabel date={row.date} {timeZone} class="text-sm text-fg-muted" />
	 */
	type Props = {
		/** The instant to draw, as ISO — a transaction's `date`. */
		date: string;
		/** The viewer's zone: the day and the time are drawn in it. */
		timeZone: string;
		class?: string;
	};

	let { date, timeZone, class: className }: Props = $props();

	const at = $derived(new Date(date));
	const format = $derived(formats(timeZone));
	// A year the viewer isn't in is out already, the way the tables have always drawn it.
	const short = $derived(
		format.year.format(at) === format.year.format(new Date())
			? format.short.format(at)
			: `${format.short.format(at)}, ${format.year.format(at)}`
	);
	const whole = $derived(`${format.long.format(at)} · ${format.time.format(at)}`);

	/** Clipped to nothing, and clipped to all of itself. */
	const SHUT = 'inset(0 100% 0 0)';
	const OPEN = 'inset(0 0% 0 0)';

	let layer = $state<HTMLElement>();
	let wipe: gsap.core.Tween | undefined;

	function extend(on: boolean) {
		if (!layer) return;
		wipe?.kill();

		if (prefersReducedMotion()) {
			gsap.set(layer, { clipPath: on ? OPEN : SHUT });
			return;
		}

		// Fast out, a touch quicker back. The inset is a number inside a string,
		// which is GSAP's own ground, and `power4` is the quintic curve
		// everything else here moves on.
		wipe = gsap.to(layer, {
			clipPath: on ? OPEN : SHUT,
			duration: on ? 0.36 : 0.22,
			ease: 'power4.out'
		});
	}
</script>

<time
	datetime={date}
	class={cn('tabular relative whitespace-nowrap', className)}
	onpointerenter={() => extend(true)}
	onpointerleave={() => extend(false)}
	><span aria-hidden="true">{short}</span><span class="sr-only">{whole}</span><span
		bind:this={layer}
		class="whole"
		aria-hidden="true">{whole}</span
	></time
>

<style>
	/* Over the short date, its text exactly where the short date's is: the
	   padding and rim the surface adds, its offset takes back. Above the next
	   cells, below the table's sticky header. The clip unrolls it from the
	   left, so its rim closes on the right last. */
	.whole {
		position: absolute;
		z-index: 1;
		top: calc(-0.125rem - 1px);
		left: calc(-0.375rem - 1px);
		padding: 0.125rem 0.375rem;
		border: 1px solid var(--color-line);
		border-radius: 0.375rem;
		background: var(--color-card);
		clip-path: inset(0 100% 0 0);
	}
</style>

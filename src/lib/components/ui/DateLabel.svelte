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
	 * The whole date shares the short one's place, clipped to nothing until asked
	 * for: both sit in one grid cell, so the label is as wide as the whole date
	 * and its column keeps room for it. Unrolled, it covers the short date and
	 * nothing beside it — no row reflows, and no amount has to make way. Behind
	 * its words it wears the hovered row's own ground — no rim, no padding,
	 * nothing that reads as a surface — only so the short date doesn't show
	 * through. Clipped shut, it isn't there to point at. A table laid out by
	 * shares, as the ledger is, gives the date column that width itself.
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
	/* Both dates share one grid cell, so the label is as wide as the whole one,
	   which unrolls over the short one and nothing else. */
	time {
		display: inline-grid;
	}

	time > span {
		grid-area: 1 / 1;
	}

	/* Its ground is the hovered row's — `sunken`, or what a picked or open row
	   sets as `--date-ground` — so it reads as the row's own text rather than
	   something laid on it. */
	.whole {
		background: var(--date-ground, var(--color-sunken));
		clip-path: inset(0 100% 0 0);
	}
</style>

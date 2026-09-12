<script module lang="ts">
	type Formats = {
		short: Intl.DateTimeFormat;
		year: Intl.DateTimeFormat;
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
			year: new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric' })
		});
	}
</script>

<script lang="ts">
	import gsap from 'gsap';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * A date that reads short and extends under the pointer: "Sep 2", then the
	 * year unrolling out of it left to right — "Sep 2, 2026" — and rolling back
	 * when the pointer leaves.
	 *
	 * One date in one line of text, split in two: the day, then the year in a
	 * box of its own that clips its ink to nothing until asked for. That box is
	 * in the flow from the first paint, so the label is the whole date's width
	 * whatever it is showing — a column of them lines up, and no row reflows as
	 * one opens. Nothing is measured, positioned or duplicated: the container
	 * does the hiding.
	 *
	 * A year the viewer isn't in is already out, the way the tables have always
	 * drawn it, so those have nothing left to extend.
	 *
	 * Assistive tech reads the whole date either way — both halves are real
	 * text — and `datetime` carries the machine-readable instant.
	 *
	 * <DateLabel date={row.date} {timeZone} class="text-sm text-fg-muted" />
	 */
	type Props = {
		/** The instant to draw, as ISO — a transaction's `date`. */
		date: string;
		/** The viewer's zone: the day is drawn in it. */
		timeZone: string;
		class?: string;
	};

	let { date, timeZone, class: className }: Props = $props();

	const at = $derived(new Date(date));
	const format = $derived(formats(timeZone));
	const parts = $derived.by(() => {
		const year = format.year.format(at);
		const day = format.short.format(at);
		return year === format.year.format(new Date())
			? { day, year: `, ${year}` }
			: { day: `${day}, ${year}`, year: '' };
	});

	/** Clipped to nothing, and clipped to all of itself. */
	const SHUT = 'inset(0 100% 0 0)';
	const OPEN = 'inset(0 0% 0 0)';

	// `$state`, because the tail only exists on dates with something to extend.
	let tail = $state<HTMLElement>();
	let wipe: gsap.core.Tween | undefined;

	function extend(on: boolean) {
		if (!tail) return;
		wipe?.kill();

		if (prefersReducedMotion()) {
			gsap.set(tail, { clipPath: on ? OPEN : SHUT });
			return;
		}

		// Fast out, a touch quicker back. The inset is a number inside a string,
		// which is GSAP's own ground, and `power4` is the quintic curve
		// everything else here moves on.
		wipe = gsap.to(tail, {
			clipPath: on ? OPEN : SHUT,
			duration: on ? 0.32 : 0.22,
			ease: 'power4.out'
		});
	}
</script>

<time
	datetime={date}
	class={cn('tabular whitespace-nowrap', className)}
	onpointerenter={() => extend(true)}
	onpointerleave={() => extend(false)}
	>{parts.day}{#if parts.year}<span bind:this={tail} class="tail">{parts.year}</span>{/if}</time
>

<style>
	/* Its own box, and its ink never leaves it. `inline-block` so the clip has a
	   box to work on — an inline box that wraps has none — and `clip-path`
	   rather than `overflow`, which on an inline-block drops the label onto a
	   new baseline. */
	.tail {
		display: inline-block;
		clip-path: inset(0 100% 0 0);
	}
</style>

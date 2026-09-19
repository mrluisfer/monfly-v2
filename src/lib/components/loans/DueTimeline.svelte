<script lang="ts">
	import MovingCalendarCheck from '@jis3r/icons/icons/calendar-check';
	import gsap from 'gsap';
	import { AnimatedIcon, Avatar, PALETTE, Tooltip } from '$lib/components/ui';
	import { formatMoney, type Currency, type DateKey } from '$lib/finance';
	import {
		LOAN_DIRECTION_LABEL,
		daysBetween,
		dueLabel,
		loanDue,
		loanLeft,
		type Loan
	} from '$lib/loans';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { DIRECTION_TINT } from './tone';

	/**
	 * When the open loans fall due, on one line through today: what's coming
	 * back to them stands above it, what they owe hangs below, each a pin with
	 * the other person's blobatar on a stem, as the balance chart's pins stand
	 * on theirs. The stretch already gone is hatched in `negative` — a pin in it
	 * is late. Pins close together climb over one another rather than overlap.
	 * Pointing at one sets the rest back and says what's left and when; a press
	 * opens it in the panel.
	 */
	type Props = {
		/** Every loan: the open ones with a due day are drawn. */
		loans: Loan[];
		today: DateKey;
		currency: Currency;
		selectedId: string | null;
		onSelect: (id: string) => void;
		class?: string;
	};

	let { loans, today, currency, selectedId, onSelect, class: className }: Props = $props();

	/** Pins nearer than this, in percent of the width, climb onto another lane. */
	const GAP = 7;
	const LANES = 3;
	/** A stem's length on the first lane, and what each lane above adds. */
	const STEM = 36;
	const RISE = 30;

	const open = $derived(loans.filter((l) => l.status !== 'paid'));
	const dated = $derived(open.filter((l): l is Loan & { dueOn: DateKey } => l.dueOn !== null));
	const undated = $derived(open.length - dated.length);

	/** A day some days on (or back) from another. */
	const shift = (key: DateKey, days: number): DateKey => {
		const [y, m, d] = key.split('-').map(Number);
		return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10) as DateKey;
	};

	/** At least ten days back and five weeks on, stretched to take in every due day. */
	const range = $derived.by(() => {
		let from = shift(today, -10);
		let to = shift(today, 35);
		for (const loan of dated) {
			if (loan.dueOn < shift(from, 4)) from = shift(loan.dueOn, -4);
			if (loan.dueOn > shift(to, -4)) to = shift(loan.dueOn, 4);
		}
		return { from, to, span: Math.max(1, daysBetween(from, to)) };
	});

	const at = (key: DateKey) => (daysBetween(range.from, key) / range.span) * 100;

	const pins = $derived.by(() => {
		const placed: {
			loan: Loan & { dueOn: DateKey };
			x: number;
			up: boolean;
			lane: number;
		}[] = [];
		for (const up of [true, false]) {
			/** The last x on each lane. */
			const lanes: number[] = [];
			const side = dated
				.filter((l) => (l.direction === 'lent') === up)
				.sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0));
			for (const loan of side) {
				const x = at(loan.dueOn);
				let lane = lanes.findIndex((last) => x - last >= GAP);
				if (lane === -1) lane = Math.min(lanes.length, LANES - 1);
				lanes[lane] = x;
				placed.push({ loan, x, up, lane });
			}
		}
		return placed;
	});

	/** The first of each month in range, where the axis names it. */
	const months = $derived.by(() => {
		const marks: { key: string; x: number; label: string }[] = [];
		const [y, m] = range.from.split('-').map(Number);
		for (let i = 1; i <= 24; i++) {
			const first = new Date(Date.UTC(y, m - 1 + i, 1));
			const key = first.toISOString().slice(0, 10) as DateKey;
			if (key > range.to) break;
			marks.push({
				key,
				x: at(key),
				label: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(first)
			});
		}
		return marks;
	});

	const todayAt = $derived(at(today));
	const money = (cents: number) => formatMoney(Math.round(cents), currency);

	/**
	 * Arriving in view, the line draws itself from the left, the late stretch
	 * and today's mark fade up, and the pins stand up from the line 50 ms apart
	 * (GSAP): stems first, then each head springs onto its stem. Held drawn
	 * until the chart is in view; still under reduced motion.
	 */
	function intro(node: HTMLElement) {
		if (prefersReducedMotion()) return;
		const q = (selector: string) => node.querySelectorAll<HTMLElement>(selector);
		const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
		timeline
			.from(q('.axis'), { scaleX: 0, duration: 0.9 })
			.from(q('.late'), { opacity: 0, duration: 0.6 }, 0.2)
			// Today's parts, not the mark: GSAP writes `translate` inline, and the
			// mark is centred on its day by one.
			.from(q('.today-part'), { opacity: 0, scaleY: 0.4, duration: 0.5 }, 0.3)
			.from(q('.stem'), { scaleY: 0, duration: 0.45, stagger: 0.05 }, 0.45)
			.from(
				q('.head'),
				{ scale: 0.3, opacity: 0, duration: 0.6, ease: 'back.out(2.2)', stagger: 0.05 },
				0.6
			);
		const seen = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				timeline.play();
				seen.disconnect();
			},
			{ threshold: 0.3 }
		);
		seen.observe(node);
		return () => {
			seen.disconnect();
			timeline.progress(1).kill();
		};
	}
</script>

{#if dated.length === 0}
	<div class={cn('flex flex-col items-start gap-3 py-6', className)}>
		<span
			class="grid size-11 place-items-center rounded-full border border-dashed border-hairline text-fg-subtle"
		>
			<AnimatedIcon icon={MovingCalendarCheck} set="moving" size={18} trigger="visible" />
		</span>
		<p class="text-[0.9375rem] text-fg-muted">
			{open.length === 0
				? 'Nothing open, so nothing falls due.'
				: 'No open loan has a due day yet.'}
		</p>
		{#if open.length > 0}
			<p class="text-sm text-fg-muted">Give one a due day and it takes its place on the line.</p>
		{/if}
	</div>
{:else}
	<div class={className}>
		<div class="chart relative h-[18rem] select-none" {@attach intro}>
			<!-- The stretch already gone: a due day in it is late. -->
			<div
				class="late hatch absolute inset-y-3 left-0 rounded-l-xl"
				style="width: {todayAt}%"
				aria-hidden="true"
			></div>

			<!-- Coming back above the line, going out below it. -->
			<span
				class="absolute top-3 right-0 text-[0.6875rem] font-medium tracking-[0.12em] text-positive uppercase"
				aria-hidden="true">Coming back</span
			>
			<span
				class="absolute right-0 bottom-3 text-[0.6875rem] font-medium tracking-[0.12em] text-spent uppercase"
				aria-hidden="true">Going out</span
			>

			<div class="axis absolute inset-x-0 top-1/2 h-px bg-line-strong" aria-hidden="true"></div>

			{#each months as month (month.key)}
				<span
					class="tick absolute top-1/2 flex -translate-x-1/2 flex-col items-center"
					style="left: {month.x}%"
					aria-hidden="true"
				>
					<span class="h-2 w-px -translate-y-1 bg-line-strong"></span>
					<span class="mt-0.5 text-[0.6875rem] text-fg-subtle">{month.label}</span>
				</span>
			{/each}

			<!-- Today: a dashed rule with its name at the top, breathing softly. -->
			<div
				class="today absolute inset-y-1 flex -translate-x-1/2 flex-col items-center"
				style="left: {todayAt}%"
				aria-hidden="true"
			>
				<span
					class="today-part rounded-md bg-ink px-1.5 py-0.5 text-[0.625rem] leading-none font-medium text-white dark:bg-white dark:text-ink"
					>Today</span
				>
				<span class="today-part rule mt-1 w-px flex-1 origin-top"></span>
				<span class="beacon absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full"></span>
			</div>

			{#each pins as pin (pin.loan.id)}
				{@const due = loanDue(pin.loan, today)}
				{#snippet detail()}
					<div class="grid w-48 gap-1.5 font-normal">
						<p class="font-medium">{pin.loan.person}</p>
						<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
							<dt class="text-fg-muted">{LOAN_DIRECTION_LABEL[pin.loan.direction]}</dt>
							<dd class="tabular text-right">{money(loanLeft(pin.loan))}</dd>
							<dt class="text-fg-muted">When</dt>
							<dd class="text-right">{dueLabel(due, pin.loan.dueOn)}</dd>
						</dl>
					</div>
				{/snippet}
				<Tooltip content={detail} side={pin.up ? 'top' : 'bottom'} delay={60} class="px-3 py-2.5">
					{#snippet children({ props })}
						<button
							{...props}
							type="button"
							class={cn(
								'pin absolute flex -translate-x-1/2 items-center rounded-full outline-none',
								pin.up ? 'bottom-1/2 flex-col-reverse' : 'top-1/2 flex-col',
								due.kind === 'overdue' && 'late-pin',
								selectedId === pin.loan.id && 'picked'
							)}
							style="left: {pin.x}%; --stem: {STEM + pin.lane * RISE}px; --tint: {PALETTE[
								DIRECTION_TINT[pin.loan.direction]
							].css}"
							aria-label="{pin.loan.person}: {money(loanLeft(pin.loan))}, {dueLabel(
								due,
								pin.loan.dueOn
							).toLowerCase()}"
							aria-pressed={selectedId === pin.loan.id}
							onclick={() => onSelect(pin.loan.id)}
						>
							<span class={cn('stem w-px', pin.up ? 'origin-bottom' : 'origin-top')}></span>
							<span class="head relative block rounded-full">
								<Avatar seed={pin.loan.person} class="size-7" />
							</span>
						</button>
					{/snippet}
				</Tooltip>
			{/each}
		</div>

		{#if undated > 0}
			<p class="mt-3 text-sm text-fg-muted">
				{undated} open {undated === 1 ? 'loan has' : 'loans have'} no due day, so {undated === 1
					? "it isn't"
					: "they aren't"} on the line.
			</p>
		{/if}
	</div>
{/if}

<style>
	.axis {
		transform-origin: left center;
	}

	.late {
		background-color: color-mix(in oklab, var(--negative) 7%, transparent);
	}

	.today .rule {
		background-image: linear-gradient(to bottom, var(--ink) 50%, transparent 50%);
		background-size: 1px 6px;
	}

	:global(.dark) .today .rule {
		background-image: linear-gradient(to bottom, white 50%, transparent 50%);
	}

	/* Today's beacon on the line breathes out, as the biggest day's ring does. */
	.beacon {
		background: var(--blue);
		box-shadow: 0 0 0 0 color-mix(in oklab, var(--blue) 45%, transparent);
		animation: beacon 2.4s var(--ease-out-quint) infinite;
	}

	@keyframes beacon {
		0% {
			box-shadow: 0 0 0 0 color-mix(in oklab, var(--blue) 45%, transparent);
		}
		100% {
			box-shadow: 0 0 0 10px transparent;
		}
	}

	.pin {
		--glyph: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
		transition:
			left 0.6s var(--ease-out-quint),
			opacity 0.3s var(--ease-out-quint);
	}

	:global(.dark) .pin {
		--glyph: var(--tint);
	}

	.stem {
		height: var(--stem);
		background: var(--glyph);
		transition: height 0.5s var(--ease-out-quint);
	}

	.head {
		box-shadow:
			0 0 0 2px var(--card),
			0 0 0 3.5px var(--glyph);
		transition: scale 0.35s var(--ease-spring);
	}

	/* A late pin wears `negative`'s ring instead of its side's. */
	.late-pin .head {
		box-shadow:
			0 0 0 2px var(--card),
			0 0 0 3.5px var(--negative);
	}

	.pin:hover .head,
	.pin:focus-visible .head,
	.pin.picked .head {
		scale: 1.18;
	}

	.pin:focus-visible .head {
		outline: 2px solid var(--blue);
		outline-offset: 4px;
	}

	/* Pointing at one pin sets the others back. */
	.chart:has(.pin:hover) .pin:not(:hover) {
		opacity: 0.35;
	}

	@media (prefers-reduced-motion: reduce) {
		.beacon {
			animation: none;
		}
	}
</style>

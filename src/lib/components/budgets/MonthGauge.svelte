<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Gauge from '@lucide/svelte/icons/gauge';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import gsap from 'gsap';
	import { animate } from 'motion';
	import { untrack } from 'svelte';
	import { countUp } from '$lib/actions';
	import BudgetEditor from '$lib/components/dashboard/BudgetEditor.svelte';
	import { Badge, Card, PALETTE, Sparkle } from '$lib/components/ui';
	import {
		budgetPace,
		budgetProgress,
		formatMoney,
		formatMoneyCompact,
		monthName,
		monthShare,
		perDayLeft,
		projectedSpend,
		type BudgetMonth,
		type MonthProgress
	} from '$lib/finance';
	import { pop } from '$lib/transitions';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { longDay } from '$lib/components/insights/format';

	/**
	 * The month against the monthly budget, as a dial: 240° open at the foot,
	 * filled as far as the spending has gone — lime while it keeps pace with
	 * the month, peach once it runs ahead of it, the alarm's red past the
	 * budget — with a pin where an even pace would be today. What's left sits
	 * inside; under it, what's left a day, where the month is heading and how
	 * it has gone so far. A past month says how it ended instead. The pencil
	 * sets the budget (`BudgetEditor`, the dashboard's).
	 */
	type Props = {
		month: BudgetMonth;
		progress: MonthProgress;
		/** Which way the month last moved, so its name enters from that side. */
		dir?: number;
		class?: string;
	};

	let { month, progress, dir = 1, class: className }: Props = $props();

	const uid = $props.id();
	const money = (cents: number) => formatMoney(cents, month.currency);
	const compact = (cents: number) =>
		formatMoneyCompact(cents, month.currency, { whole: cents < 100_000 });

	const running = $derived(progress.left > 0);
	const share = $derived(monthShare(progress));
	const standing = $derived(budgetProgress(month.spent, month.budget));
	const pace = $derived(standing ? budgetPace(standing, share) : null);

	const tint = $derived(
		pace === 'over'
			? 'var(--negative)'
			: pace === 'ahead' && running
				? PALETTE.peach.css
				: PALETTE.lime.css
	);

	// ── The dial: BalanceGauge's geometry ────────────────────────────────

	const CX = 100;
	const CY = 96;
	const R = 76;
	const START = 150;
	const SWEEP = 240;
	const LENGTH = (R * SWEEP * Math.PI) / 180;
	const STEP = LENGTH / 18;

	const point = (degrees: number, radius = R) => {
		const a = (degrees * Math.PI) / 180;
		return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)] as const;
	};
	const [x0, y0] = point(START);
	const [x1, y1] = point(START + SWEEP);
	const ARC = `M${x0},${y0}A${R},${R} 0 1 1 ${x1},${y1}`;

	const target = $derived(standing?.ratio ?? 0);

	/** What the dial draws: where it lands on the server, then wherever the sweep has got to. */
	let shown = $state(untrack(() => target));
	let knob = $state<SVGGElement>();
	let mounted = false;

	// Arriving, the fill sweeps up from nothing; a new month or budget carries
	// it along the arc from where it was, and the knob springs as it lands.
	$effect(() => {
		const to = target;
		if (prefersReducedMotion()) {
			shown = to;
			return;
		}
		const from = mounted ? untrack(() => shown) : 0;
		mounted = true;
		const state = { v: from };
		shown = from;
		const tween = gsap.to(state, {
			v: to,
			duration: from === 0 ? 1.2 : 0.9,
			ease: from === 0 ? 'power4.out' : 'power3.inOut',
			onUpdate: () => {
				shown = state.v;
			},
			onComplete: () => {
				if (knob && to > 0)
					animate(knob, { scale: [0.6, 1] }, { type: 'spring', bounce: 0.5, duration: 0.5 });
			}
		});
		return () => tween.kill();
	});

	const at = $derived(point(START + SWEEP * shown));
	const pin = $derived(running && standing ? point(START + SWEEP * share, R + 13) : null);
	const pinFoot = $derived(running && standing ? point(START + SWEEP * share, R - 9) : null);

	/** The empty dial's marks, and a budget's: nothing, half, the whole. */
	const marks = $derived(
		(standing ? [0, 0.5, 1] : []).map((f) => {
			const [x, y] = point(START + SWEEP * f, R + 17);
			return {
				f,
				x: (x / 200) * 100,
				y: (y / 140) * 100,
				label: compact((standing?.budget ?? 0) * f)
			};
		})
	);

	// ── What's inside and under it ───────────────────────────────────────

	const inside = $derived(
		!standing
			? { label: 'Spent', value: month.spent, note: 'No budget yet' }
			: standing.over
				? { label: 'Over by', value: -standing.remaining, note: `of ${money(standing.budget)}` }
				: { label: 'Left', value: standing.remaining, note: `of ${money(standing.budget)}` }
	);
	const figure = $derived(money(inside.value));

	const perDay = $derived(Math.round(month.spent / Math.max(1, progress.elapsed)));
	const projected = $derived(projectedSpend(month.spent, progress));
	const busiest = $derived.by(() => {
		const most = Math.max(0, ...month.days);
		const day = month.days.indexOf(most);
		return most > 0
			? { spent: most, key: `${month.month}-${String(day + 1).padStart(2, '0')}` }
			: null;
	});

	type Stat = { label: string; value: number; format?: 'count'; note: string; tone?: string };

	const stats = $derived.by((): Stat[] => {
		if (!running) {
			return [
				{ label: 'A day', value: perDay, note: 'on average' },
				{
					label: 'Biggest day',
					value: busiest?.spent ?? 0,
					note: busiest ? longDay(busiest.key) : 'Nothing spent'
				},
				{ label: 'Entries', value: month.count, format: 'count', note: 'expenses recorded' }
			];
		}
		const daily = perDayLeft(month.spent, month.budget, progress);
		const heading = standing
			? projected > standing.budget
				? { note: `${money(projected - standing.budget)} over`, tone: 'text-negative' }
				: { note: `${money(standing.budget - projected)} under`, tone: 'text-positive' }
			: { note: "by the month's end" };
		return [
			daily !== null
				? {
						label: 'A day from here',
						value: daily,
						note: `${progress.left} ${progress.left === 1 ? 'day' : 'days'} left`
					}
				: {
						label: 'Days left',
						value: progress.left,
						format: 'count',
						note: 'today included'
					},
			{ label: 'At this pace', value: projected, note: heading.note, tone: heading.tone },
			{ label: 'A day so far', value: perDay, note: `over ${progress.elapsed} days` }
		];
	});

	const status = $derived.by(() => {
		if (!standing) return { tone: 'neutral' as const, text: 'No budget yet', icon: Gauge };
		if (standing.over)
			return {
				tone: 'negative' as const,
				text: `${running ? 'Over budget' : 'Went over'} by ${money(-standing.remaining)}`,
				icon: TriangleAlert
			};
		if (!running)
			return {
				tone: 'positive' as const,
				text: `Stayed under by ${money(standing.remaining)}`,
				icon: Check
			};
		return pace === 'ahead'
			? { tone: 'neutral' as const, text: 'Ahead of the month', icon: Gauge }
			: { tone: 'positive' as const, text: 'On track', icon: Check };
	});

	const whole = (n: number) => String(Math.round(n));
</script>

<Card class={cn('flex flex-col p-7', className)}>
	<div class="flex min-h-9 items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2.5">
			<Sparkle color="lime" animated burst={month.month} class="size-5 shrink-0" />
			<h2 class="font-display text-2xl font-medium">
				<!-- Keyed on the month, so each enters from the side it came from.
				     `inline-block` because a transform does nothing to an inline box. -->
				{#key month.month}
					<span class="inline-block" in:pop={{ x: dir * 12, duration: 0.32 }}>
						{monthName(month.month)}<span class="ml-2 font-normal text-fg-muted"
							>{month.month.slice(0, 4)}</span
						>
					</span>
				{/key}
			</h2>
		</div>
		<BudgetEditor budget={month.budget} currency={month.currency} />
	</div>
	<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
		{#if standing}
			{money(month.spent)} spent of a {money(standing.budget)} budget.
		{:else}
			Set a monthly budget to see what's left each day.
		{/if}
	</p>

	<!-- A meter: it reads out what's left, and the drawing is decoration. -->
	<div
		class="relative mx-auto mt-6 aspect-[200/140] w-full max-w-[20rem]"
		role="meter"
		aria-valuemin={0}
		aria-valuemax={standing ? standing.budget / 100 : 0}
		aria-valuenow={Math.min(month.spent, standing?.budget ?? month.spent) / 100}
		aria-valuetext={standing
			? `${money(month.spent)} of ${money(standing.budget)} spent; ${inside.label.toLowerCase()} ${figure}`
			: `${money(month.spent)} spent, no budget set`}
		style="--tint: {tint}"
	>
		<svg
			viewBox="0 0 200 140"
			class="absolute inset-0 size-full overflow-visible"
			aria-hidden="true"
		>
			<defs>
				<linearGradient id="{uid}-fill" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" class="stop-soft" />
					<stop offset="100%" class="stop-strong" />
				</linearGradient>
			</defs>

			<path d={ARC} fill="none" stroke-width="1.5" class="stroke-line" />
			<path
				d={ARC}
				fill="none"
				stroke-width="6"
				stroke-linecap="round"
				stroke-dasharray="{STEP * 0.28} {STEP * 0.72}"
				class="stroke-line-strong"
			/>

			{#if standing}
				<path
					d={ARC}
					fill="none"
					stroke="url(#{uid}-fill)"
					stroke-width="9"
					stroke-linecap="round"
					stroke-dasharray="{LENGTH * shown} {LENGTH}"
				/>
				{#if pin && pinFoot}
					<!-- Where an even pace would be today: a tick across the arc. -->
					<line
						x1={pinFoot[0]}
						y1={pinFoot[1]}
						x2={pin[0]}
						y2={pin[1]}
						stroke-width="2"
						stroke-linecap="round"
						class="stroke-fg"
					/>
				{/if}
				{#if shown > 0.002}
					<g
						bind:this={knob}
						style="transform-origin: {at[0]}px {at[1]}px; transform-box: view-box"
					>
						<circle
							cx={at[0]}
							cy={at[1]}
							r="7.5"
							class="fill-card stroke-hairline"
							stroke-width="1"
						/>
						<circle cx={at[0]} cy={at[1]} r="3" class="dot" />
					</g>
				{/if}
			{/if}
		</svg>

		{#each marks as mark (mark.f)}
			<span
				class="tabular pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[0.6875rem] whitespace-nowrap text-fg-subtle"
				style="left: {mark.x}%; top: {mark.y}%"
				aria-hidden="true">{mark.label}</span
			>
		{/each}
		{#if pin}
			<span
				class="pointer-events-none absolute -translate-x-1/2 -translate-y-full pb-1 text-[0.6875rem] font-medium whitespace-nowrap"
				style="left: {(pin[0] / 200) * 100}%; top: {(pin[1] / 140) * 100}%"
				aria-hidden="true">Today</span
			>
		{/if}

		<!-- What's left, fitted to the room inside the arc rather than spilling past it. -->
		<div
			class="absolute inset-x-[19%] top-[30%] flex flex-col items-center text-center"
			aria-hidden="true"
		>
			<p class="text-sm text-fg-muted">{inside.label}</p>
			<div class="@container mt-1 w-full">
				<p
					class={cn(
						'fit-figure tabular font-display leading-none font-light tracking-tight',
						standing?.over && 'text-negative'
					)}
					style="--fit: 2.25rem; --chars: {figure.length}"
					use:countUp={{ value: inside.value, format: money, whenVisible: true }}
				>
					{figure}
				</p>
			</div>
			<p class="mt-1.5 text-xs text-fg-muted">{inside.note}</p>
		</div>
	</div>

	<div class="-mt-2 flex justify-center">
		<Badge tone={status.tone} burst={`${month.month}:${status.text}`}>
			{#snippet icon()}
				<status.icon />
			{/snippet}
			{status.text}
		</Badge>
	</div>

	<dl
		class="mt-auto grid grid-cols-3 divide-x divide-line border-t border-line pt-5 [&>div]:px-3 [&>div:first-child]:pl-0 [&>div:last-child]:pr-0"
	>
		{#each stats as stat (stat.label)}
			<div class="min-w-0">
				<dt class="text-sm text-balance text-fg-muted">{stat.label}</dt>
				<dd class="mt-1.5">
					<div class="@container">
						<p
							class="fit-figure tabular font-display leading-none font-light tracking-tight"
							style="--fit: 1.375rem; --chars: {(stat.format === 'count'
								? whole(stat.value)
								: money(stat.value)
							).length}"
							use:countUp={{
								value: stat.value,
								format: stat.format === 'count' ? whole : money,
								whenVisible: true
							}}
						>
							{stat.format === 'count' ? whole(stat.value) : money(stat.value)}
						</p>
					</div>
					<p class={cn('mt-1 text-xs text-balance text-fg-muted', stat.tone)}>{stat.note}</p>
				</dd>
			</div>
		{/each}
	</dl>
</Card>

<style>
	/* The standing's colour at a glyph's weight, its softer end mixed toward the
	   card, as the balance dial's is. On dark it's bright enough as it is. */
	.stop-strong {
		stop-color: oklch(from var(--tint) 0.62 calc(c * 1.5) h);
		transition: stop-color 0.5s var(--ease-out-quint);
	}

	.stop-soft {
		stop-color: color-mix(in oklab, var(--tint) 55%, var(--card));
		transition: stop-color 0.5s var(--ease-out-quint);
	}

	.dot {
		fill: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
		transition: fill 0.5s var(--ease-out-quint);
	}

	:global(.dark) .stop-strong {
		stop-color: var(--tint);
	}

	:global(.dark) .dot {
		fill: var(--tint);
	}
</style>

<script lang="ts">
	import { RadioGroup } from 'bits-ui';
	import { fade } from 'svelte/transition';
	import { morph } from '$lib/actions';
	import {
		HISTORY_RANGE_LABEL,
		HISTORY_RANGE_SPAN,
		HISTORY_RANGES,
		type BalanceHistory,
		type HistoryRange
	} from '$lib/accounts';
	import { Orb, OrbitRing, PALETTE, Sparkle, Tooltip, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, formatMoneyCompact, type Currency } from '$lib/finance';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import { areaPath, dayNumber, monotonePath, niceTicks } from './chart';

	/**
	 * Every account's balance over time, a line each in the account's colour —
	 * the colour its tile, orb and slice wear. The lines unroll left to right
	 * as the chart comes into view and morph into a new range rather than
	 * redrawing. Each ends in a tag with where it stands today; pointing at the
	 * chart (or arrowing through it) reads out every balance on that day.
	 * Under it, pins mark the days an account was added or its balance set by
	 * hand, and the range sits last, on an axis of its own.
	 */
	type Props = {
		/** The range on show, or the last one while the next loads. */
		history: BalanceHistory | undefined;
		/** The next range is on its way: the lines dim until it lands. */
		loading?: boolean;
		range: HistoryRange;
		onRangeChange: (range: HistoryRange) => void;
		/** Names by id, for the legend, the tips and the tags. */
		accounts: { id: string; name: string }[];
		colors: Record<string, PaletteColor>;
		/** The account open in the panel: its line is drawn heavier, over a soft fill. */
		selectedId?: string | null;
		/** A press on the chart picks the line nearest to it. */
		onSelect?: (id: string) => void;
		currency: Currency;
		class?: string;
	};

	let {
		history,
		loading = false,
		range,
		onRangeChange,
		accounts,
		colors,
		selectedId = null,
		onSelect,
		currency,
		class: className
	}: Props = $props();

	const uid = $props.id();

	// The drawing's own units. It stretches to its box (`preserveAspectRatio`
	// none) while strokes keep their width, so the server draws it at any size;
	// dots, tags and labels are HTML placed by percentage, and never stretch.
	const VW = 1000;
	const VH = 300;

	const days = $derived(history?.days ?? []);
	const n = $derived(days.length);
	const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Account';

	/** Lines taken off the chart from the legend — for the visit, not stored. */
	let hidden = $state<string[]>([]);
	/** The legend entry under the pointer or focus: its line comes forward, the rest step back. */
	let spotlit = $state<string | null>(null);

	const series = $derived(history?.series ?? []);
	const shown = $derived(series.filter((s) => !hidden.includes(s.id)));

	function toggle(id: string) {
		if (hidden.includes(id)) hidden = hidden.filter((h) => h !== id);
		// The last line on the chart stays: an empty chart answers nothing.
		else if (shown.length > 1) hidden = [...hidden, id];
	}

	/** The axis: round steps covering every balance on show, widened past them. */
	const ticks = $derived.by(() => {
		const values = shown.flatMap((s) => s.balances.filter((b): b is number => b !== null));
		if (values.length === 0) return [];
		return niceTicks(Math.min(...values), Math.max(...values), 4);
	});
	const floor = $derived(ticks[0] ?? 0);
	const ceiling = $derived(ticks.at(-1) ?? 1);

	/** Where a balance sits, 0 at the top and 1 at the bottom. */
	const yOf = (cents: number) =>
		ceiling === floor ? 0.5 : 1 - (cents - floor) / (ceiling - floor);
	/** Where a day sits, 0 at the left and 1 at the right. */
	const xOf = (i: number) => (n <= 1 ? 1 : i / (n - 1));

	const lines = $derived(
		shown.map((s) => {
			const points = s.balances.flatMap((b, i) =>
				b === null ? [] : [[xOf(i) * VW, yOf(b) * VH] as const]
			);
			return {
				id: s.id,
				color: colors[s.id] ?? 'blue',
				d: monotonePath(points),
				area: areaPath(points, VH),
				last: s.balances.at(-1) ?? null
			};
		})
	);

	const dayFormat = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
	const longDayFormat = new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
	const monthFormat = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});
	const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
	/** A long range is read by month, a short one by day. */
	const axisLabel = (day: string) =>
		range === '1y' || range === 'all'
			? monthFormat.format(asDate(day))
			: dayFormat.format(asDate(day));

	/** Four labels under the line, from the first day to today. */
	const axis = $derived.by(() => {
		if (n === 0) return [];
		const at = [...new Set([0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1])];
		return at.map((i) => ({
			i,
			x: xOf(i) * 100,
			label: i === n - 1 ? 'Today' : axisLabel(days[i])
		}));
	});

	const money = (cents: number) => formatMoney(cents, currency);
	const compact = (cents: number) => formatMoneyCompact(cents, currency);

	// ── Reading a day ────────────────────────────────────────────────────

	/** The day being read, by index — under the pointer, or arrowed to. */
	let index = $state<number | null>(null);
	let plot = $state<HTMLElement>();
	let plotWidth = $state(0);
	let plotHeight = $state(256);

	const reading = $derived.by(() => {
		if (index === null || index >= n) return null;
		const i = index;
		const rows = shown
			.flatMap((s) => {
				const balance = s.balances[i];
				return balance === null || balance === undefined
					? []
					: [{ id: s.id, balance, color: colors[s.id] ?? 'blue', y: yOf(balance) * 100 }];
			})
			.sort((a, b) => b.balance - a.balance);
		return { i, x: xOf(i) * 100, day: longDayFormat.format(asDate(days[i])), rows };
	});

	function indexAt(event: PointerEvent) {
		if (!plot || n === 0) return null;
		const rect = plot.getBoundingClientRect();
		const f = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
		return Math.round(f * (n - 1));
	}

	function point(event: PointerEvent) {
		index = indexAt(event);
	}

	/** A press picks the line nearest to it on that day. */
	function pick(event: MouseEvent) {
		if (!plot || !onSelect || !reading) return;
		const rect = plot.getBoundingClientRect();
		const y = ((event.clientY - rect.top) / rect.height) * 100;
		const nearest = [...reading.rows].sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
		if (nearest) onSelect(nearest.id);
	}

	function keys(event: KeyboardEvent) {
		if (n === 0) return;
		const step = event.shiftKey ? 7 : 1;
		const at = index ?? n - 1;
		const next =
			event.key === 'ArrowLeft'
				? Math.max(0, at - step)
				: event.key === 'ArrowRight'
					? Math.min(n - 1, at + step)
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? n - 1
							: null;
		if (next !== null) {
			event.preventDefault();
			index = next;
		} else if (event.key === 'Escape' && index !== null) {
			// Answered here, so the panel behind doesn't close as well.
			event.preventDefault();
			index = null;
		}
	}

	/** What the day being read holds, in words: the slider's value. */
	const spoken = $derived(
		reading
			? `${reading.day}: ${reading.rows.map((r) => `${nameOf(r.id)} ${money(r.balance)}`).join(', ')}`
			: ''
	);

	// ── Today's tags ─────────────────────────────────────────────────────

	/** Blue and violet are deep enough for white words; every other colour takes ink. */
	const onColor = (color: PaletteColor) =>
		color === 'blue' || color === 'violet' ? 'text-white' : 'text-ink';

	/**
	 * Each line's tag beside its end, nudged apart where two would overlap:
	 * down past the one above, then back up from the bottom if that ran out of
	 * room. A leader runs from the line's end to wherever its tag landed.
	 */
	const tags = $derived.by(() => {
		const GAP = 22;
		const placed = lines
			.filter((l) => l.last !== null)
			.map((l) => ({ ...l, lineY: yOf(l.last as number) * plotHeight, y: 0 }))
			.sort((a, b) => a.lineY - b.lineY);
		let floorY = GAP / 2;
		for (const tag of placed) {
			tag.y = Math.max(tag.lineY, floorY);
			floorY = tag.y + GAP;
		}
		let ceilingY = plotHeight - GAP / 2;
		for (const tag of [...placed].reverse()) {
			tag.y = Math.min(tag.y, ceilingY);
			ceilingY = tag.y - GAP;
		}
		return placed;
	});

	// ── Pins ─────────────────────────────────────────────────────────────

	/** Openings and corrections on the track, lifted a lane where two would touch. */
	const pins = $derived.by(() => {
		if (!history || n === 0) return [];
		const first = dayNumber(days[0]);
		const stretch = Math.max(1, dayNumber(days[n - 1]) - first);
		let lastX = [-Infinity, -Infinity];
		return history.events
			.filter((e) => !hidden.includes(e.accountId))
			.map((event, i) => {
				const x = Math.min(1, Math.max(0, (dayNumber(event.day) - first) / stretch));
				const px = x * (plotWidth || 600);
				const lane = px - lastX[0] >= 30 ? 0 : px - lastX[1] >= 30 ? 1 : 0;
				lastX = lane === 0 ? [px, lastX[1]] : [lastX[0], px];
				return {
					...event,
					key: `${event.accountId}:${event.kind}:${event.day}:${i}`,
					x: x * 100,
					lane,
					i
				};
			});
	});

	const pinText = (pin: (typeof pins)[number]) =>
		pin.kind === 'opened'
			? `${nameOf(pin.accountId)} added`
			: `${nameOf(pin.accountId)} set by hand, ${pin.amount !== null && pin.amount >= 0 ? '+' : '−'}${money(Math.abs(pin.amount ?? 0))}`;

	const at = $derived(Math.max(0, HISTORY_RANGES.indexOf(range)));
	const span = $derived(HISTORY_RANGE_SPAN[range]);
</script>

<div class={cn('flex flex-col', className)}>
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
		<div class="min-w-0">
			<div class="flex items-center gap-2.5">
				<Sparkle color="blue" animated burst={range} class="size-5 shrink-0" />
				<h2 class="font-display text-2xl font-medium">Balance over time</h2>
			</div>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
				What each account held at the end of every day, {span === HISTORY_RANGE_SPAN.all
					? span
					: `over ${span}`}.
			</p>
		</div>

		<!-- The legend is also the switch: a line taken off the chart greys its
		     orb and strikes its name, and the last one on it stays. -->
		{#if series.length > 1}
			<ul class="flex flex-wrap gap-1.5" aria-label="Accounts on the chart">
				{#each series as s (s.id)}
					{@const off = hidden.includes(s.id)}
					<li>
						<button
							type="button"
							aria-pressed={!off}
							disabled={!off && shown.length === 1}
							onclick={() => toggle(s.id)}
							onpointerenter={() => (spotlit = s.id)}
							onpointerleave={() => (spotlit = null)}
							onfocus={() => (spotlit = s.id)}
							onblur={() => (spotlit = null)}
							class={cn(
								'press flex h-8 items-center gap-2 rounded-full border border-line px-3 text-sm',
								'hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
								'disabled:cursor-default',
								off && 'text-fg-subtle'
							)}
						>
							<Orb
								color={colors[s.id] ?? 'blue'}
								class={cn(
									'size-3 transition-[filter,opacity] duration-500',
									off && 'opacity-40 grayscale'
								)}
							/>
							<span class={cn('decoration-fg-subtle transition-colors', off && 'line-through')}
								>{nameOf(s.id)}</span
							>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<!-- ── The plot, between the axis on its left and the tags on its right ── -->
	<div class="mt-6 grid grid-cols-[3.25rem_minmax(0,1fr)_5.25rem]">
		<div class="relative" aria-hidden="true">
			{#each ticks as tick (tick)}
				<span
					class="tick tabular absolute right-3 -translate-y-1/2 text-xs text-fg-subtle"
					style="top: {yOf(tick) * 100}%"
					transition:fade={{ duration: 250 }}>{compact(tick)}</span
				>
			{/each}
		</div>

		<!-- A slider over the days: arrowing through them reads each one out, and
		     a press picks the line nearest to it. -->
		<div
			bind:this={plot}
			bind:clientWidth={plotWidth}
			bind:clientHeight={plotHeight}
			class="relative h-64 touch-pan-y rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
			role="slider"
			tabindex="0"
			aria-label="Day on the balance chart"
			aria-valuemin={0}
			aria-valuemax={Math.max(0, n - 1)}
			aria-valuenow={index ?? Math.max(0, n - 1)}
			aria-valuetext={spoken || 'Today'}
			onpointermove={point}
			onpointerdown={point}
			onpointerleave={() => (index = null)}
			onclick={pick}
			onkeydown={keys}
			onfocus={() => (index ??= n - 1)}
			onblur={() => (index = null)}
		>
			{#each ticks as tick (tick)}
				<span
					class="tick absolute inset-x-0 border-t border-line"
					style="top: {yOf(tick) * 100}%"
					transition:fade={{ duration: 250 }}
					aria-hidden="true"
				></span>
			{/each}

			{#if lines.length === 0}
				<p
					class="hatch absolute inset-0 grid place-items-center rounded-lg text-[0.9375rem] text-fg-muted"
				>
					{history ? 'Add an account to see its balance move.' : ''}
				</p>
			{/if}

			<!-- The lines unroll left to right as the chart scrolls into view. -->
			<div
				class={cn(
					'unroll pointer-events-none absolute inset-0 transition-opacity duration-300',
					loading && 'opacity-60'
				)}
			>
				<svg
					viewBox="0 0 {VW} {VH}"
					preserveAspectRatio="none"
					class="size-full overflow-visible"
					aria-hidden="true"
				>
					<defs>
						<linearGradient id="{uid}-area" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="white" stop-opacity="0.9" />
							<stop offset="100%" stop-color="white" stop-opacity="0" />
						</linearGradient>
						<mask id="{uid}-fade" maskContentUnits="userSpaceOnUse">
							<rect width={VW} height={VH} fill="url(#{uid}-area)" />
						</mask>
					</defs>
					<g>
						{#each lines as line (line.id)}
							{@const selected = line.id === selectedId}
							<g
								class={cn(
									'line transition-opacity duration-300',
									spotlit && spotlit !== line.id && 'opacity-25'
								)}
								style="--tint: {PALETTE[line.color].css}"
								transition:fade={{ duration: 300 }}
							>
								{#if selected && line.area}
									<path
										d={line.area}
										use:morph={line.area}
										class="area"
										mask="url(#{uid}-fade)"
										transition:fade={{ duration: 400 }}
									/>
								{/if}
								<path
									d={line.d}
									use:morph={line.d}
									fill="none"
									stroke-width={selected ? 2.75 : 1.75}
									stroke-linecap="round"
									stroke-linejoin="round"
									vector-effect="non-scaling-stroke"
									class="stroke transition-[stroke-width] duration-300"
								/>
							</g>
						{/each}
					</g>
				</svg>
			</div>

			<!-- Where each line ends: today. -->
			{#each lines as line (line.id)}
				{#if line.last !== null}
					<span
						class="end pointer-events-none absolute size-2 -translate-1/2 rounded-full"
						style="left: 100%; top: {yOf(line.last) * 100}%; --tint: {PALETTE[line.color].css}"
						aria-hidden="true"
					></span>
				{/if}
			{/each}

			{#if reading}
				<!-- The day being read: a guide down the chart, a ringed dot on each
				     line, and every balance that day beside it. -->
				<span
					class="glide pointer-events-none absolute inset-y-0 border-l border-dashed border-line-strong"
					style="left: {reading.x}%"
					aria-hidden="true"
				></span>
				{#each reading.rows as row (row.id)}
					<span
						class="glide dot pointer-events-none absolute grid size-3.5 -translate-1/2 place-items-center rounded-full border-2 bg-card"
						style="left: {reading.x}%; top: {row.y}%; --tint: {PALETTE[row.color].css}"
						aria-hidden="true"
					>
						<span class="size-1 rounded-full bg-current"></span>
					</span>
				{/each}
				<div
					class={cn(
						'glide pointer-events-none absolute top-2 z-10 w-max min-w-44 rounded-lg border border-line bg-card px-3 py-2.5 shadow-lg',
						reading.x > 55 ? '-translate-x-[calc(100%+0.875rem)]' : 'translate-x-3.5'
					)}
					style="left: {reading.x}%"
					in:pop={{ scale: 0.94 }}
					out:pop={{ scale: 0.94 }}
					aria-hidden="true"
				>
					<p class="text-xs text-fg-muted">{reading.day}</p>
					<ul class="mt-1.5 grid gap-1">
						{#each reading.rows as row (row.id)}
							<li class="flex items-center gap-2 text-xs">
								<Orb color={row.color} class="size-2.5 shrink-0" />
								<span class="min-w-0 flex-1 truncate">{nameOf(row.id)}</span>
								<span class="tabular pl-3 font-medium">{money(row.balance)}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<!-- Today's balance on each line, in its colour, nudged apart where they'd touch. -->
		<div class="relative" aria-hidden="true">
			<svg class="absolute inset-y-0 left-0 h-full w-3 overflow-visible">
				{#each tags as tag (tag.id)}
					<path
						d="M0 {tag.lineY} C6 {tag.lineY} 6 {tag.y} 12 {tag.y}"
						fill="none"
						stroke-width="1"
						class="leader"
						style="--tint: {PALETTE[tag.color].css}"
					/>
				{/each}
			</svg>
			{#each tags as tag (tag.id)}
				<span
					class={cn(
						'glide tabular absolute left-3 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap',
						onColor(tag.color),
						loading && 'opacity-60'
					)}
					style="top: {tag.y}px; background: {PALETTE[tag.color].css}"
					in:pop={{ scale: 0.8, bounce: 0.4, duration: 0.4 }}
					out:pop={{ scale: 0.8 }}>{compact(tag.last as number)}</span
				>
			{/each}
		</div>
	</div>

	<!-- ── The track: days along the bottom, and what happened on them ─── -->
	<div class="grid grid-cols-[3.25rem_minmax(0,1fr)_5.25rem]">
		<div class="col-start-2">
			<div class="relative h-12">
				<span class="absolute inset-x-0 bottom-1 h-1.5 rounded-full bg-sunken" aria-hidden="true"
				></span>
				{#each pins as pin (pin.key)}
					<Tooltip side="top" delay={80}>
						{#snippet content()}
							<p class="text-xs font-medium">{pinText(pin)}</p>
							<p class="mt-0.5 text-xs font-normal text-fg-muted">
								{longDayFormat.format(asDate(pin.day))}
							</p>
						{/snippet}
						{#snippet children({ props })}
							<button
								{...props}
								type="button"
								aria-label="{pinText(pin)}, {longDayFormat.format(asDate(pin.day))}"
								class="pin absolute bottom-2.5 -translate-x-1/2 focus-visible:outline-none"
								style="left: {pin.x}%; --i: {pin.i}; --lift: {pin.lane * 0.875}rem"
							>
								<!-- The account's orb in orbit, as its balance wears it everywhere else;
								     neighbours take the dashboard's pair and turn opposite ways. -->
								<span class="head press block rounded-full">
									<OrbitRing
										class="w-7"
										ticks={20}
										markers={pin.i % 2 === 0 ? [0.25, 0.75] : [0, 0.5]}
										direction={pin.i % 2 === 0 ? 1 : -1}
										period={pin.i % 2 === 0 ? 32 : 24}
									>
										<Orb color={colors[pin.accountId] ?? 'blue'} blur={3} class="size-full" />
									</OrbitRing>
								</span>
								<span class="stem mx-auto block w-px bg-line-strong"></span>
							</button>
						{/snippet}
					</Tooltip>
				{/each}
			</div>

			<div class="relative mt-1.5 h-4 text-xs text-fg-muted" aria-hidden="true">
				{#each axis as mark (mark.i)}
					<span
						class={cn(
							'absolute whitespace-nowrap',
							mark.x === 0 ? 'left-0' : mark.x === 100 ? 'right-0' : '-translate-x-1/2'
						)}
						style={mark.x === 0 || mark.x === 100 ? undefined : `left: ${mark.x}%`}
						>{mark.label}</span
					>
				{/each}
			</div>

			<!-- The range, on an axis of its own: a soft column rises behind the
			     one chosen, between two marks, and slides to the next. -->
			<RadioGroup.Root
				value={range}
				onValueChange={(next) => onRangeChange(next as HistoryRange)}
				orientation="horizontal"
				aria-label="Range"
				class="relative mt-5 grid auto-cols-fr grid-flow-col border-t border-line"
				style="--count: {HISTORY_RANGES.length}; --at: {at}"
			>
				<span
					class="band pointer-events-none absolute bottom-0 left-0 h-[calc(100%+1.5rem)]"
					aria-hidden="true"
				>
					<span class="mark absolute top-6 left-0 -translate-x-1/2 -translate-y-full"></span>
					<span class="mark absolute top-6 right-0 translate-x-1/2 -translate-y-full"></span>
				</span>
				{#each HISTORY_RANGES as option (option)}
					<RadioGroup.Item
						value={option}
						class={cn(
							'relative flex h-11 flex-col items-center pt-1 text-sm text-fg-subtle transition-colors duration-200',
							'hover:text-fg-muted data-[state=checked]:font-medium data-[state=checked]:text-fg',
							'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue'
						)}
					>
						<span class="h-1.5 w-px bg-line-strong" aria-hidden="true"></span>
						<span class="mt-1.5">{HISTORY_RANGE_LABEL[option]}</span>
					</RadioGroup.Item>
				{/each}
			</RadioGroup.Root>
		</div>
	</div>
</div>

<style>
	/* A line at a glyph's weight on white, as a category's glyph is drawn, so
	   pastels and lime read as strongly as blue; on dark, the colour itself. */
	.line,
	.end,
	.dot,
	.leader {
		--ink-tint: oklch(from var(--tint) 0.6 calc(c * 1.6) h);
	}

	:global(.dark) :is(.line, .end, .dot, .leader) {
		--ink-tint: var(--tint);
	}

	.stroke {
		stroke: var(--ink-tint);
	}

	.area {
		fill: var(--tint);
		opacity: 0.35;
	}

	.end {
		background: var(--ink-tint);
		box-shadow: 0 0 0 3px var(--card);
	}

	.dot {
		border-color: var(--ink-tint);
		color: var(--ink-tint);
	}

	.leader {
		stroke: var(--ink-tint);
		opacity: 0.6;
	}

	/*
	 * The lines unroll left to right as the chart comes into view, tied to the
	 * scroll rather than a clock (a scroll-driven animation): they draw as far
	 * as the chart has arrived, and a chart already on screen is already drawn.
	 * Browsers without scroll timelines, and reduced motion, draw them whole.
	 */
	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view()) {
			.unroll {
				animation: unroll both var(--ease-out-quint);
				animation-timeline: view();
				animation-range: entry 15% cover 45%;
			}
		}
	}

	@keyframes unroll {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}

	/* The axis eases to a new range as the lines morph into it. */
	.tick {
		transition: top 0.9s var(--ease-out-quint);
	}

	/* The reading follows the pointer from day to day, and tags slide into place. */
	.glide {
		transition:
			left 0.14s var(--ease-out-quint),
			top 0.35s var(--ease-out-quint),
			translate 0.25s var(--ease-out-quint);
	}

	/* Pins stand up out of the track once the lines have unrolled, one after another. */
	.pin {
		translate: 0 calc(var(--lift) * -1);
		transition:
			opacity 0.4s var(--ease-out-quint) calc(0.6s + var(--i) * 50ms),
			translate 0.5s var(--ease-spring) calc(0.6s + var(--i) * 50ms);

		@starting-style {
			opacity: 0;
			translate: 0 0.5rem;
		}
	}

	.pin:focus-visible .head {
		outline: 2px solid var(--blue);
		outline-offset: 2px;
	}

	.stem {
		height: calc(0.25rem + var(--lift));
	}

	/* The chosen range's column: one slot wide, slid over by its index. */
	.band {
		width: calc(100% / var(--count));
		translate: calc(var(--at) * 100%) 0;
		background: linear-gradient(
			to top,
			color-mix(in oklab, var(--blue) 14%, transparent),
			transparent
		);
		transition: translate 0.45s var(--ease-out-quint);
	}

	/* The two marks at its edges, pointing up at the axis, as on a ruler. */
	.mark {
		width: 0.625rem;
		height: 0.4375rem;
		background: var(--fg);
		clip-path: polygon(50% 0, 100% 100%, 0 100%);
	}
</style>

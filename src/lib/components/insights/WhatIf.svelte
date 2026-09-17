<script lang="ts">
	import ColorFlaskConical from '@animated-color-icons/lucide-svelte/FlaskConical.svelte';
	import MovingRotateCcw from '@jis3r/icons/icons/rotate-ccw';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { countUp } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import { niceTicks } from '$lib/components/accounts/chart';
	import {
		AnimatedIcon,
		Card,
		PillButton,
		Slider,
		Tooltip,
		type PaletteColor
	} from '$lib/components/ui';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import {
		formatMoney,
		formatMoneyCompact,
		monthName,
		type Cents,
		type Currency,
		type DateKey
	} from '$lib/finance';
	import {
		kept,
		keptRate,
		summarize,
		withScenario,
		type Entry,
		type Scenario,
		type Stretch
	} from '$lib/insights';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import { percent, signedMoney } from './format';

	/**
	 * A sandbox over the stretch: move what came in, or what the biggest
	 * categories took, by a share, and see what would have stayed — in all, as
	 * a share of income, and month by month, each month's bar over the ghost of
	 * what really happened. Only this card moves: nothing is saved, and nothing
	 * else on the page takes the what-if.
	 */
	type Props = {
		/** What counts, as the page reads it. */
		entries: Entry[];
		/** Those entries over the stretch, as they happened. */
		stretch: Stretch;
		today: DateKey;
		currency: Currency;
		categoryChoices?: Record<string, PaletteColor>;
		class?: string;
	};

	let { entries, stretch, today, currency, categoryChoices, class: className }: Props = $props();

	/** How many categories get a slider. */
	const TOP = 4;

	let income = $state(0);
	let changes = $state<Record<string, number>>({});

	const top = $derived(stretch.categories.slice(0, TOP));

	/** Only the sliders on show move anything: a category that left the top keeps its place but not its say. */
	const scenario = $derived<Scenario>({
		income,
		categories: Object.fromEntries(top.map((c) => [c.name, changes[c.name] ?? 0]))
	});
	const moved = $derived(
		scenario.income !== 0 || Object.values(scenario.categories).some((c) => c !== 0)
	);

	const tried = $derived(summarize(withScenario(entries, scenario), stretch.span, today));

	function reset() {
		income = 0;
		changes = {};
	}

	const money = (cents: number) => formatMoney(cents, currency);
	const signed = (cents: number) => signedMoney(cents, currency);
	const change = (value: number) =>
		value === 0 ? 'As it was' : `${value > 0 ? '+' : '−'}${Math.abs(value)}%`;

	const keptNow = $derived(kept(stretch.total));
	const keptTried = $derived(kept(tried.total));
	const rateNow = $derived(keptRate(stretch.total));
	const rateTried = $derived(keptRate(tried.total));
	const points = $derived(
		rateNow === null || rateTried === null ? null : (rateTried - rateNow) * 100
	);

	// ── Month by month ───────────────────────────────────────────────────

	const months = $derived(
		stretch.months.map((m, i) => ({
			key: m.key,
			label: monthName(m.key, 'short'),
			future: m.future,
			actual: kept(m),
			tried: kept(tried.months[i])
		}))
	);

	const ticks = $derived.by(() => {
		const values = months.filter((m) => !m.future).flatMap((m) => [m.actual, m.tried]);
		const low = Math.min(0, ...values);
		const high = Math.max(0, ...values);
		return low === high ? [0, 1] : niceTicks(low, high, 3);
	});
	const floor = $derived(ticks[0] ?? 0);
	const ceiling = $derived(ticks.at(-1) ?? 1);
	const yOf = (cents: Cents) => (ceiling === floor ? 1 : 1 - (cents - floor) / (ceiling - floor));

	/** A bar's box, from the baseline to its figure, as percentages of the plot. */
	const box = (cents: Cents) => {
		const y = yOf(cents);
		const zero = yOf(0);
		return `--top: ${Math.min(y, zero) * 100}%; --height: ${Math.abs(y - zero) * 100}%; --zero: ${zero * 100}%`;
	};
</script>

<Card class={cn('flex flex-col p-7', className)}>
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
		<div data-icon-host class="flex min-w-0 items-start gap-3">
			<!-- Violet: this is configuration, and nothing it touches is kept. -->
			<span
				class="grid size-9 shrink-0 place-items-center rounded-xl bg-violet/12 text-violet"
				aria-hidden="true"
			>
				<AnimatedIcon icon={ColorFlaskConical} set="color" size={18} />
			</span>
			<div class="min-w-0">
				<h2 class="font-display text-2xl font-medium">What if</h2>
				<p class="mt-1 text-[0.9375rem] text-fg-muted">
					Nudge the numbers and see what would have stayed. Nothing here is saved.
				</p>
			</div>
		</div>
		{#if moved}
			<div transition:slide={{ axis: 'x', duration: 350, easing: quintOut }}>
				<div
					in:pop={{ scale: 0.5, bounce: 0.4, duration: 0.45 }}
					out:pop={{ scale: 0.5, duration: 0.3 }}
				>
					<PillButton size="sm" onclick={reset}>
						<AnimatedIcon icon={MovingRotateCcw} set="moving" />
						As it was
					</PillButton>
				</div>
			</div>
		{/if}
	</div>

	<div class="mt-7 grid flex-1 gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
		<!-- ── The sliders ──────────────────────────────────────────────── -->
		<div class="grid content-start gap-5">
			<div>
				<div data-icon-host class="flex items-center gap-3">
					<CategoryIcon category="Income" color="mint" animated />
					<span class="min-w-0 flex-1 truncate text-[0.9375rem]">Everything received</span>
					<span class={cn('tabular text-sm', income === 0 ? 'text-fg-subtle' : 'font-medium')}
						>{change(income)}</span
					>
				</div>
				<Slider
					label="Change what came in"
					min={-50}
					max={50}
					step={5}
					origin={0}
					color="mint"
					bind:value={income}
					valueText={change(income)}
					class="mt-2"
				/>
			</div>

			{#each top as category (category.name)}
				{@const color = categoryColor(category.name, categoryChoices)}
				{@const value = changes[category.name] ?? 0}
				<div>
					<div data-icon-host class="flex items-center gap-3">
						<CategoryIcon category={category.name} {color} animated />
						<span class="min-w-0 flex-1 truncate text-[0.9375rem]">{category.name}</span>
						<span class={cn('tabular text-sm', value === 0 ? 'text-fg-subtle' : 'font-medium')}
							>{change(value)}</span
						>
					</div>
					<Slider
						label="Change what went to {category.name}"
						min={-100}
						max={50}
						step={5}
						origin={0}
						{color}
						{value}
						onValueChange={(next) => (changes[category.name] = next)}
						valueText={change(value)}
						class="mt-2"
					/>
				</div>
			{:else}
				<p class="text-[0.9375rem] text-fg-muted">Nothing spent in {stretch.span.label} to try.</p>
			{/each}
		</div>

		<!-- ── What would have stayed ───────────────────────────────────── -->
		<div class="flex min-w-0 flex-col">
			<dl class="grid gap-x-8 gap-y-5 sm:grid-cols-2">
				<div class="@container min-w-0">
					<dt class="text-[0.9375rem] text-fg-muted">Would have stayed</dt>
					<dd class="mt-1">
						<p
							class="fit-figure tabular font-display leading-none font-light tracking-tight"
							style="--fit: 2.5rem; --chars: {money(keptTried).length}"
							use:countUp={{ value: keptTried, format: money, initial: false, duration: 0.6 }}
						>
							{money(keptTried)}
						</p>
						<p class="mt-2 text-sm text-fg-muted">
							{#if moved}
								<span
									class={cn(
										'tabular font-medium',
										keptTried >= keptNow ? 'text-positive' : 'text-spent'
									)}>{signed(keptTried - keptNow)}</span
								>
								against what happened
							{:else}
								What really stayed
							{/if}
						</p>
					</dd>
				</div>
				<div class="min-w-0">
					<dt class="text-[0.9375rem] text-fg-muted">Savings rate</dt>
					<dd class="mt-1">
						<p
							class="tabular truncate font-display text-[2.5rem] leading-none font-light tracking-tight"
						>
							{percent(rateTried)}
						</p>
						<p class="mt-2 text-sm text-fg-muted">
							{#if moved && points !== null}
								<span
									class={cn('tabular font-medium', points >= 0 ? 'text-positive' : 'text-spent')}
									>{points >= 0 ? '+' : '−'}{Math.abs(points).toFixed(1)} pts</span
								>
								from {percent(rateNow)}
							{:else}
								Of everything received
							{/if}
						</p>
					</dd>
				</div>
			</dl>

			<div class="mt-7 flex items-center gap-5 text-sm text-fg-muted" aria-hidden="true">
				<span class="flex items-center gap-2"
					><span class="size-2.5 rounded-[3px] bg-violet/20"></span>What happened</span
				>
				<span class="flex items-center gap-2"
					><span class="size-2.5 rounded-[3px] bg-violet"></span>What if</span
				>
			</div>

			<div class="mt-3 grid min-h-44 flex-1 grid-cols-[3rem_minmax(0,1fr)]">
				<div class="relative" aria-hidden="true">
					{#each ticks as tick (tick)}
						<span
							class="tick tabular absolute right-3 -translate-y-1/2 text-xs whitespace-nowrap text-fg-subtle"
							style="top: {yOf(tick) * 100}%"
							>{formatMoneyCompact(tick, currency, { whole: true })}</span
						>
					{/each}
				</div>
				<div class="flex min-w-0 flex-col">
					<div class="relative flex-1">
						{#each ticks as tick (tick)}
							<span
								class={cn(
									'tick absolute inset-x-0 border-t',
									tick === 0 ? 'border-line-strong' : 'border-dashed border-line'
								)}
								style="top: {yOf(tick) * 100}%"
								aria-hidden="true"
							></span>
						{/each}
						<div
							class="absolute inset-0 grid"
							style="grid-template-columns: repeat({months.length}, minmax(0, 1fr))"
						>
							{#each months as month, i (i)}
								{#if month.future}
									<span aria-hidden="true"></span>
								{:else}
									<Tooltip side="top" delay={80}>
										{#snippet content()}
											<p class="font-medium">{monthName(month.key)} {month.key.slice(0, 4)}</p>
											<dl class="mt-1.5 grid grid-cols-[1fr_auto] gap-x-5 gap-y-1 font-normal">
												<dt class="text-fg-muted">What happened</dt>
												<dd class="tabular text-right">{money(month.actual)}</dd>
												<dt class="text-fg-muted">What if</dt>
												<dd class="tabular text-right font-medium">{money(month.tried)}</dd>
											</dl>
										{/snippet}
										{#snippet children({ props })}
											<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users reach each month's figures. -->
											<div
												{...props}
												tabindex="0"
												role="img"
												aria-label="{monthName(month.key)}: {money(month.actual)} stayed, {money(
													month.tried
												)} with the what-if"
												class="group relative h-full outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue"
												style="--i: {i}"
											>
												<span class="bar ghost absolute inset-x-[16%]" style={box(month.actual)}
												></span>
												<span
													class={cn('bar tried absolute', month.tried < 0 && 'below')}
													style={box(month.tried)}
												></span>
											</div>
										{/snippet}
									</Tooltip>
								{/if}
							{/each}
						</div>
					</div>
					<div
						class="mt-2 grid"
						style="grid-template-columns: repeat({months.length}, minmax(0, 1fr))"
						aria-hidden="true"
					>
						{#each months as month, i (i)}
							<span
								class={cn(
									'truncate text-center text-xs',
									month.future ? 'text-fg-subtle' : 'text-fg-muted'
								)}>{month.label}</span
							>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>
</Card>

<style>
	/*
	 * What happened, as a ghost; the what-if over it in violet. Both rise from
	 * the baseline as the card arrives and ease to every change of a slider.
	 */
	.bar {
		top: var(--top);
		height: max(var(--height), 2px);
		border-radius: 0.5rem;
		transition:
			top 0.6s var(--ease-out-quint) calc(var(--i) * 25ms),
			height 0.6s var(--ease-out-quint) calc(var(--i) * 25ms),
			opacity 0.2s;

		@starting-style {
			top: var(--zero);
			height: 0;
		}
	}

	.ghost {
		background: color-mix(in oklab, var(--color-violet) 16%, transparent);
	}

	.tried {
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--color-violet) 75%, white),
			var(--color-violet)
		);
		box-shadow: 0 6px 16px -8px color-mix(in oklab, var(--color-violet) 60%, transparent);
		/* Narrower than the ghost, so what happened still shows beside it. */
		inset-inline: 26%;
	}

	.tried.below {
		background: linear-gradient(
			to top,
			color-mix(in oklab, var(--pastel-rose) 70%, white),
			oklch(from var(--pastel-rose) 0.6 calc(c * 1.6) h)
		);
		box-shadow: none;
	}

	.group:hover .tried,
	.group:focus-visible .tried {
		opacity: 0.85;
	}

	.tick {
		transition: top 0.6s var(--ease-out-quint);
	}
</style>

<script lang="ts">
	import MovingAlarmClock from '@jis3r/icons/icons/alarm-clock';
	import { countUp } from '$lib/actions';
	import { AnimatedIcon } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import type { LoanTotals } from '$lib/loans';
	import { cn } from '$lib/utils';

	/**
	 * The headline figures beside the title, from the user's seat: what's still
	 * owed to them, what they still owe, the two against each other, and how
	 * many loans are open — with how many of those are late, the one figure
	 * here that asks for something. They count over as the accounts' do.
	 */
	type Props = {
		totals: LoanTotals;
		/** How many people the open loans are with. */
		people: number;
		currency: Currency;
		class?: string;
	};

	let { totals, people, currency, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(Math.round(cents), currency);
	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${money(Math.abs(cents))}`;
	const whole = (value: number) => String(Math.round(value));

	const FIGURE = 'tabular truncate font-display text-[2rem] leading-none font-light tracking-tight';
</script>

<dl class={cn('grid gap-x-10 gap-y-6 sm:grid-cols-2 xl:grid-cols-4', className)}>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Owed to you</dt>
		<dd class="mt-1">
			<p
				class={cn(FIGURE, totals.owedToYou > 0 && 'text-positive')}
				use:countUp={{ value: totals.owedToYou, format: money, whenVisible: true }}
			>
				{money(totals.owedToYou)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">You owe</dt>
		<dd class="mt-1">
			<p
				class={cn(FIGURE, totals.youOwe > 0 && 'text-spent')}
				use:countUp={{ value: totals.youOwe, format: money, whenVisible: true }}
			>
				{money(totals.youOwe)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Where you stand</dt>
		<dd class="mt-1">
			<p class={FIGURE} use:countUp={{ value: totals.net, format: signed, whenVisible: true }}>
				{signed(totals.net)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Open</dt>
		<dd class="mt-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
			<p class={FIGURE} use:countUp={{ value: totals.open, format: whole, initial: false }}>
				{totals.open}
			</p>
			{#if totals.overdue > 0}
				<!-- Late loans ring their alarm once as the page arrives. -->
				<span
					class="inline-flex items-center gap-1 rounded-lg bg-negative/12 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-negative"
				>
					<AnimatedIcon icon={MovingAlarmClock} set="moving" size={13} trigger="mount" />
					{totals.overdue} late
				</span>
			{:else if people > 0}
				<span class="text-sm whitespace-nowrap text-fg-muted"
					>with {people} {people === 1 ? 'person' : 'people'}</span
				>
			{/if}
		</dd>
	</div>
</dl>

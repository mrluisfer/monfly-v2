<script lang="ts">
	import { countUp } from '$lib/actions';
	import { formatMoney, type Cents, type Currency } from '$lib/finance';
	import { cn } from '$lib/utils';

	/**
	 * What the ledger holds, beside the hero's total balance (`AccountsTotal`).
	 *
	 * They count over, as every figure on the dashboard does. The action owns
	 * the text from mount on, so each figure is one expression and nothing
	 * else: `textContent` then has a single text node to replace, and Svelte is
	 * never left writing into one that was swapped out underneath it.
	 */
	type Props = {
		received: Cents;
		spent: Cents;
		count: number;
		currency: Currency;
		class?: string;
	};

	let { received, spent, count, currency, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(cents, currency);
	const whole = (value: number) => String(Math.round(value));

	const FIGURE = 'tabular truncate font-display text-[2rem] leading-none font-light tracking-tight';
</script>

<!-- Columns by the room it has, not the viewport's: beside the total it can be
     short of three, and each figure keeps 12rem before it wraps to the next line. -->
<dl class={cn('grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-x-10 gap-y-6', className)}>
	<div class="min-w-0">
		<dt class="text-sm text-fg-muted">Received</dt>
		<dd class="mt-1">
			<p
				class={cn(FIGURE, 'text-positive')}
				use:countUp={{ value: received, format: money, whenVisible: true }}
			>
				{money(received)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-sm text-fg-muted">Spent</dt>
		<dd class="mt-1">
			<p class={FIGURE} use:countUp={{ value: spent, format: money, whenVisible: true }}>
				{money(spent)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-sm text-fg-muted">Transactions</dt>
		<dd class="mt-1">
			<p class={FIGURE} use:countUp={{ value: count, format: whole, whenVisible: true }}>
				{whole(count)}
			</p>
		</dd>
	</div>
</dl>

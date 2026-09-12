<script lang="ts">
	import { countUp } from '$lib/actions';
	import { formatMoney, type Cents, type Currency } from '$lib/finance';
	import { cn } from '$lib/utils';

	/**
	 * The headline figures. They cover the whole record, always — narrowing the
	 * list to a month is a question about the list, not about what someone has.
	 *
	 * They count over, as every figure on the dashboard does. The action owns
	 * the text from mount on, so each figure is one expression and nothing
	 * else: `textContent` then has a single text node to replace, and Svelte is
	 * never left writing into one that was swapped out underneath it.
	 */
	type Props = {
		/** Everything the accounts hold, plus what the total carries beyond them. */
		balance: Cents;
		received: Cents;
		spent: Cents;
		count: number;
		currency: Currency;
		class?: string;
	};

	let { balance, received, spent, count, currency, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(cents, currency);
	const whole = (value: number) => String(Math.round(value));

	const FIGURE = 'tabular truncate font-display text-[2rem] leading-none font-light tracking-tight';
</script>

<dl class={cn('grid gap-x-10 gap-y-6 sm:grid-cols-2 xl:grid-cols-4', className)}>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Total balance</dt>
		<dd class="mt-1">
			<p class={FIGURE} use:countUp={{ value: balance, format: money, whenVisible: true }}>
				{money(balance)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Received</dt>
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
		<dt class="text-[0.9375rem] text-fg-muted">Spent</dt>
		<dd class="mt-1">
			<p class={FIGURE} use:countUp={{ value: spent, format: money, whenVisible: true }}>
				{money(spent)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Transactions</dt>
		<dd class="mt-1">
			<p class={FIGURE} use:countUp={{ value: count, format: whole, whenVisible: true }}>
				{whole(count)}
			</p>
		</dd>
	</div>
</dl>

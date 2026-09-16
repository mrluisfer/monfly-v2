<script lang="ts">
	import type { Account } from '$lib/accounts';
	import { countUp } from '$lib/actions';
	import { formatMoney, type Currency } from '$lib/finance';
	import { cn } from '$lib/utils';

	/**
	 * The headline figures beside the title: what the accounts hold together,
	 * what came into them and went out of them this month, and how many there
	 * are. The Transactions page's figures, told about accounts — they count
	 * over as those do.
	 */
	type Props = {
		/** The active accounts. */
		accounts: Account[];
		/** How many are archived: said under the count. */
		archived?: number;
		currency: Currency;
		class?: string;
	};

	let { accounts, archived = 0, currency, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(cents, currency);
	const whole = (value: number) => String(Math.round(value));

	const held = $derived(accounts.reduce((sum, a) => sum + a.balance, 0));
	const out = $derived(accounts.reduce((sum, a) => sum + a.tracked, 0));
	// Income on an account is what's left of its net movement once its spending is put back.
	const came = $derived(accounts.reduce((sum, a) => sum + a.change + a.tracked, 0));

	const FIGURE = 'tabular truncate font-display text-[2rem] leading-none font-light tracking-tight';
</script>

<dl class={cn('grid gap-x-10 gap-y-6 sm:grid-cols-2 xl:grid-cols-4', className)}>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">In your accounts</dt>
		<dd class="mt-1">
			<p class={FIGURE} use:countUp={{ value: held, format: money, whenVisible: true }}>
				{money(held)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Came in this month</dt>
		<dd class="mt-1">
			<p
				class={cn(FIGURE, 'text-positive')}
				use:countUp={{ value: came, format: money, whenVisible: true }}
			>
				{money(came)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Went out this month</dt>
		<dd class="mt-1">
			<p class={FIGURE} use:countUp={{ value: out, format: money, whenVisible: true }}>
				{money(out)}
			</p>
		</dd>
	</div>
	<div class="min-w-0">
		<dt class="text-[0.9375rem] text-fg-muted">Accounts</dt>
		<dd class="mt-1 flex items-baseline gap-2.5">
			<p class={FIGURE} use:countUp={{ value: accounts.length, format: whole, initial: false }}>
				{accounts.length}
			</p>
			{#if archived > 0}
				<span class="text-sm whitespace-nowrap text-fg-muted">+{archived} archived</span>
			{/if}
		</dd>
	</div>
</dl>

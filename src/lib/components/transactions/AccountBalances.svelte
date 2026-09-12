<script lang="ts">
	import type { Account } from '$lib/accounts';
	import { countUp } from '$lib/actions';
	import { Orb, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Cents, type Currency } from '$lib/finance';
	import { cn } from '$lib/utils';

	/**
	 * What each account holds, largest first, and what the total carries beyond
	 * them. It answers the question the ledger raises next: the rows say where
	 * money went, this says where what's left is sitting.
	 */
	type Props = {
		accounts: Account[];
		/** v1's total minus the accounts — money that moved with no account on it. */
		unassigned?: Cents | null;
		colors?: Record<string, PaletteColor>;
		currency: Currency;
		class?: string;
	};

	let { accounts, unassigned = null, colors = {}, currency, class: className }: Props = $props();

	const ordered = $derived([...accounts].sort((a, b) => b.balance - a.balance));
	const money = (cents: number) => formatMoney(cents, currency);
</script>

<div class={cn('flex flex-col', className)}>
	{#each ordered as account (account.id)}
		<div class="flex items-center gap-3 border-b border-line py-3 first:pt-0">
			<Orb color={colors[account.id] ?? 'blue'} class="size-5 shrink-0" />
			<span class="min-w-0 flex-1 truncate text-[0.9375rem]">{account.name}</span>
			<!-- The server writes the figure; countUp takes it over once mounted.
			     The final figure, invisible beneath it, holds the width, so the row
			     sizes to it once instead of growing with every tick. -->
			<span class="tabular grid shrink-0 text-[0.9375rem]">
				<span class="invisible col-start-1 row-start-1" aria-hidden="true"
					>{money(account.balance)}</span
				>
				<span
					class="col-start-1 row-start-1"
					use:countUp={{ value: account.balance, format: money, whenVisible: true }}
					>{money(account.balance)}</span
				>
			</span>
		</div>
	{:else}
		<p class="text-[0.9375rem] text-fg-muted">No accounts yet.</p>
	{/each}

	{#if unassigned !== null && unassigned !== 0}
		<!-- The dashboard calls this the unknown line: in the total, in no account. -->
		<div class="flex items-center gap-3 py-3">
			<span class="hatch size-5 shrink-0 rounded-full border border-hairline" aria-hidden="true"
			></span>
			<span class="min-w-0 flex-1 truncate text-[0.9375rem] text-fg-muted">No account</span>
			<span class="tabular grid shrink-0 text-[0.9375rem] text-fg-muted">
				<span class="invisible col-start-1 row-start-1" aria-hidden="true">{money(unassigned)}</span
				>
				<span
					class="col-start-1 row-start-1"
					use:countUp={{ value: unassigned, format: money, whenVisible: true }}
					>{money(unassigned)}</span
				>
			</span>
		</div>
	{/if}
</div>

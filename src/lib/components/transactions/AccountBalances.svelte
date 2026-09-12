<script lang="ts">
	import type { Account } from '$lib/accounts';
	import { countUp } from '$lib/actions';
	import { Orb, OrbitRing, type PaletteColor } from '$lib/components/ui';
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
	{#each ordered as account, i (account.id)}
		<!-- No rules between rows: the rings already set each account apart. -->
		<div class="flex items-center gap-3 py-2 first:pt-0">
			<!-- Each orb in orbit, as on the dashboard's account blocks; neighbours
			     take the dashboard's pair and turn opposite ways. -->
			<OrbitRing
				class="w-10 shrink-0"
				markers={i % 2 === 0 ? [0.25, 0.75] : [0, 0.5]}
				direction={i % 2 === 0 ? 1 : -1}
				period={i % 2 === 0 ? 32 : 24}
			>
				<Orb color={colors[account.id] ?? 'blue'} class="size-full" />
			</OrbitRing>
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
		<div class="flex items-center gap-3 py-2">
			<!-- A ring's room with no ring: nothing in orbit, but the name lines up. -->
			<span class="relative aspect-square w-10 shrink-0" aria-hidden="true">
				<span class="hatch absolute inset-[14%] rounded-full border border-hairline"></span>
			</span>
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

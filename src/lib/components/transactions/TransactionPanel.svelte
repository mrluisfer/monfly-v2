<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { Card, Figure, IconButton, Orb, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { pop } from '$lib/transitions';
	import { signedAmount, type TransactionRow } from '$lib/transactions';
	import { cn } from '$lib/utils';

	/**
	 * One transaction, opened beside the table. It reads rather than edits:
	 * everything here is already recorded, and editing belongs to the form that
	 * records it.
	 */
	type Props = {
		row: TransactionRow;
		currency: Currency;
		/** The viewer's zone: the date is drawn in it. */
		timeZone: string;
		colors?: Record<string, PaletteColor>;
		onClose?: () => void;
	};

	let { row, currency, timeZone, colors = {}, onClose }: Props = $props();

	const amount = $derived(signedAmount(row));
	const full = $derived(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(row.date))
	);

	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;

	const facts = $derived([
		{ label: 'Date', value: full },
		{ label: 'Category', value: row.category },
		{ label: 'Kind', value: row.type === 'income' ? 'Money in' : 'Money out' }
	]);
</script>

<div in:pop={{ x: 12 }}>
	<Card class="p-7">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				<p class="text-[0.9375rem] text-fg-muted">
					{row.type === 'income' ? 'Received' : 'Spent'}
				</p>
				<Figure
					value={signed(amount)}
					size="lg"
					class={cn('mt-1', row.type === 'income' && 'text-positive')}
				/>
			</div>
			{#if onClose}
				<IconButton size="sm" aria-label="Close details" onclick={onClose}>
					<X />
				</IconButton>
			{/if}
		</div>

		<p class="mt-6 text-lg leading-snug font-medium">{row.category}</p>
		{#if row.description}
			<p class="mt-1 text-[0.9375rem] leading-relaxed text-fg-muted">{row.description}</p>
		{/if}

		<dl class="mt-6 grid gap-3 border-t border-line pt-6">
			{#each facts as fact (fact.label)}
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-fg-muted">{fact.label}</dt>
					<dd class="text-right text-[0.9375rem]">{fact.value}</dd>
				</div>
			{/each}
			<div class="flex items-baseline justify-between gap-4">
				<dt class="text-sm text-fg-muted">Account</dt>
				<dd class="text-right text-[0.9375rem]">
					{#if row.account}
						<span class="inline-flex items-center gap-2">
							<Orb color={colors[row.account.id] ?? 'blue'} class="size-4 shrink-0" />
							{row.account.name}
						</span>
					{:else}
						<span class="text-fg-subtle">None yet</span>
					{/if}
				</dd>
			</div>
		</dl>

		{#if !row.account}
			<p class="mt-6 text-sm leading-relaxed text-fg-muted">
				It has no account, so it moved your total but no balance. Give it one below and it joins
				that account's balance.
			</p>
		{/if}
	</Card>
</div>

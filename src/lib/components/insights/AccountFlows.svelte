<script lang="ts">
	import { countUp } from '$lib/actions';
	import { Card, Orb, Sparkle, Tooltip, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, formatMoneyCompact, type Currency } from '$lib/finance';
	import { kept, NO_ACCOUNT, type Stretch } from '$lib/insights';
	import { cn } from '$lib/utils';
	import { signedMoney } from './format';

	/**
	 * Each account's stretch as one bar split in two: what came in, in mint,
	 * and what went out, in rose, side by side against the busiest account, the
	 * rest of the track hatched. What stayed closes the row, signed. Bars grow
	 * in one after another; each one's figures, entries and all, are in a tip.
	 */
	type Props = {
		stretch: Stretch;
		/** Names by id. */
		accounts: { id: string; name: string }[];
		colors: Record<string, PaletteColor>;
		currency: Currency;
		class?: string;
	};

	let { stretch, accounts, colors, currency, class: className }: Props = $props();

	const money = (cents: number) => formatMoney(cents, currency);
	const signed = (cents: number) => signedMoney(cents, currency);

	const rows = $derived(
		stretch.accounts.map((account) => ({
			...account,
			name:
				account.id === NO_ACCOUNT
					? 'No account'
					: (accounts.find((a) => a.id === account.id)?.name ?? 'Account'),
			net: kept(account)
		}))
	);
	const most = $derived(Math.max(0, ...rows.map((r) => r.received + r.spent)));

	/** A part wide enough to hold its figure inside it. */
	const roomy = (share: number) => share >= 0.2;
</script>

<Card class={cn('flex flex-col p-7', className)}>
	<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
		<div class="min-w-0">
			<div class="flex items-center gap-2.5">
				<Sparkle color="blue" animated burst={stretch.span.label} class="size-5 shrink-0" />
				<h2 class="font-display text-2xl font-medium">Accounts in and out</h2>
			</div>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
				What each one took in and paid out, {stretch.span.label}.
			</p>
		</div>
		<ul class="flex gap-4 text-sm text-fg-muted" aria-label="Parts">
			<li class="flex items-center gap-2">
				<span class="size-2.5 rounded-full bg-(--pastel-mint)" aria-hidden="true"></span>In
			</li>
			<li class="flex items-center gap-2">
				<span class="size-2.5 rounded-full bg-(--pastel-rose)" aria-hidden="true"></span>Out
			</li>
		</ul>
	</div>

	{#if rows.length === 0}
		<p class="mt-6 flex-1 text-[0.9375rem] text-fg-muted">
			Nothing moved in {stretch.span.label}.
		</p>
	{:else}
		<ul class="mt-6 grid flex-1 content-end gap-5">
			{#each rows as row, i (row.id)}
				{@const inShare = most > 0 ? row.received / most : 0}
				{@const outShare = most > 0 ? row.spent / most : 0}
				<li>
					<div class="flex items-center gap-2.5">
						{#if row.id === NO_ACCOUNT}
							<span
								class="size-4 shrink-0 rounded-full border border-dashed border-line-strong"
								aria-hidden="true"
							></span>
						{:else}
							<Orb color={colors[row.id] ?? 'blue'} class="size-4 shrink-0" />
						{/if}
						<span class="min-w-0 flex-1 truncate text-[0.9375rem]">{row.name}</span>
						<span
							class={cn('tabular text-sm', row.net >= 0 ? 'text-positive' : 'text-spent')}
							use:countUp={{ value: row.net, format: signed, whenVisible: true }}
							>{signed(row.net)}</span
						>
					</div>

					<Tooltip side="top" delay={80}>
						{#snippet content()}
							<dl class="grid grid-cols-[1fr_auto] gap-x-5 gap-y-1 font-normal">
								<dt class="text-fg-muted">
									In, {row.incomes}
									{row.incomes === 1 ? 'entry' : 'entries'}
								</dt>
								<dd class="tabular text-right">{money(row.received)}</dd>
								<dt class="text-fg-muted">
									Out, {row.expenses}
									{row.expenses === 1 ? 'entry' : 'entries'}
								</dt>
								<dd class="tabular text-right">{money(row.spent)}</dd>
								<dt class="text-fg-muted">Stayed</dt>
								<dd class="tabular text-right font-medium">{signed(row.net)}</dd>
							</dl>
						{/snippet}
						{#snippet children({ props })}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users reach the figures. -->
							<div
								{...props}
								tabindex="0"
								role="img"
								aria-label="{row.name}: {money(row.received)} in, {money(row.spent)} out"
								class="mt-2 flex h-7 gap-1 rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
								style="--i: {i}"
							>
								{#if row.received > 0}
									<span class="part in" style="--share: {inShare}">
										{#if roomy(inShare)}{formatMoneyCompact(row.received, currency)}{/if}
									</span>
								{/if}
								{#if row.spent > 0}
									<span class="part out" style="--share: {outShare}">
										{#if roomy(outShare)}{formatMoneyCompact(row.spent, currency)}{/if}
									</span>
								{/if}
								{#if inShare + outShare < 0.97}
									<span class="hatch min-w-0 flex-1 rounded-lg border border-line"></span>
								{/if}
							</div>
						{/snippet}
					</Tooltip>
				</li>
			{/each}
		</ul>
	{/if}
</Card>

<style>
	/*
	 * Each part as wide as its share of the busiest account, growing in from
	 * nothing after the bar above it, and easing to a new share.
	 */
	.part {
		flex: 0 0 calc(var(--share) * (100% - 0.5rem));
		display: flex;
		align-items: center;
		overflow: hidden;
		padding-inline: 0.5rem;
		border-radius: 0.5rem;
		background: var(--tint);
		color: oklch(from var(--tint) 0.32 calc(c * 1.2) h);
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
		transition: flex-basis 0.9s var(--ease-out-quint) calc(var(--i) * 70ms);

		@starting-style {
			flex-basis: 0;
		}
	}

	.part.in {
		--tint: var(--pastel-mint);
	}

	.part.out {
		--tint: var(--pastel-rose);
	}
</style>

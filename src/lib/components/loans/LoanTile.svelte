<script lang="ts">
	import { countUp } from '$lib/actions';
	import { AnimatedIcon, Avatar, PALETTE, ShareBar } from '$lib/components/ui';
	import { formatMoney, type Currency, type DateKey } from '$lib/finance';
	import { LOAN_DIRECTION_LABEL, loanDue, loanLeft, shortDay, type Loan } from '$lib/loans';
	import { cn } from '$lib/utils';
	import DueChip from './DueChip.svelte';
	import { DIRECTION_CHIP, DIRECTION_GLYPH, DIRECTION_TINT } from './tone';

	/**
	 * An open loan, drawn as a card of its own: the other person's blobatar and
	 * name, which way it runs, what's left to settle over how much of it is
	 * settled, and where it stands against its due day. The whole card opens it
	 * in the panel; the open one lifts and wears a rim in its side's colour, as
	 * an account's card does.
	 */
	type Props = {
		loan: Loan;
		currency: Currency;
		/** Today in the viewer's zone: what the due day is measured from. */
		today: DateKey;
		selected?: boolean;
		onSelect: () => void;
		class?: string;
	};

	let { loan, currency, today, selected = false, onSelect, class: className }: Props = $props();

	const tint = $derived(DIRECTION_TINT[loan.direction]);
	const left = $derived(loanLeft(loan));
	const share = $derived(loan.amount > 0 ? Math.min(1, loan.paid / loan.amount) : 0);
	const due = $derived(loanDue(loan, today));
	const money = (cents: number) => formatMoney(Math.round(cents), currency);
	const figure = $derived(money(left));
	const payments = $derived(loan.payments.length);
</script>

<!-- A host for its glyphs: pointing anywhere on the card plays them. -->
<article
	class={cn('tile group relative isolate', selected && 'selected', className)}
	style="--tint: {PALETTE[tint].css}"
	data-icon-host
>
	<div
		class="face relative flex h-full min-h-60 flex-col overflow-hidden rounded-[var(--radius-card)] bg-card p-6"
	>
		<span
			class="glow pointer-events-none absolute -top-20 -right-16 size-56 rounded-full"
			aria-hidden="true"
		></span>

		<!-- The whole card opens the loan; what's drawn on it lets the press through. -->
		<button
			type="button"
			class="absolute inset-0 z-0 rounded-[var(--radius-card)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue"
			aria-pressed={selected}
			aria-label="Show the loan {loan.direction === 'lent' ? 'to' : 'from'} {loan.person}"
			onclick={onSelect}
		></button>

		<div class="pointer-events-none relative flex items-start gap-3">
			<Avatar seed={loan.person} class="size-10 shrink-0" />
			<div class="min-w-0 flex-1">
				<p class="text-[0.9375rem] leading-snug font-medium text-balance wrap-anywhere">
					{loan.person}
				</p>
				<p class="mt-0.5 text-xs text-fg-muted">Since {shortDay(loan.issuedOn)}</p>
			</div>
			<span
				class={cn(
					'inline-flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap',
					DIRECTION_CHIP[loan.direction]
				)}
			>
				<AnimatedIcon {...DIRECTION_GLYPH[loan.direction]} size={12} />
				{LOAN_DIRECTION_LABEL[loan.direction]}
			</span>
		</div>

		<div class="pointer-events-none relative mt-auto pt-8">
			<p class="text-sm text-fg-muted">Left to settle</p>
			<div class="@container mt-1">
				<p
					class="fit-figure tabular font-display leading-none font-light tracking-tight"
					style="--fit: 2rem; --chars: {figure.length}"
					use:countUp={{ value: left, format: money, initial: false }}
				>
					{figure}
				</p>
			</div>
			<p class="tabular mt-1.5 text-xs text-fg-muted">
				of {money(loan.amount)} · {Math.floor(share * 100)}% settled
			</p>
			<ShareBar track="hatch" segments={[{ id: loan.id, share, color: tint }]} class="mt-3 h-2" />
			<div class="mt-4 flex flex-wrap items-center justify-between gap-2">
				<DueChip {due} dueOn={loan.dueOn} />
				{#if payments > 0}
					<span class="text-xs whitespace-nowrap text-fg-subtle">
						{payments}
						{payments === 1 ? 'payment' : 'payments'}
					</span>
				{/if}
			</div>
		</div>
	</div>
</article>

<style>
	/* The side's colour at a glyph's weight, for the rim of the open card. */
	.tile {
		--glyph: oklch(from var(--tint) 0.55 calc(c * 1.7) h);
	}

	:global(.dark) .tile {
		--glyph: var(--tint);
	}

	.face {
		transition:
			translate 0.7s var(--ease-out-quint),
			box-shadow 0.4s var(--ease-out-quint),
			outline-color 0.3s var(--ease-out-quint);
		outline: 2px solid transparent;
		outline-offset: 3px;
	}

	.tile.selected .face {
		translate: 0 -4px;
		outline-color: var(--glyph);
		box-shadow: 0 18px 40px -24px color-mix(in oklab, var(--tint) 70%, transparent);
	}

	/* A glow in the side's colour, swelling under the pointer and on the open card. */
	.glow {
		background: radial-gradient(
			circle at 50% 50%,
			color-mix(in oklab, var(--tint) 55%, transparent) 0%,
			color-mix(in oklab, var(--tint) 18%, transparent) 45%,
			transparent 70%
		);
		filter: blur(10px);
		opacity: 0.6;
		transition:
			scale 0.7s var(--ease-out-quint),
			opacity 0.7s var(--ease-out-quint);
	}

	.tile:hover .glow,
	.tile.selected .glow {
		scale: 1.15;
		opacity: 1;
	}
</style>

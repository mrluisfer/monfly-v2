<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { animate } from 'motion';
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import type { Account } from '$lib/accounts';
	import { Figure, Orb, OrbitRing, Select, Sparkle, type PaletteColor } from '$lib/components/ui';
	import {
		earlierMonthsThisYear,
		formatMoney,
		monthName,
		type Currency,
		type MonthKey
	} from '$lib/finance';
	import { accountsQuery } from '$lib/queries';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';
	import { formatAge } from '$lib/utils/time';

	/**
	 * One featured account. The header's filter shows it now (the default) or
	 * as one of this year's earlier months ended: the balance then, and that
	 * month's spending. A new choice counts the figures over (GSAP), blurs them
	 * into focus (Motion) and spins the rings up for a moment.
	 */
	type Props = {
		/** The account as it is now, from the dashboard's list. */
		account: Account;
		currency: Currency;
		/** The viewer's zone: it decides which months have passed. */
		timeZone: string;
		/** The account's colour: its sparkle and its balance orb. */
		color: PaletteColor;
		/** Called with a colour the person picked from the orb. Omit to keep it read-only. */
		onColorChange?: (color: PaletteColor) => void;
		/** Why the last pick didn't save, shown in the palette. */
		colorError?: string;
	};

	let { account, currency, timeZone, color, onColorChange, colorError }: Props = $props();

	type Period = 'now' | MonthKey;

	let period = $state<Period>('now');
	const options = $derived<{ value: Period; label: string }[]>([
		{ value: 'now', label: `Updated ${formatAge(account.updatedAt)}` },
		...earlierMonthsThisYear(timeZone).map((m) => ({ value: m, label: `End of ${monthName(m)}` }))
	]);

	// A past month's figures come from that month's list; now's are the ones we were handed.
	const past = createQuery(() => ({
		...accountsQuery(period === 'now' ? undefined : period),
		enabled: browser && period !== 'now',
		// The last month stays up while the next loads, so the figures count from it.
		placeholderData: keepPreviousData
	}));
	const shown = $derived(
		period === 'now' ? account : (past.data?.accounts.find((a) => a.id === account.id) ?? account)
	);
	const loading = $derived(period !== 'now' && (past.isPending || past.isPlaceholderData));
	const format = (cents: number) => formatMoney(cents, currency);
	// Both figures wear one size: the one the longer fits at (.fit-figure).
	const chars = $derived(Math.max(format(shown.balance).length, format(shown.tracked).length));

	let figures = $state<HTMLElement[]>([]);
	let settled = false;

	// Each new month's figures blur into focus while they count to their values.
	$effect(() => {
		void shown;
		if (!settled) {
			settled = true;
			return;
		}
		if (loading || prefersReducedMotion()) return;
		animate(
			figures.filter(Boolean),
			{ filter: ['blur(6px)', 'blur(0px)'], opacity: [0.35, 1] },
			{ duration: 0.6, ease: EASE_OUT_QUINT }
		);
	});
</script>

<!-- Fills its card: the header on top, the figures anchored to the bottom. -->
<div class="flex flex-1 flex-col p-7">
	<div class="mb-6 flex items-center justify-between gap-4">
		<div class="flex min-w-0 items-center gap-2.5">
			<!-- Alive in the account's colour; a new month flashes it, as it surges the rings. -->
			<Sparkle {color} animated burst={period} class="size-5 shrink-0" />
			<span class="truncate font-display text-xl font-medium">{account.name}</span>
		</div>
		{#if options.length > 1}
			<Select variant="ghost" label="Show the balance" {options} bind:value={period} />
		{:else}
			<span class="shrink-0 text-sm text-fg-muted">{options[0].label}</span>
		{/if}
	</div>

	<div
		class={cn(
			'mt-auto grid grid-cols-[1fr_1fr_auto] gap-6 transition-opacity duration-300',
			loading && 'opacity-60'
		)}
	>
		<!-- Containers, so a big figure fits its column instead of squeezing "To review". -->
		<div class="@container min-w-0">
			<p class="text-sm text-fg-muted">Bank balance</p>
			<!-- The server writes the figure; countUp takes the node over once mounted. -->
			{#if shown.existed}
				<p
					bind:this={figures[0]}
					class="fit-figure tabular mt-1 font-display leading-[1.75rem] font-light"
					style="--fit: 1.75rem; --chars: {chars}"
					use:countUp={{ value: shown.balance, format, whenVisible: true }}
				>
					{format(shown.balance)}
				</p>
			{:else}
				<p class="mt-1 font-display text-[1.75rem] leading-none font-light text-fg-subtle">—</p>
			{/if}
			<OrbitRing class="mt-5 w-24" markers={[0.25, 0.75]} burst={period}>
				<Orb
					{color}
					editable={onColorChange !== undefined}
					label="the {account.name} account"
					onChange={onColorChange}
					error={colorError}
					blur={7}
					spread={80}
					class="size-full"
				/>
			</OrbitRing>
		</div>

		<div class="@container min-w-0">
			<p class="text-sm text-fg-muted">Tracked</p>
			{#if shown.existed}
				<p
					bind:this={figures[1]}
					class="fit-figure tabular mt-1 font-display leading-[1.75rem] font-light"
					style="--fit: 1.75rem; --chars: {chars}"
					use:countUp={{ value: shown.tracked, format, whenVisible: true }}
				>
					{format(shown.tracked)}
				</p>
			{:else}
				<p class="mt-1 font-display text-[1.75rem] leading-none font-light text-fg-subtle">—</p>
			{/if}
			<!-- Turns the other way from its neighbour, a little quicker. -->
			<OrbitRing class="mt-5 w-20" markers={[0, 0.5]} direction={-1} period={24} burst={period}>
				<Orb color="blue" blur={8} spread={70} class="size-full" />
			</OrbitRing>
		</div>

		<!-- Leads to the review view to come; for now, the transactions. -->
		<a href="/transactions" class="review press self-end rounded-lg text-right">
			<Figure value={String(account.toReview)} size="lg" />
			<span
				class="mt-1 flex items-center justify-end gap-1 text-sm whitespace-nowrap text-fg-muted"
			>
				To review
				<ArrowRight class="review-arrow size-3.5 stroke-[1.75]" aria-hidden="true" />
			</span>
		</a>
	</div>
</div>

<style>
	/* The arrow says "this goes somewhere": it slides in on hover or focus,
	   then keeps nudging the way it points. Touch has no hover, so it stays. */
	.review :global(.review-arrow) {
		opacity: 0;
		translate: -0.25rem 0;
		transition:
			opacity 0.3s var(--ease-out-quint),
			translate 0.45s var(--ease-spring);
	}

	.review:hover :global(.review-arrow),
	.review:focus-visible :global(.review-arrow) {
		opacity: 1;
		translate: 0 0;
		animation: nudge 1.4s var(--ease-out-quint) 0.45s infinite;
	}

	@media (hover: none) {
		.review :global(.review-arrow) {
			opacity: 1;
			translate: 0 0;
		}
	}

	@keyframes nudge {
		0%,
		100% {
			translate: 0 0;
		}
		50% {
			translate: 0.2rem 0;
		}
	}
</style>

<script lang="ts">
	import MovingArrowRight from '@jis3r/icons/icons/arrow-right';
	import { animate } from 'motion';
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import type { Account } from '$lib/accounts';
	import {
		AnimatedIcon,
		Figure,
		Orb,
		OrbitRing,
		Select,
		Sparkle,
		type PaletteColor
	} from '$lib/components/ui';
	import {
		earlierMonthsThisYear,
		formatMoney,
		monthName,
		type Currency,
		type MonthKey
	} from '$lib/finance';
	import { accountLedgerHref } from '$lib/ledger-view';
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
	<!-- The name is never cut short: it takes the lines it needs, balanced, and
	     one long word breaks rather than widening the card. The filter keeps its
	     words on one line and drops under the name once there's no room beside it. -->
	<div class="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
		<!-- Leads to the account's rows in the ledger. -->
		<a
			href={accountLedgerHref(account.id)}
			class="name flex min-w-0 flex-1 basis-56 items-start gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
		>
			<!-- Alive in the account's colour; a new month flashes it, as it surges the
			     rings. Centred on the name's first line. -->
			<Sparkle {color} animated burst={period} class="mt-1 size-5 shrink-0" />
			<span class="min-w-0 font-display text-xl font-medium text-balance wrap-anywhere"
				>{account.name}<AnimatedIcon
					icon={MovingArrowRight}
					set="moving"
					size={16}
					class="review-arrow ml-1.5 align-middle"
				/></span
			>
		</a>
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

		<!-- Leads to the review view to come; for now, the account's rows in the ledger. -->
		<a href={accountLedgerHref(account.id)} class="review press self-end rounded-lg text-right">
			<Figure value={String(account.toReview)} size="lg" />
			<span
				class="mt-1 flex items-center justify-end gap-1 text-sm whitespace-nowrap text-fg-muted"
			>
				To review
				<AnimatedIcon icon={MovingArrowRight} set="moving" size={14} class="review-arrow" />
			</span>
		</a>
	</div>
</div>

<style>
	/* The arrow says "this goes somewhere": it slides in on hover or focus and
	   plays its own push the way it points (AnimatedIcon). Touch has no hover,
	   so it stays. */
	:is(.review, .name) :global(.review-arrow) {
		opacity: 0;
		translate: -0.25rem 0;
		transition:
			opacity 0.3s var(--ease-out-quint),
			translate 0.45s var(--ease-spring);
	}

	:is(.review, .name):hover :global(.review-arrow),
	:is(.review, .name):focus-visible :global(.review-arrow) {
		opacity: 1;
		translate: 0 0;
	}

	@media (hover: none) {
		:is(.review, .name) :global(.review-arrow) {
			opacity: 1;
			translate: 0 0;
		}
	}
</style>

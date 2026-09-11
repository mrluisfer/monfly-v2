<script lang="ts">
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import { animate } from 'motion';
	import { countUp } from '$lib/actions';
	import type { Account } from '$lib/accounts';
	import { PALETTE, Tooltip, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * Every account at once: the total balance, this month's net movement, and
	 * a share bar — each account's slice of the whole in its own colour, with
	 * its amount in a tooltip. The figures count (GSAP), the slices grow (CSS),
	 * the change chip springs when the numbers move (Motion), and a sheen
	 * crosses the bar now and then.
	 */
	type Props = {
		accounts: Account[];
		/** Each account's colour, by id — the one its orb and sparkle wear. */
		colors: Record<string, PaletteColor>;
		currency: Currency;
		class?: string;
	};

	let { accounts, colors, currency, class: className }: Props = $props();

	const total = $derived(accounts.reduce((sum, a) => sum + a.balance, 0));
	const change = $derived(accounts.reduce((sum, a) => sum + a.change, 0));
	// Shares of what's above zero: an overdrawn account has no slice of the whole.
	const positive = $derived(accounts.reduce((sum, a) => sum + Math.max(a.balance, 0), 0));
	const slices = $derived(
		accounts
			.map((account) => ({
				account,
				share: positive > 0 ? Math.max(account.balance, 0) / positive : 0,
				color: colors[account.id] ?? 'blue'
			}))
			.filter((slice) => slice.share > 0)
	);

	const format = (cents: number) => formatMoney(cents, currency);
	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;
	const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 }).format;

	/** The slice being pointed at or focused: it lifts, the rest dim. */
	let lit = $state<string | null>(null);

	type Handler = ((event: Event) => void) | undefined;
	/**
	 * The tooltip trigger's own handlers first, then ours. Writing ours after
	 * the spread without calling theirs replaces them: bits-ui then never hears
	 * the pointer leave, and the tooltip sticks open and stops responding.
	 */
	const chain = (theirs: unknown, ours: () => void) => (event: Event) => {
		(theirs as Handler)?.(event);
		ours();
	};

	let chip = $state<HTMLElement>();
	let settled = false;

	// The chip springs when the numbers move; the first, server-rendered ones stay put.
	$effect(() => {
		void total;
		void change;
		if (!settled) {
			settled = true;
			return;
		}
		if (chip && !prefersReducedMotion()) {
			animate(chip, { scale: [0.88, 1] }, { type: 'spring', bounce: 0.45, duration: 0.6 });
		}
	});
</script>

<div class={className}>
	<div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
		<div class="min-w-0">
			<p class="text-sm text-fg-muted">Total balance</p>
			<!-- The server writes the figure; countUp takes the node over once mounted. -->
			<p
				class="font-display tabular mt-1 text-[2rem] leading-none font-light tracking-tight"
				use:countUp={{ value: total, format, whenVisible: true }}
			>
				{format(total)}
			</p>
		</div>
		<span
			bind:this={chip}
			class={cn(
				'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
				change > 0 && 'bg-positive/12 text-positive',
				change < 0 && 'bg-negative/12 text-negative',
				change === 0 && 'bg-sunken text-fg-muted'
			)}
		>
			{#if change < 0}
				<TrendingDown class="size-3.5 stroke-[1.75]" aria-hidden="true" />
			{:else}
				<TrendingUp class="size-3.5 stroke-[1.75]" aria-hidden="true" />
			{/if}
			<span class="tabular" use:countUp={{ value: change, format: signed, whenVisible: true }}>
				{signed(change)}
			</span>
			<span class="font-normal opacity-80">this month</span>
		</span>
	</div>

	{#if slices.length > 0}
		<div class="relative mt-4">
			<!-- What you see: each slice grown to its account's part of the whole -->
			<div class="share flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
				{#each slices as slice, i (slice.account.id)}
					<span
						class={cn('slice h-full min-w-1 rounded-full', lit === slice.account.id && 'lit')}
						style="--c: {PALETTE[slice.color].css}; --share: {slice.share}; --i: {i}"
					></span>
				{/each}
			</div>

			<!-- What you point at: the same slices, taller and invisible, each with
			     its amount in a tooltip. They track the visible ones' widths. -->
			<ul class="absolute inset-x-0 -inset-y-2 flex gap-0.5" aria-label="Share of the total balance">
				{#each slices as slice, i (slice.account.id)}
					{#snippet amount()}
						<span class="flex items-center gap-2 whitespace-nowrap">
							<span class="size-2 shrink-0 rounded-full" style="background: {PALETTE[slice.color].css}"></span>
							<span class="font-normal text-fg-muted">{slice.account.name}</span>
							<span class="tabular">{format(slice.account.balance)}</span>
						</span>
					{/snippet}
					<Tooltip content={amount} side="top" delay={60}>
						{#snippet children({ props })}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users reach each slice's amount. -->
							<li
								{...props}
								tabindex="0"
								aria-label="{slice.account.name}: {format(slice.account.balance)}, {percent(slice.share)} of the total"
								class="slice-target h-full min-w-1 cursor-default rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
								style="--share: {slice.share}; --i: {i}"
								onpointerenter={chain(props.onpointerenter, () => (lit = slice.account.id))}
								onpointerleave={chain(props.onpointerleave, () => (lit = null))}
								onfocus={chain(props.onfocus, () => (lit = slice.account.id))}
								onblur={chain(props.onblur, () => (lit = null))}
							></li>
						{/snippet}
					</Tooltip>
				{/each}
			</ul>
		</div>

		<ul class="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-hidden="true">
			{#each slices as slice (slice.account.id)}
				<li class="flex min-w-0 items-center gap-1.5">
					<span class="size-2 shrink-0 rounded-full" style="background: {PALETTE[slice.color].css}"></span>
					<span class="truncate">{slice.account.name}</span>
					<span class="tabular text-fg">{percent(slice.share)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.share {
		position: relative;
	}

	/* Every few seconds a soft light crosses the bar, left to right. */
	.share::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 0.6) 50%, transparent 70%);
		mix-blend-mode: soft-light;
		translate: -100% 0;
		animation: sheen 7s var(--ease-out-quint) 1.5s infinite;
	}

	@keyframes sheen {
		0% {
			translate: -100% 0;
		}
		30%,
		100% {
			translate: 100% 0;
		}
	}

	/* Each slice's width is its share, eased on every change and grown in from
	   nothing when it first appears, one after another. Its invisible target
	   moves the same way, so the tooltip always sits over the right colour. */
	.slice,
	.slice-target {
		flex: var(--share) 1 0;
		transition: flex-grow 0.9s var(--ease-out-quint) calc(var(--i) * 80ms);

		@starting-style {
			flex-grow: 0;
		}
	}

	.slice {
		background: linear-gradient(90deg, var(--c), color-mix(in oklab, var(--c) 55%, white));
		transition:
			flex-grow 0.9s var(--ease-out-quint) calc(var(--i) * 80ms),
			opacity 0.25s var(--ease-out-quint),
			filter 0.25s var(--ease-out-quint);
	}

	/* The slice pointed at stays bright; while one is, the others step back. */
	.share:has(.lit) .slice:not(.lit) {
		opacity: 0.4;
	}

	.slice.lit {
		filter: saturate(1.2) brightness(1.04);
	}
</style>

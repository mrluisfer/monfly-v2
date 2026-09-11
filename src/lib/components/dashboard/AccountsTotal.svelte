<script lang="ts">
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import gsap from 'gsap';
	import { animate, hover } from 'motion';
	import { MediaQuery, SvelteSet } from 'svelte/reactivity';
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
	 * crosses the bar now and then. Where a pointer can hover, the change chip
	 * rests as a dot and opens into its figure when pointed at or focused.
	 */
	type Props = {
		accounts: Account[];
		/** Each account's colour, by id — the one its orb and sparkle wear. */
		colors: Record<string, PaletteColor>;
		currency: Currency;
		class?: string;
	};

	let { accounts, colors, currency, class: className }: Props = $props();

	/** Accounts left out of the totals by pressing their slice — for this visit only. */
	const off = new SvelteSet<string>();
	const counted = $derived(accounts.filter((a) => !off.has(a.id)));
	const leftOut = $derived(accounts.length - counted.length);

	const total = $derived(counted.reduce((sum, a) => sum + a.balance, 0));
	const change = $derived(counted.reduce((sum, a) => sum + a.change, 0));
	// Shares of what's above zero: an overdrawn account has no slice of the whole.
	// Every account keeps its slice; one left out greys out in place.
	const positive = $derived(accounts.reduce((sum, a) => sum + Math.max(a.balance, 0), 0));
	const slices = $derived(
		accounts
			.map((account) => ({
				account,
				share: positive > 0 ? Math.max(account.balance, 0) / positive : 0,
				color: colors[account.id] ?? 'blue',
				off: off.has(account.id)
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

	/** The visible slices, by account: a pressed one squashes and springs back. */
	let bars = $state<Record<string, HTMLElement>>({});

	// Leaving an account out, or counting it again: the totals count to their
	// new sums (GSAP, via countUp), the slice greys or regains its colour
	// (CSS, --vivid) and gives a little under the press (Motion).
	function toggle(id: string) {
		if (off.has(id)) off.delete(id);
		else off.add(id);
		const bar = bars[id];
		if (bar && !prefersReducedMotion()) {
			animate(bar, { scaleY: [0.4, 1] }, { type: 'spring', bounce: 0.55, duration: 0.5 });
		}
	}

	let chip = $state<HTMLElement>();
	let arrow = $state<HTMLElement>();
	let words = $state<HTMLElement>();
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

	/*
	 * The dot opens while pointed at or tabbed to. One state drives all three
	 * layers so they never disagree: CSS widens the chip (`data-open`), GSAP
	 * brings the words in, Motion leans the arrow. Touch has no hover, so there
	 * the chip stays open — the CSS only collapses it under `hover: hover`.
	 */
	const canHover = new MediaQuery('(hover: hover)');
	let hovered = $state(false);
	let focused = $state(false);
	const open = $derived(hovered || focused);

	// Motion's hover ignores touch, so a tap never leaves the chip stuck open.
	$effect(() => {
		if (!chip) return;
		return hover(chip, () => {
			hovered = true;
			return () => (hovered = false);
		});
	});

	let reveal: gsap.core.Timeline | undefined;

	// The words follow the edge as it sweeps left — "this month", then the
	// figure — sliding into place as they fade up (compositor properties only).
	$effect(() => {
		if (!words || prefersReducedMotion()) return;
		const timeline = gsap
			.timeline({ paused: true })
			.fromTo(
				words.children,
				{ opacity: 0, x: 8 },
				{ opacity: 1, x: 0, duration: 0.4, ease: 'power3.out', stagger: { each: 0.07, from: 'end' } },
				0.08
			);
		reveal = timeline;
		return () => {
			timeline.kill();
			reveal = undefined;
		};
	});

	// Closing runs the same timeline back from wherever it is, a little quicker.
	$effect(() => {
		if (!canHover.current) reveal?.progress(1);
		else if (open) reveal?.timeScale(1).play();
		else reveal?.timeScale(1.35).reverse();
	});

	// The arrow leans the way the money went, springing a touch past it.
	$effect(() => {
		const lean = open ? 1.5 : 0;
		const y = change < 0 ? lean : -lean;
		if (!arrow || prefersReducedMotion()) return;
		animate(arrow, { x: lean, y }, { type: 'spring', bounce: 0.5, duration: 0.5 });
	});
</script>

<div class={className}>
	<div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
		<div class="min-w-0">
			<p class="text-sm text-fg-muted">
				<!-- A margin, not a space: Svelte trims the space at the start of a tag. -->
				Total balance{#if leftOut > 0}<span class="left-out ml-1">· {leftOut} left out</span>{/if}
			</p>
			<!-- The server writes the figure; countUp takes the node over once mounted. -->
			<p
				class="font-display tabular mt-1 text-[2rem] leading-none font-light tracking-tight"
				use:countUp={{ value: total, format, whenVisible: true }}
			>
				{format(total)}
			</p>
		</div>
		<!-- Where a pointer can hover, a dot-wide slot the chip opens out of,
		     leftward; on touch, just the chip's own width. -->
		<div class="chip-slot">
			<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users open the chip. -->
			<span
				bind:this={chip}
				tabindex="0"
				data-open={open || undefined}
				class={cn(
					'chip rounded-lg cursor-default text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
					change > 0 && 'text-positive',
					change < 0 && 'text-negative',
					change === 0 && 'flat text-fg-muted'
				)}
				onfocus={(event) => (focused = event.currentTarget.matches(':focus-visible'))}
				onblur={() => (focused = false)}
			>
				<span bind:this={arrow} class="flex shrink-0">
					{#if change < 0}
						<TrendingDown class="size-3.5 stroke-[1.75]" aria-hidden="true" />
					{:else}
						<TrendingUp class="size-3.5 stroke-[1.75]" aria-hidden="true" />
					{/if}
				</span>
				<span class="reveal">
					<span class="reveal-clip">
						<span bind:this={words} class="flex items-center gap-1.5 pr-[0.3125rem] pl-1.5 whitespace-nowrap">
							<!-- Counts on mount, not when seen: clipped to a dot it never
							     enters view, so it would sit at $0 — and be read out so. -->
							<span class="tabular" use:countUp={{ value: change, format: signed }}>
								{signed(change)}
							</span>
							<span class="muted font-normal">this month</span>
						</span>
					</span>
				</span>
			</span>
		</div>
	</div>

	{#if slices.length > 0}
		<div class="relative mt-4">
			<!-- What you see: each slice grown to its account's part of the whole -->
			<div class="share flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
				{#each slices as slice, i (slice.account.id)}
					<span
						bind:this={bars[slice.account.id]}
						class={cn('slice h-full min-w-1 rounded-full', lit === slice.account.id && 'lit', slice.off && 'off')}
						style="--c: {PALETTE[slice.color].css}; --share: {slice.share}; --i: {i}"
					></span>
				{/each}
			</div>

			<!-- What you point at and press: the same slices, taller and invisible,
			     each with its amount in a tooltip and a switch for the totals. They
			     track the visible ones' widths. -->
			<ul class="absolute inset-x-0 -inset-y-2 flex gap-0.5" aria-label="Accounts in the total balance">
				{#each slices as slice, i (slice.account.id)}
					{#snippet amount()}
						<span class="flex flex-col gap-1 whitespace-nowrap">
							<span class="flex items-center gap-2">
								<span class="size-2 shrink-0 rounded-full" style="background: {PALETTE[slice.color].css}"></span>
								<span class="font-normal text-fg-muted">{slice.account.name}</span>
								<span class="tabular">{format(slice.account.balance)}</span>
							</span>
							<span class="font-normal text-fg-muted">
								{slice.off ? 'Left out of the total · click to count it' : 'Click to leave out of the total'}
							</span>
						</span>
					{/snippet}
					<li class="slice-target h-full min-w-1" style="--share: {slice.share}; --i: {i}">
						<Tooltip content={amount} side="top" delay={60}>
							{#snippet children({ props })}
								<button
									{...props}
									type="button"
									aria-pressed={!slice.off}
									aria-label="Count {slice.account.name} in the total balance: {format(slice.account.balance)}, {percent(slice.share)} of all accounts"
									class="size-full cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
									onclick={chain(props.onclick, () => toggle(slice.account.id))}
									onpointerenter={chain(props.onpointerenter, () => (lit = slice.account.id))}
									onpointerleave={chain(props.onpointerleave, () => (lit = null))}
									onfocus={chain(props.onfocus, () => (lit = slice.account.id))}
									onblur={chain(props.onblur, () => (lit = null))}
								></button>
							{/snippet}
						</Tooltip>
					</li>
				{/each}
			</ul>
		</div>

		<ul class="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-hidden="true">
			{#each slices as slice (slice.account.id)}
				<li
					class={cn('legend flex min-w-0 items-center gap-1.5', slice.off && 'off')}
					style="--c: {PALETTE[slice.color].css}"
				>
					<span class="dot size-2 shrink-0 rounded-full"></span>
					<span class="struck truncate">{slice.account.name}</span>
					<span class="struck tabular text-fg">{percent(slice.share)}</span>
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
		background: linear-gradient(90deg, var(--ink), color-mix(in oklab, var(--ink) 55%, white));
		transition:
			flex-grow 0.9s var(--ease-out-quint) calc(var(--i) * 80ms),
			opacity 0.25s var(--ease-out-quint),
			filter 0.25s var(--ease-out-quint),
			--vivid 0.6s var(--ease-out-quint);
	}

	/* The slice pointed at stays bright; while one is, the others step back. */
	.share:has(.lit) .slice:not(.lit) {
		opacity: 0.4;
	}

	.slice.lit {
		filter: saturate(1.2) brightness(1.04);
	}

	/* An account left out of the totals keeps its slice, greyed in place: the
	   colour mixes toward the track's grey through the registered --vivid, so
	   it eases rather than snaps. Its legend entry fades and strikes through. */
	@property --vivid {
		syntax: '<percentage>';
		inherits: false;
		initial-value: 100%;
	}

	.slice,
	.legend {
		--grey: color-mix(in oklab, var(--color-fg-muted) 35%, var(--color-card));
		--ink: color-mix(in oklab, var(--c) var(--vivid), var(--grey));
	}

	.slice.off,
	.legend.off {
		--vivid: 0%;
	}

	.legend {
		transition:
			--vivid 0.6s var(--ease-out-quint),
			opacity 0.3s var(--ease-out-quint);
	}

	.legend .dot {
		background: var(--ink);
	}

	.legend .struck {
		text-decoration: line-through transparent;
		transition: text-decoration-color 0.3s var(--ease-out-quint);
	}

	.legend.off {
		opacity: 0.55;
	}

	.legend.off .struck {
		text-decoration-color: currentColor;
	}

	.left-out {
		transition: opacity 0.3s var(--ease-out-quint);

		@starting-style {
			opacity: 0;
		}
	}

	/* The change chip. Its tint is mixed onto the card (the same colour
	   `bg-positive/12` gives over it) so it stays solid if, opened on a narrow
	   card, it ever reaches the figure beside it. */
	.chip {
		position: relative;
		display: flex;
		flex-shrink: 0;
		align-items: center;
		height: 1.5rem;
		padding-inline: 0.5rem 0.3125rem;
		background: color-mix(in srgb, currentColor 12%, var(--color-card));
		transition: padding-inline-start 0.34s var(--ease-out-quint);
	}

	.chip.flat {
		background: var(--color-sunken);
	}

	/* Width to `auto`, in any browser: the words sit in a grid track that eases
	   between 0fr and 1fr. They're pinned to its right edge, so the opening
	   edge uncovers them where they rest instead of dragging them along. */
	.reveal {
		display: grid;
		grid-template-columns: 1fr;
		align-self: stretch;
		transition: grid-template-columns 0.34s var(--ease-out-quint);
	}

	.reveal-clip {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		min-width: 0;
		overflow: hidden;
	}

	.muted {
		color: color-mix(in srgb, currentColor 80%, transparent);
	}

	/* Only where a pointer can hover does it rest as a dot — the arrow alone.
	   The slot keeps the dot's width, so the open chip overflows leftward over
	   the gap instead of re-wrapping the row under the pointer. Opening takes
	   450 ms; closing, 340. */
	@media (hover: hover) {
		.chip-slot {
			display: flex;
			justify-content: flex-end;
			width: 1.5rem;
		}

		.chip:not([data-open]) {
			padding-inline-start: 0.3125rem;
		}

		.chip:not([data-open]) .reveal {
			grid-template-columns: 0fr;
		}

		.chip[data-open],
		.chip[data-open] .reveal {
			transition-duration: 0.45s;
		}
	}
</style>

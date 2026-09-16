<script lang="ts">
	import MovingArrowLeftRight from '@jis3r/icons/icons/arrow-left-right';
	import MovingArrowRight from '@jis3r/icons/icons/arrow-right';
	import { createQuery } from '@tanstack/svelte-query';
	import { animate, scroll, stagger } from 'motion';
	import { browser } from '$app/environment';
	import { accountColors } from '$lib/accounts';
	import { countUp } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { AnimatedIcon, DateLabel, Loader, Orb, Tooltip } from '$lib/components/ui';
	import { DEFAULT_CURRENCY, formatMoney } from '$lib/finance';
	import { accountsQuery, colorChoicesQuery, transactionsQuery } from '$lib/queries';
	import { signedAmount } from '$lib/transactions';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * The last five transactions, newest first, in the ledger's own order — the
	 * category's glyph and name, what it cost, the account's orb, the day — with
	 * nothing to do to them but go on to the whole ledger. It fits the card its
	 * tab has rather than sizing it: rows that don't fit scroll under the column
	 * names. It reads the ledger's cache entry, so a visit here fills the
	 * transactions page's too, and a write there shows here.
	 */
	type Props = {
		/** The viewer's zone: dates are drawn in it. */
		timeZone: string;
		/** Its tab is the one open: rows are read the first time it is, and deal in each time. */
		open: boolean;
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { timeZone, open, enabled = true }: Props = $props();

	const SHOWN = 5;

	// Not prefetched: the tab starts closed, and the whole record isn't worth
	// inlining into every dashboard for a card nobody has opened.
	const query = createQuery(() => ({
		...transactionsQuery(),
		enabled: browser && enabled && open
	}));
	const choices = createQuery(() => ({ ...colorChoicesQuery(), enabled: browser && enabled }));
	// The dashboard prefetches the accounts, so this is the cache's: each orb
	// wears the colour its account wears in the blocks beside this card.
	const accounts = createQuery(() => ({ ...accountsQuery(), enabled: browser && enabled }));

	const currency = $derived(query.data?.currency ?? DEFAULT_CURRENCY);
	const rows = $derived(query.data?.transactions.slice(0, SHOWN) ?? []);
	const colors = $derived(accountColors(accounts.data?.accounts ?? [], choices.data?.account));

	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;

	let list = $state<HTMLElement>();
	// A refetch that brings back the same five doesn't deal them again.
	const drawn = $derived(rows.map((t) => t.id).join());

	$effect(() => {
		if (!open || !list || !drawn) return;
		animate(
			list.children,
			prefersReducedMotion() ? { opacity: [0, 1] } : { opacity: [0, 1], y: [8, 0] },
			{ delay: stagger(0.05), duration: 0.42, ease: EASE_OUT_QUINT }
		);
	});

	let scroller = $state<HTMLElement>();

	/*
	 * While rows wait below, the foot fades into the card. Tied to the scroll
	 * rather than timed (Motion): full with 24 px or more still under, gone as
	 * the last row comes in, and never there when all five fit.
	 */
	$effect(() => {
		const node = scroller;
		if (!node) return;
		return scroll(
			(_progress: number, info: { y: { current: number; scrollLength: number } }) =>
				node.parentElement?.style.setProperty(
					'--more',
					String(Math.min((info.y.scrollLength - info.y.current) / 24, 1))
				),
			{ container: node, axis: 'y' }
		);
	});
</script>

<!--
	The Transactions tab's card. A card holding less than its cell: a label on
	top and the list anchored to the foot, so spare height pools above the rows
	rather than under them. Holding more, the rows scroll.
-->
<div class="relative flex h-full flex-col p-7">
	<!-- Over the card rather than in its flow, so the rows dealing in as it
	     fades don't push it about. Its own block, so its exit plays. -->
	{#if query.isPending && open}
		<div class="pointer-events-none absolute inset-0 grid place-items-center">
			<Loader />
		</div>
	{/if}

	{#if query.data && rows.length === 0}
		<div
			class="grid size-11 shrink-0 place-items-center rounded-full border border-dashed border-hairline text-fg-subtle"
		>
			<!-- Not a control: it plays once, as the tab opens. -->
			<AnimatedIcon
				icon={MovingArrowLeftRight}
				set="moving"
				size={18}
				strokeWidth={1.5}
				trigger="mount"
			/>
		</div>

		<p class="mt-5 text-[0.9375rem] text-fg-muted">No transactions yet.</p>
		<p class="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-muted">
			The last five you record will show here, newest first.
		</p>
	{:else if query.data}
		<!-- The way on to the whole ledger closes the label's line; with no room
		     beside the words it drops under them rather than squeezing them. Its
		     arrow is always there — it's the card's one way on — and pushes under
		     the pointer or focus. -->
		<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
			<p class="text-[0.9375rem] text-fg-muted">Your last five, newest first</p>
			<a
				href="/transactions"
				class="press flex items-center gap-1 rounded-md text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
			>
				See all
				<AnimatedIcon icon={MovingArrowRight} set="moving" size={14} />
			</a>
		</div>

		<!-- What the card has left under the label, adding no height of its own
		     (a zero basis): the tab's card is as tall as Tips makes it, whatever
		     the rows would take. -->
		<div class="more relative mt-5 flex min-h-0 flex-1 basis-0 flex-col justify-end">
			<!-- The unassigned lists' tracks with the description gone: the category
			     capped, the amount right beside it, the account's orb, and the day
			     taking the rest. The rows hold no action, so they don't highlight,
			     and the date's ground is the card's. The scroller pulls 12 px out
			     into the card's padding, so an overlay scrollbar rides there rather
			     than over the days. Positioned, so what's absolute in a row (the
			     orb's read-out name) is clipped with it rather than stretching the
			     page from where a hidden row sits. -->
			<div
				bind:this={scroller}
				class="relative -mx-3 grid min-h-0 gap-x-6 overflow-y-auto px-3 [--date-ground:var(--color-card)]"
				style="grid-template-columns: auto minmax(0,10rem) auto auto minmax(max-content,1fr)"
			>
				<!-- The columns named in words: five rows, newest first, have no order to
			     pick. The orb's column is too narrow for its word: read out only.
			     They stick to the top of the scroller, the rows passing under — a
			     pixel above it, that pixel padded, so no row's edge shows through
			     where the scroller starts part-way across a pixel. -->
				<div
					class="sticky -top-px z-10 col-span-full grid grid-cols-subgrid border-b border-line bg-card pt-px pb-2 text-sm font-medium text-fg-muted"
				>
					<span class="col-start-2">Category</span>
					<span class="text-right">Amount</span>
					<span><span class="sr-only">Account</span></span>
					<span>Date</span>
				</div>

				<ul bind:this={list} class="col-span-full grid grid-cols-subgrid gap-y-0.5">
					{#each rows as row (row.id)}
						{@const account = row.account?.name ?? 'No account'}
						<li
							class="col-span-full grid grid-cols-subgrid items-center border-b border-line py-2.5 last:border-0"
						>
							<CategoryIcon
								category={row.category}
								color={categoryColor(row.category, choices.data?.category)}
							/>
							<span class="truncate text-[0.9375rem]">
								{#if row.category}{row.category}{:else}<span class="text-fg-subtle">—</span>{/if}
							</span>
							<!-- countUp takes the figure over once its row is in view, counting from zero. -->
							<span
								class={cn(
									'tabular text-right text-[0.9375rem]',
									row.type === 'income' ? 'text-positive' : 'text-spent'
								)}
								use:countUp={{
									value: signedAmount(row),
									format: signed,
									whenVisible: true,
									duration: 0.8
								}}
							>
								{signed(signedAmount(row))}
							</span>
							<!-- Which account it went through, in the colour that account wears on
						     the dashboard; its name in a tip under the pointer or focus. -->
							<Tooltip label={account} delay={150}>
								{#snippet children({ props })}
									<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users reach the name. -->
									<span
										{...props}
										tabindex="0"
										class="grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-blue"
									>
										{#if row.account}
											<Orb color={colors[row.account.id] ?? 'blue'} class="size-4" />
										{:else}
											<!-- An empty ring where an orb would be: no account to wear. -->
											<span
												class="size-4 rounded-full border border-dashed border-line-strong"
												aria-hidden="true"
											></span>
										{/if}
										<span class="sr-only">{account}</span>
									</span>
								{/snippet}
							</Tooltip>
							<DateLabel date={row.date} {timeZone} unroll={false} class="text-sm text-fg-muted" />
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

<style>
	/* The rows' foot fades into the card, as strong as `--more` (the scroll):
	   there while more rows wait below, gone once the last is in. */
	.more::after {
		content: '';
		position: absolute;
		inset-inline: 0;
		bottom: 0;
		height: 2rem;
		background: linear-gradient(to top, var(--color-card), transparent);
		opacity: var(--more, 0);
		pointer-events: none;
	}
</style>

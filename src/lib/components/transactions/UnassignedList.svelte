<script lang="ts">
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { Checkbox, DateLabel, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { signedAmount, type UnassignedTransaction } from '$lib/transactions';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import CategoryIcon from './CategoryIcon.svelte';
	import SortHeader from './SortHeader.svelte';

	/**
	 * One card's worth of card-less transactions: the same columns the ledger
	 * has, ordered by the same control, with a box on each row to pick it.
	 *
	 * A list orders itself rather than taking an order from above, because the
	 * two cards order independently — and because the order is what a range
	 * pick follows: shift takes what lies between two rows *as drawn*, not as
	 * the server sent them. Which rows a press covers is all this reports; the
	 * card above owns what is picked, since a pick spans both lists.
	 */
	type Props = {
		rows: UnassignedTransaction[];
		currency: Currency;
		/** The viewer's zone: dates are drawn in it. */
		timeZone: string;
		/** Each category's colour, worked out once for both lists. */
		tint: Record<string, PaletteColor>;
		/** The ids picked right now — the card's, shared with the other list. */
		picked: ReadonlySet<string>;
		/** The rows a press covers: one, or the stretch shift reaches back to. */
		onPick: (rows: UnassignedTransaction[], on: boolean) => void;
		/** A line under every row, as the ledger has. Off for a quieter list. */
		dividers?: boolean;
		/** Columns the card's columns menu hid. The box always stays. */
		hidden?: ReadonlySet<string>;
	};

	let {
		rows,
		currency,
		timeZone,
		tint,
		picked,
		onPick,
		dividers = true,
		hidden = new Set<string>()
	}: Props = $props();

	type Column = 'category' | 'what' | 'date' | 'amount';

	/** What each column sorts on, and which way it goes when first asked. */
	const COLUMNS = {
		category: { label: 'Category', of: (t: UnassignedTransaction) => t.category, first: false },
		what: {
			label: 'Description',
			of: (t: UnassignedTransaction) => t.description ?? '',
			first: false
		},
		date: { label: 'Date', of: (t: UnassignedTransaction) => t.date, first: true },
		amount: { label: 'Amount', of: (t: UnassignedTransaction) => signedAmount(t), first: true }
	} as const satisfies Record<
		Column,
		{ label: string; of: (t: UnassignedTransaction) => string | number; first: boolean }
	>;

	const drawn = (id: Column) => !hidden.has(id);

	/** Each column's tracks, after the box's: the glyph rides with its category. */
	const TRACKS: Record<Column, string> = {
		category: 'auto minmax(0,10rem)',
		what: 'minmax(0,1fr)',
		date: 'auto',
		amount: 'auto'
	};

	const template = $derived.by(() => {
		const tracks = (Object.keys(TRACKS) as Column[]).filter(drawn).map((id) => TRACKS[id]);
		// With the description hidden nothing stretches, so the last column does
		// and the amount keeps to the right edge.
		const last = tracks.length - 1;
		if (!drawn('what') && last >= 0)
			tracks[last] = tracks[last].replace(/auto$/, 'minmax(max-content,1fr)');
		return ['auto', ...tracks].join(' ');
	});

	// Newest first, as the server sends them and as the ledger opens.
	let sort = $state<{ id: Column; desc: boolean }>({ id: 'date', desc: true });

	function order(id: Column) {
		// The column already in force turns over; a new one starts the way it
		// reads best — text from A, figures and days from the top.
		sort = sort.id === id ? { id, desc: !sort.desc } : { id, desc: COLUMNS[id].first };
	}

	const sorted = $derived.by(() => {
		const value = COLUMNS[sort.id].of;
		const way = sort.desc ? -1 : 1;
		return [...rows].sort((a, b) => {
			const [x, y] = [value(a), value(b)];
			if (typeof x === 'number' && typeof y === 'number') return (x - y) * way;
			// Rows with nothing in the column sit at the end either way, rather
			// than leading with a run of blanks.
			if (x === '' || y === '') return x === y ? 0 : x === '' ? 1 : -1;
			return String(x).localeCompare(String(y)) * way;
		});
	});

	/** Shift was held as the pick began: it takes the stretch back to the last one. */
	let shift = false;
	let anchor: string | null = null;

	function pick(row: UnassignedTransaction, on: boolean) {
		const at = sorted.findIndex((t) => t.id === row.id);
		const from = shift && anchor ? sorted.findIndex((t) => t.id === anchor) : at;
		onPick(from < 0 ? [row] : sorted.slice(Math.min(from, at), Math.max(from, at) + 1), on);
		anchor = row.id;
	}

	const signed = (row: UnassignedTransaction) => {
		const cents = signedAmount(row);
		return `${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;
	};

	const motion = (ms: number) => (prefersReducedMotion() ? 0 : ms);
</script>

<!-- A pick started with shift held takes the stretch: pointer or keyboard alike. -->
<svelte:window
	onpointerdown={(event) => (shift = event.shiftKey)}
	onkeydown={(event) => (shift = event.shiftKey)}
	onkeyup={(event) => (shift = event.shiftKey)}
/>

<!-- Capped and scrolled: a couple of hundred rows would otherwise run the column
     past ten thousand pixels and bury everything under it. The card's own box
     stays short, so both fit in the view together. The pull either side gives
     the rows back the 12 px their highlight bleeds into the card's padding —
     inside a scroller that overhang would be something to scroll sideways. -->
<div class="-mx-3 mt-5 max-h-[22rem] overflow-y-auto px-3">
	<!-- One grid for the whole list, not one per row: the columns are the
	     list's, so a short day and a long one leave the category in the same
	     place down every row. `subgrid` hands those tracks to each row, which
	     still needs a box of its own for the label and its highlight. The order
	     is the ledger's — glyph, what it was, what it was for, the day, what it
	     cost — so the three tables read the same way. -->
	<div class="grid" style="grid-template-columns: {template}">
		<!-- The ledger's header, on the list's own tracks. The boxes and the glyph
		     head nothing: one is the row's control, the other is the category
		     beside it, drawn. Placed by column rather than by order, so the two
		     blanks don't have to be written out. -->
		<div
			class="sticky top-0 z-10 col-span-full -mx-3 grid grid-cols-subgrid items-center gap-x-6 border-b border-line bg-card px-3 pb-2 text-sm font-medium text-fg-muted"
		>
			{#each Object.entries(COLUMNS).filter(([id]) => drawn(id as Column)) as [id, column], i (id)}
				<span
					class={cn(
						i === 0 && (drawn('category') ? 'col-start-3' : 'col-start-2'),
						id === 'amount' && 'text-right'
					)}
				>
					<SortHeader
						label={column.label}
						align={id === 'amount' ? 'right' : 'left'}
						sort={sort.id === id ? sort : undefined}
						onclick={() => order(id as Column)}
					/>
				</span>
			{/each}
		</div>

		<!-- A hair between the rows: picked ones are a block of colour each, and
		     touching they read as one long one. -->
		<ul class="col-span-full grid grid-cols-subgrid gap-y-0.5">
			{#each sorted as row (row.id)}
				<li
					class={cn(
						'col-span-full grid grid-cols-subgrid',
						// Not under the last one: the card's own edge closes the list.
						dividers && 'border-b border-line last:border-0'
					)}
					out:slide={{ duration: motion(280), easing: quintOut }}
				>
					<label
						for="pick-{row.id}"
						class={cn(
							'col-span-full -mx-3 grid cursor-pointer grid-cols-subgrid items-center gap-x-6 rounded-lg px-3 py-2.5 transition-colors duration-150 select-none',
							picked.has(row.id) ? 'bg-blue/8 hover:bg-blue/12' : 'hover:bg-sunken'
						)}
						style={picked.has(row.id)
							? '--date-ground: color-mix(in oklab, var(--color-blue) 12%, var(--color-card))'
							: undefined}
					>
						<Checkbox
							id="pick-{row.id}"
							checked={picked.has(row.id)}
							onCheckedChange={(on) => pick(row, on)}
						/>
						{#if drawn('category')}
							<CategoryIcon category={row.category} color={tint[row.category]} />
							<span class="truncate text-[0.9375rem]">
								{#if row.category}{row.category}{:else}<span class="text-fg-subtle">—</span>{/if}
							</span>
						{/if}
						{#if drawn('what')}
							<span class="truncate text-[0.9375rem] text-fg-muted">
								{#if row.description}{row.description}{:else}<span class="text-fg-subtle">—</span
									>{/if}
							</span>
						{/if}
						{#if drawn('date')}
							<DateLabel date={row.date} {timeZone} class="text-sm text-fg-muted" />
						{/if}
						{#if drawn('amount')}
							<span
								class={cn(
									'tabular text-right text-[0.9375rem]',
									row.type === 'income' ? 'text-positive' : 'text-spent'
								)}
							>
								{signed(row)}
							</span>
						{/if}
					</label>
				</li>
			{/each}
		</ul>
	</div>

	<!-- A list only comes up empty when the card's search or filter empties it. -->
	{#if rows.length === 0}
		<p class="py-6 text-[0.9375rem] text-fg-muted">Nothing matches that search or filter.</p>
	{/if}
</div>

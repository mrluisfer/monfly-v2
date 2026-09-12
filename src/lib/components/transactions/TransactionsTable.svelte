<script lang="ts">
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Search from '@lucide/svelte/icons/search';
	import {
		columnFilteringFeature,
		createColumnHelper,
		createCoreRowModel,
		createFilteredRowModel,
		createPaginatedRowModel,
		createSortedRowModel,
		createTable,
		filterFn_includesString,
		globalFilteringFeature,
		rowPaginationFeature,
		rowSortingFeature,
		tableFeatures,
		type ColumnDef,
		type SortingState
	} from '@tanstack/svelte-table';
	import { animate } from 'motion';
	import { IconButton, Orb, PALETTE, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { signedAmount, type TransactionRow } from '$lib/transactions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * The ledger. TanStack owns the data pipeline — sorting, the search and
	 * paging — while the markup stays ours: money in tabular figures, the
	 * account as its own orb, income told apart by colour rather than a badge.
	 * Rendering rows straight from `row.original` keeps that control, and
	 * avoids the adapter's cell templates entirely.
	 */
	type Props = {
		transactions: TransactionRow[];
		currency: Currency;
		/** The viewer's zone: dates are drawn in it. */
		timeZone: string;
		/** Each account's colour, by id — the same ones the dashboard uses. */
		colors?: Record<string, PaletteColor>;
		/** The row opened in the detail panel, if any. */
		selectedId?: string | null;
		onSelect?: (row: TransactionRow) => void;
		class?: string;
	};

	let {
		transactions,
		currency,
		timeZone,
		colors = {},
		selectedId = null,
		onSelect,
		class: className
	}: Props = $props();

	// v9 is modular: the feature set is declared once and carries the row
	// models with it, and it types everything downstream — hence `typeof features`.
	const features = tableFeatures({
		rowSortingFeature,
		columnFilteringFeature,
		globalFilteringFeature,
		rowPaginationFeature,
		coreRowModel: createCoreRowModel(),
		sortedRowModel: createSortedRowModel(),
		filteredRowModel: createFilteredRowModel(),
		paginatedRowModel: createPaginatedRowModel()
	});

	const column = createColumnHelper<typeof features, TransactionRow>();

	/*
	 * Columns carry the data pipeline only: what can be sorted, and what the
	 * search reads. Nothing here draws anything.
	 *
	 * The annotation is TanStack's own escape hatch for a mixed array: each
	 * accessor has its own value type — three strings and a number — and a
	 * union of those doesn't satisfy one `ColumnDef`, because `accessorFn` is
	 * invariant in it. Widening the slot keeps the amount sorting as a number.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const columns: ColumnDef<typeof features, TransactionRow, any>[] = [
		column.accessor('date', { id: 'date', header: 'Date' }),
		column.accessor((row) => `${row.category} ${row.description ?? ''}`, {
			id: 'what',
			header: 'Transaction'
		}),
		column.accessor((row) => row.account?.name ?? '', { id: 'account', header: 'Account' }),
		column.accessor((row) => signedAmount(row), { id: 'amount', header: 'Amount' })
	];

	const table = createTable<typeof features, TransactionRow>({
		features,
		columns,
		get data() {
			return transactions;
		},
		initialState: {
			sorting: [{ id: 'date', desc: true }],
			pagination: { pageIndex: 0, pageSize: 25 }
		},
		globalFilterFn: filterFn_includesString
	});

	// Reads through `atoms` take part in Svelte's tracking, so the markup
	// follows the table's own state rather than a copy kept beside it.
	const sorting = $derived<SortingState>(table.atoms.sorting?.get() ?? []);
	const page = $derived(table.atoms.pagination?.get() ?? { pageIndex: 0, pageSize: 25 });
	const search = $derived(String(table.atoms.globalFilter?.get() ?? ''));

	const rows = $derived(table.getRowModel().rows);
	const pageCount = $derived(table.getPageCount());
	const shown = $derived(table.getFilteredRowModel().rows.length);
	// The stretch on screen, so the pager says what is in front of you rather
	// than making you work it out from a page number.
	const first = $derived(shown === 0 ? 0 : page.pageIndex * page.pageSize + 1);
	const last = $derived(Math.min(first + page.pageSize - 1, shown));

	const dayOf = $derived(
		new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone })
	);
	const yearOf = $derived(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone }));
	const thisYear = $derived(yearOf.format(new Date()));
	const day = (iso: string) => {
		const date = new Date(iso);
		const year = yearOf.format(date);
		return year === thisYear ? dayOf.format(date) : `${dayOf.format(date)}, ${year}`;
	};

	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;

	/**
	 * Every column states its own share of the table and the pastel its mark
	 * wears — the palette the overview paints with, not the brand's flat three.
	 * The widths are what `table-fixed` lays the columns out on, so the header's
	 * line and the rows beneath it agree; a column added later names one more
	 * share here and nothing else has to move.
	 */
	const HEADS = [
		{ id: 'what', label: 'Transaction', align: 'text-left', width: '40%', color: 'sky' },
		{ id: 'account', label: 'Account', align: 'text-left', width: '24%', color: 'lavender' },
		{ id: 'date', label: 'Date', align: 'text-left', width: '16%', color: 'teal' },
		{ id: 'amount', label: 'Amount', align: 'text-right', width: '20%', color: 'coral' }
	] as const satisfies readonly { color: PaletteColor; [k: string]: string }[];

	const sortOf = (id: string) => sorting.find((s) => s.id === id);

	let headRow = $state<HTMLTableRowElement | null>(null);
	let mark = $state<HTMLElement | null>(null);
	let marked = false;

	/**
	 * One mark carries the sorted column and slides between them, as the
	 * header's tab surface does, rather than each column lighting up on its
	 * own. Sorting can be cleared away entirely, and then it fades where it
	 * stands instead of darting home.
	 */
	function place(animated: boolean) {
		if (!headRow || !mark) return;

		const at = HEADS.findIndex((h) => sortOf(h.id));
		const cell = headRow.querySelectorAll<HTMLElement>('th')[at];
		if (at < 0 || !cell) {
			animate(mark, { opacity: 0 }, { duration: 0.2 });
			return;
		}

		// The whole column, not just the width of its label: the mark is that
		// stretch of the row's line, so it has to end where the column does.
		// Measured against the row, so it doesn't matter which cell carries it.
		const x = cell.getBoundingClientRect().left - headRow.getBoundingClientRect().left;
		const width = `${cell.offsetWidth}px`;
		// CSS eases the colour across while Motion carries the shape.
		mark.style.setProperty('--mark', PALETTE[HEADS[at].color].css);

		if (!animated || prefersReducedMotion()) {
			mark.style.transform = `translateX(${x}px)`;
			mark.style.width = width;
			mark.style.opacity = '1';
			return;
		}

		animate(mark, { x, width, opacity: 1 }, { duration: 0.45, ease: [...EASE_OUT_QUINT] });
	}

	$effect(() => {
		sorting; // re-place whenever the sorted column, or its width, changes
		place(marked);
		marked = true;
	});

	$effect(() => {
		const replace = () => place(false);
		window.addEventListener('resize', replace);
		return () => window.removeEventListener('resize', replace);
	});
</script>

<div class={cn('flex flex-col', className)}>
	<!-- Search: it reads the category and the note together. -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div
			class="flex h-11 min-w-0 flex-1 basis-64 items-center gap-2.5 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue"
		>
			<Search class="size-4 shrink-0 stroke-[1.5] text-fg-subtle" aria-hidden="true" />
			<input
				value={search}
				oninput={(event) => table.setGlobalFilter(event.currentTarget.value)}
				type="search"
				placeholder="Search transactions"
				aria-label="Search transactions"
				class="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-fg-subtle"
			/>
		</div>
		<p class="tabular text-sm text-fg-muted" aria-live="polite">
			{shown}
			{shown === 1 ? 'entry' : 'entries'}
		</p>
	</div>

	<div class="mt-6 max-h-[32rem] overflow-y-auto">
		<table class="w-full table-fixed border-collapse text-left">
			<colgroup>
				{#each HEADS as head (head.id)}
					<col style="width: {head.width}" />
				{/each}
			</colgroup>
			<thead class="sticky top-0 z-10 bg-card">
				<!-- `relative`, so the mark below can be measured and placed against the
				     whole row rather than the cell that happens to carry it. -->
				<tr bind:this={headRow} class="relative border-b border-line">
					{#each HEADS as head, i (head.id)}
						{@const sort = sortOf(head.id)}
						<th
							scope="col"
							aria-sort={sort ? (sort.desc ? 'descending' : 'ascending') : 'none'}
							class={cn('pb-3 text-sm font-medium text-fg-muted', head.align)}
						>
							<button
								type="button"
								onclick={() => table.getColumn(head.id)?.toggleSorting()}
								class={cn(
									'group inline-flex items-center gap-1.5 rounded-sm transition-colors duration-200',
									'hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
									head.align === 'text-right' && 'flex-row-reverse',
									// The column in force reads at full strength; the rest stay quiet.
									sort && 'text-fg'
								)}
							>
								{head.label}
								<span
									class={cn(
										'transition-opacity duration-200',
										sort ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
									)}
								>
									<!-- One arrow that turns over, as every caret here does, rather
									     than two that swap. -->
									<ArrowUp
										class={cn(
											'size-3.5 stroke-[1.75] transition-[rotate] duration-300 ease-[var(--ease-spring)]',
											sort?.desc && 'rotate-180'
										)}
									/>
								</span>
							</button>

							{#if i === 0}
								<!-- It rides on the row's own line, under whichever column is sorted. -->
								<span
									bind:this={mark}
									aria-hidden="true"
									class="sort-mark pointer-events-none absolute -bottom-px left-0 h-[3px] w-0 rounded-full opacity-0"
								></span>
							{/if}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, i (row.id)}
					{@const t = row.original}
					<tr
						style="--i: {i}"
						class={cn(
							'row border-b border-line transition-colors duration-150',
							selectedId === t.id ? 'bg-blue/8' : 'hover:bg-sunken'
						)}
					>
						<td class="py-3">
							<button
								type="button"
								onclick={() => onSelect?.(t)}
								class="block max-w-full truncate text-left text-[0.9375rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
							>
								{t.category}{#if t.description}<span class="text-fg-muted">
										· {t.description}</span
									>{/if}
							</button>
						</td>
						<td class="py-3">
							{#if t.account}
								<span class="flex items-center gap-2 text-[0.9375rem] text-fg-muted">
									<Orb color={colors[t.account.id] ?? 'blue'} class="size-4 shrink-0" />
									<span class="truncate">{t.account.name}</span>
								</span>
							{:else}
								<span class="text-[0.9375rem] text-fg-subtle">—</span>
							{/if}
						</td>
						<td class="tabular py-3 text-[0.9375rem] whitespace-nowrap text-fg-muted">
							{day(t.date)}
						</td>
						<td
							class={cn(
								'tabular py-3 text-right text-[0.9375rem] whitespace-nowrap',
								t.type === 'income' && 'text-positive'
							)}
						>
							{signed(signedAmount(t))}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if rows.length === 0}
		<p class="mt-8 text-[0.9375rem] text-fg-muted">
			{transactions.length === 0 ? 'Nothing recorded yet.' : 'Nothing matches that search.'}
		</p>
	{/if}

	{#if pageCount > 1}
		<div class="mt-6 flex items-center justify-between gap-4">
			<p class="tabular text-sm text-fg-muted">
				{first}–{last} of {shown}
			</p>
			<div class="flex items-center gap-2">
				<IconButton
					size="sm"
					aria-label="Previous page"
					disabled={!table.getCanPreviousPage()}
					onclick={() => table.previousPage()}
				>
					<ChevronLeft />
				</IconButton>
				<IconButton
					size="sm"
					aria-label="Next page"
					disabled={!table.getCanNextPage()}
					onclick={() => table.nextPage()}
				>
					<ChevronRight />
				</IconButton>
			</div>
		</div>
	{/if}
</div>

<style>
	/* Rows arrive one after another, as the bars and chips elsewhere do. The
	   stagger is capped: a full page of them shouldn't take a second and a half
	   to land. */
	.row {
		animation: row-in 0.42s var(--ease-out-quint) calc(min(var(--i), 12) * 24ms) both;
	}

	@keyframes row-in {
		from {
			opacity: 0;
			translate: 0 6px;
		}
	}

	/* The header was four greys. The sorted column's line is the one place
	   colour belongs here, and it is the overview's language: one pastel, the
	   column's own, eased across as the mark travels. */
	.sort-mark {
		background-color: var(--mark, var(--pastel-sky));
		transition: background-color 0.45s var(--ease-out-quint);
	}

	@media (prefers-reduced-motion: reduce) {
		.row {
			animation: none;
		}
	}
</style>

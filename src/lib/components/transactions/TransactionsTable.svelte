<script lang="ts">
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
		filterFn_equals,
		filterFn_includesString,
		globalFilteringFeature,
		rowPaginationFeature,
		rowSortingFeature,
		sortFn_alphanumeric,
		sortFn_text,
		tableFeatures,
		type ColumnDef,
		type SortingState
	} from '@tanstack/svelte-table';
	import { DropdownMenu } from 'bits-ui';
	import { animate } from 'motion';
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { SvelteSet } from 'svelte/reactivity';
	import { countUp } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import { DateLabel, IconButton, Orb, PALETTE, type PaletteColor } from '$lib/components/ui';
	import CategoryIcon from './CategoryIcon.svelte';
	import LedgerTools, { type Kind } from './LedgerTools.svelte';
	import SortHeader from './SortHeader.svelte';
	import { formatMoney, type Currency } from '$lib/finance';
	import { pop } from '$lib/transitions';
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
		/** Colours people picked for their categories (`User.colors.category`). */
		categoryChoices?: Record<string, PaletteColor>;
		/** A line under every row. Off for a quieter table. */
		dividers?: boolean;
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
		categoryChoices,
		dividers = true,
		selectedId = null,
		onSelect,
		class: className
	}: Props = $props();

	// One pass over the rows, so a category is placed once however many times it
	// appears — and every row of it wears the same colour.
	const tint = $derived.by(() => {
		const out: Record<string, PaletteColor> = {};
		for (const t of transactions) out[t.category] ??= categoryColor(t.category, categoryChoices);
		return out;
	});

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
		paginatedRowModel: createPaginatedRowModel(),
		// v9 registers comparators rather than bundling them: `sortFn: 'auto'`
		// resolves the text columns to these two by name, and falls back to a
		// plain `<` — case-sensitive, blind to digits inside a string — when
		// they aren't here.
		sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text }
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
		column.accessor('category', { id: 'category', header: 'Category' }),
		column.accessor((row) => row.description ?? '', { id: 'what', header: 'Description' }),
		column.accessor((row) => row.account?.name ?? '', { id: 'account', header: 'Account' }),
		column.accessor((row) => signedAmount(row), { id: 'amount', header: 'Amount' }),
		// Drawn by no cell: it's what the type filter reads. Left out of the
		// search, so typing "exp" doesn't match every expense.
		column.accessor('type', {
			id: 'type',
			header: 'Type',
			filterFn: filterFn_equals,
			enableGlobalFilter: false
		})
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
	const kind = $derived<Kind>(
		((table.atoms.columnFilters?.get() ?? []).find((f) => f.id === 'type')?.value as
			| Kind
			| undefined) ?? 'all'
	);

	function setKind(next: Kind) {
		table.getColumn('type')?.setFilterValue(next === 'all' ? undefined : next);
		table.setPageIndex(0);
	}

	function reset() {
		table.setGlobalFilter('');
		setKind('all');
	}

	const rows = $derived(table.getRowModel().rows);
	const pageCount = $derived(table.getPageCount());
	const shown = $derived(table.getFilteredRowModel().rows.length);
	// The stretch on screen, so the pager says what is in front of you rather
	// than making you work it out from a page number.
	const first = $derived(shown === 0 ? 0 : page.pageIndex * page.pageSize + 1);
	const last = $derived(Math.min(first + page.pageSize - 1, shown));

	/**
	 * The page numbers on offer: every one, up to seven; past that, seven slots —
	 * the first, the last, the page in view with one either side, and a gap for
	 * the rest — so the row never changes width.
	 */
	const pages = $derived.by((): (number | 'gap-start' | 'gap-end')[] => {
		const at = page.pageIndex;
		const n = pageCount;
		if (n <= 7) return Array.from({ length: n }, (_, i) => i);
		if (at < 4) return [0, 1, 2, 3, 4, 'gap-end', n - 1];
		if (at > n - 5) return [0, 'gap-start', n - 5, n - 4, n - 3, n - 2, n - 1];
		return [0, 'gap-start', at - 1, at, at + 1, 'gap-end', n - 1];
	});

	/** The pages a gap stands for: every one between the numbers either side of it. */
	function hiddenBy(slot: number) {
		const from = pages[slot - 1] as number;
		const to = pages[slot + 1] as number;
		return Array.from({ length: to - from - 1 }, (_, k) => from + 1 + k);
	}

	/** The rows a page holds, as the pager says them: "76–100". */
	const stretch = (index: number) =>
		`${index * page.pageSize + 1}–${Math.min((index + 1) * page.pageSize, shown)}`;

	/** Which way the last move went, so the new stretch's label enters from that side. */
	let dir = $state(1);

	function go(index: number) {
		dir = index < page.pageIndex ? -1 : 1;
		table.setPageIndex(index);
	}

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
		// The glyph column heads nothing and sorts by nothing: it is the category
		// beside it, drawn. Its label is there for a screen reader alone.
		{ id: 'icon', label: 'Category icon', align: 'text-left', width: '7%', color: 'mint' },
		{ id: 'category', label: 'Category', align: 'text-left', width: '18%', color: 'mint' },
		{ id: 'what', label: 'Description', align: 'text-left', width: '24%', color: 'sky' },
		{ id: 'account', label: 'Account', align: 'text-left', width: '18%', color: 'lavender' },
		{ id: 'date', label: 'Date', align: 'text-left', width: '14%', color: 'teal' },
		{ id: 'amount', label: 'Amount', align: 'text-right', width: '19%', color: 'coral' }
	] as const satisfies readonly { color: PaletteColor; [k: string]: string }[];

	/** Columns hidden from the columns menu — for this visit only. */
	const hidden = new SvelteSet<string>();
	/** Whether a head is drawn: the glyph goes with the category it draws. */
	const drawn = (id: string) => !hidden.has(id === 'icon' ? 'category' : id);
	const heads = $derived(HEADS.filter((h) => drawn(h.id)));
	/** What the drawn columns' shares come to, so they spread back over the whole width. */
	const spread = $derived(heads.reduce((sum, h) => sum + parseFloat(h.width), 0));

	const toolColumns = $derived(
		HEADS.filter((h) => h.id !== 'icon').map((h) => ({
			id: h.id,
			label: h.label,
			color: h.color,
			hidden: hidden.has(h.id),
			// The amount is what a ledger is for: it stays.
			locked: h.id === 'amount'
		}))
	);

	let scroller = $state<HTMLElement | null>(null);

	/**
	 * Showing or hiding a column reflows every row at once. Rather than let the
	 * columns jump, each one that stays glides from where it was to where it
	 * lands (Motion: a FLIP on its cells' contents) while one arriving fades in.
	 * No view transition: its crossfade laid the old text over the new and
	 * froze the page for a beat. Measured on the header cells, which never move
	 * themselves — a transform there would carry the sort mark along.
	 */
	async function reflow(change: () => void) {
		if (!headRow || !scroller || prefersReducedMotion()) return change();
		const row = headRow;
		const body = scroller;
		const was = new Map(heads.map((h, i) => [h.id, row.children[i].getBoundingClientRect().left]));

		change();
		await tick();

		heads.forEach((head, i) => {
			const th = row.children[i] as HTMLElement;
			const cells = [
				th.firstElementChild,
				...body.querySelectorAll(`tbody tr > td:nth-child(${i + 1})`)
			].filter((cell) => cell !== null);
			const from = was.get(head.id);
			if (from === undefined) {
				animate(cells, { opacity: [0, 1] }, { duration: 0.35, ease: EASE_OUT_QUINT });
				return;
			}
			const dx = from - th.getBoundingClientRect().left;
			if (Math.abs(dx) >= 0.5) {
				animate(cells, { x: [dx, 0] }, { duration: 0.5, ease: EASE_OUT_QUINT });
			}
		});
	}

	function toggleColumn(id: string) {
		void reflow(() => {
			if (hidden.has(id)) hidden.delete(id);
			else hidden.add(id);
		});
	}

	function showAllColumns() {
		void reflow(() => hidden.clear());
	}

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

		const at = heads.findIndex((h) => sortOf(h.id));
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
		mark.style.setProperty('--mark', PALETTE[heads[at].color].css);

		if (!animated || prefersReducedMotion()) {
			mark.style.transform = `translateX(${x}px)`;
			mark.style.width = width;
			mark.style.opacity = '1';
			return;
		}

		animate(mark, { x, width, opacity: 1 }, { duration: 0.45, ease: [...EASE_OUT_QUINT] });
	}

	$effect(() => {
		// Re-place whenever the sorted column, or the columns drawn, change.
		sorting;
		heads;
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
	<!-- Search — it reads the category and the note together — then the tools
	     that narrow and shape the list, then what's left of it. -->
	<div class="flex flex-wrap items-center gap-3">
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
		<LedgerTools
			{kind}
			onKindChange={setKind}
			searching={search !== ''}
			onReset={reset}
			columns={toolColumns}
			onToggleColumn={toggleColumn}
			onShowAllColumns={showAllColumns}
		/>
		<!-- The count counts over to what the search and filter leave (GSAP), and
		     is read out once, in whole, rather than tick by tick. -->
		<p class="tabular ml-auto text-sm text-fg-muted">
			<span aria-hidden="true">
				<span use:countUp={{ value: shown, initial: false, duration: 0.6 }}>{shown}</span>
				{shown === 1 ? 'entry' : 'entries'}
			</span>
			<span class="sr-only" aria-live="polite">{shown} {shown === 1 ? 'entry' : 'entries'}</span>
		</p>
	</div>

	<!-- Columns keep their air down to `min-w`; past that the ledger scrolls
	     sideways rather than crushing a description against an orb. The
	     scroller pulls 12 px out into the card's padding, as the unassigned
	     lists' do: every cell's `px-3` puts the columns back in line with the
	     card, the rows' highlight overhangs them into that room, and an overlay
	     scrollbar rides there rather than over the amounts. Laid out `separate`,
	     since a collapsed table ignores a cell's radius. -->
	<div bind:this={scroller} class="-mx-3 mt-6 max-h-[32rem] overflow-auto">
		<!-- The drawn columns' shares spread back over the whole width, and the
		     floor under them shrinks by what the hidden ones took. -->
		<table
			class="w-full table-fixed border-separate border-spacing-0 text-left"
			style="min-width: {(53.5 * spread) / 100}rem"
		>
			<colgroup>
				{#each heads as head (head.id)}
					<col style="width: {(parseFloat(head.width) / spread) * 100}%" />
				{/each}
			</colgroup>
			<thead class="sticky top-0 z-10 bg-card">
				<!-- `relative`, so the mark below can be measured and placed against the
				     whole row rather than the cell that happens to carry it. -->
				<tr bind:this={headRow} class="relative">
					{#each heads as head, i (head.id)}
						{@const sort = sortOf(head.id)}
						<th
							scope="col"
							aria-sort={sort ? (sort.desc ? 'descending' : 'ascending') : 'none'}
							class={cn(
								// The cells draw the line: a separate table ignores a row's border.
								'border-b border-line px-3 pb-3 text-sm font-medium text-fg-muted',
								head.align
							)}
						>
							{#if head.id === 'icon'}
								<span class="sr-only">{head.label}</span>
							{:else}
								<SortHeader
									label={head.label}
									sort={sortOf(head.id)}
									align={head.align === 'text-right' ? 'right' : 'left'}
									onclick={() => table.getColumn(head.id)?.toggleSorting()}
								/>
							{/if}

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
					{@const cell = cn(
						'px-3 py-3 transition-colors duration-150 first:rounded-l-lg last:rounded-r-lg',
						selectedId === t.id ? 'bg-blue/8' : 'group-hover:bg-sunken'
					)}
					<!-- The highlight is each cell's, so the two at the ends can round it off. -->
					<tr style="--i: {i}" class={cn('row group relative', dividers && 'divided')}>
						{#if drawn('category')}
							<td class={cell}>
								<CategoryIcon category={t.category} color={tint[t.category]} />
							</td>
							<td class={cell}>
								<!-- The row's way in: pressing the category opens the whole entry. -->
								<button
									type="button"
									onclick={() => onSelect?.(t)}
									class="block max-w-full truncate text-left text-[0.9375rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
								>
									{#if t.category}{t.category}{:else}<span class="text-fg-subtle">—</span>{/if}
								</button>
							</td>
						{/if}
						{#if drawn('what')}
							<td class={cn(cell, 'text-[0.9375rem] text-fg-muted')}>
								{#if t.description}
									<span class="block truncate">{t.description}</span>
								{:else}
									<span class="text-fg-subtle">—</span>
								{/if}
							</td>
						{/if}
						{#if drawn('account')}
							<td class={cell}>
								{#if t.account}
									<span class="flex items-center gap-2 text-[0.9375rem] text-fg-muted">
										<Orb color={colors[t.account.id] ?? 'blue'} class="size-4 shrink-0" />
										<span class="truncate">{t.account.name}</span>
									</span>
								{:else}
									<span class="text-[0.9375rem] text-fg-subtle">—</span>
								{/if}
							</td>
						{/if}
						{#if drawn('date')}
							<td class={cn(cell, 'text-[0.9375rem] text-fg-muted')}>
								<DateLabel date={t.date} {timeZone} />
							</td>
						{/if}
						<td
							class={cn(
								cell,
								'tabular text-right text-[0.9375rem] whitespace-nowrap',
								// Money in reads green, money out the pastel red: which way a row
								// went is the first thing anyone scans a ledger for.
								t.type === 'income' ? 'text-positive' : 'text-spent'
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
			{#if transactions.length === 0}
				Nothing recorded yet.
			{:else if search !== ''}
				Nothing matches that search.
			{:else}
				No {kind === 'income' ? 'income' : 'expenses'} here.
			{/if}
		</p>
	{/if}

	{#if pageCount > 1}
		<div class="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
			<!-- Keyed on the page, so each stretch enters from the side it came from.
			     `inline-block` because a transform does nothing to an inline box. -->
			<p class="tabular text-sm text-fg-muted">
				{#key page.pageIndex}
					<span class="inline-block" in:pop={{ x: dir * 8, duration: 0.32 }}>
						{first}–{last} of {shown}
					</span>
				{/key}
			</p>
			<nav aria-label="Pages" class="flex items-center gap-2">
				<IconButton
					size="sm"
					aria-label="Previous page"
					disabled={!table.getCanPreviousPage()}
					onclick={() => go(page.pageIndex - 1)}
				>
					<ChevronLeft />
				</IconButton>
				<!-- The numbers sit in a sunken capsule under one raised surface, the
				     Segmented control's: the surface slides to the page in view, and
				     when the window of numbers moves they glide past it (flip), the
				     ones arriving and leaving popping in and out (Motion). Arrows
				     alone on a phone, where seven more would crowd the row. -->
				<div
					class="relative hidden h-9 rounded-full bg-sunken p-0.5 sm:block"
					style="--slot: {Math.max(0, pages.indexOf(page.pageIndex))}"
				>
					<span
						aria-hidden="true"
						class="thumb pointer-events-none absolute inset-y-0.5 left-0.5 w-8 rounded-full border border-hairline bg-card"
					></span>
					<ol class="flex">
						{#each pages as item, slot (item)}
							<li
								class="relative"
								animate:flip={{ duration: prefersReducedMotion() ? 0 : 450, easing: quintOut }}
								in:pop={{ scale: 0.6, bounce: 0.4, duration: 0.4 }}
								out:pop={{ scale: 0.6, duration: 0.3 }}
							>
								{#if typeof item === 'number'}
									<button
										type="button"
										aria-label="Page {item + 1}"
										aria-current={item === page.pageIndex ? 'page' : undefined}
										onclick={() => go(item)}
										class="tabular grid size-8 place-items-center rounded-full text-sm text-fg-muted transition-colors duration-200 hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue aria-[current=page]:text-fg"
									>
										{item + 1}
									</button>
								{:else}
									{@const hidden = hiddenBy(slot)}
									<!-- A gap is a way in to the pages it stands for: a short menu of
									     them, each with the rows it holds. Opens upward, over the
									     ledger it pages, rather than over the card below. -->
									<DropdownMenu.Root>
										<DropdownMenu.Trigger>
											{#snippet child({ props })}
												<button
													{...props}
													type="button"
													aria-label="Pages {hidden[0] + 1} to {hidden[hidden.length - 1] + 1}"
													class="grid size-8 place-items-center rounded-full text-sm text-fg-subtle transition-colors duration-200 hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue data-[state=open]:text-fg"
												>
													…
												</button>
											{/snippet}
										</DropdownMenu.Trigger>
										<DropdownMenu.Portal>
											<!-- Every floating layer's entrance and exit: forceMount hands mounting to the {#if}. -->
											<DropdownMenu.Content side="top" sideOffset={8} forceMount>
												{#snippet child({ props, wrapperProps, open })}
													{#if open}
														<div {...wrapperProps}>
															<div
																{...props}
																in:pop
																out:pop
																class="z-50 max-h-72 min-w-44 origin-(--bits-floating-transform-origin) overflow-y-auto rounded-[var(--radius-chip)] border border-line bg-card p-1.5 shadow-lg outline-none"
															>
																{#each hidden as index (index)}
																	<DropdownMenu.Item
																		textValue="Page {index + 1}"
																		onSelect={() => go(index)}
																		class="flex h-9 cursor-default items-center gap-4 rounded-[0.625rem] px-2.5 text-sm whitespace-nowrap transition-colors duration-150 outline-none select-none data-highlighted:bg-sunken"
																	>
																		Page {index + 1}
																		<span class="tabular ml-auto text-xs text-fg-muted"
																			>{stretch(index)}</span
																		>
																	</DropdownMenu.Item>
																{/each}
															</div>
														</div>
													{/if}
												{/snippet}
											</DropdownMenu.Content>
										</DropdownMenu.Portal>
									</DropdownMenu.Root>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
				<IconButton
					size="sm"
					aria-label="Next page"
					disabled={!table.getCanNextPage()}
					onclick={() => go(page.pageIndex + 1)}
				>
					<ChevronRight />
				</IconButton>
			</nav>
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

	/* The rule under a row stays on the columns while the highlight overhangs
	   it, as the unassigned lists' does. A separate table ignores a row's own
	   border, so the row draws it. Not under the last: the card's edge closes
	   the list. */
	.divided::after {
		content: '';
		position: absolute;
		inset-inline: 0.75rem;
		bottom: 0;
		height: 1px;
		background: var(--color-line);
		pointer-events: none;
	}

	.divided:last-child::after {
		content: none;
	}

	/* The page in view's surface: one number wide, slid over by its slot. */
	.thumb {
		translate: calc(var(--slot) * 2rem) 0;
		transition: translate 0.45s var(--ease-out-quint);
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

		.thumb {
			transition: none;
		}
	}
</style>

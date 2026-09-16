<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
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
	import { animate, scroll } from 'motion';
	import { tick, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { SvelteSet } from 'svelte/reactivity';
	import type { Account, AccountRole } from '$lib/accounts';
	import { categoryColor } from '$lib/categories';
	import {
		DateLabel,
		IconButton,
		Orb,
		OverflowText,
		PALETTE,
		Tooltip,
		type PaletteColor
	} from '$lib/components/ui';
	import AppliedFilters from './AppliedFilters.svelte';
	import CategoryIcon from './CategoryIcon.svelte';
	import LedgerFilters, {
		EMPTY_FILTER,
		filterCount,
		NO_ACCOUNT,
		type LedgerFilter
	} from './LedgerFilters.svelte';
	import LedgerToolbar from './LedgerToolbar.svelte';
	import { toolColumns, type Kind } from './LedgerTools.svelte';
	import RowActions from './RowActions.svelte';
	import SortHeader from './SortHeader.svelte';
	import { formatMoney, parseMoney, type Currency } from '$lib/finance';
	import type { LedgerView } from '$lib/ledger-view';
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
		/**
		 * The user's active accounts: what a card-less row can be given, and what
		 * an account's name tells of itself under the pointer.
		 */
		accounts?: Account[];
		/** The row opened in the detail panel, if any. */
		selectedId?: string | null;
		onSelect?: (row: TransactionRow) => void;
		/** Opens a row in the panel with its fields ready to change. */
		onEdit?: (row: TransactionRow) => void;
		/** What the ledger opens narrowed by: its search, kind and filters. Later, `show`. */
		initial?: Omit<LedgerView, 'month'>;
		/** Called with the search, kind and filters whenever one of them moves. */
		onViewChange?: (view: Omit<LedgerView, 'month'>) => void;
		class?: string;
	};

	let {
		transactions,
		currency,
		timeZone,
		colors = {},
		categoryChoices,
		dividers = true,
		accounts = [],
		selectedId = null,
		onSelect,
		onEdit,
		initial,
		onViewChange,
		class: className
	}: Props = $props();

	/** Read once: past the first render the table's own state takes over. */
	const opening = untrack(() => initial);

	/** What a row's actions couldn't do, said under the list until the next try. */
	let problem = $state<string | null>(null);
	/** The row whose actions are open: it stays marked while its menu has the pointer. */
	let acting = $state<string | null>(null);

	/** The accounts by id, for what an account's name tells under the pointer. */
	const accountById = $derived(Object.fromEntries(accounts.map((a) => [a.id, a])));

	const ROLE_LABEL: Record<AccountRole, string> = {
		main: 'Main account',
		secondary: 'Secondary account',
		savings: 'Savings account'
	};
	/** v1's card kinds, named as its card form names them. */
	const TYPE_LABEL: Record<string, string> = {
		debit: 'Debit',
		credit: 'Credit',
		cash: 'Cash',
		other: 'Other'
	};

	/**
	 * What an account is, in one line, in v1's own terms for its cards: the role
	 * it plays here, who issues it, its last four digits and its kind — "Main
	 * account · BBVA · •••• 4821 · Debit". Only what was filled in.
	 */
	const identity = (a: Account) =>
		[
			a.role && ROLE_LABEL[a.role],
			a.provider,
			a.last4 && `•••• ${a.last4}`,
			a.type && (TYPE_LABEL[a.type] ?? a.type)
		]
			.filter(Boolean)
			.join(' · ');

	// One pass over the rows, so a category is placed once however many times it
	// appears — and every row of it wears the same colour.
	const tint = $derived.by(() => {
		const out: Record<string, PaletteColor> = {};
		for (const t of transactions) out[t.category] ??= categoryColor(t.category, categoryChoices);
		return out;
	});

	/** The advanced filter. The page keeps it in its address, with the search and the kind. */
	let filter = $state<LedgerFilter>(opening?.filter ?? EMPTY_FILTER);

	function setFilter(next: LedgerFilter) {
		filter = next;
		table.setPageIndex(0);
	}

	const dayFormat = $derived(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
	);

	/** A transaction's day as the viewer's zone reads it: `YYYY-MM-DD`, one formatter for every row. */
	function dayOf(date: string) {
		const parts = dayFormat.formatToParts(new Date(date));
		const part = (type: string) => parts.find((p) => p.type === type)?.value;
		return `${part('year')}-${part('month')}-${part('day')}`;
	}

	/**
	 * The rows the advanced filter lets through, before the search, the kind and
	 * the pages see them: accounts and categories by what's picked, days as the
	 * viewer's zone reads them, amounts by size whichever way the money went.
	 */
	const filtered = $derived.by(() => {
		const { accounts: picked, categories, from, to } = filter;
		const least = parseMoney(filter.min);
		const most = parseMoney(filter.max);
		return transactions.filter((t) => {
			if (picked.length > 0 && !picked.includes(t.account?.id ?? NO_ACCOUNT)) return false;
			if (categories.length > 0 && !categories.includes(t.category)) return false;
			if (least !== null && t.amount < least) return false;
			if (most !== null && t.amount > most) return false;
			if (from === '' && to === '') return true;
			const day = dayOf(t.date);
			return (from === '' || day >= from) && (to === '' || day <= to);
		});
	});

	/** What the filters offer: the accounts and categories the rows name, and the days they span. */
	const offered = $derived.by(() => {
		const names: Record<string, string> = {};
		const counts: Record<string, number> = {};
		let noAccount = false;
		for (const t of transactions) {
			if (t.account) names[t.account.id] ??= t.account.name;
			else noAccount = true;
			counts[t.category] = (counts[t.category] ?? 0) + 1;
		}
		return {
			accounts: Object.entries(names).map(([id, name]) => ({ id, name })),
			noAccount,
			// Most used first: the ones someone reaches for sit at the top.
			categories: Object.entries(counts)
				.map(([name, count]) => ({ name, count }))
				.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
			// The rows arrive newest first.
			oldest: transactions.length > 0 ? dayOf(transactions[transactions.length - 1].date) : '',
			newest: transactions.length > 0 ? dayOf(transactions[0].date) : ''
		};
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
			return filtered;
		},
		initialState: {
			sorting: [{ id: 'date', desc: true }],
			pagination: { pageIndex: 0, pageSize: 25 },
			globalFilter: opening?.search ?? '',
			columnFilters: opening && opening.kind !== 'all' ? [{ id: 'type', value: opening.kind }] : []
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

	/** Narrows the ledger as a navigation asks, keeping its sort and columns. */
	export function show(view: Omit<LedgerView, 'month'>) {
		filter = view.filter;
		table.setGlobalFilter(view.search);
		setKind(view.kind);
	}

	// The page keeps these in its address.
	$effect(() => onViewChange?.({ search, kind, filter }));

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
	 * Every column states its width and the pastel its mark wears — the palette
	 * the overview paints with, not the brand's flat three. They run in the
	 * order a row is read (DESIGN.md → Layout): what it was, what it cost right
	 * beside it, where it came from, the note, and the day closing the row, as a
	 * mail list keeps its timestamps at the end.
	 *
	 * Widths are rems, what `table-fixed` lays the columns out on, so the
	 * header's line and the rows beneath it agree. Each holds its widest value,
	 * measured: the date its whole one, "September 30, 2026 · 12:59 AM" — 235 px
	 * with its cell's padding — so it unrolls inside its own column; the amount
	 * "−999.999,99 €", 125 px; the category and account the longest names on
	 * record. The description's is only its floor: it takes whatever the others
	 * leave, so width a wider screen adds goes to the words rather than pulling a
	 * row's facts apart.
	 */
	const HEADS = [
		// The glyph column heads nothing and sorts by nothing: it is the category
		// beside it, drawn. Its label is there for a screen reader alone.
		{ id: 'icon', label: 'Category icon', align: 'text-left', width: 3.25, color: 'mint' },
		{ id: 'category', label: 'Category', align: 'text-left', width: 9, color: 'mint' },
		{ id: 'amount', label: 'Amount', align: 'text-right', width: 8, color: 'coral' },
		{ id: 'account', label: 'Account', align: 'text-left', width: 10, color: 'lavender' },
		{ id: 'what', label: 'Description', align: 'text-left', width: 8, color: 'sky' },
		{ id: 'date', label: 'Date', align: 'text-left', width: 15, color: 'teal' },
		// What can be done to the row, at the end of it — where a table's actions
		// are everywhere else. It heads nothing, sorts by nothing and can't be
		// hidden: a row always has something that can be done to it.
		{ id: 'actions', label: 'Actions', align: 'text-right', width: 3.75, color: 'lavender' }
	] as const satisfies readonly {
		color: PaletteColor;
		width: number;
		[k: string]: string | number;
	}[];

	/** Columns hidden from the columns menu — for this visit only. */
	const hidden = new SvelteSet<string>();
	/** Whether a head is drawn: the glyph goes with the category it draws. */
	const drawn = (id: string) => !hidden.has(id === 'icon' ? 'category' : id);
	const heads = $derived(HEADS.filter((h) => drawn(h.id)));
	/**
	 * The one column that takes whatever width the others leave: the
	 * description, or with it hidden the last one drawn before the actions, so
	 * they still close the row at its right edge.
	 */
	const grows = $derived.by(() => {
		if (drawn('what')) return 'what';
		const content = heads.filter((h) => h.id !== 'actions');
		return content[content.length - 1]?.id;
	});
	/** The ledger's floor: every drawn column at its width, the growing one at its least. */
	const floor = $derived(heads.reduce((sum, h) => sum + h.width, 0));

	/**
	 * The category's glyph and name stay pinned at the left while the ledger
	 * scrolls sideways, so a row never loses its name however far the rest has
	 * gone: the glyph at the edge, the name after it.
	 */
	const pinned = (id: string) => id === 'icon' || id === 'category';
	const pinLeft = (id: string) => (id === 'category' ? HEADS[0].width : 0);

	// Any column can go, the amount too; the last one shown stays. The glyph
	// goes with its category, and the actions stay put.
	const menuColumns = $derived(
		toolColumns(
			HEADS.filter((h) => h.id !== 'icon' && h.id !== 'actions'),
			hidden
		)
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

	/**
	 * Scrolled sideways, the pinned category casts an edge over what slides
	 * under it. Tied to the scroll rather than timed (Motion): none at rest, full
	 * once the columns are 16 px under, so it is there exactly while something is.
	 */
	$effect(() => {
		const node = scroller;
		if (!node) return;
		return scroll(
			(_progress: number, info: { x: { current: number } }) =>
				node.style.setProperty('--edge', String(Math.min(info.x.current / 16, 1))),
			{ container: node, axis: 'x' }
		);
	});
</script>

<div class={cn('flex flex-col', className)}>
	<!-- Search — it reads the category and the note together — then the tools
	     that narrow and shape the list, then what's left of it. -->
	<LedgerToolbar
		{search}
		onSearch={(value) => table.setGlobalFilter(value)}
		count={shown}
		{kind}
		onKindChange={setKind}
		onReset={reset}
		columns={menuColumns}
		onToggleColumn={toggleColumn}
		onShowAllColumns={showAllColumns}
	>
		{#snippet filters()}
			<LedgerFilters
				{filter}
				onChange={setFilter}
				accounts={offered.accounts}
				noAccount={offered.noAccount}
				categories={offered.categories}
				{colors}
				{tint}
				oldest={offered.oldest}
				newest={offered.newest}
				{currency}
				count={shown}
			/>
		{/snippet}
	</LedgerToolbar>

	<!-- What the filters narrow by, each chip its own way out. Names come from the
	     active accounts too: a link can pick one no row here names. -->
	<AppliedFilters
		{filter}
		onChange={setFilter}
		accounts={[...offered.accounts, ...accounts]}
		{currency}
	/>

	<!-- Columns keep their air down to `min-w`; past that the ledger scrolls
	     sideways rather than crushing a description against an orb. The
	     scroller pulls 12 px out into the card's padding, as the unassigned
	     lists' do: every cell's `px-3` puts the columns back in line with the
	     card, the rows' highlight overhangs them into that room, and an overlay
	     scrollbar rides there rather than over the amounts. Laid out `separate`,
	     since a collapsed table ignores a cell's radius. -->
	<div bind:this={scroller} class="-mx-3 mt-6 max-h-[32rem] overflow-auto">
		<!-- Every drawn column at its width is the floor, and the one that grows
		     takes the rest: a column without a width, which `table-fixed` hands
		     whatever the others leave. -->
		<table
			class="w-full table-fixed border-separate border-spacing-0 text-left"
			style="min-width: {floor}rem"
		>
			<colgroup>
				{#each heads as head (head.id)}
					<col style={head.id === grows ? undefined : `width: ${head.width}rem`} />
				{/each}
				<!-- At nothing, for the rule under each row: Chrome counts that `::after`
				     as a column of its own, and left without a width it took half of
				     what the growing column is owed. -->
				<col style="width: 0" />
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
								head.align,
								pinned(head.id) && 'sticky z-[1] bg-card',
								head.id === 'category' && 'pin-edge'
							)}
							style={pinned(head.id) ? `left: ${pinLeft(head.id)}rem` : undefined}
						>
							{#if head.id === 'icon' || head.id === 'actions'}
								<span class="sr-only">{head.label}</span>
							{:else}
								<SortHeader
									label={head.label}
									sort={sortOf(head.id)}
									align={head.align === 'text-right' ? 'right' : 'left'}
									onclick={() => table.getColumn(head.id)?.toggleSorting()}
								/>
							{/if}

							{#if i === heads.length - 1}
								<!-- It rides on the row's own line, under whichever column is sorted.
								     The actions' cell carries it: that one never pins, so the mark is
								     placed against the row rather than a cell that holds still. -->
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
						// A row holds its highlight while its own menu is open: the
						// pointer has left for the layer, so hover alone would drop it
						// and lose the row that was pressed.
						selectedId === t.id
							? 'bg-blue/8'
							: acting === t.id
								? 'bg-sunken'
								: 'group-hover:bg-sunken'
					)}
					{@const pin = cn(
						'sticky z-[1] px-3 py-3 transition-colors duration-150 first:rounded-l-lg',
						// Pinned, the other columns scroll under it, so it wears the same
						// highlight made solid: the open row's blue mixed into the card,
						// and the card itself at rest.
						selectedId === t.id
							? 'bg-[color-mix(in_oklab,var(--color-blue)_8%,var(--color-card))]'
							: acting === t.id
								? 'bg-sunken'
								: 'bg-card group-hover:bg-sunken'
					)}
					<!-- The highlight is each cell's, so the two at the ends can round it off. -->
					<!-- An open row tells its date the ground behind it (DateLabel). -->
					<tr
						style="--i: {i}{selectedId === t.id
							? '; --date-ground: color-mix(in oklab, var(--color-blue) 8%, var(--color-card))'
							: ''}"
						class={cn('row group relative', dividers && 'divided')}
					>
						{#if drawn('category')}
							<td class={cn(pin, 'left-0')}>
								<CategoryIcon category={t.category} color={tint[t.category]} />
							</td>
							<td class={cn(pin, 'pin-edge')} style="left: {HEADS[0].width}rem">
								<!-- The row's way in: pressing the category opens the whole entry. -->
								<button
									type="button"
									onclick={() => onSelect?.(t)}
									class="block max-w-full text-left text-[0.9375rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
								>
									<!-- A name too long for the column reads to its end in place. -->
									{#if t.category}<OverflowText text={t.category} />{:else}<span
											class="text-fg-subtle">—</span
										>{/if}
								</button>
							</td>
						{/if}
						{#if drawn('amount')}
							<!-- What it cost, right beside what it was. -->
							<td
								class={cn(
									cell,
									'tabular text-right text-[0.9375rem] whitespace-nowrap',
									// Money in reads green, money out the pastel red: which way a row
									// went is the first thing anyone scans a ledger for. A transfer's
									// side is neither, so it wears the lavender its category is drawn in.
									t.transfer
										? 'text-[oklch(from_var(--tint)_0.55_calc(c*1.7)_h)] dark:text-(--tint)'
										: t.type === 'income'
											? 'text-positive'
											: 'text-spent'
								)}
								style={t.transfer ? `--tint: ${PALETTE.lavender.css}` : undefined}
							>
								{signed(signedAmount(t))}
							</td>
						{/if}
						{#if drawn('account')}
							<td class={cell}>
								{#if t.account}
									{@const account = t.account}
									{@const detail = accountById[account.id] as Account | undefined}
									<!-- The column cuts a long name short; under the pointer or focus the
									     account tells the rest above it: its whole name, the card behind
									     it, and where its money stands this month. -->
									<Tooltip side="top" delay={150} class="px-3 py-2.5">
										{#snippet content()}
											<div class="grid w-56 gap-2 font-normal">
												<div class="flex items-start gap-2">
													<Orb color={colors[account.id] ?? 'blue'} class="mt-px size-4 shrink-0" />
													<div class="min-w-0">
														<p class="font-medium break-words">{account.name}</p>
														{#if detail && identity(detail)}
															<p class="mt-0.5 text-fg-muted">{identity(detail)}</p>
														{/if}
													</div>
												</div>
												{#if detail}
													<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
														<dt class="text-fg-muted">Bank balance</dt>
														<dd class="tabular text-right">
															{formatMoney(detail.balance, currency)}
														</dd>
														<dt class="text-fg-muted">Tracked this month</dt>
														<dd class="tabular text-right">
															{formatMoney(detail.tracked, currency)}
														</dd>
														<dt class="text-fg-muted">Net this month</dt>
														<dd
															class={cn(
																'tabular text-right',
																detail.change > 0 && 'text-positive',
																detail.change < 0 && 'text-spent'
															)}
														>
															{signed(detail.change)}
														</dd>
													</dl>
												{:else}
													<p class="text-fg-muted">No longer among your active accounts.</p>
												{/if}
											</div>
										{/snippet}
										{#snippet children({ props })}
											<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users reach the details. -->
											<span
												{...props}
												tabindex="0"
												class="flex items-center gap-2 rounded-sm text-[0.9375rem] text-fg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
											>
												<Orb color={colors[account.id] ?? 'blue'} class="size-4 shrink-0" />
												<span class="truncate">{account.name}</span>
											</span>
										{/snippet}
									</Tooltip>
								{:else}
									<span class="text-[0.9375rem] text-fg-subtle">—</span>
								{/if}
							</td>
						{/if}
						{#if drawn('what')}
							<td class={cn(cell, 'text-[0.9375rem] text-fg-muted')}>
								{#if t.description}
									<OverflowText text={t.description} />
								{:else}
									<span class="text-fg-subtle">—</span>
								{/if}
							</td>
						{/if}
						{#if drawn('date')}
							<!-- The day closes the row, before its actions. Left-aligned, so its
							     whole date unrolls out of the short one (DateLabel). -->
							<td class={cn(cell, 'text-[0.9375rem] text-fg-muted')}>
								<DateLabel date={t.date} {timeZone} />
							</td>
						{/if}
						<!-- Less air than the other cells, so the button it holds doesn't
						     make every row taller than the category chips ask for. -->
						<td class={cn(cell, 'py-1.5 text-right')}>
							<RowActions
								row={t}
								{currency}
								{accounts}
								{colors}
								open={selectedId === t.id}
								held={acting === t.id}
								onHeldChange={(next) => (acting = next ? t.id : null)}
								onView={(row) => onSelect?.(row)}
								onEdit={(row) => onEdit?.(row)}
								onProblem={(message) => (problem = message)}
							/>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if problem}
		<p class="mt-4 text-sm text-negative" role="alert">{problem}</p>
	{/if}

	{#if rows.length === 0}
		<p class="mt-8 text-[0.9375rem] text-fg-muted">
			{#if transactions.length === 0}
				Nothing recorded yet.
			{:else if search !== ''}
				Nothing matches that search.
			{:else if filterCount(filter) > 0}
				Nothing matches these filters.
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
		/* Over the pinned cells too, so the rule runs on unbroken as the rest
		   scrolls under them. */
		z-index: 2;
		inset-inline: 0.75rem;
		bottom: 0;
		height: 1px;
		background: var(--color-line);
		pointer-events: none;
	}

	/* The pinned category's edge over the columns sliding under it: a short
	   fade from the canvas, the page beneath the card, as strong as `--edge` —
	   none at rest, full once the scroll is 16 px in. */
	.pin-edge::after {
		content: '';
		position: absolute;
		inset-block: 0;
		right: -0.75rem;
		width: 0.75rem;
		background: linear-gradient(to right, var(--color-canvas), transparent);
		opacity: var(--edge, 0);
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

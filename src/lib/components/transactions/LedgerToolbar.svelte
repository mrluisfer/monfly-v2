<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import { countUp } from '$lib/actions';
	import { cn } from '$lib/utils';
	import LedgerTools, { type Kind, type ToolColumn } from './LedgerTools.svelte';

	/**
	 * A table's bar: the search, the tools that narrow and shape its rows, and
	 * how many rows are left. The ledger and both card-less lists wear it, each
	 * keeping its own state; this only draws it and asks for changes.
	 */
	type Props = {
		search: string;
		onSearch: (value: string) => void;
		/** Names the search and says what it reads. */
		placeholder?: string;
		/** The rows the search and filter leave. */
		count: number;
		kind: Kind;
		onKindChange: (kind: Kind) => void;
		/** Clears the search and shows every kind again. */
		onReset: () => void;
		columns: ToolColumn[];
		onToggleColumn: (id: string) => void;
		onShowAllColumns: () => void;
		class?: string;
	};

	let {
		search,
		onSearch,
		placeholder = 'Search transactions',
		count,
		kind,
		onKindChange,
		onReset,
		columns,
		onToggleColumn,
		onShowAllColumns,
		class: className
	}: Props = $props();
</script>

<div class={cn('flex flex-wrap items-center gap-3', className)}>
	<div
		class="flex h-11 min-w-0 flex-1 basis-64 items-center gap-2.5 rounded-full border border-hairline px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue"
	>
		<Search class="size-4 shrink-0 stroke-[1.5] text-fg-subtle" aria-hidden="true" />
		<!-- Capped: a search only narrows what is already here, but a field with no
		     bound on it is a field nobody has thought about. -->
		<input
			value={search}
			oninput={(event) => onSearch(event.currentTarget.value)}
			type="search"
			maxlength={120}
			{placeholder}
			aria-label={placeholder}
			class="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-fg-subtle"
		/>
	</div>
	<LedgerTools
		{kind}
		{onKindChange}
		searching={search !== ''}
		{onReset}
		{columns}
		{onToggleColumn}
		{onShowAllColumns}
	/>
	<!-- The count counts over to what the search and filter leave (GSAP), and
	     is read out once, in whole, rather than tick by tick. -->
	<p class="tabular ml-auto text-sm text-fg-muted">
		<span aria-hidden="true">
			<span use:countUp={{ value: count, initial: false, duration: 0.6 }}>{count}</span>
			{count === 1 ? 'entry' : 'entries'}
		</span>
		<span class="sr-only" aria-live="polite">{count} {count === 1 ? 'entry' : 'entries'}</span>
	</p>
</div>

<script lang="ts">
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import { cn } from '$lib/utils';

	/**
	 * The control that names a column and orders by it — the ledger's, and the
	 * card-less lists' too, so ordering is the same gesture wherever a table
	 * draws its columns. It holds no state: whoever owns the ordering says
	 * which way this column is going, if it is.
	 */
	type Props = {
		label: string;
		/** Which way this column is ordered now — omitted when it isn't the one. */
		sort?: { desc: boolean };
		/** Right-aligned columns read label-last, so the arrow stays beside the figures. */
		align?: 'left' | 'right';
		onclick: () => void;
	};

	let { label, sort, align = 'left', onclick }: Props = $props();
</script>

<button
	type="button"
	{onclick}
	class={cn(
		'group inline-flex items-center gap-1.5 rounded-sm transition-colors duration-200',
		'hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
		align === 'right' && 'flex-row-reverse',
		// The column in force reads at full strength; the rest stay quiet.
		sort && 'text-fg'
	)}
>
	{label}
	<span
		class={cn(
			'transition-opacity duration-200',
			sort ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
		)}
	>
		<!-- One arrow that turns over, as every caret here does, rather than two
		     that swap. -->
		<ArrowUp
			class={cn(
				'size-3.5 stroke-[1.75] transition-[rotate] duration-300 ease-[var(--ease-spring)]',
				sort?.desc && 'rotate-180'
			)}
		/>
	</span>
</button>

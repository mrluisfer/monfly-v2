<script lang="ts" module>
	import type { PaletteColor } from '$lib/components/ui';

	/** Which way the money went, or both. */
	export type Kind = 'all' | 'income' | 'expense';

	/** A ledger column as the columns menu offers it. */
	export type ToolColumn = {
		id: string;
		label: string;
		/** The pastel its sort mark wears: its chip here wears it too. */
		color: PaletteColor;
		hidden: boolean;
		/** Always shown: the menu greys it and says so. */
		locked?: boolean;
	};
</script>

<script lang="ts">
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Banknote from '@lucide/svelte/icons/banknote';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Check from '@lucide/svelte/icons/check';
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import CreditCard from '@lucide/svelte/icons/credit-card';
	import Eye from '@lucide/svelte/icons/eye';
	import ListFilter from '@lucide/svelte/icons/list-filter';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Tag from '@lucide/svelte/icons/tag';
	import Text from '@lucide/svelte/icons/text';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import { DropdownMenu } from 'bits-ui';
	import { animate, stagger } from 'motion';
	import { blur } from 'svelte/transition';
	import { PALETTE, PillButton } from '$lib/components/ui';
	import { pop } from '$lib/transitions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * The ledger's tools beside its search: what kind of money to show, and
	 * which columns. Two pills that open the menu surface — a tinted chip per
	 * row, its glyph making a small gesture on highlight, a blue check that
	 * springs in for what's chosen — and an action under a rule to put things
	 * back. The table owns the state; this only asks for changes.
	 */
	type Props = {
		kind: Kind;
		onKindChange: (kind: Kind) => void;
		/** Something is typed in the search: the reset has that to clear too. */
		searching: boolean;
		/** Clears the search and shows every kind again. */
		onReset: () => void;
		columns: ToolColumn[];
		onToggleColumn: (id: string) => void;
		onShowAllColumns: () => void;
		class?: string;
	};

	let {
		kind,
		onKindChange,
		searching,
		onReset,
		columns,
		onToggleColumn,
		onShowAllColumns,
		class: className
	}: Props = $props();

	/**
	 * A pastel taken to a chip, the way `CategoryIcon` wears a category's: the
	 * colour at 15% behind, the glyph that colour taken down to one weight.
	 * `--tint` names the colour.
	 */
	const pastel =
		'bg-[color-mix(in_oklab,var(--tint)_15%,transparent)] text-[oklch(from_var(--tint)_0.55_calc(c*1.7)_h)] dark:bg-[color-mix(in_oklab,var(--tint)_20%,transparent)] dark:text-(--tint)';

	/**
	 * The pill while it narrows the list, in the colour of what it keeps: the
	 * tint behind, the glyph and words that colour at a glyph's weight, and its
	 * rim the colour a step darker — the hairline's shape, in colour. The rim
	 * and fill ease across with the press transition.
	 */
	const narrowing =
		'bg-[color-mix(in_oklab,var(--tint)_14%,transparent)] hover:bg-[color-mix(in_oklab,var(--tint)_24%,transparent)] border-[oklch(from_var(--tint)_calc(l_-_0.12)_c_h)] text-[oklch(from_var(--tint)_0.5_calc(c*1.6)_h)] dark:text-(--tint)';

	// Blue is the list as it's yours; money in and out wear the colours their figures do.
	const KINDS = [
		{
			value: 'all',
			label: 'All types',
			icon: ArrowLeftRight,
			tint: '',
			chip: 'bg-blue/12 text-blue',
			gesture: 'group-data-highlighted:scale-115',
			pill: ''
		},
		{
			value: 'income',
			label: 'Income',
			icon: TrendingUp,
			tint: '--tint: var(--color-positive)',
			chip: 'bg-positive/12 text-positive',
			gesture: 'group-data-highlighted:-translate-y-0.5',
			pill: narrowing
		},
		{
			value: 'expense',
			label: 'Expenses',
			icon: TrendingDown,
			tint: '--tint: var(--color-spent)',
			chip: pastel,
			gesture: 'group-data-highlighted:translate-y-0.5',
			pill: narrowing
		}
	] as const;

	const GLYPHS: Record<string, typeof Tag> = {
		category: Tag,
		what: Text,
		account: CreditCard,
		date: CalendarDays,
		amount: Banknote
	};

	const current = $derived(KINDS.find((k) => k.value === kind) ?? KINDS[0]);
	const hiddenCount = $derived(columns.filter((c) => c.hidden).length);

	// The menu's rows, as the user menu has them.
	const surface =
		'z-50 w-64 origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-1.5 shadow-lg outline-none';
	const heading = 'px-1.5 pt-1.5 pb-1 text-xs font-medium text-fg-muted';
	const item = [
		'group flex h-10 cursor-default items-center gap-3 rounded-[0.625rem] px-1.5 text-[0.9375rem] outline-none select-none',
		'transition-colors duration-150 data-highlighted:bg-sunken',
		'data-disabled:pointer-events-none data-disabled:text-fg-subtle'
	].join(' ');
	const chip =
		'grid size-7 shrink-0 place-items-center rounded-lg group-data-disabled:opacity-50 group-data-disabled:grayscale';
	const glyph = 'size-4 stroke-[1.75] transition-transform duration-300 ease-[var(--ease-spring)]';
	/** The chosen row's check: it springs in, as the Select's does. */
	const tick = (on: boolean) =>
		cn(
			'ml-auto size-4 stroke-[1.75] text-blue transition-[opacity,scale] duration-300 ease-[var(--ease-spring)]',
			on ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
		);

	/** As a menu opens, its rows deal in one after another behind the surface's pop (Motion). */
	function deal(node: HTMLElement) {
		if (prefersReducedMotion()) return;
		animate(
			node.querySelectorAll('[data-deal]'),
			{ opacity: [0, 1], y: [4, 0] },
			{ delay: stagger(0.03, { startDelay: 0.05 }), duration: 0.3, ease: EASE_OUT_QUINT }
		);
	}
</script>

<div class={cn('flex items-center gap-2', className)}>
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<!-- Tinted while it narrows the list, in the colour of what it keeps. A
				     new choice's glyph springs in and its words blur into focus. -->
				<PillButton
					{...props}
					caret
					aria-label="Show: {current.label}"
					class={current.pill}
					style={current.tint}
				>
					{#key kind}
						<span class="flex" in:pop={{ scale: 0.5, bounce: 0.5, duration: 0.45 }}>
							{#if kind === 'all'}
								<ListFilter class="size-4 stroke-[1.75]" />
							{:else}
								<current.icon class="size-4 stroke-[1.75]" />
							{/if}
						</span>
						<span in:blur={{ amount: 4, duration: 300 }}>{current.label}</span>
					{/key}
				</PillButton>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<!-- Every floating layer's entrance and exit: forceMount hands mounting to the {#if}. -->
			<DropdownMenu.Content align="end" sideOffset={8} forceMount>
				{#snippet child({ props, wrapperProps, open })}
					{#if open}
						<div {...wrapperProps}>
							<div {...props} in:pop out:pop use:deal class={surface}>
								<DropdownMenu.RadioGroup
									value={kind}
									onValueChange={(value) => onKindChange(value as Kind)}
								>
									<DropdownMenu.GroupHeading class={heading} data-deal
										>Show</DropdownMenu.GroupHeading
									>
									{#each KINDS as option (option.value)}
										<DropdownMenu.RadioItem value={option.value} class={item} data-deal>
											{#snippet children({ checked })}
												<span class={cn(chip, option.chip)} style={option.tint}>
													<option.icon class={cn(glyph, option.gesture)} />
												</span>
												{option.label}
												<Check class={tick(checked)} />
											{/snippet}
										</DropdownMenu.RadioItem>
									{/each}
								</DropdownMenu.RadioGroup>
								<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />
								<DropdownMenu.Item
									class={item}
									disabled={kind === 'all' && !searching}
									onSelect={onReset}
									data-deal
								>
									<span class={cn(chip, 'bg-violet/12 text-violet')}>
										<RotateCcw class={cn(glyph, 'group-data-highlighted:-rotate-90')} />
									</span>
									Clear search and filter
								</DropdownMenu.Item>
							</div>
						</div>
					{/if}
				{/snippet}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>

	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<PillButton
					{...props}
					caret
					aria-label={hiddenCount > 0 ? `Columns: ${hiddenCount} hidden` : 'Columns'}
				>
					<Columns3 class="size-4 stroke-[1.75]" />
					Columns
					<!-- How many are hidden, in configuration's violet: it pops in with the
					     first one hidden and out with the last one back. -->
					{#if hiddenCount > 0}
						<span
							class="tabular -mx-1 grid h-5 min-w-5 place-items-center rounded-full bg-violet/12 px-1.5 text-xs text-violet"
							in:pop={{ scale: 0.5, bounce: 0.5, duration: 0.4 }}
							out:pop={{ scale: 0.5, duration: 0.3 }}
						>
							{#key hiddenCount}
								<span in:blur={{ amount: 3, duration: 250 }}>{hiddenCount}</span>
							{/key}
						</span>
					{/if}
				</PillButton>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content align="end" sideOffset={8} forceMount>
				{#snippet child({ props, wrapperProps, open })}
					{#if open}
						<div {...wrapperProps}>
							<div {...props} in:pop out:pop use:deal class={surface}>
								<DropdownMenu.Group>
									<DropdownMenu.GroupHeading class={heading} data-deal
										>Columns</DropdownMenu.GroupHeading
									>
									<!-- Stays open, so several can go in one visit. A hidden column's
									     chip drains to grey where it stands. -->
									{#each columns as col (col.id)}
										{@const Glyph = GLYPHS[col.id] ?? Tag}
										<DropdownMenu.CheckboxItem
											checked={!col.hidden}
											onCheckedChange={() => onToggleColumn(col.id)}
											disabled={col.locked}
											closeOnSelect={false}
											class={item}
											data-deal
										>
											{#snippet children({ checked })}
												<span
													class={cn(
														chip,
														pastel,
														'transition-[opacity,filter] duration-300',
														!checked && 'opacity-45 grayscale'
													)}
													style="--tint: {PALETTE[col.color].css}"
												>
													<Glyph class={cn(glyph, 'group-data-highlighted:scale-115')} />
												</span>
												<span
													class={cn('transition-colors duration-200', !checked && 'text-fg-muted')}
													>{col.label}</span
												>
												{#if col.locked}
													<span class="ml-auto text-xs">Always</span>
												{:else}
													<Check class={tick(checked)} />
												{/if}
											{/snippet}
										</DropdownMenu.CheckboxItem>
									{/each}
								</DropdownMenu.Group>
								<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />
								<DropdownMenu.Item
									class={item}
									disabled={hiddenCount === 0}
									onSelect={onShowAllColumns}
									closeOnSelect={false}
									data-deal
								>
									<span class={cn(chip, 'bg-violet/12 text-violet')}>
										<Eye class={cn(glyph, 'group-data-highlighted:scale-115')} />
									</span>
									Show every column
								</DropdownMenu.Item>
							</div>
						</div>
					{/if}
				{/snippet}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
</div>

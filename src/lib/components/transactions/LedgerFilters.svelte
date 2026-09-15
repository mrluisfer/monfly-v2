<script lang="ts" module>
	import { parseMoney } from '$lib/finance';

	/** The account filter's name for rows with no account. */
	export const NO_ACCOUNT = 'none';

	/**
	 * The ledger's advanced filter. Its parts narrow together, a part left empty
	 * lets every row through, and the page keeps it in its address
	 * (`$lib/ledger-view`).
	 */
	export type LedgerFilter = {
		/** Account ids, and `NO_ACCOUNT` for rows with none. Empty: any account. */
		accounts: string[];
		/** Categories by name, as transactions store them. Empty: any category. */
		categories: string[];
		/** The first and last day, `YYYY-MM-DD` as the viewer's zone reads it; `''` leaves that end open. */
		from: string;
		to: string;
		/**
		 * The least and the most, as typed — "1,200" — compared by size, whichever
		 * way the money went; `''` leaves that end open.
		 */
		min: string;
		max: string;
	};

	export const EMPTY_FILTER: LedgerFilter = {
		accounts: [],
		categories: [],
		from: '',
		to: '',
		min: '',
		max: ''
	};

	/** How many of its four kinds are narrowing the list: the pill's count. */
	export const filterCount = (filter: LedgerFilter) =>
		[
			filter.accounts.length > 0,
			filter.categories.length > 0,
			filter.from !== '' || filter.to !== '',
			parseMoney(filter.min) !== null || parseMoney(filter.max) !== null
		].filter(Boolean).length;
</script>

<script lang="ts">
	import MovingRotateCcw from '@jis3r/icons/icons/rotate-ccw';
	import MovingSlidersHorizontal from '@jis3r/icons/icons/sliders-horizontal';
	import { Popover } from 'bits-ui';
	import { blur } from 'svelte/transition';
	import { countUp, moneyField } from '$lib/actions';
	import { AnimatedIcon, Checkbox, Orb, PillButton, type PaletteColor } from '$lib/components/ui';
	import { currencySymbol, MAX_MONEY_LENGTH, type Currency } from '$lib/finance';
	import { pop } from '$lib/transitions';
	import CategoryIcon from './CategoryIcon.svelte';
	import { deal, narrowing } from './LedgerTools.svelte';

	/**
	 * The ledger's advanced filters, beside its other tools: which accounts,
	 * which categories, from one day to another, between two amounts. A pill
	 * that wears blue — the list as it's yours — while it narrows, with how many
	 * kinds are on, opening a popover whose sections deal in. Every change
	 * applies as it is made; the table owns the filter, this only asks.
	 */
	type Props = {
		filter: LedgerFilter;
		onChange: (filter: LedgerFilter) => void;
		/** The accounts the rows name. */
		accounts: { id: string; name: string }[];
		/** Some row has no account: "No account" is on offer. */
		noAccount: boolean;
		/** The categories the rows name, most used first, with how many rows each. */
		categories: { name: string; count: number }[];
		/** Each account's colour, by id. */
		colors: Record<string, PaletteColor>;
		/** Each category's colour, by name, as the table draws them. */
		tint: Record<string, PaletteColor>;
		/** The first and last day on record, bounding the date fields. */
		oldest: string;
		newest: string;
		currency: Currency;
		/** What the filter, the search and the kind leave. */
		count: number;
	};

	let {
		filter,
		onChange,
		accounts,
		noAccount,
		categories,
		colors,
		tint,
		oldest,
		newest,
		currency,
		count
	}: Props = $props();

	const uid = $props.id();
	const active = $derived(filterCount(filter));

	function toggle(key: 'accounts' | 'categories', value: string, on: boolean) {
		const rest = filter[key].filter((v) => v !== value);
		onChange({ ...filter, [key]: on ? [...rest, value] : rest });
	}

	function set(key: 'from' | 'to' | 'min' | 'max', value: string) {
		onChange({ ...filter, [key]: value });
	}

	// A range that runs backwards leaves nothing: said in words, as a field says
	// what is out of range.
	const backwards = $derived(filter.from !== '' && filter.to !== '' && filter.from > filter.to);
	const least = $derived(parseMoney(filter.min));
	const most = $derived(parseMoney(filter.max));
	const inverted = $derived(least !== null && most !== null && least > most);

	const heading = 'px-1.5 text-xs font-medium text-fg-muted';
	const option =
		'flex h-9 items-center gap-3 rounded-[0.625rem] px-1.5 transition-colors duration-150 hover:bg-sunken';
	const choice = 'flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm';
	const field =
		'flex h-10 min-w-0 items-center gap-2 rounded-full border border-hairline px-3.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue';
	const entry = 'min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle';
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<!-- Blue while it narrows — the list as it's yours — with how many kinds are
			     on, popping in with the first and out with the last. The sliders hold
			     their gesture while the filters are open. -->
			<PillButton
				{...props}
				caret
				aria-label={active > 0 ? `Filters: ${active} on` : 'Filters'}
				class={active > 0 ? narrowing : ''}
				style={active > 0 ? '--tint: var(--color-blue)' : ''}
			>
				<AnimatedIcon
					icon={MovingSlidersHorizontal}
					set="moving"
					play={props['data-state'] === 'open'}
				/>
				Filters
				{#if active > 0}
					<span
						class="tabular -mx-1 grid h-5 min-w-5 place-items-center rounded-full bg-blue/12 px-1.5 text-xs text-blue"
						in:pop={{ scale: 0.5, bounce: 0.5, duration: 0.4 }}
						out:pop={{ scale: 0.5, duration: 0.3 }}
					>
						{#key active}
							<span in:blur={{ amount: 3, duration: 250 }}>{active}</span>
						{/key}
					</span>
				{/if}
			</PillButton>
		{/snippet}
	</Popover.Trigger>
	<Popover.Portal>
		<!-- Every floating layer's entrance and exit: forceMount hands mounting to the {#if}. -->
		<Popover.Content side="bottom" align="end" sideOffset={8} forceMount>
			{#snippet child({ props, wrapperProps, open })}
				{#if open}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							use:deal
							class="z-50 flex max-h-[calc(var(--bits-floating-available-height,40rem)_-_1rem)] w-max max-w-[min(36rem,calc(100vw-2rem))] min-w-[min(22rem,calc(100vw-2rem))] origin-(--bits-floating-transform-origin) flex-col rounded-[var(--radius-chip)] border border-line bg-card p-4 shadow-lg outline-none"
						>
							<div class="flex items-center gap-3" data-deal>
								<!-- Blue: the list as it's yours, as the ledger tools' "All types" chip. -->
								<span
									class="grid size-7 shrink-0 place-items-center rounded-lg bg-blue/12 text-blue"
									aria-hidden="true"
								>
									<AnimatedIcon icon={MovingSlidersHorizontal} set="moving" trigger="mount" />
								</span>
								<div class="min-w-0">
									<p class="text-sm font-medium">Filters</p>
									<p class="text-xs text-fg-muted">They narrow together and stay in the link.</p>
								</div>
							</div>

							<!-- The sections scroll between the heading and the foot, so a long list
							     of categories never pushes the way out off the screen. -->
							<div class="-mx-1 mt-3 min-h-0 flex-1 divide-y divide-line overflow-y-auto px-1">
								{#if accounts.length > 0 || noAccount}
									<div role="group" aria-labelledby="{uid}-accounts" class="pb-3" data-deal>
										<p id="{uid}-accounts" class={heading}>Account</p>
										<div class="mt-1 grid">
											{#each accounts as account, i (account.id)}
												<div class={option}>
													<Checkbox
														id="{uid}-account-{i}"
														checked={filter.accounts.includes(account.id)}
														onCheckedChange={(on) => toggle('accounts', account.id, on)}
													/>
													<label for="{uid}-account-{i}" class={choice}>
														<Orb color={colors[account.id] ?? 'blue'} class="size-4 shrink-0" />
														<span class="truncate">{account.name}</span>
													</label>
												</div>
											{/each}
											{#if noAccount}
												<div class={option}>
													<Checkbox
														id="{uid}-account-none"
														checked={filter.accounts.includes(NO_ACCOUNT)}
														onCheckedChange={(on) => toggle('accounts', NO_ACCOUNT, on)}
													/>
													<label for="{uid}-account-none" class={choice}>
														<!-- An empty ring where an orb would be: no account to wear. -->
														<span
															class="size-4 shrink-0 rounded-full border border-dashed border-line-strong"
															aria-hidden="true"
														></span>
														<span class="text-fg-muted">No account</span>
													</label>
												</div>
											{/if}
										</div>
									</div>
								{/if}

								{#if categories.length > 0}
									<div role="group" aria-labelledby="{uid}-categories" class="py-3" data-deal>
										<p id="{uid}-categories" class={heading}>Category</p>
										<!-- Two columns, so the list stays short enough to leave the dates and
										     amounts in view; it scrolls on its own past that. -->
										<div class="mt-1 grid max-h-56 grid-cols-2 gap-x-2 overflow-y-auto">
											{#each categories as category, i (category.name)}
												<div class={option}>
													<Checkbox
														id="{uid}-category-{i}"
														checked={filter.categories.includes(category.name)}
														onCheckedChange={(on) => toggle('categories', category.name, on)}
													/>
													<label for="{uid}-category-{i}" class={choice}>
														<CategoryIcon
															category={category.name}
															color={tint[category.name] ?? 'blue'}
															class="size-6"
														/>
														<span class="truncate">{category.name}</span>
														<span class="tabular ml-auto text-xs text-fg-subtle"
															>{category.count}</span
														>
													</label>
												</div>
											{/each}
										</div>
									</div>
								{/if}

								<div role="group" aria-labelledby="{uid}-dates" class="py-3" data-deal>
									<p id="{uid}-dates" class={heading}>Date</p>
									<div class="mt-2 grid grid-cols-2 gap-2">
										<label class="grid min-w-0 gap-1">
											<span class="px-1.5 text-xs text-fg-subtle">From</span>
											<span class={field}>
												<input
													type="date"
													value={filter.from}
													min={oldest || undefined}
													max={filter.to || newest || undefined}
													oninput={(event) => set('from', event.currentTarget.value)}
													class="{entry} tabular"
												/>
											</span>
										</label>
										<label class="grid min-w-0 gap-1">
											<span class="px-1.5 text-xs text-fg-subtle">To</span>
											<span class={field}>
												<input
													type="date"
													value={filter.to}
													min={filter.from || oldest || undefined}
													max={newest || undefined}
													oninput={(event) => set('to', event.currentTarget.value)}
													class="{entry} tabular"
												/>
											</span>
										</label>
									</div>
									{#if backwards}
										<p class="mt-2 px-1.5 text-xs text-negative" role="alert">
											The first day is after the last.
										</p>
									{/if}
								</div>

								<div role="group" aria-labelledby="{uid}-amounts" class="pt-3" data-deal>
									<p id="{uid}-amounts" class={heading}>Amount</p>
									<div class="mt-2 grid grid-cols-2 gap-2">
										<label class="grid min-w-0 gap-1">
											<span class="px-1.5 text-xs text-fg-subtle">At least</span>
											<span class={field}>
												<span class="text-sm text-fg-muted" aria-hidden="true">
													{currencySymbol(currency)}
												</span>
												<!-- Money only, as the editor's amount takes it (`moneyField`). -->
												<input
													value={filter.min}
													use:moneyField={(next) => set('min', next)}
													inputmode="decimal"
													autocomplete="off"
													spellcheck="false"
													maxlength={MAX_MONEY_LENGTH}
													placeholder="0"
													class="{entry} tabular"
												/>
											</span>
										</label>
										<label class="grid min-w-0 gap-1">
											<span class="px-1.5 text-xs text-fg-subtle">At most</span>
											<span class={field}>
												<span class="text-sm text-fg-muted" aria-hidden="true">
													{currencySymbol(currency)}
												</span>
												<input
													value={filter.max}
													use:moneyField={(next) => set('max', next)}
													inputmode="decimal"
													autocomplete="off"
													spellcheck="false"
													maxlength={MAX_MONEY_LENGTH}
													placeholder="Any"
													class="{entry} tabular"
												/>
											</span>
										</label>
									</div>
									<p class="mt-2 px-1.5 text-xs text-fg-subtle">
										By size, whichever way the money went.
									</p>
									{#if inverted}
										<p class="mt-1 px-1.5 text-xs text-negative" role="alert">
											The least is more than the most.
										</p>
									{/if}
								</div>
							</div>

							<!-- The way out and what's left, below the sections wherever they scroll.
							     The count counts over as the filter changes (GSAP). -->
							<div
								class="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3"
								data-deal
							>
								<button
									type="button"
									disabled={active === 0}
									onclick={() => onChange(EMPTY_FILTER)}
									class="group -ml-1.5 flex h-10 items-center gap-3 rounded-[0.625rem] pr-2.5 pl-1.5 text-[0.9375rem] transition-colors duration-150 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-blue disabled:pointer-events-none disabled:text-fg-subtle"
								>
									<span
										class="grid size-7 shrink-0 place-items-center rounded-lg bg-violet/12 text-violet group-disabled:opacity-50 group-disabled:grayscale"
										aria-hidden="true"
									>
										<AnimatedIcon icon={MovingRotateCcw} set="moving" />
									</span>
									Clear filters
								</button>
								<p class="tabular text-sm text-fg-muted">
									<span use:countUp={{ value: count, initial: false, duration: 0.5 }}>{count}</span>
									{count === 1 ? 'entry' : 'entries'}
								</p>
							</div>
						</div>
					</div>
				{/if}
			{/snippet}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

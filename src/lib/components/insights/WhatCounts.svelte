<script lang="ts">
	import MovingRotateCcw from '@jis3r/icons/icons/rotate-ccw';
	import MovingSlidersHorizontal from '@jis3r/icons/icons/sliders-horizontal';
	import { Popover } from 'bits-ui';
	import { blur } from 'svelte/transition';
	import { countUp } from '$lib/actions';
	import { AnimatedIcon, Checkbox, Orb, PillButton, type PaletteColor } from '$lib/components/ui';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { deal, narrowing } from '$lib/components/transactions/LedgerTools.svelte';
	import { EMPTY_LENS, lensCount, NO_ACCOUNT, type Lens } from '$lib/insights';
	import { pop } from '$lib/transitions';

	/**
	 * What every figure on the page counts: each account and each category
	 * with a box, all ticked to begin with. Unticking one leaves it out of
	 * every chart at once — a one-off, a loan, money that wasn't really yours —
	 * and the record stays exactly as it is. The ledger filters' pill and
	 * popover, so leaving things out reads the way narrowing the ledger does.
	 */
	type Props = {
		lens: Lens;
		onChange: (lens: Lens) => void;
		accounts: { id: string; name: string }[];
		/** Some entry has no account: "No account" is on offer. */
		noAccount: boolean;
		/** Every category on record, most used first, with how many entries each. */
		categories: { name: string; count: number }[];
		colors: Record<string, PaletteColor>;
		/** Each category's colour, by name. */
		tint: Record<string, PaletteColor>;
		/** Entries counted, and on record. */
		counted: number;
		total: number;
	};

	let { lens, onChange, accounts, noAccount, categories, colors, tint, counted, total }: Props =
		$props();

	const uid = $props.id();
	const left = $derived(lensCount(lens));

	function toggle(key: keyof Lens, value: string, counts: boolean) {
		const rest = lens[key].filter((v) => v !== value);
		onChange({ ...lens, [key]: counts ? rest : [...rest, value] });
	}

	const heading = 'px-1.5 text-xs font-medium text-fg-muted';
	const option =
		'flex h-9 items-center gap-3 rounded-[0.625rem] px-1.5 transition-colors duration-150 hover:bg-sunken';
	const choice = 'flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm';
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<!-- Blue while something is left out, with how many, as the ledger's filters. -->
			<PillButton
				{...props}
				size="sm"
				caret
				aria-label={left > 0 ? `What counts: ${left} left out` : 'What counts'}
				class={left > 0 ? narrowing : ''}
				style={left > 0 ? '--tint: var(--color-blue)' : ''}
			>
				<AnimatedIcon
					icon={MovingSlidersHorizontal}
					set="moving"
					play={props['data-state'] === 'open'}
				/>
				What counts
				{#if left > 0}
					<span
						class="tabular -mx-1 grid h-5 min-w-5 place-items-center rounded-full bg-blue/12 px-1.5 text-xs text-blue"
						in:pop={{ scale: 0.5, bounce: 0.5, duration: 0.4 }}
						out:pop={{ scale: 0.5, duration: 0.3 }}
					>
						{#key left}
							<span in:blur={{ amount: 3, duration: 250 }}>{left}</span>
						{/key}
					</span>
				{/if}
			</PillButton>
		{/snippet}
	</Popover.Trigger>
	<Popover.Portal>
		<Popover.Content side="bottom" align="end" sideOffset={8} forceMount>
			{#snippet child({ props, wrapperProps, open })}
				{#if open}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							use:deal
							class="z-50 flex max-h-[calc(var(--bits-floating-available-height,40rem)_-_1rem)] w-max max-w-[min(34rem,calc(100vw-2rem))] min-w-[min(22rem,calc(100vw-2rem))] origin-(--bits-floating-transform-origin) flex-col rounded-[var(--radius-chip)] border border-line bg-card p-4 shadow-lg outline-none"
						>
							<div class="flex items-center gap-3" data-deal>
								<span
									class="grid size-7 shrink-0 place-items-center rounded-lg bg-blue/12 text-blue"
									aria-hidden="true"
								>
									<AnimatedIcon icon={MovingSlidersHorizontal} set="moving" trigger="mount" />
								</span>
								<div class="min-w-0">
									<p class="text-sm font-medium">What counts</p>
									<p class="text-xs text-fg-muted">
										Untick something to leave it out of every chart. Your records stay as they are.
									</p>
								</div>
							</div>

							<div class="-mx-1 mt-3 min-h-0 flex-1 divide-y divide-line overflow-y-auto px-1">
								{#if accounts.length > 0 || noAccount}
									<div role="group" aria-labelledby="{uid}-accounts" class="pb-3" data-deal>
										<p id="{uid}-accounts" class={heading}>Accounts</p>
										<div class="mt-1 grid">
											{#each accounts as account, i (account.id)}
												<div class={option}>
													<Checkbox
														id="{uid}-account-{i}"
														checked={!lens.accounts.includes(account.id)}
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
														checked={!lens.accounts.includes(NO_ACCOUNT)}
														onCheckedChange={(on) => toggle('accounts', NO_ACCOUNT, on)}
													/>
													<label for="{uid}-account-none" class={choice}>
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
									<div role="group" aria-labelledby="{uid}-categories" class="pt-3" data-deal>
										<p id="{uid}-categories" class={heading}>Categories</p>
										<div class="mt-1 grid max-h-64 grid-cols-2 gap-x-2 overflow-y-auto">
											{#each categories as category, i (category.name)}
												<div class={option}>
													<Checkbox
														id="{uid}-category-{i}"
														checked={!lens.categories.includes(category.name)}
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
							</div>

							<div
								class="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3"
								data-deal
							>
								<button
									type="button"
									disabled={left === 0}
									onclick={() => onChange(EMPTY_LENS)}
									class="group -ml-1.5 flex h-10 items-center gap-3 rounded-[0.625rem] pr-2.5 pl-1.5 text-[0.9375rem] transition-colors duration-150 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-blue disabled:pointer-events-none disabled:text-fg-subtle"
								>
									<span
										class="grid size-7 shrink-0 place-items-center rounded-lg bg-violet/12 text-violet group-disabled:opacity-50 group-disabled:grayscale"
										aria-hidden="true"
									>
										<AnimatedIcon icon={MovingRotateCcw} set="moving" />
									</span>
									Count everything
								</button>
								<p class="tabular text-sm text-fg-muted">
									<span use:countUp={{ value: counted, initial: false, duration: 0.5 }}
										>{counted}</span
									>
									of {total}
									{total === 1 ? 'entry' : 'entries'}
								</p>
							</div>
						</div>
					</div>
				{/if}
			{/snippet}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

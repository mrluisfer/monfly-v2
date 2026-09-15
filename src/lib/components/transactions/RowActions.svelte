<script lang="ts">
	import ColorCreditCard from '@animated-color-icons/lucide-svelte/CreditCard.svelte';
	import MovingCheck from '@jis3r/icons/icons/check';
	import MovingCopy from '@jis3r/icons/icons/copy';
	import MovingEye from '@jis3r/icons/icons/eye';
	import MovingPencil from '@jis3r/icons/icons/pencil';
	import MovingTrash from '@jis3r/icons/icons/trash-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { DropdownMenu } from 'bits-ui';
	import { animate, stagger } from 'motion';
	import { onDestroy } from 'svelte';
	import {
		AnimatedIcon,
		ConfirmDialog,
		IconButton,
		Orb,
		PALETTE,
		type PaletteColor
	} from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { assignAccountMutation, deleteTransactionMutation } from '$lib/queries';
	import { pop } from '$lib/transitions';
	import { signedAmount, type TransactionRow } from '$lib/transactions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * What can be done to one row, at the end of that row — where a table's
	 * actions live everywhere else, so there is nothing to learn: the same
	 * button in the same place down every row, opening the same list in the
	 * same order.
	 *
	 * The order is the order of the day: look at it, change it, finish it
	 * (an account), take it away with you (copy), and — under a rule of its
	 * own, last, in `negative` — remove it. Each carries the colour of what it
	 * touches: blue for the row as yours, violet for changing it, the Account
	 * and Amount columns' own pastels, and red for the one that can't be
	 * undone.
	 *
	 * Rows that pay off a loan are read here and changed in v1, where the
	 * loan's own rules live: those two items grey out and say so.
	 */
	type Props = {
		row: TransactionRow;
		currency: Currency;
		/** Accounts a card-less row can be given — the user's active ones. */
		accounts?: { id: string; name: string }[];
		/** Each account's colour, by id: the orbs beside their names. */
		colors?: Record<string, PaletteColor>;
		/** The row is the one open in the detail panel. */
		open?: boolean;
		/**
		 * This row's menu is the one open. The table holds it, so the row can
		 * stay marked while the pointer is away over the menu — hover alone
		 * lets go the moment the layer opens, and the row you pressed goes
		 * quiet under it.
		 */
		held?: boolean;
		/** The menu opened or closed: the table marks the row for as long as it's open. */
		onHeldChange?: (held: boolean) => void;
		/** Opens the row in the panel beside the table, or closes it again. */
		onView: (row: TransactionRow) => void;
		/** Opens the row in the panel, ready to edit. */
		onEdit: (row: TransactionRow) => void;
		/** Something an action couldn't do, for the table to say out loud. */
		onProblem?: (message: string | null) => void;
	};

	let {
		row,
		currency,
		accounts = [],
		colors = {},
		open = false,
		held = false,
		onHeldChange,
		onView,
		onEdit,
		onProblem
	}: Props = $props();

	const queryClient = useQueryClient();
	const assign = createMutation(() => assignAccountMutation(queryClient));
	const remove = createMutation(() => deleteTransactionMutation(queryClient));

	let confirming = $state(false);
	let copied = $state(false);
	let forget: ReturnType<typeof setTimeout>;

	// Not `$effect`: this is a timer the component starts, not state it follows.
	onDestroy(() => clearTimeout(forget));

	const amount = $derived(signedAmount(row));
	const signed = $derived(
		`${amount > 0 ? '+' : amount < 0 ? '−' : ''}${formatMoney(Math.abs(amount), currency)}`
	);

	async function copy() {
		try {
			await navigator.clipboard.writeText(signed);
			copied = true;
			clearTimeout(forget);
			forget = setTimeout(() => (copied = false), 1600);
		} catch {
			onProblem?.('This browser wouldn’t let the amount be copied.');
		}
	}

	function give(accountId: string) {
		onProblem?.(null);
		assign.mutate(
			{ ids: [row.id], accountId },
			{ onError: () => onProblem?.('Couldn’t give it that account. Try again.') }
		);
	}

	function destroy() {
		remove.mutate(row.id, { onSuccess: () => (confirming = false) });
	}

	/**
	 * A pastel taken to a chip, as `CategoryIcon` and the ledger tools wear one:
	 * the colour at 15% behind, the glyph that colour at one weight. `--tint`
	 * names it.
	 */
	const pastel =
		'bg-[color-mix(in_oklab,var(--tint)_15%,transparent)] text-[oklch(from_var(--tint)_0.55_calc(c*1.7)_h)] dark:bg-[color-mix(in_oklab,var(--tint)_20%,transparent)] dark:text-(--tint)';

	// The menu's rows, as the ledger tools and the user menu have them.
	const surface =
		'z-50 w-max min-w-60 max-w-[calc(100vw-2rem)] origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-1.5 shadow-lg outline-none';
	// `whitespace-nowrap`: a row is one line high, so a long label — or a long
	// account name beside it — truncates rather than pushing the row open.
	const item = [
		'group flex h-10 cursor-default items-center gap-3 rounded-[0.625rem] px-1.5 text-[0.9375rem] whitespace-nowrap outline-none select-none',
		'transition-colors duration-150 data-highlighted:bg-sunken',
		'data-disabled:pointer-events-none data-disabled:text-fg-subtle'
	].join(' ');
	// The chip passes the pointer through: a glyph plays with its row, never
	// under the pointer on itself alone.
	const chip =
		'pointer-events-none grid size-7 shrink-0 place-items-center rounded-lg group-data-disabled:opacity-50 group-data-disabled:grayscale';
	/** Why an item can't be pressed, said where the check would be. */
	const hint = 'ml-auto max-w-28 truncate text-xs text-fg-subtle';

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

<DropdownMenu.Root onOpenChange={(next) => onHeldChange?.(next)}>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<!-- Rests out of sight so the ledger stays a ledger, and comes up with
			     the row under the pointer or with keyboard focus. While its menu is
			     open the table holds it there instead: hover ends the moment the
			     layer takes the pointer, and a button that went with it would blink
			     out from under the press. Always drawn where there is no pointer to
			     hover with. -->
			<IconButton
				{...props}
				size="sm"
				aria-label="Actions for {row.category || 'this transaction'}"
				class={cn(
					'transition-opacity duration-150',
					held
						? 'opacity-100'
						: 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'
				)}
			>
				<Ellipsis />
			</IconButton>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<!-- Every floating layer's entrance and exit: forceMount hands mounting to the {#if}. -->
		<DropdownMenu.Content align="end" sideOffset={6} forceMount>
			{#snippet child({ props, wrapperProps, open: shown })}
				{#if shown}
					<div {...wrapperProps}>
						<div {...props} in:pop out:pop use:deal class={surface}>
							<DropdownMenu.Item class={item} onSelect={() => onView(row)} data-deal>
								<span class={cn(chip, 'bg-blue/12 text-blue')} aria-hidden="true">
									<AnimatedIcon icon={MovingEye} set="moving" />
								</span>
								{open ? 'Hide details' : 'View details'}
							</DropdownMenu.Item>

							<DropdownMenu.Item
								class={item}
								disabled={row.loanLinked}
								onSelect={() => onEdit(row)}
								data-deal
							>
								<span class={cn(chip, 'bg-violet/12 text-violet')} aria-hidden="true">
									<AnimatedIcon icon={MovingPencil} set="moving" />
								</span>
								Edit
								{#if row.loanLinked}<span class={hint}>Loan</span>{/if}
							</DropdownMenu.Item>

							<!-- The account it came from. Already on one, the item says which and
							     rests: moving it between accounts is v1's, along with the balances
							     that would follow it. -->
							{#if row.account || accounts.length === 0}
								<DropdownMenu.Item class={item} disabled data-deal>
									<span
										class={cn(chip, pastel)}
										style="--tint: {PALETTE.lavender.css}"
										aria-hidden="true"
									>
										<AnimatedIcon icon={ColorCreditCard} set="color" />
									</span>
									Give it an account
									<!-- Which account it is on is the row's own column, and the panel's;
									     here the only thing worth saying is why this can't be pressed. -->
									<span class={hint}>{row.account ? 'Has one' : 'No accounts'}</span>
								</DropdownMenu.Item>
							{:else}
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger class={item} data-deal>
										<span
											class={cn(chip, pastel)}
											style="--tint: {PALETTE.lavender.css}"
											aria-hidden="true"
										>
											<AnimatedIcon icon={ColorCreditCard} set="color" />
										</span>
										Give it an account
										<ChevronRight
											class="ml-auto size-4 shrink-0 stroke-[1.5] text-fg-subtle"
											aria-hidden="true"
										/>
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent forceMount>
										{#snippet child({ props: subProps, wrapperProps: subWrapper, open: subOpen })}
											{#if subOpen}
												<div {...subWrapper}>
													<div
														{...subProps}
														in:pop
														out:pop
														use:deal
														class={cn(surface, 'max-h-72 overflow-y-auto')}
													>
														{#each accounts as account (account.id)}
															<DropdownMenu.Item
																class={item}
																textValue={account.name}
																onSelect={() => give(account.id)}
																data-deal
															>
																<span class={chip} aria-hidden="true">
																	<Orb color={colors[account.id] ?? 'blue'} class="size-4" />
																</span>
																<span class="truncate">{account.name}</span>
															</DropdownMenu.Item>
														{/each}
													</div>
												</div>
											{/if}
										{/snippet}
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
							{/if}

							<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

							<!-- Stays open long enough to see the check land, then closes itself. -->
							<DropdownMenu.Item
								class={item}
								textValue="Copy amount"
								closeOnSelect={false}
								onSelect={copy}
								data-deal
							>
								<span
									class={cn(chip, pastel)}
									style="--tint: {PALETTE.coral.css}"
									aria-hidden="true"
								>
									<AnimatedIcon icon={MovingCopy} set="moving" />
								</span>
								{copied ? 'Copied' : 'Copy amount'}
								<AnimatedIcon
									icon={MovingCheck}
									set="moving"
									trigger="none"
									play={copied}
									class={cn(
										'ml-auto size-4 stroke-[1.75] text-blue transition-[opacity,scale] duration-300 ease-[var(--ease-spring)]',
										copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
									)}
								/>
							</DropdownMenu.Item>

							<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

							<DropdownMenu.Item
								class={cn(item, 'text-negative data-highlighted:bg-negative/10')}
								disabled={row.loanLinked}
								onSelect={() => (confirming = true)}
								data-deal
							>
								<span class={cn(chip, 'bg-negative/12 text-negative')} aria-hidden="true">
									<AnimatedIcon icon={MovingTrash} set="moving" />
								</span>
								Delete
								{#if row.loanLinked}<span class={hint}>Loan</span>{/if}
							</DropdownMenu.Item>
						</div>
					</div>
				{/if}
			{/snippet}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<!-- Removing a transaction moves money back: the question says so before it happens. -->
<ConfirmDialog
	open={confirming}
	onOpenChange={(next) => {
		confirming = next;
		if (!next) remove.reset();
	}}
	title="Delete this transaction?"
	description={row.account
		? `It leaves the ledger for good, and ${row.account.name}'s balance goes back to what it was without it.`
		: 'It leaves the ledger for good, and your total goes back to what it was without it.'}
	action="Delete"
	pending={remove.isPending}
	error={remove.isError ? 'Couldn’t delete it. Try again.' : null}
	onConfirm={destroy}
>
	<div class="flex items-baseline justify-between gap-4">
		<span class="min-w-0 truncate text-[0.9375rem]">{row.category || 'Uncategorised'}</span>
		<span
			class={cn(
				'tabular text-[0.9375rem] whitespace-nowrap',
				row.type === 'income' ? 'text-positive' : 'text-spent'
			)}
		>
			{signed}
		</span>
	</div>
	{#if row.description}
		<p class="mt-1 truncate text-sm text-fg-muted">{row.description}</p>
	{/if}
</ConfirmDialog>

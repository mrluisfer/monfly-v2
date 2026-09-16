<script lang="ts">
	import MovingArchive from '@jis3r/icons/icons/archive';
	import MovingArrowLeftRight from '@jis3r/icons/icons/arrow-left-right';
	import MovingCheck from '@jis3r/icons/icons/check';
	import MovingEye from '@jis3r/icons/icons/eye';
	import MovingPencil from '@jis3r/icons/icons/pencil';
	import MovingStar from '@jis3r/icons/icons/star';
	import MovingTrash from '@jis3r/icons/icons/trash-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { DropdownMenu } from 'bits-ui';
	import { animate, stagger } from 'motion';
	import { goto } from '$app/navigation';
	import type { Account, AccountRole } from '$lib/accounts';
	import {
		AnimatedIcon,
		ConfirmDialog,
		IconButton,
		Orb,
		PALETTE,
		type PaletteColor
	} from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { accountLedgerHref } from '$lib/ledger-view';
	import {
		deleteAccountMutation,
		setAccountRoleMutation,
		setAccountStatusMutation
	} from '$lib/queries';
	import { pop } from '$lib/transitions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * What can be done to one account, from the corner of its card — the order
	 * of the day, as a ledger row's menu has it: look at it, change it, feature
	 * it, go to its rows; then, each under a rule of its own, put it away and,
	 * last and in `negative`, delete it.
	 */
	type Props = {
		account: Account;
		color: PaletteColor;
		currency: Currency;
		/** It's the one open in the panel. */
		open?: boolean;
		onView: () => void;
		onEdit: () => void;
		/** Something the menu couldn't do, for the page to say out loud. */
		onProblem?: (message: string | null) => void;
	};

	let { account, color, currency, open = false, onView, onEdit, onProblem }: Props = $props();

	const queryClient = useQueryClient();
	const role = createMutation(() => setAccountRoleMutation(queryClient));
	const status = createMutation(() => setAccountStatusMutation(queryClient));
	const remove = createMutation(() => deleteAccountMutation(queryClient));

	let confirming = $state(false);

	const ROLES: { value: AccountRole | null; label: string }[] = [
		{ value: 'main', label: 'Main' },
		{ value: 'secondary', label: 'Secondary' },
		{ value: 'savings', label: 'Savings' },
		{ value: null, label: 'Not featured' }
	];

	function feature(next: AccountRole | null) {
		if (next === account.role) return;
		onProblem?.(null);
		role.mutate(
			{ id: account.id, role: next },
			{ onError: () => onProblem?.(`Couldn’t change how ${account.name} is featured. Try again.`) }
		);
	}

	function archive() {
		onProblem?.(null);
		status.mutate(
			{ id: account.id, status: 'archived' },
			{ onError: () => onProblem?.(`Couldn’t archive ${account.name}. Try again.`) }
		);
	}

	function destroy() {
		remove.mutate(account.id, { onSuccess: () => (confirming = false) });
	}

	/** A pastel taken to a chip, as the ledger's row menu wears one. */
	const pastel =
		'bg-[color-mix(in_oklab,var(--tint)_15%,transparent)] text-[oklch(from_var(--tint)_0.55_calc(c*1.7)_h)] dark:bg-[color-mix(in_oklab,var(--tint)_20%,transparent)] dark:text-(--tint)';

	const surface =
		'z-50 w-max min-w-60 max-w-[calc(100vw-2rem)] origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-1.5 shadow-lg outline-none';
	const item = [
		'group flex h-10 cursor-default items-center gap-3 rounded-[0.625rem] px-1.5 text-[0.9375rem] whitespace-nowrap outline-none select-none',
		'transition-colors duration-150 data-highlighted:bg-sunken',
		'data-disabled:pointer-events-none data-disabled:text-fg-subtle'
	].join(' ');
	const chip =
		'pointer-events-none grid size-7 shrink-0 place-items-center rounded-lg group-data-disabled:opacity-50 group-data-disabled:grayscale';

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

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<IconButton
				{...props}
				size="sm"
				aria-label="Actions for {account.name}"
				class="bg-card/70 backdrop-blur-sm"
			>
				<Ellipsis />
			</IconButton>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content align="end" sideOffset={6} forceMount>
			{#snippet child({ props, wrapperProps, open: shown })}
				{#if shown}
					<div {...wrapperProps}>
						<div {...props} in:pop out:pop use:deal class={surface}>
							<DropdownMenu.Item class={item} onSelect={onView} disabled={open} data-deal>
								<span class={cn(chip, 'bg-blue/12 text-blue')} aria-hidden="true">
									<AnimatedIcon icon={MovingEye} set="moving" />
								</span>
								View details
								{#if open}<span class="ml-auto text-xs text-fg-subtle">Open</span>{/if}
							</DropdownMenu.Item>

							<DropdownMenu.Item class={item} onSelect={onEdit} data-deal>
								<span class={cn(chip, 'bg-violet/12 text-violet')} aria-hidden="true">
									<AnimatedIcon icon={MovingPencil} set="moving" />
								</span>
								Edit
							</DropdownMenu.Item>

							<!-- Blue, as the dashboard's featured-accounts picker: choosing which
							     accounts get a place of their own. -->
							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger class={item} data-deal>
									<span class={cn(chip, 'bg-blue/12 text-blue')} aria-hidden="true">
										<AnimatedIcon icon={MovingStar} set="moving" />
									</span>
									Feature as
									<span class="ml-auto text-xs text-fg-subtle">
										{ROLES.find((r) => r.value === account.role)?.label}
									</span>
									<ChevronRight
										class="size-4 shrink-0 stroke-[1.5] text-fg-subtle"
										aria-hidden="true"
									/>
								</DropdownMenu.SubTrigger>
								<DropdownMenu.SubContent forceMount>
									{#snippet child({ props: subProps, wrapperProps: subWrapper, open: subOpen })}
										{#if subOpen}
											<div {...subWrapper}>
												<div {...subProps} in:pop out:pop use:deal class={cn(surface, 'min-w-48')}>
													{#each ROLES as option (option.label)}
														{@const chosen = account.role === option.value}
														<DropdownMenu.Item
															class={item}
															closeOnSelect={false}
															onSelect={() => feature(option.value)}
															data-deal
														>
															<span class="pl-1.5">{option.label}</span>
															<AnimatedIcon
																icon={MovingCheck}
																set="moving"
																trigger="none"
																play={chosen}
																class={cn(
																	'ml-auto size-4 text-blue transition-[opacity,scale] duration-300 ease-[var(--ease-spring)]',
																	chosen ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
																)}
															/>
														</DropdownMenu.Item>
													{/each}
												</div>
											</div>
										{/if}
									{/snippet}
								</DropdownMenu.SubContent>
							</DropdownMenu.Sub>

							<!-- The ledger's own colour for the Account column. -->
							<DropdownMenu.Item
								class={item}
								onSelect={() => goto(accountLedgerHref(account.id))}
								data-deal
							>
								<span
									class={cn(chip, pastel)}
									style="--tint: {PALETTE.lavender.css}"
									aria-hidden="true"
								>
									<AnimatedIcon icon={MovingArrowLeftRight} set="moving" />
								</span>
								See its transactions
							</DropdownMenu.Item>

							<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

							<!-- Put away, not gone: it can come back from the archive below. -->
							<DropdownMenu.Item class={item} onSelect={archive} data-deal>
								<span
									class={cn(chip, pastel)}
									style="--tint: {PALETTE.peach.css}"
									aria-hidden="true"
								>
									<AnimatedIcon icon={MovingArchive} set="moving" />
								</span>
								Archive
							</DropdownMenu.Item>

							<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

							<DropdownMenu.Item
								class={cn(item, 'text-negative data-highlighted:bg-negative/10')}
								onSelect={() => (confirming = true)}
								data-deal
							>
								<span class={cn(chip, 'bg-negative/12 text-negative')} aria-hidden="true">
									<AnimatedIcon icon={MovingTrash} set="moving" />
								</span>
								Delete
							</DropdownMenu.Item>
						</div>
					</div>
				{/if}
			{/snippet}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<ConfirmDialog
	open={confirming}
	onOpenChange={(next) => {
		confirming = next;
		if (!next) remove.reset();
	}}
	title="Delete this account?"
	description="It's gone for good. Its transactions stay in the ledger with no account, still counted in your total; a balance set by hand leaves the total with it."
	action="Delete"
	pending={remove.isPending}
	error={remove.isError ? 'Couldn’t delete it. Try again.' : null}
	onConfirm={destroy}
>
	<div class="flex items-center gap-3">
		<Orb {color} class="size-4 shrink-0" />
		<span class="min-w-0 flex-1 truncate text-[0.9375rem]">{account.name}</span>
		<span class="tabular text-[0.9375rem] whitespace-nowrap"
			>{formatMoney(account.balance, currency)}</span
		>
	</div>
</ConfirmDialog>

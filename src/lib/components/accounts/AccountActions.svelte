<script lang="ts">
	import MovingArchive from '@jis3r/icons/icons/archive';
	import MovingArrowLeftRight from '@jis3r/icons/icons/arrow-left-right';
	import MovingCheck from '@jis3r/icons/icons/check';
	import MovingEye from '@jis3r/icons/icons/eye';
	import MovingLandmark from '@jis3r/icons/icons/landmark';
	import MovingPencil from '@jis3r/icons/icons/pencil';
	import MovingStar from '@jis3r/icons/icons/star';
	import MovingTrash from '@jis3r/icons/icons/trash-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { DropdownMenu } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { ACCOUNT_BRANDS, accountIcon } from '$lib/account-icons';
	import type { Account, AccountPlace, AccountRole } from '$lib/accounts';
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
	import { cn } from '$lib/utils';
	import AccountIconOptions from './AccountIconOptions.svelte';
	import { dealRows, MENU_CHIP, MENU_ITEM, MENU_PASTEL, MENU_SURFACE } from './menu';

	/**
	 * What can be done to one account, from the corner of its card — the order
	 * of the day, as a ledger row's menu has it: look at it, change it, feature
	 * it, go to its rows; then, each under a rule of its own, put it away and,
	 * last and in `negative`, delete it.
	 */
	type Props = {
		account: Account;
		/** Its place (`accountPlace`): a role it holds, or a dashboard slot it fills by default. */
		place: AccountPlace | null;
		color: PaletteColor;
		currency: Currency;
		/** It's the one open in the panel. */
		open?: boolean;
		onView: () => void;
		onEdit: () => void;
		/** Something the menu couldn't do, for the page to say out loud. */
		onProblem?: (message: string | null) => void;
	};

	let {
		account,
		place,
		color,
		currency,
		open = false,
		onView,
		onEdit,
		onProblem
	}: Props = $props();

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

	/** Where it stands, as the submenu's trigger says it. */
	const standing = $derived(
		`${ROLES.find((r) => r.value === (place?.role ?? null))?.label}${place?.chosen === false ? ', by default' : ''}`
	);
	/** Filling a slot by default: picking that role keeps it; only another account takes it away. */
	const byDefault = $derived(place?.chosen === false ? place.role : null);

	/** The brand it wears, as the icon submenu's trigger says it. */
	const worn = $derived(accountIcon(account));
	const wearing = $derived(
		worn ? `${ACCOUNT_BRANDS[worn].label}${account.icon === null ? ', automatic' : ''}` : 'None'
	);

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
						<div {...props} in:pop out:pop use:dealRows class={MENU_SURFACE}>
							<DropdownMenu.Item class={MENU_ITEM} onSelect={onView} disabled={open} data-deal>
								<span class={cn(MENU_CHIP, 'bg-blue/12 text-blue')} aria-hidden="true">
									<AnimatedIcon icon={MovingEye} set="moving" />
								</span>
								View details
								{#if open}<span class="ml-auto text-xs text-fg-subtle">Open</span>{/if}
							</DropdownMenu.Item>

							<DropdownMenu.Item class={MENU_ITEM} onSelect={onEdit} data-deal>
								<span class={cn(MENU_CHIP, 'bg-violet/12 text-violet')} aria-hidden="true">
									<AnimatedIcon icon={MovingPencil} set="moving" />
								</span>
								Edit
							</DropdownMenu.Item>

							<!-- Blue, as the dashboard's featured-accounts picker: choosing which
							     accounts get a place of their own. -->
							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger class={MENU_ITEM} data-deal>
									<span class={cn(MENU_CHIP, 'bg-blue/12 text-blue')} aria-hidden="true">
										<AnimatedIcon icon={MovingStar} set="moving" />
									</span>
									Feature as
									<span class="ml-auto text-xs text-fg-subtle">{standing}</span>
									<ChevronRight
										class="size-4 shrink-0 stroke-[1.5] text-fg-subtle"
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
													use:dealRows
													class={cn(MENU_SURFACE, 'min-w-48')}
												>
													{#each ROLES as option (option.label)}
														{@const current = (place?.role ?? null) === option.value}
														{@const defaulted = current && byDefault !== null}
														<DropdownMenu.Item
															class={MENU_ITEM}
															closeOnSelect={false}
															onSelect={() => feature(option.value)}
															disabled={option.value === null && byDefault !== null}
															data-deal
														>
															<span class="pl-1.5">{option.label}</span>
															{#if defaulted}
																<span class="ml-auto text-xs text-fg-subtle">By default</span>
															{/if}
															<!-- Held by default, the check steps back: it's where the account is, not a choice. -->
															<AnimatedIcon
																icon={MovingCheck}
																set="moving"
																trigger="none"
																play={current}
																class={cn(
																	'size-4 transition-[opacity,scale,color] duration-300 ease-[var(--ease-spring)]',
																	defaulted ? 'text-fg-subtle' : 'ml-auto text-blue',
																	current ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
																)}
															/>
														</DropdownMenu.Item>
													{/each}
													{#if byDefault}
														{@const slot = byDefault === 'main' ? 'Main' : 'Secondary'}
														<!-- w-0 min-w-full: it wraps to the rows' width instead of setting it. -->
														<p
															class="w-0 min-w-full px-3 pt-1 pb-2 text-xs leading-relaxed text-fg-subtle"
															data-deal
														>
															It’s {slot} by default: no account was picked for it. Pick {slot} to keep
															it there, or give the place to another account.
														</p>
													{/if}
												</div>
											</div>
										{/if}
									{/snippet}
								</DropdownMenu.SubContent>
							</DropdownMenu.Sub>

							<!-- In the account's own colour: the mark it wears is its own. The same
							     list its card's brand mark opens, reading and writing the same pick. -->
							<DropdownMenu.Sub>
								<DropdownMenu.SubTrigger class={MENU_ITEM} data-deal>
									<span
										class={cn(MENU_CHIP, MENU_PASTEL)}
										style="--tint: {PALETTE[color].css}"
										aria-hidden="true"
									>
										<AnimatedIcon icon={MovingLandmark} set="moving" />
									</span>
									Icon
									<span class="ml-auto text-xs text-fg-subtle">{wearing}</span>
									<ChevronRight
										class="size-4 shrink-0 stroke-[1.5] text-fg-subtle"
										aria-hidden="true"
									/>
								</DropdownMenu.SubTrigger>
								<DropdownMenu.SubContent forceMount>
									{#snippet child({ props: subProps, wrapperProps: subWrapper, open: subOpen })}
										{#if subOpen}
											<div {...subWrapper}>
												<div {...subProps} in:pop out:pop use:dealRows class={MENU_SURFACE}>
													<AccountIconOptions {account} {onProblem} />
												</div>
											</div>
										{/if}
									{/snippet}
								</DropdownMenu.SubContent>
							</DropdownMenu.Sub>

							<!-- The ledger's own colour for the Account column. -->
							<DropdownMenu.Item
								class={MENU_ITEM}
								onSelect={() => goto(accountLedgerHref(account.id))}
								data-deal
							>
								<span
									class={cn(MENU_CHIP, MENU_PASTEL)}
									style="--tint: {PALETTE.lavender.css}"
									aria-hidden="true"
								>
									<AnimatedIcon icon={MovingArrowLeftRight} set="moving" />
								</span>
								See its transactions
							</DropdownMenu.Item>

							<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

							<!-- Put away, not gone: it can come back from the archive below. -->
							<DropdownMenu.Item class={MENU_ITEM} onSelect={archive} data-deal>
								<span
									class={cn(MENU_CHIP, MENU_PASTEL)}
									style="--tint: {PALETTE.peach.css}"
									aria-hidden="true"
								>
									<AnimatedIcon icon={MovingArchive} set="moving" />
								</span>
								Archive
							</DropdownMenu.Item>

							<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

							<DropdownMenu.Item
								class={cn(MENU_ITEM, 'text-negative data-highlighted:bg-negative/10')}
								onSelect={() => (confirming = true)}
								data-deal
							>
								<span class={cn(MENU_CHIP, 'bg-negative/12 text-negative')} aria-hidden="true">
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

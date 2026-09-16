<script lang="ts">
	import MovingCheck from '@jis3r/icons/icons/check';
	import MovingSparkles from '@jis3r/icons/icons/sparkles';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import { DropdownMenu } from 'bits-ui';
	import {
		ACCOUNT_BRANDS,
		ACCOUNT_ICONS,
		detectAccountIcon,
		type AccountIcon
	} from '$lib/account-icons';
	import type { Account } from '$lib/accounts';
	import { AnimatedIcon } from '$lib/components/ui';
	import { setAccountIconMutation } from '$lib/queries';
	import { cn } from '$lib/utils';
	import AccountLogo from './AccountLogo.svelte';
	import { MENU_CHECK, MENU_ITEM } from './menu';

	/**
	 * The brands an account can wear, as menu rows: _Automatic_, which reads one
	 * from its name, then every brand on its plate. It's the same list wherever
	 * it opens — from the brand mark on the card, or the card's `⋯` — and both
	 * read the account from the one cached list the pick writes to, so they
	 * never disagree. Place it inside a `DropdownMenu` content or sub-content;
	 * rows carry `data-deal` for the surface to deal them in.
	 */
	type Props = {
		account: Account;
		/** Something the pick couldn't do, for the page to say out loud. */
		onProblem?: (message: string | null) => void;
	};

	let { account, onProblem }: Props = $props();

	const queryClient = useQueryClient();
	const mutation = createMutation(() => setAccountIconMutation(queryClient));

	/** What its name and issuer say, picked or not. */
	const named = $derived(detectAccountIcon(account.provider, account.name));

	function choose(icon: AccountIcon | null) {
		if (icon === account.icon) return;
		onProblem?.(null);
		mutation.mutate(
			{ id: account.id, icon },
			{ onError: () => onProblem?.(`Couldn’t change the icon of ${account.name}. Try again.`) }
		);
	}

	/** A brand's mark sits on white, as it's meant to be seen, in a slot wide enough for a word mark. */
	const plate =
		'pointer-events-none grid h-7 w-14 shrink-0 place-items-center rounded-lg bg-white px-1.5 ring-1 ring-line';
</script>

<!-- Blue, as choosing how an account is featured: what stands for it. -->
<DropdownMenu.Item class={MENU_ITEM} closeOnSelect={false} onSelect={() => choose(null)} data-deal>
	<span
		class="pointer-events-none grid h-7 w-14 shrink-0 place-items-center rounded-lg bg-blue/12 text-blue"
		aria-hidden="true"
	>
		<AnimatedIcon icon={MovingSparkles} set="moving" />
	</span>
	<span class="grid leading-tight">
		Automatic
		<span class="text-xs text-fg-subtle">
			{named ? `${ACCOUNT_BRANDS[named].label}, from its name` : 'None: its name names no brand'}
		</span>
	</span>
	<AnimatedIcon
		icon={MovingCheck}
		set="moving"
		trigger="none"
		play={account.icon === null}
		class={cn(
			MENU_CHECK,
			'text-blue',
			account.icon === null ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
		)}
	/>
</DropdownMenu.Item>

<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

{#each ACCOUNT_ICONS as icon (icon)}
	{@const picked = account.icon === icon}
	{@const read = account.icon === null && named === icon}
	<!-- Read from its name, the brand's check steps back: it's what the account
	     wears, not a pick. Picking it keeps it whatever the name says. -->
	<DropdownMenu.Item
		class={MENU_ITEM}
		closeOnSelect={false}
		onSelect={() => choose(icon)}
		data-deal
	>
		<span class={plate} aria-hidden="true">
			<AccountLogo {icon} class="size-full" />
		</span>
		{ACCOUNT_BRANDS[icon].label}
		<AnimatedIcon
			icon={MovingCheck}
			set="moving"
			trigger="none"
			play={picked || read}
			class={cn(
				MENU_CHECK,
				read ? 'text-fg-subtle' : 'text-blue',
				picked || read ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
			)}
		/>
	</DropdownMenu.Item>
{/each}

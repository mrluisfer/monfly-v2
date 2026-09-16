<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import gsap from 'gsap';
	import { untrack } from 'svelte';
	import { ACCOUNT_BRANDS, accountIcon } from '$lib/account-icons';
	import type { Account } from '$lib/accounts';
	import { pop } from '$lib/transitions';
	import { prefersReducedMotion } from '$lib/utils';
	import AccountIconOptions from './AccountIconOptions.svelte';
	import AccountLogo from './AccountLogo.svelte';
	import { dealRows, MENU_SURFACE } from './menu';

	/**
	 * The brand an account wears at the head of its card's label — the bank or
	 * network its name or issuer names (`$lib/account-icons`), or the one picked
	 * for it. Where it wears none, there's nothing here at all. Pressed, it opens
	 * the brands (`AccountIconOptions`, the list the card's `⋯` opens too); a new
	 * brand turns the mark over like a card (GSAP).
	 */
	type Props = {
		account: Account;
		/** Something the pick couldn't do, for the page to say out loud. */
		onProblem?: (message: string | null) => void;
	};

	let { account, onProblem }: Props = $props();

	const worn = $derived(accountIcon(account));

	let chip = $state<HTMLElement>();
	/** The brand drawn right now: it trails `worn` by half a turn while the mark flips. */
	let drawn = $state(untrack(() => accountIcon(account)));
	let turn: gsap.core.Timeline | undefined;

	// A new brand turns the mark away edge-on, swaps it out of sight, and swings
	// the new one round past square before it settles. Coming or going, it pops.
	$effect(() => {
		const next = worn;
		const was = untrack(() => drawn);
		if (next === was) return;
		turn?.kill();
		if (!chip || !was || !next || prefersReducedMotion()) {
			// A turn cut short mustn't leave the mark edge-on.
			if (chip) gsap.set(chip, { rotationY: 0 });
			drawn = next;
			return;
		}
		turn = gsap
			.timeline({ defaults: { transformPerspective: 240 } })
			.to(chip, {
				rotationY: 90,
				duration: 0.16,
				ease: 'power2.in',
				onComplete: () => {
					drawn = next;
				}
			})
			.fromTo(chip, { rotationY: -90 }, { rotationY: 0, duration: 0.55, ease: 'back.out(2.2)' });
	});

	$effect(() => () => turn?.kill());
</script>

{#if drawn}
	{@const brand = drawn}
	<span
		class="pointer-events-auto inline-flex"
		in:pop={{ scale: 0.6, duration: 0.45, bounce: 0.5 }}
		out:pop={{ scale: 0.6 }}
	>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						bind:this={chip}
						type="button"
						aria-label="{ACCOUNT_BRANDS[brand].label} icon for {account.name}. Change it"
						class="press grid h-5 place-items-center rounded-md bg-white px-1 ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue data-[state=open]:ring-blue"
					>
						<AccountLogo icon={brand} class="h-3 w-auto max-w-12" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content align="start" sideOffset={6} forceMount>
					{#snippet child({ props, wrapperProps, open })}
						{#if open}
							<div {...wrapperProps}>
								<div {...props} in:pop out:pop use:dealRows class={MENU_SURFACE}>
									<AccountIconOptions {account} {onProblem} />
								</div>
							</div>
						{/if}
					{/snippet}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	</span>
{/if}

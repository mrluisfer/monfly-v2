<script lang="ts">
	import Bell from '@lucide/svelte/icons/bell';
	import CircleUserRound from '@lucide/svelte/icons/circle-user-round';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Settings from '@lucide/svelte/icons/settings';
	import { DropdownMenu } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Avatar, Kbd } from '$lib/components/ui';
	import { HOTKEYS, type Hotkey } from '$lib/hotkeys';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';

	/** The account behind the avatar: who's signed in, and the doors out of the dashboard. */
	type Account = { name: string | null; email: string; avatarSeed: string | null };

	const profile = $derived(page.data.profile as Account | null);
	const name = $derived(profile?.name ?? page.data.user?.name ?? 'Your account');
	const email = $derived(profile?.email ?? page.data.user?.email ?? '');
	// v1's rule: the chosen seed, else the name — so a v1 avatar keeps its identity.
	const seed = $derived(profile?.avatarSeed ?? profile?.name ?? email);

	/**
	 * Each icon sits in a chip tinted with its accent — colour carries meaning
	 * and life here, not grey. On highlight the glyph makes its own small
	 * gesture: the gear turns, the door arrow leans out.
	 */
	const TONE = {
		blue: 'bg-blue/12 text-blue',
		violet: 'bg-violet/12 text-violet',
		lime: 'bg-lime/30 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))]',
		negative: 'bg-negative/12 text-negative'
	};

	type Link = {
		label: string;
		icon: typeof Settings;
		tone: keyof typeof TONE;
		gesture: string;
		hotkey: Hotkey & { href: string };
	};

	const links: Link[] = [
		{
			label: 'Profile',
			icon: CircleUserRound,
			tone: 'blue',
			gesture: 'group-data-highlighted:scale-115',
			hotkey: HOTKEYS.goProfile
		},
		{
			label: 'Settings',
			icon: Settings,
			tone: 'violet',
			gesture: 'group-data-highlighted:rotate-90',
			hotkey: HOTKEYS.goSettings
		}
	];

	let logout = $state<HTMLFormElement>();

	const item = [
		'group flex h-10 cursor-default items-center gap-3 rounded-[0.625rem] px-1.5 text-[0.9375rem] outline-none select-none',
		'transition-colors duration-150 data-highlighted:bg-sunken',
		'data-disabled:pointer-events-none data-disabled:text-fg-subtle'
	].join(' ');
	const chip =
		'grid size-7 shrink-0 place-items-center rounded-lg group-data-disabled:opacity-50 group-data-disabled:grayscale';
	const glyph =
		'size-4 stroke-[1.75] transition-transform duration-300 ease-[var(--ease-spring)]';
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				aria-label="Account menu"
				class="press grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
			>
				<Avatar {seed} gaze class="size-11" />
			</button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Portal>
		<!-- Same entrance and exit as every floating layer: forceMount hands mounting to the {#if}. -->
		<DropdownMenu.Content align="end" sideOffset={10} forceMount>
			{#snippet child({ props, wrapperProps, open })}
				{#if open}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							class="z-50 w-64 origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-1.5 shadow-lg outline-none"
						>
							<div class="flex items-center gap-3 px-1.5 py-2">
								<Avatar {seed} class="size-9" />
								<div class="min-w-0">
									<p class="truncate text-sm font-medium">{name}</p>
									<p class="truncate text-xs text-fg-muted">{email}</p>
								</div>
							</div>

							<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

							{#each links as link (link.label)}
								<DropdownMenu.Item class={item} onSelect={() => goto(link.hotkey.href)}>
									<span class={cn(chip, TONE[link.tone])}>
										<link.icon class={cn(glyph, link.gesture)} />
									</span>
									{link.label}
									<Kbd keys={link.hotkey.keys} class="ml-auto" />
								</DropdownMenu.Item>
							{/each}
							<DropdownMenu.Item class={item} disabled>
								<span class={cn(chip, TONE.lime)}><Bell class={glyph} /></span>
								Notifications
								<span class="ml-auto text-xs">Soon</span>
							</DropdownMenu.Item>

							<DropdownMenu.Separator class="mx-1 my-1.5 h-px bg-line" />

							<DropdownMenu.Item class={item} onSelect={() => logout?.requestSubmit()}>
								<span class={cn(chip, TONE.negative)}>
									<LogOut class={cn(glyph, 'group-data-highlighted:translate-x-0.5')} />
								</span>
								Log out
							</DropdownMenu.Item>
						</div>
					</div>
				{/if}
			{/snippet}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>

<!-- Logging out is a POST, like the endpoint expects; the menu item submits it. -->
<form bind:this={logout} method="POST" action="/auth/logout" hidden></form>

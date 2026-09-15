<script lang="ts">
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { browser } from '$app/environment';
	import { countUp, reveal } from '$lib/actions';
	import { ShortcutActivity, ShortcutCard } from '$lib/components/shortcuts';
	import { HOTKEYS } from '$lib/hotkeys';
	import { setShortcutMutation, shortcutsQuery } from '$lib/queries';
	import { DEFAULT_SHORTCUTS, SHORTCUTS, inHeader } from '$lib/shortcuts';
	import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	let { data } = $props();

	// The app layout seeded this from the session, so it draws on the server.
	const query = createQuery(() => ({
		...shortcutsQuery(),
		enabled: browser && data.profile !== null
	}));

	// Read the client during setup: Svelte context is out of reach from the
	// mutation's lazily evaluated options.
	const queryClient = useQueryClient();
	const pin = createMutation(() => setShortcutMutation(queryClient));

	const pinned = $derived(query.data ?? DEFAULT_SHORTCUTS);
	const count = $derived(SHORTCUTS.filter((shortcut) => inHeader(shortcut, pinned)).length);
	/** The shortcut whose last change the server refused: its card says so. */
	const refused = $derived(pin.isError ? pin.variables?.id : undefined);

	const hotkeyFor = (href: string) =>
		Object.values(HOTKEYS).find((hotkey) => hotkey.href === href)?.keys;

	let grid = $state<HTMLElement>();

	// The cards are dealt in one after another, behind the heading's reveal.
	$effect(() => {
		if (!grid || prefersReducedMotion()) return;
		animate(
			grid.children,
			{ opacity: [0, 1], y: [14, 0], scale: [0.97, 1] },
			{ delay: stagger(0.05, { startDelay: 0.1 }), duration: 0.55, ease: EASE_OUT_QUINT }
		);
	});
</script>

<svelte:head><title>Shortcuts · Monfly</title></svelte:head>

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<section class="grid items-end gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_auto]" use:reveal>
		<div>
			<h1 class="font-display text-6xl leading-none font-light tracking-tight xl:text-7xl">
				Shortcuts
			</h1>
			<p class="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-fg-muted">
				Pin the pages you use most to the header. They're saved to your account, so they're there on
				any device you sign in from.
			</p>
		</div>

		<div class="lg:text-right">
			<p class="tabular font-display text-[2.75rem] leading-none font-light tracking-tight">
				<span use:countUp={{ value: count, initial: false }}>{count}</span><span
					class="text-fg-subtle">&thinsp;/&thinsp;{SHORTCUTS.length}</span
				>
			</p>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">In your header</p>
		</div>
	</section>

	<div bind:this={grid} class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
		{#each SHORTCUTS as shortcut (shortcut.id)}
			<ShortcutCard
				{shortcut}
				pinned={inHeader(shortcut, pinned)}
				hotkey={hotkeyFor(shortcut.href)}
				disabled={data.profile === null}
				error={refused === shortcut.id ? "Couldn't save that. Try again." : null}
				onPinnedChange={(next, source) => pin.mutate({ id: shortcut.id, pinned: next, source })}
			/>
		{/each}
	</div>

	<ShortcutActivity enabled={data.profile !== null} />
</div>

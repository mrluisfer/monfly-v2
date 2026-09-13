<script lang="ts">
	import MovingArrowLeft from '@jis3r/icons/icons/arrow-left';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { AnimatedIcon, IconButton, Logo, ThemeToggle } from '$lib/components/ui';
	import { HOME_PATH } from '$lib/routes';
	import { pop } from '$lib/transitions';
	import TabStrip from './TabStrip.svelte';
	import UserMenu from './UserMenu.svelte';

	// How many of the app's own history entries sit behind this one, so that
	// "back" never walks out of Monfly.
	let depth = 0;
	afterNavigate(({ type, delta }) => {
		if (type === 'enter') depth = 0;
		else if (type === 'popstate') depth = Math.max(0, depth + (delta ?? -1));
		else depth += 1;
	});

	/** Back through the app's own history, or home when there is none — a deep link. */
	function goBack() {
		if (depth > 0) history.back();
		else goto(HOME_PATH);
	}

	const showBack = $derived(page.url.pathname !== HOME_PATH);
</script>

<header
	class="sticky top-0 z-50 flex h-20 shrink-0 items-center gap-5 bg-window px-4 sm:px-6 lg:px-8"
>
	<!-- Brand -->
	<a href={HOME_PATH} class="flex shrink-0 items-center gap-3.5">
		<Logo class="h-7 w-auto" />
		<span class="h-6 w-px bg-line-strong"></span>
		<span class="font-display text-xl font-medium tracking-tight">Monfly</span>
	</a>

	<div class="flex h-full min-w-0 flex-1 items-center">
		<!-- Back, everywhere but home. The wrapper carries the spacing and
		     collapses with the button, so the tabs glide over instead of jumping. -->
		{#if showBack}
			<div
				class="hidden shrink-0 pr-5 pl-2 sm:block"
				transition:slide={{ axis: 'x', duration: 350, easing: quintOut }}
			>
				<div
					in:pop={{ scale: 0.5, x: 10, bounce: 0.4, duration: 0.5 }}
					out:pop={{ scale: 0.5, x: 10, duration: 0.4 }}
				>
					<IconButton dashed aria-label="Go back" onclick={goBack}>
						<AnimatedIcon icon={MovingArrowLeft} set="moving" />
					</IconButton>
				</div>
			</div>
		{/if}

		<div class="h-full min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
			<TabStrip />
		</div>
	</div>

	<div class="flex shrink-0 items-center gap-3">
		<ThemeToggle />
		<UserMenu />
	</div>
</header>

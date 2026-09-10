<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import { IconButton, Logo, ThemeToggle } from '$lib/components/ui';
	import TabStrip from './TabStrip.svelte';
</script>

<header
	class="sticky top-0 z-50 flex h-20 shrink-0 items-center gap-5 bg-window px-4 sm:px-6 lg:px-8"
>
	<!-- Brand -->
	<a href="/dashboard" class="flex shrink-0 items-center gap-3.5">
		<Logo class="h-7 w-auto" />
		<span class="h-6 w-px bg-line-strong"></span>
		<span class="font-display text-xl font-medium tracking-tight">Monfly</span>
	</a>

	<IconButton dashed aria-label="Go back" class="ml-2 hidden shrink-0 sm:inline-grid">
		<ArrowLeft />
	</IconButton>

	<div class="h-full min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
		<TabStrip />
	</div>

	<div class="flex shrink-0 items-center gap-3">
		<ThemeToggle />
		<div
			class="size-11 rounded-full bg-gradient-to-br from-lime via-blue to-violet ring-1 ring-line"
		></div>
	</div>
</header>

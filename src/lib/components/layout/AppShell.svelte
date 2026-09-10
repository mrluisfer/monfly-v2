<script lang="ts">
	import type { Snippet } from 'svelte';
	import { bindHotkeys } from '$lib/hotkeys';
	import TopBar from './TopBar.svelte';

	let { children }: { children: Snippet } = $props();

	// Shortcuts live as long as the shell does. The keys are in $lib/hotkeys/registry.
	$effect(() => bindHotkeys());
</script>

<div class="flex min-h-dvh flex-col bg-canvas">
	<TopBar />
	<main class="flex-1">
		{@render children()}
	</main>
</div>

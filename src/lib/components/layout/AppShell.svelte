<script lang="ts">
	import type { Snippet } from 'svelte';
	import TopBar from './TopBar.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="flex min-h-dvh flex-col bg-canvas">
	<TopBar />
	<main class="flex-1">
		{@render children()}
	</main>
</div>

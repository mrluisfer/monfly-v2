<script lang="ts">
	// Straight from its file, not the layout barrel: the barrel carries the app shell.
	import Meta from '$lib/components/layout/Meta.svelte';

	let { children } = $props();
</script>

<!-- Signed-out chrome: no app shell and no QueryClient, so auth pages stay light. -->
<Meta />
<div class="flex min-h-dvh flex-col bg-canvas p-4 sm:p-6 lg:p-8">
	{@render children()}
</div>

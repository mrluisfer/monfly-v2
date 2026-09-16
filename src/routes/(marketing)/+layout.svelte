<script lang="ts">
	// Straight from its file, not the layout barrel: the barrel carries the app shell.
	import Meta from '$lib/components/layout/Meta.svelte';

	let { children } = $props();
</script>

<!-- Public landing chrome (header, footer) goes here. Kept out of (app), so the
     landing never loads the app shell, bits-ui, Motion or TanStack Query. -->
<Meta />
{@render children()}

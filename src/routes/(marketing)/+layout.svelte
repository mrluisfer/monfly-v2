<script lang="ts">
	let { children } = $props();
</script>

<!-- Public landing chrome (header, footer) goes here. Kept out of (app), so the
     landing never loads the app shell, bits-ui, Motion or TanStack Query. -->
{@render children()}

<script lang="ts">
	let { children } = $props();
</script>

<!-- Signed-out chrome: no app shell and no QueryClient, so auth pages stay light. -->
<div class="flex min-h-dvh flex-col bg-canvas p-4 sm:p-6 lg:p-8">
	{@render children()}
</div>

<script lang="ts">
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { AppShell } from '$lib/components/layout';

	let { children, data } = $props();
</script>

<QueryClientProvider client={data.queryClient}>
	<AppShell>
		{@render children()}
	</AppShell>
</QueryClientProvider>

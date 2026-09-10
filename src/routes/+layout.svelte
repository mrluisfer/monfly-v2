<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/outfit';
	import '../app.css';

	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { ModeWatcher } from 'mode-watcher';
	import favicon from '$lib/assets/favicon.svg';
	import { AppShell } from '$lib/components/layout';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Monfly</title>
</svelte:head>

<ModeWatcher defaultMode="light" themeColors={{ dark: '#0f1424', light: '#f2f2f4' }} />

<QueryClientProvider client={data.queryClient}>
	<AppShell>
		{@render children()}
	</AppShell>
</QueryClientProvider>

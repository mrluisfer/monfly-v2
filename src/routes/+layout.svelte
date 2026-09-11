<script lang="ts">
	import '@fontsource-variable/space-grotesk';
	import '@fontsource-variable/outfit';
	import '../app.css';

	import { ModeWatcher } from 'mode-watcher';

	// Global concerns only — fonts, tokens, theme. Each route group brings its
	// own chrome, so nothing app-specific loads on the landing.
	let { children } = $props();
</script>

<svelte:head>
	<title>Monfly</title>
</svelte:head>

<ModeWatcher defaultMode="light" themeColors={{ dark: '#0f1424', light: '#f2f2f4' }} />

{@render children()}

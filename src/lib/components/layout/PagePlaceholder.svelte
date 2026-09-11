<script lang="ts">
	import { reveal } from '$lib/actions';
	import { Card } from '$lib/components/ui';

	let { title }: { title: string } = $props();
</script>

<svelte:head><title>{title} · Monfly</title></svelte:head>

<div class="px-4 pb-6 sm:px-6 lg:px-8" use:reveal>
	<h1 class="py-8 font-display text-5xl font-light tracking-tight">{title}</h1>
	<Card class="p-8 text-[0.9375rem] text-fg-muted">
		Nothing here yet — this route exists so the shell is navigable.
	</Card>
</div>

<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Logo from './Logo.svelte';

	const { Story } = defineMeta({
		title: 'UI/Logo',
		component: Logo,
		tags: ['autodocs'],
		args: { label: 'Monfly' }
	});
</script>

<Story name="Mark" />

<!-- Beside the wordmark it needs no name of its own. -->
<Story name="With the wordmark">
	{#snippet template()}
		<div class="flex items-center gap-3">
			<Logo />
			<span class="h-6 w-px bg-line"></span>
			<span class="text-xl font-medium">Monfly</span>
		</div>
	{/snippet}
</Story>

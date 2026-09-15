<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Kbd from './Kbd.svelte';

	const { Story } = defineMeta({
		title: 'UI/Kbd',
		component: Kbd,
		tags: ['autodocs'],
		args: { keys: ['g', 'o'] }
	});
</script>

<!-- Pressed one after another, as the hotkey registry writes them. -->
<Story name="Sequence" />

<Story name="One key" args={{ keys: ['?'] }} />

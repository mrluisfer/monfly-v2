<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Avatar from './Avatar.svelte';

	const { Story } = defineMeta({
		title: 'UI/Avatar',
		component: Avatar,
		tags: ['autodocs'],
		args: { seed: 'monfly', animated: false, gaze: false, label: 'Monfly', class: 'size-16' }
	});
</script>

<!-- A single image: right for lists. -->
<Story name="Static" />

<!-- Comes alive under the pointer. -->
<Story name="Animated" args={{ animated: true }} />

<!-- Always alive, eyes on the pointer: the header's one. -->
<Story name="Gaze" args={{ gaze: true }} />

<!-- The same seed always draws the same blobatar. -->
<Story name="Seeds">
	{#snippet template()}
		<div class="flex gap-4">
			{#each ['ana', 'bruno', 'carla', 'diego', 'elena'] as seed (seed)}
				<Avatar {seed} class="size-12" />
			{/each}
		</div>
	{/snippet}
</Story>

<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Card from './Card.svelte';
	import Loader from './Loader.svelte';

	const { Story } = defineMeta({
		title: 'UI/Loader',
		component: Loader,
		tags: ['autodocs'],
		args: { label: 'Loading' }
	});
</script>

<Story name="Default" />

<Story name="Naming what" args={{ label: 'Loading transactions' }} />

<!-- Where it lives: over a card still waiting on its first read. -->
<Story name="In a card" parameters={{ layout: 'padded' }}>
	{#snippet template(args)}
		<Card class="relative h-72 w-96">
			<div class="absolute inset-0 grid place-items-center">
				<Loader {...args} />
			</div>
		</Card>
	{/snippet}
</Story>

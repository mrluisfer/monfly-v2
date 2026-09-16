<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ErrorView from './ErrorView.svelte';

	const { Story } = defineMeta({
		title: 'Errors/ErrorView',
		component: ErrorView,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<!-- Each in the frame the root error page draws: the canvas, its padding, and
     the card filling the window. The only way to see a 500 without breaking
     something on purpose. -->
<Story name="Not found" args={{ status: 404, message: 'Not Found' }}>
	{#snippet template(args)}
		<div class="flex h-dvh flex-col bg-canvas p-4 sm:p-6 lg:p-8">
			<ErrorView {...args} class="flex-1" />
		</div>
	{/snippet}
</Story>

<Story name="Server error" args={{ status: 500, message: 'Internal Error' }}>
	{#snippet template(args)}
		<div class="flex h-dvh flex-col bg-canvas p-4 sm:p-6 lg:p-8">
			<ErrorView {...args} class="flex-1" />
		</div>
	{/snippet}
</Story>

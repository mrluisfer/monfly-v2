<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ShareBar from './ShareBar.svelte';

	const { Story } = defineMeta({
		title: 'UI/ShareBar',
		component: ShareBar,
		tags: ['autodocs'],
		args: {
			segments: [
				{ id: 'bbva', share: 0.62, color: 'sky' },
				{ id: 'nu', share: 0.3, color: 'violet' },
				{ id: 'unknown', share: 0.08 }
			],
			track: 'sunken',
			class: 'h-4 w-96'
		},
		argTypes: { track: { control: 'inline-radio', options: ['sunken', 'hatch'] } }
	});
</script>

<!-- Segments that fill the bar; one with no colour is a gap, hatched. -->
<Story name="Filling the bar" />

<!-- The rest of the track is room, as in Where it went. -->
<Story
	name="Room left"
	args={{ track: 'hatch', segments: [{ id: 'food', share: 0.42, color: 'coral' }] }}
/>

<Story
	name="One left out"
	args={{
		segments: [
			{ id: 'bbva', share: 0.62, color: 'sky', off: true },
			{ id: 'nu', share: 0.3, color: 'violet' },
			{ id: 'unknown', share: 0.08 }
		]
	}}
/>

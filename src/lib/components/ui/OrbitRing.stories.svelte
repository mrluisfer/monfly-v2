<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Orb from './Orb.svelte';
	import OrbitRing from './OrbitRing.svelte';

	const { Story } = defineMeta({
		title: 'UI/OrbitRing',
		component: OrbitRing,
		tags: ['autodocs'],
		args: { markers: [0.25, 0.75], period: 32, direction: 1, class: 'w-28' },
		argTypes: { direction: { control: 'inline-radio', options: [1, -1] } }
	});
</script>

<!-- Point at it: it spins up and eases back. -->
<Story name="Around an orb">
	{#snippet template(args)}
		<OrbitRing
			markers={args.markers}
			period={args.period}
			direction={args.direction}
			class={args.class}
		>
			<Orb color="blue" blur={7} spread={80} class="size-full" />
		</OrbitRing>
	{/snippet}
</Story>

<!-- Side by side, they turn opposite ways, as an account's two do. -->
<Story name="A pair">
	{#snippet template()}
		<div class="flex gap-10">
			<OrbitRing class="w-28" markers={[0.25, 0.75]} period={32}>
				<Orb color="sky" blur={7} spread={80} class="size-full" />
			</OrbitRing>
			<OrbitRing class="w-28" markers={[0.25, 0.75]} period={24} direction={-1}>
				<Orb color="blue" blur={7} spread={80} class="size-full" />
			</OrbitRing>
		</div>
	{/snippet}
</Story>

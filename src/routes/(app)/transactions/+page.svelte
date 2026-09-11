<script lang="ts">
	import { reveal } from '$lib/actions';
	import { UnassignedCard } from '$lib/components/transactions';

	let { data } = $props();
</script>

<svelte:head><title>Transactions · Monfly</title></svelte:head>

<div class="flex flex-col gap-4 px-4 pb-6 sm:px-6 lg:px-8">
	<h1
		class="py-8 font-display text-6xl leading-none font-light tracking-tight xl:text-7xl"
		use:reveal
	>
		Transactions
	</h1>
	<div use:reveal={{ delay: 0.05 }}>
		<UnassignedCard timeZone={data.timeZone} enabled={data.profile !== null} />
	</div>
</div>

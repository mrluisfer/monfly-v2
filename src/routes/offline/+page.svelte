<script lang="ts">
	import WifiOff from '@lucide/svelte/icons/wifi-off';
</script>

<!--
	Where a navigation lands with no connection (src/service-worker.ts). Plain
	markup and one icon, like the landing: it is served from the cache, so the
	less it needs to boot, the more reliably it appears.
-->
<svelte:head>
	<title>Offline · Monfly</title>
</svelte:head>

<svelte:window ononline={() => location.reload()} />

<main class="grid min-h-dvh place-items-center px-4">
	<div class="max-w-sm text-center">
		<WifiOff class="mx-auto size-8 stroke-[1.5] text-fg-subtle" aria-hidden="true" />
		<h1 class="mt-5 font-display text-2xl">No connection</h1>
		<p class="mt-2 text-[0.9375rem] text-fg-muted">
			Monfly keeps your money on the server, so it needs the network to show it. This page reloads
			itself the moment you are back.
		</p>
		<button
			type="button"
			class="mt-6 inline-flex h-11 items-center rounded-full border border-hairline px-6 text-[0.9375rem] transition-colors duration-200 hover:bg-sunken"
			onclick={() => location.reload()}
		>
			Try again
		</button>
	</div>
</main>

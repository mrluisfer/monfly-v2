<script lang="ts">
	// Straight from its file, not the ui barrel: the root error page is loaded on
	// every page, the landing included, and the barrel carries bits-ui with it.
	import Card from '$lib/components/ui/Card.svelte';
	import { cn } from '$lib/utils';
	import NotFound from './NotFound.svelte';
	import ServerError from './ServerError.svelte';

	/**
	 * What a failed page shows, in the card a page is made of. The status picks
	 * the view; each view is where its own picture will be drawn, and is empty
	 * until then.
	 *
	 * No page throws an `error()` of its own today, so two statuses reach a
	 * person: 404, an address no route matches, and 500, anything that threw.
	 * Every status but 404 gets `ServerError` until one is thrown on purpose —
	 * that status earns its own view then.
	 */
	type Props = {
		status: number;
		/** SvelteKit's, never the exception's: "Not Found", or "Internal Error" for anything unexpected. */
		message: string;
		/** The frame sizes the card: filling the window, or a floor under the app's header. */
		class?: string;
	};

	let { status, message, class: className }: Props = $props();
</script>

<svelte:head><title>{status} · Monfly</title></svelte:head>

<Card class={cn('flex flex-col', className)}>
	<!-- Nothing is visible yet, so a screen reader is still told what happened. -->
	<h1 class="sr-only">{status} · {message}</h1>
	{#if status === 404}
		<NotFound />
	{:else}
		<ServerError />
	{/if}
</Card>

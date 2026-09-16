<script lang="ts">
	import { page } from '$app/state';
	import { ErrorView } from '$lib/components/errors';
</script>

<!--
	A page inside the app that failed. It is drawn where the page would have
	been, under the header, so the tabs are still there to go somewhere else.
	The card keeps the dashboard's floor for a card rather than filling the
	window: the shell's <main> doesn't hand its height down.
-->
<div class="px-4 pb-6 sm:px-6 lg:px-8">
	<ErrorView status={page.status} message={page.error?.message ?? ''} class="min-h-96" />
</div>

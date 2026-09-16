<script lang="ts">
	import { page } from '$app/state';
	import { ErrorView } from '$lib/components/errors';
</script>

<!--
	The error page for everything (app) doesn't catch: every 404, since an
	unknown path belongs to no group; a failure in the landing or the auth
	screens; and the app's own layout, when that is what failed and there is no
	header left to keep. Framed as (auth) frames a page: the canvas, its padding,
	and the card filling the rest of the window.
-->
<div class="flex min-h-dvh flex-col bg-canvas p-4 sm:p-6 lg:p-8">
	<ErrorView status={page.status} message={page.error?.message ?? ''} class="flex-1" />
</div>

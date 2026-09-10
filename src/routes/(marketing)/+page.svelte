<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
</script>

<!--
	Landing page — not designed yet. For now it only holds direct-access
	shortcuts, as plain links: no app-shell components, so it stays light.
-->
<main class="grid min-h-dvh place-items-center px-4">
	<nav aria-label="Shortcuts" class="flex flex-wrap items-center justify-center gap-3">
		<a
			href="/login"
			class="inline-flex h-11 items-center rounded-full border border-hairline px-6 text-[0.9375rem] transition-colors duration-200 hover:bg-sunken"
		>
			Log in
		</a>
		<a
			href="/dashboard"
			class="inline-flex h-11 items-center gap-2 rounded-full bg-fg px-6 text-[0.9375rem] font-medium text-window transition-opacity duration-200 hover:opacity-85"
		>
			Open dashboard
			<ArrowRight class="size-4" />
		</a>
	</nav>
</main>

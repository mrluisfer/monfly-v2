<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import type { Snippet } from 'svelte';
	import { IconButton } from '$lib/components/ui';

	type Props = {
		/** The graphic on top; it takes whatever height is left over. */
		visual: Snippet;
		/** The headline — a snippet, so one word can carry the weight. */
		title: Snippet;
		/** The line under it. */
		description: string;
		/** Where the arrow goes. */
		href: string;
		/** Names the arrow for assistive tech. */
		action: string;
	};

	let { visual, title, description, href, action }: Props = $props();
</script>

<!--
	The shape most tips take: a graphic, and the point of it summed up in a
	sunken block at the foot with the way on. Tips that need another shape
	build their own; this one is for the ones that don't.
-->
<div class="flex h-full flex-col p-7">
	<div class="flex min-h-0 flex-1 items-center justify-center py-2">
		{@render visual()}
	</div>

	<div class="flex shrink-0 items-center gap-4 rounded-[1.25rem] bg-sunken p-5">
		<div class="min-w-0 flex-1">
			<p class="font-display text-lg leading-snug">{@render title()}</p>
			<p class="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-muted">{description}</p>
		</div>
		<IconButton dashed {href} aria-label={action}>
			<ArrowRight />
		</IconButton>
	</div>
</div>

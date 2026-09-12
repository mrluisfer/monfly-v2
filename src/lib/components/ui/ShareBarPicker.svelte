<script lang="ts" generics="T extends ShareSegment">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import ShareBar, { type ShareSegment } from './ShareBar.svelte';
	import Tooltip from './Tooltip.svelte';

	/**
	 * A share bar to read and press. Each segment shows its detail in a tooltip
	 * and lights while pointed at or focused; a press hands it back to the owner
	 * — who decides what it means and says so through `off` — and the segment
	 * gives and springs back. The bar draws nothing of its own here: over it
	 * lies a row of invisible, taller targets on the same tracks, easing with
	 * the segments, so a thin bar is easy to hit and a tooltip always sits over
	 * the colour it describes.
	 */
	type Props = {
		segments: T[];
		track?: 'sunken' | 'hatch';
		/** What pointing at a segment shows. */
		tip: Snippet<[T]>;
		/** A segment's button, read out: what it is and what a press does. */
		label: (segment: T) => string;
		/** A segment was pressed. */
		onToggle: (segment: T) => void;
		/** Names the row of segments for assistive tech. */
		listLabel: string;
		/** On the wrapper: the bar fills its height. */
		class?: string;
	};

	let { segments, track, tip, label, onToggle, listLabel, class: className }: Props = $props();

	let bar = $state<ReturnType<typeof ShareBar>>();
	/** The segment being pointed at or focused. */
	let lit = $state<string | null>(null);

	type Handler = ((event: Event) => void) | undefined;
	/**
	 * The tooltip trigger's own handlers first, then ours. Writing ours after
	 * the spread without calling theirs replaces them: bits-ui then never hears
	 * the pointer leave, and the tooltip sticks open and stops responding.
	 */
	const chain = (theirs: unknown, ours: () => void) => (event: Event) => {
		(theirs as Handler)?.(event);
		ours();
	};
</script>

<div class={cn('relative', className)}>
	<ShareBar bind:this={bar} {segments} {track} {lit} class="h-full" />

	<ul class="absolute inset-x-0 -inset-y-2 flex gap-0.5" aria-label={listLabel}>
		{#each segments as segment, i (segment.id)}
			{#snippet detail()}
				{@render tip(segment)}
			{/snippet}
			<li class="target h-full min-w-1" style="--share: {segment.share}; --i: {i}">
				<Tooltip content={detail} side="top" delay={60}>
					{#snippet children({ props })}
						<button
							{...props}
							type="button"
							aria-pressed={!segment.off}
							aria-label={label(segment)}
							class="size-full cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
							onclick={chain(props.onclick, () => {
								onToggle(segment);
								bar?.squash(segment.id);
							})}
							onpointerenter={chain(props.onpointerenter, () => (lit = segment.id))}
							onpointerleave={chain(props.onpointerleave, () => (lit = null))}
							onfocus={chain(props.onfocus, () => (lit = segment.id))}
							onblur={chain(props.onblur, () => (lit = null))}
						></button>
					{/snippet}
				</Tooltip>
			</li>
		{/each}
	</ul>
</div>

<style>
	/* The targets track the segments' lengths, eased the same way. */
	.target {
		flex: var(--share) 1 0;
		transition: flex-grow 0.9s var(--ease-out-quint) calc(var(--i) * 80ms);

		@starting-style {
			flex-grow: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.target {
			transition: none;
		}
	}
</style>

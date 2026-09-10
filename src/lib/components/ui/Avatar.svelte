<script lang="ts">
	import { Blobatar } from '@blobatar/svelte';
	import { gaze as follow } from '@blobatar/svelte/gaze';
	import 'blobatar/motion.css';
	import 'blobatar/gaze.css';
	import { cn } from '$lib/utils';

	type Props = {
		/** Who it's for. The same seed always draws the same blobatar. */
		seed: string;
		/**
		 * Comes alive on hover. For a prominent avatar, never for lists: it
		 * renders inline SVG instead of a single `<img>`.
		 */
		animated?: boolean;
		/**
		 * Always alive — breathing, blinking — with its eyes on the pointer
		 * wherever it is on the page. For the one avatar that's the face of the
		 * app: the header's.
		 */
		gaze?: boolean;
		/** Read out when the avatar stands alone; omit beside a visible name or inside a labelled button. */
		label?: string;
		class?: string;
	};

	let { seed, animated = false, gaze = false, label, class: className }: Props = $props();

	// One driver, built once: a gaze() written inline in the template would be
	// rebuilt on every change and snap the eyes back to centre. Travel is in
	// viewBox units (the face is 100 across); 1.5–4 reads well, and the top of
	// that range still shows at header size. Blobatar attaches nothing under
	// reduced motion or without a fine pointer.
	const eyes = follow({ travel: 4, target: 'pointer' });
</script>

<!-- Generated locally, on the server too — no image request leaves the app. -->
{#if animated || gaze}
	<Blobatar
		{@attach gaze && eyes}
		name={seed}
		animate={gaze ? 'always' : 'hover'}
		background="circle"
		title={label}
		aria-hidden={label ? undefined : true}
		class={cn('block', className)}
	/>
{:else}
	<Blobatar name={seed} background="circle" alt={label ?? ''} class={cn('block', className)} />
{/if}

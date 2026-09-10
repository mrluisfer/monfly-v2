<script lang="ts" module>
	export type BlobColor = 'lime' | 'blue' | 'violet';

	export const BLOB_COLOR: Record<BlobColor, string> = {
		lime: 'var(--lime)',
		blue: 'var(--blue)',
		violet: 'var(--violet)'
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		color?: BlobColor;
		/** Blur radius in px. Larger reads softer, like the mockup's pie slices. */
		blur?: number;
		/** How far the colour reaches before fading out, 0–100. */
		spread?: number;
		class?: string;
	};

	let { color = 'lime', blur = 10, spread = 62, class: className }: Props = $props();

	const c = $derived(BLOB_COLOR[color]);
</script>

<div
	aria-hidden="true"
	class={cn('pointer-events-none absolute inset-0', className)}
	style="background: radial-gradient(circle at 42% 38%, {c} 0%, color-mix(in oklab, {c} 72%, transparent) {spread *
		0.55}%, transparent {spread}%); filter: blur({blur}px);"
></div>

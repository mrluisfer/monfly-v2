<script lang="ts">
	import { cn } from '$lib/utils';

	/** The mockup uses a solid triangle, not a chevron stroke. */
	let { class: className }: { class?: string } = $props();
</script>

<svg viewBox="0 0 12 8" class={cn('size-2.5 fill-current', className)} aria-hidden="true">
	<path d="M1 1.2C1 0.6 1.5 0.2 2 0.5L6 3.2C6 3.2 6 3.2 6 3.2L10 0.5C10.5 0.2 11 0.6 11 1.2C11 1.4 10.9 1.6 10.8 1.7L6.6 6.9C6.3 7.3 5.7 7.3 5.4 6.9L1.2 1.7C1.1 1.6 1 1.4 1 1.2Z" />
</svg>

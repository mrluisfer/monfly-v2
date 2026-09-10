<script lang="ts">
	import { BLOB_COLOR, type BlobColor } from './Blob.svelte';
	import { cn } from '$lib/utils';

	type Props = { color?: BlobColor; class?: string };
	let { color = 'lime', class: className }: Props = $props();
</script>

<svg
	viewBox="0 0 24 24"
	class={cn('size-4', className)}
	fill={BLOB_COLOR[color]}
	aria-hidden="true"
>
	<path d="M12 0C12 6.6 17.4 12 24 12C17.4 12 12 17.4 12 24C12 17.4 6.6 12 0 12C6.6 12 12 6.6 12 0Z" />
</svg>

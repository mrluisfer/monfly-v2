<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		class?: string;
		children: Snippet;
	} & Omit<HTMLAttributes<HTMLDivElement>, 'class'>;

	let { class: className, children, ...rest }: Props = $props();
</script>

<!-- Cards read as white shapes on the grey canvas; separation is the gap, not a border. -->
<div class={cn('rounded-[var(--radius-card)] bg-card', className)} {...rest}>
	{@render children()}
</div>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		/** The mockup uses dashed rings for navigation affordances. */
		dashed?: boolean;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes, 'class'>;

	let { dashed = false, size = 'md', class: className, children, ...rest }: Props = $props();

	const sizes = { sm: 'size-9', md: 'size-11', lg: 'size-14' };
</script>

<button
	type="button"
	class={cn(
		'inline-grid shrink-0 place-items-center rounded-full border border-hairline',
		'press hover:bg-sunken',
		'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
		'[&_svg]:size-[1.15rem] [&_svg]:stroke-[1.5]',
		dashed && 'border-dashed',
		sizes[size],
		className
	)}
	{...rest}
>
	{@render children()}
</button>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		/** The mockup uses dashed rings for navigation affordances. */
		dashed?: boolean;
		size?: 'sm' | 'md' | 'lg';
		/** Renders a link with the same look — for an icon button that goes somewhere. */
		href?: string;
		class?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes, 'class'>;

	let { dashed = false, size = 'md', href, class: className, children, ...rest }: Props = $props();

	const sizes = { sm: 'size-9', md: 'size-11', lg: 'size-14' };

	const classes = $derived(
		cn(
			'inline-grid shrink-0 place-items-center rounded-full border border-hairline',
			'press hover:bg-sunken',
			'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
			'[&_svg]:size-[1.15rem] [&_svg]:stroke-[1.5]',
			dashed && 'border-dashed',
			sizes[size],
			className
		)
	);
	const linkRest = $derived(rest as HTMLAnchorAttributes);
</script>

{#if href}
	<a {href} class={classes} {...linkRest}>
		{@render children()}
	</a>
{:else}
	<button type="button" class={classes} {...rest}>
		{@render children()}
	</button>
{/if}

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Caret from './Caret.svelte';
	import { cn } from '$lib/utils';

	type Props = {
		/** Appends the mockup's solid triangle, for dropdown-style pills. */
		caret?: boolean;
		size?: 'sm' | 'md';
		class?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes, 'class'>;

	let { caret = false, size = 'md', class: className, children, ...rest }: Props = $props();
</script>

<button
	type="button"
	class={cn(
		'inline-flex items-center gap-2.5 rounded-full border border-hairline bg-transparent',
		'press font-sans whitespace-nowrap hover:bg-sunken',
		'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
		size === 'sm' ? 'h-9 px-4 text-sm' : 'h-11 px-5 text-[0.9375rem]',
		className
	)}
	{...rest}
>
	{@render children()}
	{#if caret}
		<Caret class="shrink-0" />
	{/if}
</button>

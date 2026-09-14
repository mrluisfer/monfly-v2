<script lang="ts" generics="T extends string">
	import { RadioGroup } from 'bits-ui';
	import type { ComponentProps } from 'svelte';
	import { cn } from '$lib/utils';
	import AnimatedIcon from './AnimatedIcon.svelte';

	type Option = {
		value: T;
		label: string;
		/** An animated glyph, in a chip before the label (DESIGN.md → Icons). */
		icon?: Pick<ComponentProps<typeof AnimatedIcon>, 'icon' | 'set'>;
		/** The chip's tint, as the menus' chips wear theirs: `bg-positive/12 text-positive`. */
		chip?: string;
	};

	type Props = {
		/** Two to four short choices, in order. */
		options: Option[];
		/** The chosen option's value. Bind it, or pass it and listen to `onValueChange`. */
		value: T;
		/** Called with each new choice. */
		onValueChange?: (value: T) => void;
		/** Names the group for assistive tech: "This year by". */
		label: string;
		class?: string;
	};

	let { options, value = $bindable(), onValueChange, label, class: className }: Props = $props();

	const at = $derived(
		Math.max(
			0,
			options.findIndex((o) => o.value === value)
		)
	);
</script>

<!--
	A few choices side by side in a sunken capsule. One raised surface slides
	to the chosen one, as the tab strip's does. A radio group: arrow keys move
	the choice.
-->
<RadioGroup.Root
	bind:value={
		() => value,
		(next) => {
			value = next as T;
			onValueChange?.(next as T);
		}
	}
	orientation="horizontal"
	aria-label={label}
	class={cn(
		'relative inline-grid h-9 auto-cols-fr grid-flow-col rounded-full bg-sunken p-0.5',
		className
	)}
	style="--count: {options.length}; --at: {at}"
>
	<span
		aria-hidden="true"
		class="thumb pointer-events-none absolute inset-y-0.5 left-0.5 rounded-full border border-hairline bg-card"
	></span>
	{#each options as option (option.value)}
		<RadioGroup.Item
			value={option.value}
			class={cn(
				'group relative rounded-full px-3 text-sm whitespace-nowrap text-fg-muted transition-colors duration-200',
				'hover:text-fg data-[state=checked]:text-fg',
				'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue'
			)}
		>
			<span class="flex items-center justify-center gap-2">
				{#if option.icon}
					<!-- What the option is, drawn: its colour carries the meaning, so it
					     stays coloured either way and only steps back while unchosen. -->
					<span
						class={cn(
							'grid size-6 shrink-0 place-items-center rounded-md opacity-55 transition-opacity duration-200',
							'group-data-[state=checked]:opacity-100',
							option.chip
						)}
						aria-hidden="true"
					>
						<AnimatedIcon {...option.icon} size={14} />
					</span>
				{/if}
				{option.label}
			</span>
		</RadioGroup.Item>
	{/each}
</RadioGroup.Root>

<style>
	/* The chosen option's surface: one column wide, slid over by its index. */
	.thumb {
		width: calc((100% - 0.25rem) / var(--count));
		translate: calc(var(--at) * 100%) 0;
		transition: translate 0.45s var(--ease-out-quint);
	}
</style>

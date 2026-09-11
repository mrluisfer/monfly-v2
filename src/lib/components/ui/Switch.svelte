<script lang="ts">
	import { Switch } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Props = {
		/** On or off. Bind it, or pass it and listen to `onCheckedChange`. */
		checked: boolean;
		/** Called with each new state. */
		onCheckedChange?: (checked: boolean) => void;
		/** Pairs it with a `<label for>`, which then names it. */
		id?: string;
		/** Names it for assistive tech when no visible label does. */
		label?: string;
		disabled?: boolean;
		class?: string;
	};

	let {
		checked = $bindable(),
		onCheckedChange,
		id,
		label,
		disabled = false,
		class: className
	}: Props = $props();
</script>

<!--
	A hairline capsule, grey when off and blue when on. The thumb springs
	across and lights up — a small gesture, so it may overshoot.
-->
<Switch.Root
	bind:checked={
		() => checked,
		(next) => {
			checked = next;
			onCheckedChange?.(next);
		}
	}
	{id}
	{disabled}
	aria-label={label}
	class={cn(
		'press inline-flex h-6 w-10 shrink-0 items-center rounded-full border border-hairline bg-sunken px-0.5',
		'transition-colors duration-200 data-[state=checked]:bg-blue',
		'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
		'disabled:opacity-50',
		className
	)}
>
	<Switch.Thumb
		class={cn(
			'pointer-events-none block size-[1.125rem] rounded-full border border-hairline bg-card',
			'transition-[translate,background-color] duration-300 ease-[var(--ease-spring)]',
			'data-[state=checked]:translate-x-4 data-[state=checked]:bg-white'
		)}
	/>
</Switch.Root>

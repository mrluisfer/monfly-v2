<script lang="ts">
	import MovingCheck from '@jis3r/icons/icons/check';
	import MovingMinus from '@jis3r/icons/icons/minus';
	import { Checkbox } from 'bits-ui';
	import { cn } from '$lib/utils';
	import AnimatedIcon from './AnimatedIcon.svelte';

	type Props = {
		/** Checked or not. Bind it, or pass it and listen to `onCheckedChange`. */
		checked: boolean;
		/** Some, not all, of what it stands for are checked: it shows a dash. */
		indeterminate?: boolean;
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
		indeterminate = false,
		onCheckedChange,
		id,
		label,
		disabled = false,
		class: className
	}: Props = $props();
</script>

<!--
	A hairline square that fills blue when checked. The check — or the dash,
	for some of a group — springs in: a small gesture, so it may overshoot.
-->
<Checkbox.Root
	bind:checked={
		() => checked,
		(next) => {
			checked = next;
			onCheckedChange?.(next);
		}
	}
	{indeterminate}
	{id}
	{disabled}
	aria-label={label}
	class={cn(
		'press inline-flex size-[1.125rem] shrink-0 items-center justify-center rounded-[0.3125rem] border border-hairline bg-card text-white',
		'transition-colors duration-200 data-[state=checked]:border-blue data-[state=checked]:bg-blue',
		'data-[state=indeterminate]:border-blue data-[state=indeterminate]:bg-blue',
		'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-50',
		className
	)}
>
	{#snippet children({ checked: on, indeterminate: some })}
		<!-- It springs in, and plays as it lands: a mark, so it follows the state
		     rather than the pointer. -->
		<AnimatedIcon
			icon={some ? MovingMinus : MovingCheck}
			set="moving"
			size={14}
			strokeWidth={2.5}
			trigger="none"
			play={on || some}
			class={cn(
				'transition-[opacity,scale] duration-300 ease-[var(--ease-spring)]',
				on || some ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
			)}
		/>
	{/snippet}
</Checkbox.Root>

<script lang="ts">
	import MovingPlus from '@jis3r/icons/icons/plus';
	import { AnimatedIcon } from '$lib/components/ui';
	import { cn } from '$lib/utils';

	/**
	 * The slot beside the loans where the next one goes, as the accounts page's
	 * is: dashed and hatched like a slot still to come, held down in lime —
	 * what's new — while the panel is writing one.
	 */
	type Props = {
		/** The panel is writing a new loan. */
		pressed?: boolean;
		onclick: () => void;
		class?: string;
	};

	let { pressed = false, onclick, class: className }: Props = $props();
</script>

<button
	type="button"
	aria-pressed={pressed}
	{onclick}
	class={cn(
		'group press relative flex min-h-60 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-hairline p-6 text-center',
		'transition-[background-color,border-color] duration-300 hover:bg-card/60',
		'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
		pressed && 'border-solid border-lime/60 bg-lime/15 hover:bg-lime/20 dark:bg-lime/10',
		className
	)}
>
	<span
		class="hatch pointer-events-none absolute inset-0 rounded-[inherit] opacity-60"
		aria-hidden="true"
	></span>
	<!-- Drawn in once as it appears and each time it's pressed down, never under the
	     pointer: the plus writes itself from nothing, and a hover would take it away. -->
	<span
		class={cn(
			'relative grid size-11 place-items-center rounded-full bg-lime/30 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] transition-transform duration-500 ease-[var(--ease-spring)] dark:bg-lime/15 dark:text-lime',
			'group-hover:scale-110',
			pressed && 'rotate-45'
		)}
		aria-hidden="true"
	>
		<AnimatedIcon icon={MovingPlus} set="moving" size={20} trigger="mount" play={pressed} />
	</span>
	<span class="relative">
		<span class="block text-[0.9375rem] font-medium"
			>{pressed ? 'Writing down a loan' : 'Lend or borrow'}</span
		>
		<span class="mt-0.5 block text-sm text-fg-muted">Money that has to come back, either way</span>
	</span>
</button>

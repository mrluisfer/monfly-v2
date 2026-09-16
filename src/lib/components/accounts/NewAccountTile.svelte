<script lang="ts">
	import MovingPlus from '@jis3r/icons/icons/plus';
	import { AnimatedIcon } from '$lib/components/ui';
	import { cn } from '$lib/utils';

	/**
	 * The slot beside the cards where the next one goes: dashed and hatched, as
	 * the income chart's slots still to come are. Pressing it turns the panel
	 * to a new account, and it stays held down in lime — what's new — while the
	 * panel is writing one, as the ledger's _New_ does.
	 */
	type Props = {
		/** The panel is writing a new account. */
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
		'slot group press relative flex min-h-52 flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-hairline p-6 text-center',
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
			>{pressed ? 'Adding an account' : 'Add an account'}</span
		>
		<span class="mt-0.5 block text-sm text-fg-muted">A card, a bank account or cash</span>
	</span>
</button>

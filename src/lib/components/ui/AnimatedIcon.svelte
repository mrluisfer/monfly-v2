<script lang="ts">
	import type { Component } from 'svelte';
	import { cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * A Lucide glyph that moves on its own, from either animated set
	 * (DESIGN.md → Icons), played the one way the design asks: with its control.
	 * It finds the nearest control around it — a button, a link, a menu row,
	 * anything focusable — and plays while that's hovered or focused, so the
	 * caller only places it. Moving Icons plays on its `animate` prop;
	 * Animated Color Icons from CSS under `.al-play` (app.css). Decorative and
	 * out of the pointer's way; still under reduced motion.
	 *
	 * <AnimatedIcon icon={MovingSettings} set="moving" />
	 */
	type Props = {
		/** A glyph from `@jis3r/icons/icons/…` or `@animated-color-icons/lucide-svelte/….svelte`. */
		icon: Component<{ size?: number; strokeWidth?: number; animate?: boolean }>;
		/** Which set it comes from, since the two start their animation differently. */
		set: 'moving' | 'color';
		/** Pixels. A control that sizes its glyphs (`IconButton`) overrides it in CSS. */
		size?: number;
		strokeWidth?: number;
		/**
		 * What plays it. `control`: hover or focus on the nearest control. `mount`:
		 * once, as it appears — the chip heading a popover. `none`: only `play`.
		 */
		trigger?: 'control' | 'mount' | 'none';
		/** Plays while true, whatever the trigger. */
		play?: boolean;
		class?: string;
	};

	let {
		icon: Icon,
		set,
		size = 16,
		strokeWidth = 1.75,
		trigger = 'control',
		play = false,
		class: className
	}: Props = $props();

	/** What counts as a control: what a person points at or tabs to. */
	const CONTROL = 'button, a, [role^="menuitem"], [role="option"], [tabindex]';

	let root = $state<HTMLElement>();
	let engaged = $state(false);
	const still = prefersReducedMotion();
	const playing = $derived(!still && (play || engaged));

	$effect(() => {
		if (!root || trigger === 'none') return;

		if (trigger === 'mount') {
			engaged = true;
			const done = setTimeout(() => (engaged = false), 900);
			return () => clearTimeout(done);
		}

		const control = root.parentElement?.closest<HTMLElement>(CONTROL);
		if (!control) return;
		const on = () => (engaged = true);
		const off = () => (engaged = false);
		control.addEventListener('pointerenter', on);
		control.addEventListener('pointerleave', off);
		control.addEventListener('focusin', on);
		control.addEventListener('focusout', off);
		return () => {
			control.removeEventListener('pointerenter', on);
			control.removeEventListener('pointerleave', off);
			control.removeEventListener('focusin', on);
			control.removeEventListener('focusout', off);
		};
	});
</script>

<span
	bind:this={root}
	class={cn(
		'pointer-events-none inline-flex shrink-0',
		set === 'color' && playing && 'al-play',
		className
	)}
	aria-hidden="true"
>
	{#if set === 'moving'}
		<Icon {size} {strokeWidth} animate={playing} />
	{:else}
		<Icon {size} {strokeWidth} />
	{/if}
</span>

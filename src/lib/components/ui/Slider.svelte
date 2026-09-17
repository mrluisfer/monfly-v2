<script lang="ts">
	import { Slider } from 'bits-ui';
	import { cn } from '$lib/utils';
	import { PALETTE, type PaletteColor } from './palette';

	type Props = {
		/** Where the thumb sits. Bind it, or pass it and listen to `onValueChange`. */
		value: number;
		/** Called with each new value as the thumb moves. */
		onValueChange?: (value: number) => void;
		min?: number;
		max?: number;
		step?: number;
		/**
		 * The value that means "as it is" — 0 on a slider from −50% to +50%. The
		 * fill runs from here to the thumb, whichever side it's on, so the change
		 * reads as a change. Defaults to `min`: a plain fill from the left.
		 */
		origin?: number;
		/** The fill's colour, taken to a glyph's weight on white. */
		color?: PaletteColor;
		/** Names it for assistive tech: "Income". */
		label: string;
		/** The value in words, read out as it moves: "20% less". */
		valueText?: string;
		disabled?: boolean;
		class?: string;
	};

	let {
		value = $bindable(),
		onValueChange,
		min = 0,
		max = 100,
		step = 1,
		origin,
		color = 'blue',
		label,
		valueText,
		disabled = false,
		class: className
	}: Props = $props();

	const at = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
	const from = $derived(at(Math.min(Math.max(origin ?? min, min), max)));
	const to = $derived(at(value));
</script>

<!--
	A thumb on a sunken track, filled from where nothing changes to where the
	thumb is. The thumb swells while it's held — a small gesture, so it may
	overshoot — and the fill follows it. Arrow keys step it; Home and End go to
	either end.
-->
<Slider.Root
	type="single"
	bind:value={
		() => value,
		(next) => {
			value = next;
			onValueChange?.(next);
		}
	}
	{min}
	{max}
	{step}
	{disabled}
	thumbPositioning="exact"
	class={cn(
		'relative flex h-6 touch-none items-center px-2.5 select-none data-disabled:opacity-50',
		className
	)}
>
	<span class="relative h-1.5 w-full rounded-full bg-sunken">
		<!-- Where nothing changes: a hairline tick the fill grows out of. -->
		{#if origin !== undefined && origin > min}
			<span
				class="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-line-strong"
				style="left: {from}%"
				aria-hidden="true"
			></span>
		{/if}
		<span
			class="ink-tint fill absolute inset-y-0 rounded-full"
			style="left: {Math.min(from, to)}%; width: {Math.abs(to - from)}%; --tint: {PALETTE[color]
				.css}"
			aria-hidden="true"
		></span>
		<Slider.Thumb
			index={0}
			aria-label={label}
			aria-valuetext={valueText}
			class={cn(
				// bits-ui places it along the track (`left`, `translate`); the margin centres it across.
				'top-1/2 -mt-2.5 block size-5 cursor-grab rounded-full border border-hairline bg-card shadow-sm',
				'transition-[scale,box-shadow] duration-300 ease-[var(--ease-spring)]',
				'data-active:scale-115 data-active:cursor-grabbing data-active:shadow-md',
				'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue'
			)}
		/>
	</span>
</Slider.Root>

<style>
	.fill {
		background: var(--ink-tint);
	}
</style>

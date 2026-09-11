<script lang="ts">
	import { Popover, RadioGroup } from 'bits-ui';
	import { animate } from 'motion';
	import { pop } from '$lib/transitions';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { PALETTE, PALETTE_COLORS, type PaletteColor } from './palette';

	type Props = {
		/** A palette colour, or `none` for the empty dot that stands for "everything else". */
		color: PaletteColor | 'none';
		/** Blur radius in px — larger orbs read better softer. */
		blur?: number;
		/** How far the colour reaches before fading out, 0–100. */
		spread?: number;
		/**
		 * Lets the person recolour it: the orb becomes a button that opens the
		 * palette. Listen to `onChange` (or bind `color`) to keep the choice.
		 */
		editable?: boolean;
		/** What the colour belongs to, for the button's name: "Main account". */
		label?: string;
		onChange?: (color: PaletteColor) => void;
		/** Why the last choice didn't stick — shown under the palette, so a revert is never silent. */
		error?: string;
		/** Size, and a border when it sits on a surface: `size-7 border border-line bg-card`. */
		class?: string;
	};

	let {
		color = $bindable(),
		blur = 4,
		spread = 78,
		editable = false,
		label,
		onChange,
		error,
		class: className
	}: Props = $props();

	let trigger = $state<HTMLElement>();

	const cssColor = (tone: PaletteColor | 'none') => (tone === 'none' ? 'transparent' : PALETTE[tone].css);

	function choose(next: string) {
		const tone = next as PaletteColor;
		if (tone === color) return;
		color = tone;
		onChange?.(tone);
		// A small spring pop acknowledges the choice while the gradient morphs to it.
		if (trigger && !prefersReducedMotion()) {
			animate(trigger, { scale: [0.86, 1] }, { type: 'spring', bounce: 0.5, duration: 0.5 });
		}
	}
</script>

{#snippet face(tone: PaletteColor | 'none', blurPx: number, reach: number)}
	<span
		aria-hidden="true"
		class="orb"
		style="--orb-color: {cssColor(tone)}; --orb-blur: {blurPx}px; --orb-reach: {reach}%"
	></span>
{/snippet}

{#if editable}
	<Popover.Root>
		<Popover.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					bind:this={trigger}
					type="button"
					aria-label={label ? `Change the color of ${label}` : 'Change color'}
					class={cn(
						'press relative block cursor-pointer overflow-hidden rounded-full',
						'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue',
						className
					)}
				>
					{@render face(color, blur, spread)}
				</button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Portal>
			<!-- Same surface and presence as every floating layer. -->
			<Popover.Content side="bottom" sideOffset={10} forceMount>
				{#snippet child({ props, wrapperProps, open })}
					{#if open}
						<div {...wrapperProps}>
							<div
								{...props}
								in:pop
								out:pop
								class="z-50 origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-3 shadow-lg outline-none"
							>
								<p class="mb-2.5 px-0.5 text-xs text-fg-muted">Color</p>
								<!-- A radio group: arrows move through it, and the orb follows live. -->
								<RadioGroup.Root
									value={color}
									onValueChange={choose}
									orientation="horizontal"
									loop
									aria-label="Color"
									class="grid grid-cols-6 gap-2"
								>
									{#each PALETTE_COLORS as tone (tone)}
										<RadioGroup.Item
											value={tone}
											aria-label={PALETTE[tone].label}
											class={cn(
												'press relative size-8 cursor-pointer rounded-full ring-offset-2 ring-offset-card outline-none',
												'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue',
												'data-[state=checked]:ring-2 data-[state=checked]:ring-fg'
											)}
										>
											<span class="relative block size-full overflow-hidden rounded-full border border-line bg-card">
												{@render face(tone, 2.5, 82)}
											</span>
										</RadioGroup.Item>
									{/each}
								</RadioGroup.Root>
								{#if error}
									<p class="mt-2.5 max-w-60 px-0.5 text-xs text-negative" role="alert">{error}</p>
								{/if}
							</div>
						</div>
					{/if}
				{/snippet}
			</Popover.Content>
		</Popover.Portal>
	</Popover.Root>
{:else}
	<span class={cn('relative block overflow-hidden rounded-full', className)}>
		{@render face(color, blur, spread)}
	</span>
{/if}

<style>
	/* The mockup's blurred sphere: a radial gradient off-centre, fading out. */
	.orb {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			circle at 42% 38%,
			var(--orb-color) 0%,
			color-mix(in oklab, var(--orb-color) 72%, transparent) calc(var(--orb-reach) * 0.55),
			transparent var(--orb-reach)
		);
		filter: blur(var(--orb-blur));
		/* --orb-color is registered in app.css, so a new colour morphs through the gradient. */
		transition: --orb-color 0.45s var(--ease-out-quint);
	}
</style>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Tooltip } from 'bits-ui';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';

	type Side = 'top' | 'right' | 'bottom' | 'left';
	type TriggerProps = Record<string, unknown>;

	type Props = {
		/** A plain-text tip. */
		label?: string;
		/** Rich content in place of `label`: several lines, figures. */
		content?: Snippet;
		side?: Side;
		delay?: number;
		/** Points the tip at this element instead of the trigger — a meter's pin, say. */
		anchor?: HTMLElement | null;
		class?: string;
		/**
		 * Receives the trigger props — spread them onto your own focusable
		 * element. bits-ui renders no wrapper, so no nested-button markup.
		 *
		 * Spread `props` BEFORE your own handlers: it carries bits-ui's own
		 * onclick/onpointerenter, and spreading it last overwrites yours.
		 */
		children: Snippet<[{ props: TriggerProps }]>;
	};

	let {
		label,
		content,
		side = 'top',
		delay = 200,
		anchor = null,
		class: className,
		children
	}: Props = $props();
</script>

<Tooltip.Provider>
	<Tooltip.Root delayDuration={delay}>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@render children({ props })}
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<!-- forceMount hands mounting to the {#if}, so the exit plays before
			     the tip leaves the DOM. It grows from the side facing the anchor. -->
			<Tooltip.Content {side} sideOffset={8} customAnchor={anchor} forceMount>
				{#snippet child({ props, wrapperProps, open })}
					{#if open}
						<div {...wrapperProps}>
							<div
								{...props}
								in:pop
								out:pop
								class={cn(
									'z-50 origin-(--bits-floating-transform-origin) rounded-lg border border-line bg-card px-2.5 py-1.5',
									'text-xs font-medium text-fg shadow-lg',
									className
								)}
							>
								<Tooltip.Arrow class="text-line" />
								{#if content}
									{@render content()}
								{:else}
									{label}
								{/if}
							</div>
						</div>
					{/if}
				{/snippet}
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>

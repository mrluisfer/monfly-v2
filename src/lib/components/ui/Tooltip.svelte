<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Tooltip } from 'bits-ui';
	import { cn } from '$lib/utils';

	type Side = 'top' | 'right' | 'bottom' | 'left';
	type TriggerProps = Record<string, unknown>;

	type Props = {
		label: string;
		side?: Side;
		delay?: number;
		/**
		 * Receives the trigger props — spread them onto your own focusable
		 * element. bits-ui renders no wrapper, so no nested-button markup.
		 *
		 * Spread `props` BEFORE your own handlers: it carries bits-ui's own
		 * onclick/onpointerenter, and spreading it last overwrites yours.
		 */
		children: Snippet<[{ props: TriggerProps }]>;
	};

	let { label, side = 'top', delay = 200, children }: Props = $props();
</script>

<Tooltip.Provider>
	<Tooltip.Root delayDuration={delay}>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				{@render children({ props })}
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				{side}
				sideOffset={8}
				class={cn(
					'z-50 rounded-lg border border-border bg-elevated px-2.5 py-1.5',
					'text-xs font-medium text-fg shadow-lg'
				)}
			>
				<Tooltip.Arrow class="text-border" />
				{label}
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>

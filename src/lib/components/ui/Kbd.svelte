<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		/** Pressed one after another, as in the hotkey registry: `['g', 'p']`. */
		keys: readonly string[];
		class?: string;
	};

	let { keys, class: className }: Props = $props();
</script>

<!-- Keycaps: one per key of the sequence, with a pressed-in bottom edge. -->
<span
	class={cn('inline-flex items-center gap-1', className)}
	aria-label="Shortcut: {keys.join(' then ')}"
>
	{#each keys as key, i (i)}
		<kbd
			aria-hidden="true"
			class="inline-grid h-5 min-w-5 place-items-center rounded-md border border-line bg-sunken px-1 font-sans text-[0.6875rem] font-medium text-fg-muted uppercase shadow-[inset_0_-1px_0_var(--line-strong)]"
		>
			{key}
		</kbd>
	{/each}
</span>

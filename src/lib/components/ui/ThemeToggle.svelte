<script lang="ts">
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import { toggleMode } from 'mode-watcher';
	import IconButton from './IconButton.svelte';
	import Tooltip from './Tooltip.svelte';

	type ClickHandler = ((event: MouseEvent) => void) | undefined;
</script>

<Tooltip label="Toggle theme" side="bottom">
	{#snippet children({ props })}
		<!-- Spread `props` first: bits-ui ships its own onclick, and a later
		     spread would silently overwrite ours. -->
		<IconButton
			{...props}
			class="relative"
			aria-label="Toggle theme"
			onclick={(event: MouseEvent) => {
				(props.onclick as ClickHandler)?.(event);
				toggleMode();
			}}
		>
			<Sun class="rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
			<Moon
				class="absolute rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
			/>
		</IconButton>
	{/snippet}
</Tooltip>

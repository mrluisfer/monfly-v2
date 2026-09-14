<script lang="ts">
	import { AlertDialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import PillButton from './PillButton.svelte';

	/**
	 * The question asked before something can't be taken back. A card over a
	 * dimmed page, the same surface every floating layer wears, with the action
	 * it confirms named on its own button — "Delete", never "OK", so the button
	 * says what pressing it does.
	 *
	 * Controlled: the menu item or button that offers the action opens it, so
	 * there is no trigger here.
	 */
	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		title: string;
		/** One line on what happens — the consequence, not a repeat of the title. */
		description: string;
		/** The confirming button's words: "Delete", "Discard". */
		action: string;
		/** Danger wears `negative`; anything else keeps the plain pill. */
		tone?: 'danger' | 'plain';
		/** True while the action is running: both buttons rest and the label says so. */
		pending?: boolean;
		/** What went wrong, if it did — shown under the description. */
		error?: string | null;
		onConfirm: () => void;
		/** What the question is about: the row's figure and category. */
		children?: Snippet;
	};

	let {
		open,
		onOpenChange,
		title,
		description,
		action,
		tone = 'danger',
		pending = false,
		error = null,
		onConfirm,
		children
	}: Props = $props();
</script>

<AlertDialog.Root bind:open={() => open, onOpenChange}>
	<AlertDialog.Portal>
		<!-- Every floating layer's entrance and exit: forceMount hands mounting to the {#if}. -->
		<AlertDialog.Overlay forceMount>
			{#snippet child({ props, open: shown })}
				{#if shown}
					<div
						{...props}
						transition:fade={{ duration: 180 }}
						class="fixed inset-0 z-50 bg-[color-mix(in_oklab,var(--ink)_45%,transparent)]"
					></div>
				{/if}
			{/snippet}
		</AlertDialog.Overlay>
		<AlertDialog.Content forceMount>
			{#snippet child({ props, open: shown })}
				{#if shown}
					<div
						{...props}
						in:pop={{ scale: 0.94, duration: 0.26 }}
						out:pop={{ scale: 0.94, duration: 0.2 }}
						class="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-chip)] border border-line bg-card p-6 shadow-lg outline-none"
					>
						<AlertDialog.Title class="font-display text-xl font-medium">{title}</AlertDialog.Title>
						<AlertDialog.Description class="mt-2 text-[0.9375rem] leading-relaxed text-fg-muted">
							{description}
						</AlertDialog.Description>

						{#if children}
							<div class="mt-4 rounded-[0.875rem] bg-sunken px-4 py-3">{@render children()}</div>
						{/if}

						{#if error}
							<p class="mt-4 text-sm text-negative" role="alert">{error}</p>
						{/if}

						<div class="mt-6 flex items-center justify-end gap-3">
							<AlertDialog.Cancel>
								{#snippet child({ props: cancel })}
									<PillButton {...cancel} size="sm" disabled={pending}>Cancel</PillButton>
								{/snippet}
							</AlertDialog.Cancel>
							<!-- Not `AlertDialog.Action`: it closes the layer as it fires, and
							     the answer hasn't come back yet. The action closes it itself. -->
							<PillButton
								size="sm"
								disabled={pending}
								onclick={onConfirm}
								class={cn(
									tone === 'danger' &&
										'border-negative/40 bg-negative/10 text-negative hover:bg-negative/18'
								)}
							>
								{pending ? `${action}…` : action}
							</PillButton>
						</div>
					</div>
				{/if}
			{/snippet}
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>

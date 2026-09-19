<script lang="ts" generics="T extends string">
	import { Tabs } from 'bits-ui';
	import { animate } from 'motion';
	import { tick, type Snippet } from 'svelte';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';
	import Card from './Card.svelte';

	type Option = { value: T; label: string };

	type Props = {
		/** Two or three short tabs, in order. */
		options: Option[];
		/** The open tab's value. Bind it, or pass it and listen to `onValueChange`. */
		value: T;
		/** Called with each newly opened tab. */
		onValueChange?: (value: T) => void;
		/** Names the strip for assistive tech: "Tips and loans". */
		label: string;
		/** The open tab's card, drawn with that tab's value. */
		panel: Snippet<[T]>;
		/**
		 * One panel for every tab, drawn with the open tab's value: what's in the
		 * card stays and moves to the next tab's figures, rather than another
		 * panel rising in its place. For tabs that show one thing two ways.
		 */
		shared?: boolean;
		class?: string;
	};

	let {
		options,
		value = $bindable(),
		onValueChange,
		label,
		panel,
		shared = false,
		class: className
	}: Props = $props();

	let strip = $state<HTMLElement>();
	let surface = $state<HTMLElement>();
	let panels = $state<HTMLElement>();

	const at = $derived(
		Math.max(
			0,
			options.findIndex((o) => o.value === value)
		)
	);

	/**
	 * One shared surface carries the open tab's shape and slides between tabs,
	 * as the header's does, rather than each tab lighting up on its own. The
	 * tab arriving turns transparent as it comes, so the surface lands on it.
	 */
	let placed = false;

	function place(animated: boolean) {
		const tab = strip?.querySelectorAll<HTMLElement>('[role="tab"]')[at];
		if (!surface || !tab) return;

		const x = tab.offsetLeft;
		const width = `${tab.offsetWidth}px`;

		if (!animated || prefersReducedMotion()) {
			surface.style.transform = `translateX(${x}px)`;
			surface.style.width = width;
			surface.style.opacity = '1';
			return;
		}

		animate(surface, { x, width, opacity: 1 }, { duration: 0.45, ease: [...EASE_OUT_QUINT] });
	}

	$effect(() => {
		at; // re-place whenever the open tab changes
		place(placed);
		placed = true;
	});

	$effect(() => {
		const replace = () => place(false);
		window.addEventListener('resize', replace);
		return () => window.removeEventListener('resize', replace);
	});

	/*
	 * The card keeps its place; what's in it is what changes, so the new tab's
	 * contents rise into it just behind the surface. bits-ui swaps panels by
	 * marking one active and the other not, so this waits for that, then
	 * animates the panel now open. Not on the first draw — the page's own
	 * reveal has it — and not in a shared panel, whose contents move themselves.
	 */
	let swapped = false;

	$effect(() => {
		value; // the open tab

		if (!swapped || shared) {
			swapped = true;
			return;
		}

		let cancelled = false;
		tick().then(() => {
			const open = panels?.querySelector<HTMLElement>('[role="tabpanel"][data-state="active"]');
			const contents = (open?.firstElementChild as HTMLElement | null) ?? open;
			if (cancelled || !contents) return;

			animate(
				contents,
				prefersReducedMotion() ? { opacity: [0, 1] } : { opacity: [0, 1], y: [10, 0] },
				{ duration: 0.35, ease: [...EASE_OUT_QUINT] }
			);
		});

		return () => {
			cancelled = true;
		};
	});
</script>

{#snippet content(tab: T)}
	<!-- The panel is an ordinary Card. Invisible takes it out of sight, the
	     pointer, the tab order and the accessibility tree, as hidden did. -->
	<Tabs.Content
		value={tab}
		class="col-start-1 row-start-1 min-h-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue data-[state=inactive]:invisible"
	>
		{#snippet child({ props })}
			<Card {...props} hidden={undefined}>
				{@render panel(tab)}
			</Card>
		{/snippet}
	</Tabs.Content>
{/snippet}

<!--
	A card that a small strip of tabs sits on, the header's tabs in miniature:
	the ones you're not on are sunken pills resting above the card, the one you
	are on is card-coloured, a touch taller and square at the foot, so it reads
	as the top edge of the card below it. The strip is inset by the card's own
	radius, where its top edge stops curving — the open tab meets a straight
	edge, with no wedge of canvas under its corner. The card is as tall as its
	tallest panel whichever tab is open, so switching never moves what's around
	it: a panel that should fit the card rather than size it (a long list) lets
	its rows scroll. Shared, there's one panel, drawn with the open tab.
-->
<Tabs.Root
	bind:value={
		() => value,
		(next) => {
			value = next as T;
			onValueChange?.(next as T);
		}
	}
	class={cn('flex flex-col', className)}
>
	<div bind:this={strip} class="relative shrink-0">
		<!-- The open tab's surface: x and width from place() -->
		<div
			bind:this={surface}
			aria-hidden="true"
			style="opacity: 0"
			class="pointer-events-none absolute top-0 left-0 h-10 rounded-t-[var(--radius-chip)] bg-card"
		></div>

		<Tabs.List aria-label={label} class="flex h-10 items-start gap-1.5 pl-6">
			{#each options as option (option.value)}
				<Tabs.Trigger
					value={option.value}
					class={cn(
						'relative z-10 h-9 shrink-0 rounded-[var(--radius-chip)] px-4 text-sm whitespace-nowrap',
						'transition-[height,background-color,color] duration-300',
						'ease-[var(--ease-out-quint)]',
						'bg-sunken text-fg-muted hover:text-fg',
						'data-[state=active]:h-10 data-[state=active]:bg-transparent data-[state=active]:text-fg',
						'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue'
					)}
				>
					{option.label}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>
	</div>

	<!-- Every panel is laid out in the one cell, so the tallest sets the card's
	     height; the ones you're not on are invisible rather than removed. A
	     shared panel follows the open tab instead, and is never swapped out. -->
	<div bind:this={panels} class="grid min-h-0 flex-1 grid-cols-1 grid-rows-1">
		{#if shared}
			{@render content(value)}
		{:else}
			{#each options as option (option.value)}
				{@render content(option.value)}
			{/each}
		{/if}
	</div>
</Tabs.Root>

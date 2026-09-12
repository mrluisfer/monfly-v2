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
		class?: string;
	};

	let {
		options,
		value = $bindable(),
		onValueChange,
		label,
		panel,
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
	 * hiding one and showing the other, so this waits for that, then animates
	 * the panel now open. Not on the first draw — the page's own reveal has it.
	 */
	let swapped = false;

	$effect(() => {
		value; // the open tab

		if (!swapped) {
			swapped = true;
			return;
		}

		let cancelled = false;
		tick().then(() => {
			const open = panels?.querySelector<HTMLElement>('[role="tabpanel"]:not([hidden])');
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

<!--
	A card that a small strip of tabs sits on, the header's tabs in miniature:
	the ones you're not on are sunken pills resting above the card, the one you
	are on is card-coloured, a touch taller and square at the foot, so it reads
	as the top edge of the card below it. The strip is inset by the card's own
	radius, where its top edge stops curving — the open tab meets a straight
	edge, with no wedge of canvas under its corner.
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

	<div bind:this={panels} class="flex min-h-0 flex-1 flex-col">
		{#each options as option (option.value)}
			<!-- The panel is an ordinary Card; bits-ui hides the ones you're not on. -->
			<Tabs.Content
				value={option.value}
				class="min-h-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
			>
				{#snippet child({ props })}
					<Card {...props}>
						{@render panel(option.value)}
					</Card>
				{/snippet}
			</Tabs.Content>
		{/each}
	</div>
</Tabs.Root>

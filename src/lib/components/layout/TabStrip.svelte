<script lang="ts">
	import { page } from '$app/state';
	import { animate } from 'motion';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import { IconButton } from '$lib/components/ui';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';

	/** Browser-style workspace tabs. Static for now — no open/close state yet. */
	const tabs = [
		{ href: '/dashboard', label: 'Overview' },
		{ href: '/transactions', label: 'Transactions' },
		{ href: '/insights', label: 'Insights' }
	];

	// Exact match or a nested path — '/cards' must not match '/cardsomething'.
	const isActive = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);

	const activeIndex = $derived(tabs.findIndex((t) => isActive(t.href)));

	let tabEls = $state<HTMLElement[]>([]);
	let surface = $state<HTMLElement | null>(null);
	let placed = false;

	/**
	 * One shared surface carries the tab shape and slides between tabs, rather
	 * than each tab morphing on its own. That keeps the shoulders — which are
	 * pseudo-elements and so unreachable from JS — intact throughout the move.
	 */
	function place(animated: boolean) {
		if (!surface) return;

		const el = tabEls[activeIndex];
		if (!el) {
			// Routes outside the strip (e.g. /settings) have no active tab.
			surface.style.opacity = '0';
			return;
		}

		const x = el.offsetLeft;
		const width = `${el.offsetWidth}px`;

		if (!animated || prefersReducedMotion()) {
			surface.style.transform = `translateX(${x}px)`;
			surface.style.width = width;
			surface.style.opacity = '1';
			return;
		}

		animate(surface, { x, width, opacity: 1 }, { duration: 0.45, ease: [...EASE_OUT_QUINT] });
	}

	$effect(() => {
		activeIndex; // re-place whenever the route changes
		place(placed);
		placed = true;
	});

	$effect(() => {
		const replace = () => place(false);
		window.addEventListener('resize', replace);
		return () => window.removeEventListener('resize', replace);
	});
</script>

<!-- pl-5 leaves room for the surface's left shoulder to overhang. -->
<div class="relative flex h-full min-w-0 items-center gap-6 pl-5">
	<div
		bind:this={surface}
		aria-hidden="true"
		style="opacity: 0"
		class="tab-merge pointer-events-none absolute top-2.5 bottom-0 left-0 rounded-t-[1.25rem] bg-canvas"
	></div>

	{#each tabs as tab, i (tab.href)}
		{@const active = isActive(tab.href)}
		<a
			bind:this={tabEls[i]}
			href={tab.href}
			aria-current={active ? 'page' : undefined}
			class={cn(
				'group relative z-10 flex h-11 shrink-0 items-center gap-3 px-5',
				'rounded-[var(--radius-chip)] text-[0.9375rem] whitespace-nowrap',
				'transition-[color,background-color] duration-300 ease-[var(--ease-out-quint)]',
				active ? 'bg-transparent text-fg' : 'bg-sunken text-fg-muted hover:text-fg'
			)}
		>
			{tab.label}
			<!-- Always rendered so tab widths stay fixed; a width change mid-slide
			     would reflow the strip and fight the surface animation. -->
			<X
				class={cn(
					'size-3.5 transition-opacity duration-300',
					active ? 'opacity-45 hover:opacity-80' : 'opacity-0 group-hover:opacity-35'
				)}
			/>
		</a>
	{/each}

	<IconButton size="sm" dashed aria-label="New tab" class="ml-1">
		<Plus />
	</IconButton>
</div>

<script lang="ts">
	import { untrack } from 'svelte';
	import gsap from 'gsap';
	import { page } from '$app/state';
	import { animate, scroll } from 'motion';
	import MovingPlus from '@jis3r/icons/icons/plus';
	import MovingX from '@jis3r/icons/icons/x';
	import { AnimatedIcon, IconButton } from '$lib/components/ui';
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

	/*
	 * Scrolled, the page no longer meets the tab above it, so the surface lets
	 * go: it lifts off the header's edge into a box behind the tab (CSS, on
	 * `data-docked`), gives like a drop pulled free (Motion), and a small drop
	 * drips out beneath it to mark the tab you're on (GSAP). Back at the top it
	 * all runs in reverse, a little quicker.
	 */
	let docked = $state(false);
	let settled = $state(false);
	let shape = $state<HTMLElement>();
	let drop = $state<HTMLElement>();
	let drip: gsap.core.Timeline | undefined;

	// Placed as the page already is, scrolled or not, without motion; the
	// transitions take over from the frame after.
	$effect(() => {
		docked = window.scrollY > 24;
		const frame = requestAnimationFrame(() => requestAnimationFrame(() => (settled = true)));
		return () => cancelAnimationFrame(frame);
	});

	// Two thresholds, so a page resting near the top doesn't flicker between shapes.
	$effect(() =>
		scroll((_progress: number, { y }: { y: { current: number } }) => {
			if (!docked && y.current > 24) docked = true;
			else if (docked && y.current < 8) docked = false;
		})
	);

	$effect(() => {
		if (!drop || prefersReducedMotion()) return;
		const timeline = gsap
			.timeline({ paused: true })
			// Out of the box's underside comes a thread of liquid…
			.fromTo(
				drop,
				{ y: -9, scaleX: 0.3, scaleY: 0.3, autoAlpha: 0 },
				{ y: -5, scaleX: 0.45, scaleY: 1.8, autoAlpha: 1, duration: 0.16, ease: 'power2.in' },
				0.14
			)
			// …that lets go and rounds into a drop, wobbling as it settles.
			.to(drop, { y: 0, scaleX: 1, scaleY: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)' }, 0.3);
		if (untrack(() => docked)) timeline.progress(1);
		drip = timeline;
		return () => {
			timeline.kill();
			drip = undefined;
		};
	});

	// Back at the top the drop is drawn in again, quicker than it fell.
	$effect(() => {
		if (docked) drip?.timeScale(1).play();
		else drip?.timeScale(1.5).reverse();
	});

	// Pulling free, the box gives like a drop: squashed a touch, then round.
	$effect(() => {
		if (!docked || !shape || untrack(() => !settled) || prefersReducedMotion()) return;
		animate(
			shape,
			{ scaleY: [0.82, 1], scaleX: [1.05, 1] },
			{ type: 'spring', bounce: 0.5, duration: 0.7, delay: 0.1 }
		);
	});
</script>

<!-- pl-5 leaves room for the surface's left shoulder to overhang. -->
<div class={cn('relative flex h-full min-w-0 items-center gap-6 pl-5', !settled && 'settling')}>
	<!-- The active tab's surface: x and width from place(), its shape from data-docked -->
	<div
		bind:this={surface}
		aria-hidden="true"
		style="opacity: 0"
		data-docked={docked || undefined}
		class="pointer-events-none absolute inset-y-0 left-0"
	>
		<div bind:this={shape} class="tab-merge tab-shape absolute inset-x-0 bg-canvas"></div>
		<span bind:this={drop} class="tab-drop"></span>
	</div>

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
			     would reflow the strip and fight the surface animation.
			     `mount`, not the pointer: this glyph's gesture draws it in from
			     nothing, so playing it on hover would take the ✕ away at the moment
			     the pointer asks for it. Its gesture here is the fade below. -->
			<AnimatedIcon
				icon={MovingX}
				set="moving"
				trigger="mount"
				size={14}
				class={cn(
					'transition-opacity duration-300',
					active ? 'opacity-45 group-hover:opacity-80' : 'opacity-0 group-hover:opacity-35'
				)}
			/>
		</a>
	{/each}

	<IconButton size="sm" dashed aria-label="New tab" class="ml-1">
		<!-- Drawn in once as it appears, never under the pointer: the plus writes
		     itself stroke by stroke from nothing, and on hover that reads as the
		     glyph going missing rather than as a gesture. -->
		<AnimatedIcon icon={MovingPlus} set="moving" trigger="mount" />
	</IconButton>
</div>

<style>
	/*
	 * The active tab's shape. At the top of the page it runs down into the
	 * canvas, a shoulder either side, browser-tab style. Docked it lifts off
	 * into the tab's own rounded box, flat as every surface here, and the
	 * shoulders tuck in. Lifting takes 450 ms; settling back, 340.
	 */
	.tab-shape {
		top: 0.625rem;
		bottom: 0;
		border-radius: 1.25rem 1.25rem 0 0;
		transition:
			top 0.34s var(--ease-out-quint),
			bottom 0.34s var(--ease-out-quint),
			border-radius 0.34s var(--ease-out-quint);
	}

	.tab-shape::before,
	.tab-shape::after {
		transition:
			scale 0.25s var(--ease-out-quint),
			opacity 0.25s var(--ease-out-quint);
	}

	.tab-shape::before {
		transform-origin: 100% 100%;
	}

	.tab-shape::after {
		transform-origin: 0 100%;
	}

	/* The tab's own box: h-11, centred in the h-20 header, and its corners. */
	[data-docked] .tab-shape {
		top: 1.125rem;
		bottom: 1.125rem;
		border-radius: var(--radius-chip);
		transition-duration: 0.45s;
	}

	[data-docked] .tab-shape::before,
	[data-docked] .tab-shape::after {
		scale: 0;
		opacity: 0;
	}

	/* The drop under the docked tab: a teardrop, point up, just let go. GSAP
	   moves this box; the shape inside turns, so a stretch stays vertical. */
	.tab-drop {
		position: absolute;
		top: calc(100% - 0.875rem);
		left: 50%;
		width: 0.5rem;
		height: 0.5rem;
		margin-left: -0.25rem;
		opacity: 0;
	}

	.tab-drop::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 0 50% 50% 50%;
		background: var(--fg);
		rotate: 45deg;
	}

	/* Without GSAP (reduced motion) the drop simply shows. */
	[data-docked] .tab-drop {
		opacity: 1;
	}

	.settling .tab-shape,
	.settling .tab-shape::before,
	.settling .tab-shape::after {
		transition: none;
	}
</style>

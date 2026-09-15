<script lang="ts">
	import { untrack } from 'svelte';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import gsap from 'gsap';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { animate, scroll } from 'motion';
	import MovingPlus from '@jis3r/icons/icons/plus';
	import MovingX from '@jis3r/icons/icons/x';
	import { ShortcutIcon } from '$lib/components/shortcuts';
	import { AnimatedIcon, IconButton } from '$lib/components/ui';
	import { setShortcutMutation, shortcutsQuery } from '$lib/queries';
	import { DEFAULT_SHORTCUTS, SHORTCUTS, inHeader, type Shortcut } from '$lib/shortcuts';
	import { pop } from '$lib/transitions';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * Browser-style tabs for the person's shortcuts, as pinned on /shortcuts and
	 * in the catalog's order: Overview first, unless they took it out.
	 * The plus opens that page; a tab's ✕ takes its shortcut away, on every
	 * device. The app layout seeds the query from the session, so the tabs draw
	 * on the server.
	 */
	const query = createQuery(() => ({
		...shortcutsQuery(),
		enabled: browser && page.data.profile != null
	}));

	// Read the client during setup: Svelte context is out of reach from the
	// mutation's lazily evaluated options.
	const queryClient = useQueryClient();
	const pin = createMutation(() => setShortcutMutation(queryClient));

	const tabs = $derived(
		SHORTCUTS.filter((shortcut) => inHeader(shortcut, query.data ?? DEFAULT_SHORTCUTS))
	);

	// Exact match or a nested path — '/cards' must not match '/cardsomething'.
	const isActive = (href: string) =>
		page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);

	const activeId = $derived(tabs.find((tab) => isActive(tab.href))?.id);

	/** Takes a shortcut out of the header. Closing the tab you're on moves you to the one before it, as a browser does. */
	function close(tab: Shortcut) {
		// A locked tab has no ✕: only its lock on /shortcuts takes it out.
		if (tab.locked) return;
		if (isActive(tab.href)) {
			const at = tabs.findIndex((t) => t.id === tab.id);
			goto(tabs[at - 1]?.href ?? '/dashboard');
		}
		pin.mutate({ id: tab.id, pinned: false });
	}

	let strip = $state<HTMLElement>();
	let surface = $state<HTMLElement | null>(null);
	let placed = false;
	let gliding = false;

	/**
	 * One shared surface carries the tab shape and slides between tabs, rather
	 * than each tab morphing on its own. That keeps the shoulders — which are
	 * pseudo-elements and so unreachable from JS — intact throughout the move.
	 * The tab is looked up rather than bound, so one sliding out of the strip
	 * never stands in for the one that's open.
	 */
	function place(animated: boolean) {
		if (!surface) return;

		const el = strip?.querySelector<HTMLElement>('[data-tab][data-active]');
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

		gliding = true;
		animate(
			surface,
			{ x, width, opacity: 1 },
			{ duration: 0.45, ease: [...EASE_OUT_QUINT] }
		).finished.then(() => (gliding = false));
	}

	$effect(() => {
		activeId; // re-place whenever the open tab changes
		place(placed);
		placed = true;
	});

	// A tab arriving or leaving makes room, so the tabs beside it glide over;
	// the surface rides along with the one it's on, frame by frame, until they
	// settle — except while it's gliding to a new tab on its own.
	$effect(() => {
		tabs; // whenever what's in the strip changes
		if (!untrack(() => placed)) return;
		const until = performance.now() + 700;
		let frame = requestAnimationFrame(function follow() {
			if (!gliding) place(false);
			if (performance.now() < until) frame = requestAnimationFrame(follow);
		});
		return () => cancelAnimationFrame(frame);
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

	const motion = (ms: number) => (prefersReducedMotion() ? 0 : ms);
</script>

<!-- pl-5 leaves room for the surface's left shoulder to overhang. -->
<div
	bind:this={strip}
	class={cn('relative flex h-full min-w-0 items-center pl-5', !settled && 'settling')}
>
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

	{#each tabs as tab (tab.id)}
		{@const active = isActive(tab.href)}
		<!-- The wrapper makes room and carries the gap after the tab, so the gap
		     closes with it instead of snapping shut once it's gone. -->
		<div
			class="shrink-0 pr-6"
			transition:slide={{ axis: 'x', duration: motion(350), easing: quintOut }}
		>
			<div
				data-tab
				data-active={active || undefined}
				class="group relative z-10"
				in:pop={{ scale: 0.9, duration: 0.4, bounce: 0.35 }}
				out:pop={{ scale: 0.9, duration: 0.3 }}
			>
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					class={cn(
						'flex h-11 items-center gap-2.5 pl-4',
						'rounded-[var(--radius-chip)] text-[0.9375rem] whitespace-nowrap',
						'transition-[color,background-color] duration-300 ease-[var(--ease-out-quint)]',
						// The close button sits over the end of the tab, outside the link.
						tab.locked ? 'pr-5' : 'pr-11',
						active ? 'bg-transparent text-fg' : 'bg-sunken text-fg-muted hover:text-fg'
					)}
				>
					<!-- The glyph its card on /shortcuts wears, from the same place. -->
					<ShortcutIcon shortcut={tab} size={16} />
					{tab.label}
				</a>

				{#if !tab.locked}
					<!-- A sibling of the link, not inside it: a button can't nest in an <a>.
					     `mount`, not the pointer: this glyph's gesture draws it in from
					     nothing, so playing it on hover would take the ✕ away at the moment
					     the pointer asks for it. Its gesture here is the fade. -->
					<button
						type="button"
						aria-label="Remove {tab.label} from the header"
						onclick={() => close(tab)}
						class={cn(
							'absolute top-1/2 right-3.5 grid size-6 -translate-y-1/2 place-items-center rounded-full',
							'transition-[opacity,background-color] duration-300 ease-[var(--ease-out-quint)] hover:bg-fg/8',
							'focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-blue',
							active
								? 'opacity-45 hover:opacity-80'
								: 'opacity-0 group-hover:opacity-35 hover:opacity-80 [@media(hover:none)]:opacity-35'
						)}
					>
						<AnimatedIcon icon={MovingX} set="moving" trigger="mount" size={14} />
					</button>
				{/if}
			</div>
		</div>
	{/each}

	<IconButton size="sm" dashed href="/shortcuts" aria-label="Add a shortcut" class="ml-1">
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

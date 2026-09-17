<script lang="ts">
	import { untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import gsap from 'gsap';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { animate, scroll } from 'motion';
	import MovingChevronsUp from '@jis3r/icons/icons/chevrons-up';
	import MovingPlus from '@jis3r/icons/icons/plus';
	import MovingX from '@jis3r/icons/icons/x';
	import Lock from '@lucide/svelte/icons/lock';
	import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
	import { ShortcutIcon } from '$lib/components/shortcuts';
	import { AnimatedIcon, IconButton, Tooltip } from '$lib/components/ui';
	import { setShortcutMutation, setShortcutOrderMutation, shortcutsQuery } from '$lib/queries';
	import { DEFAULT_SHORTCUTS, headerTabs, type Shortcut, type ShortcutId } from '$lib/shortcuts';
	import { pop } from '$lib/transitions';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * Browser-style tabs for the person's shortcuts, as pinned on /shortcuts, in
	 * the order they were pinned or dragged into — one put back comes back at
	 * the end. Overview leads and can't be dragged; asked to move, it shows a
	 * lock instead. The plus opens that page; a tab's ✕ takes its shortcut away,
	 * on every device. The app layout seeds the query from the session, so the
	 * tabs draw on the server.
	 */
	const query = createQuery(() => ({
		...shortcutsQuery(),
		enabled: browser && page.data.profile != null
	}));

	// Read the client during setup: Svelte context is out of reach from the
	// mutation's lazily evaluated options.
	const queryClient = useQueryClient();
	const pin = createMutation(() => setShortcutMutation(queryClient));

	const pinned = $derived(query.data ?? DEFAULT_SHORTCUTS);

	/**
	 * In the order they were pinned or dragged into, not the catalog's — while a
	 * tab is being dragged, in the order the drag has reached.
	 */
	const tabs = $derived.by(() => {
		const settled = headerTabs(pinned);
		if (!arranging) return settled;
		const byId = new Map<string, Shortcut>(settled.map((tab) => [tab.id, tab]));
		return arranging.flatMap((id) => byId.get(id) ?? []);
	});

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
		pin.mutate({ id: tab.id, pinned: false, source: 'header' });
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
		// While a tab is carried the surface has nothing steady to sit under: it
		// reads `offsetLeft`, which a transform doesn't move, so it would hang
		// back while its tab left. It stands down for the drag instead.
		if (!surface || carrying) return;

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

	// Taken hold of, the shape steps aside; let go, it finds its tab again once
	// the strip has settled into the new order.
	$effect(() => {
		if (!surface) return;
		if (carrying) animate(surface, { opacity: 0 }, { duration: 0.18 });
		else if (placed) place(false);
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

	// ── Dragging a tab into place ────────────────────────────────────────

	/*
	 * A tab is carried by the pointer while the others glide out of its way
	 * (Svelte's flip, on the slot each tab sits in). The carried tab's own
	 * transform goes on the box inside that slot, so the two never write the
	 * same property. Dropped, it springs into the slot it reached (Motion) and
	 * the new order is written. Overview is home: it leads, and stays there.
	 */
	const arrange = createMutation(() => setShortcutOrderMutation(queryClient));

	/** Ids in the order the strip is showing, while a drag is in flight. */
	let arranging = $state<string[] | null>(null);
	let carrying = $state<string | null>(null);
	/** Let go, and springing back into its slot: it still carries the transform. */
	let settling = $state<string | null>(null);
	/** How far the carried tab is from its slot, in px. */
	let carried = $state(0);
	/** The tab that just refused to move. Its glyph turns to a lock and shakes. */
	let refused = $state<string | null>(null);
	let refusal: ReturnType<typeof setTimeout> | undefined;

	/** A tab is in hand: the strip says so rather than letting it look like a glitch. */
	const rearranging = $derived(carrying !== null);

	/** Enough travel to mean it, so a press that drifts still opens the tab. */
	const GRIP = 4;
	/** How near the scroller's edge a carried tab starts pulling the strip along, in px. */
	const EDGE = 56;
	/** How fast it pulls there, in px a frame, at the very edge. */
	const PULL = 16;
	/** How long a finger holds still before it's carrying rather than scrolling. */
	const HOLD = 400;

	function refuse(id: string) {
		clearTimeout(refusal);
		refused = id;
		refusal = setTimeout(() => (refused = null), 900);
	}

	function grab(event: PointerEvent, tab: Shortcut) {
		// The ✕ is a button of its own, and only the primary button drags.
		if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return;

		const slot = (event.currentTarget as HTMLElement).closest<HTMLElement>('[data-slot]');
		if (!slot) return;

		const startX = event.clientX;
		let carrying_ = false;

		/*
		 * The strip is measured once, here, and never again while the tab is
		 * carried. Mid-flight those measurements would lie: `flip` puts each slot
		 * in its new place in the DOM and then transforms it back to where it
		 * was, so a rect read during the glide is the old position under the new
		 * order. Reading them per move had the drag reorder against stale numbers
		 * and reorder again on the result — the page stopped responding. From
		 * widths alone every position is arithmetic, and the order the pointer
		 * asks for is the same every time it asks from the same place.
		 */
		const laid = [...(strip?.querySelectorAll<HTMLElement>('[data-slot]') ?? [])].map((el) => ({
			id: el.dataset.slot ?? '',
			width: el.getBoundingClientRect().width
		}));
		const first = strip?.querySelector<HTMLElement>('[data-slot]');
		const home = laid.findIndex((s) => s.id === tab.id);
		if (!first || home < 0) return;
		/** Where the row of slots begins; every other position follows from the widths. */
		const origin = first.getBoundingClientRect().left;

		// The strip sits in a scroller (TopBar), and a wheel or trackpad can move
		// it mid-drag. The widths don't change with it, only where the row starts,
		// so the scroll it has taken since is all that's read again.
		const scroller = strip?.parentElement ?? null;
		const scrolled = scroller?.scrollLeft ?? 0;
		/** How far the row has slid since, so the tab stays with the pointer and not with it. */
		const shifted = () => (scroller?.scrollLeft ?? 0) - scrolled;

		/** Overview leads, so nothing is carried ahead of it. */
		const floor = laid[0]?.id === tabs[0]?.id && tabs[0]?.locked ? 1 : 0;
		const widthOf = new Map(laid.map((s) => [s.id, s.width]));
		/** How far into the row a slot starts — no gaps of the row's own. */
		const offsetIn = (order: string[], id: string) => {
			let x = 0;
			for (const other of order) {
				if (other === id) break;
				x += widthOf.get(other) ?? 0;
			}
			return x;
		};
		const order0 = laid.map((s) => s.id);
		const homeOffset = offsetIn(order0, tab.id);

		/*
		 * A finger has to ask. The strip is what scrolls sideways on a phone
		 * (TopBar wraps it in overflow-x-auto) and the tabs are all there is to
		 * touch, so a sideways swipe can't mean both things: `touch-action` that
		 * gave the drag its movement would take the strip's scroll away. Held
		 * still instead, the press means to carry — and until it does, every
		 * touch scrolls as it always did. A pointer that can hover says it with
		 * the 4 px it travels.
		 */
		const byTouch = event.pointerType === 'touch';
		let asked = !byTouch;
		let holding: ReturnType<typeof setTimeout> | undefined;

		// `touch-action` is read when the gesture starts, so it can't call off a
		// scroll already under way: while carrying, the move itself is refused.
		const hold = (touch: TouchEvent) => touch.preventDefault();

		/** The pointer's last word, for the frames the edge pulls without it moving. */
		let atX = startX;
		let pulling: number | undefined;

		/**
		 * Carried to the edge of the scroller, the strip comes along — the tabs
		 * out of sight are reachable without letting go. It pulls harder the
		 * closer to the edge, and only while the scroller still has somewhere to
		 * go; each frame it moves, the tab is asked where it is again.
		 */
		function pull() {
			pulling = requestAnimationFrame(pull);
			if (!scroller || !carrying_) return;

			const box = scroller.getBoundingClientRect();
			const past =
				atX < box.left + EDGE
					? atX - (box.left + EDGE)
					: atX > box.right - EDGE
						? atX - (box.right - EDGE)
						: 0;
			if (past === 0) return;

			const was = scroller.scrollLeft;
			scroller.scrollLeft = was + Math.max(-1, Math.min(1, past / EDGE)) * PULL;
			if (scroller.scrollLeft !== was) reachFor(atX);
		}

		function take() {
			if (tab.locked) {
				refuse(tab.id);
				release();
				return;
			}
			carrying_ = true;
			carrying = tab.id;
			arranging = tabs.map((t) => t.id);
			if (byTouch) window.addEventListener('touchmove', hold, { passive: false });
			pulling = requestAnimationFrame(pull);
		}

		if (byTouch) {
			holding = setTimeout(() => {
				asked = true;
				take();
			}, HOLD);
		}

		function follow(move: PointerEvent) {
			atX = move.clientX;
			if (!asked) {
				// Moved before the hold was up: that was a scroll, and it keeps it.
				if (Math.abs(move.clientX - startX) > GRIP) release();
				return;
			}
			if (!carrying_) {
				if (Math.abs(move.clientX - startX) < GRIP) return;
				take();
				if (!carrying_) return;
			}
			reachFor(move.clientX);
		}

		/**
		 * Where the pointer has carried the tab, worked out from the strip as it
		 * was: the order is always the one it left with, with this tab moved to
		 * whichever slot its middle has reached. Asking twice from the same place
		 * gives the same answer, so nothing can thrash.
		 */
		function reachFor(clientX: number) {
			const shift = shifted();
			const travelled = clientX - startX;
			// Where the tab is on screen: with the pointer, wherever the row has got to.
			const middle = origin + homeOffset + travelled + laid[home].width / 2;

			let to = home;
			// The row itself has moved by whatever it scrolled, so its slots have.
			let edge = origin - shift;
			for (const [at, slot] of laid.entries()) {
				const centre = edge + slot.width / 2;
				edge += slot.width;
				if (at === home) continue;
				if (at < home && middle < centre) to = Math.min(to, at);
				else if (at > home && middle > centre) to = Math.max(to, at);
			}
			to = Math.max(floor, to);

			const next = [...order0];
			next.splice(to, 0, ...next.splice(home, 1));
			if (arranging?.join() !== next.join()) arranging = next;
			// The transform is measured from the slot it now holds — which is not
			// the one it set out from, and has scrolled since — to where the
			// pointer is holding it.
			carried = homeOffset + travelled + shift - offsetIn(next, tab.id);
		}

		function release() {
			clearTimeout(holding);
			if (pulling !== undefined) cancelAnimationFrame(pulling);
			window.removeEventListener('pointermove', follow);
			window.removeEventListener('pointerup', release);
			window.removeEventListener('pointercancel', release);
			window.removeEventListener('touchmove', hold);
			if (carrying_) land();
		}

		window.addEventListener('pointermove', follow);
		window.addEventListener('pointerup', release);
		window.addEventListener('pointercancel', release);
	}

	async function land() {
		const order = arranging;
		const held = carrying;
		if (!held) return;

		// Let go of the lift first — it eases off in CSS — while the travel is
		// still ours to animate. `settling` keeps the transform after the hold
		// ends, so the tab springs into its slot instead of snapping to it.
		settling = held;
		carrying = null;

		if (order) {
			// The strip is already showing this order; the query takes it over. The
			// drag's copy is let go only once that has happened — `onMutate` is
			// async, so clearing it on the next line would drop the strip back to
			// the old order for the frames until the optimistic write lands. On a
			// refusal the same wait shows the rollback instead.
			arrange
				.mutateAsync(order as ShortcutId[])
				.catch(() => {})
				.finally(() => (arranging = null));
		}

		const from = carried;
		if (from !== 0 && !prefersReducedMotion()) {
			// One writer for the transform: the tween moves the state, the style
			// follows it. Motion on the element itself would fight the binding.
			await animate(from, 0, {
				type: 'spring',
				bounce: 0.35,
				duration: 0.45,
				onUpdate: (value) => (carried = value)
			}).finished;
		}
		carried = 0;
		settling = null;
	}

	$effect(() => () => clearTimeout(refusal));

	/**
	 * Back to the top, the way the page would have come. `docked` already says
	 * the page has been scrolled — the same two thresholds the box lifts on —
	 * so the button comes and goes with it rather than watching the scroll again.
	 */
	function toTop() {
		if (prefersReducedMotion()) {
			window.scrollTo({ top: 0 });
			return;
		}
		gsap.registerPlugin(ScrollToPlugin);
		gsap.to(window, { scrollTo: 0, duration: 0.7, ease: 'power3.inOut' });
	}
</script>

<!-- pl-5 leaves room for the surface's left shoulder to overhang. -->
<div
	bind:this={strip}
	class={cn(
		'relative flex h-full min-w-0 items-center pl-5',
		!settled && 'settling',
		// The whole row is in hand, not just the tab under the pointer.
		rearranging && 'cursor-grabbing'
	)}
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
		<!-- The slot, not the box inside it, carries the stacking: each slot gets a
		     transform while it glides, and a transform is a stacking context, so a
		     z-index within one only competes inside it — the tabs after it in the
		     DOM would paint over the one being carried.
		     The carried tab's own slot doesn't glide (duration 0): its travel is
		     already the pointer's, and animating the slot under it as well made the
		     tab jump the width of the swap and slide back — the blink at the moment
		     two tabs crossed. Only the tabs making way move. -->
		<div
			data-slot={tab.id}
			class={cn('shrink-0 pr-6', carrying === tab.id || settling === tab.id ? 'relative z-30' : '')}
			animate:flip={{ duration: carrying === tab.id ? 0 : motion(320), easing: quintOut }}
			transition:slide={{ axis: 'x', duration: motion(350), easing: quintOut }}
		>
			<div
				data-tab
				data-carry={tab.id}
				data-active={active || undefined}
				class="group relative"
				style={carrying === tab.id || settling === tab.id
					? `transform: translateX(${carried}px)`
					: undefined}
				in:pop={{ scale: 0.9, duration: 0.4, bounce: 0.35 }}
				out:pop={{ scale: 0.9, duration: 0.3 }}
			>
				<a
					href={tab.href}
					aria-current={active ? 'page' : undefined}
					onpointerdown={(event) => grab(event, tab)}
					ondragstart={(event) => event.preventDefault()}
					class={cn(
						'flex h-11 items-center gap-2.5 pl-4',
						'rounded-[var(--radius-chip)] text-[0.9375rem] whitespace-nowrap',
						'transition-[color,background-color,scale,box-shadow,opacity] duration-300 ease-[var(--ease-out-quint)]',
						// The close button sits over the end of the tab, outside the link.
						tab.locked ? 'pr-5' : 'pr-11',
						active ? 'bg-transparent text-fg' : 'bg-sunken text-fg-muted hover:text-fg',
						// While one is in hand the strip reads as being arranged rather than
						// used: the rest fall back so the tab being moved is the subject, and
						// the active tab wears the same chip as the others, because its
						// browser-tab shape has stood down for the drag.
						rearranging && carrying !== tab.id && 'bg-sunken opacity-45',
						// Carried, it lifts off the strip and the finger stops reaching the
						// scroller under it. The lift eases off on release — that transition —
						// while the travel springs home. A click ending a drag is not a click.
						carrying === tab.id && 'pointer-events-none scale-[1.03] touch-none shadow-lg',
						settling === tab.id && 'pointer-events-none',
						!tab.locked && 'cursor-grab select-none',
						carrying === tab.id && 'cursor-grabbing'
					)}
				>
					<!-- The glyph its card on /shortcuts wears, from the same place —
					     until Overview is asked to move, when a lock takes its place
					     and shakes its head. Ours, in CSS: no set draws that. -->
					{#if refused === tab.id}
						<span class="refusing grid size-4 shrink-0 place-items-center" aria-hidden="true">
							<Lock class="size-4 stroke-[1.75]" />
						</span>
					{:else}
						<ShortcutIcon shortcut={tab} size={16} />
					{/if}
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
								: 'opacity-0 group-hover:opacity-35 hover:opacity-80 [@media(hover:none)]:opacity-35',
							// Out of the way while the strip is being arranged: this is not
							// the moment to offer taking a tab away.
							rearranging && 'pointer-events-none !opacity-0'
						)}
					>
						<AnimatedIcon icon={MovingX} set="moving" trigger="mount" size={14} />
					</button>
				{/if}
			</div>
		</div>
	{/each}

	<!-- The strip's own buttons, set apart from the tabs and from each other:
	     two rings this size sitting close invite the wrong one. -->
	<div class="ml-2 flex items-center gap-2.5">
		<IconButton size="sm" dashed href="/shortcuts" aria-label="Add a shortcut">
			<!-- Drawn in once as it appears, never under the pointer: the plus writes
			     itself stroke by stroke from nothing, and on hover that reads as the
			     glyph going missing rather than as a gesture. -->
			<AnimatedIcon icon={MovingPlus} set="moving" trigger="mount" />
		</IconButton>

		<!-- Only once there's a page behind you to go back up. Dashed until pointed
		     at, so it offers itself without competing with the tabs beside it. -->
		{#if docked}
			<div
				in:pop={{ scale: 0.6, bounce: 0.4, duration: 0.4 }}
				out:pop={{ scale: 0.6, duration: 0.3 }}
			>
				<Tooltip label="Back to top">
					{#snippet children({ props })}
						<IconButton
							size="sm"
							dashed="until-hover"
							aria-label="Back to top"
							{...props}
							onclick={toTop}
						>
							<AnimatedIcon icon={MovingChevronsUp} set="moving" />
						</IconButton>
					{/snippet}
				</Tooltip>
			</div>
		{/if}
	</div>
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

	/* Overview, asked to move: the lock shakes its head — short, tight, and over
	   before the glyph comes back. Two sets draw a lock; neither shakes it, and
	   the refusal is the gesture, so it's ours, in CSS (DESIGN.md → Icons). */
	.refusing {
		animation: refuse 420ms var(--ease-out-quint) both;
	}

	@keyframes refuse {
		0%,
		100% {
			translate: 0;
		}
		20% {
			translate: -2.5px;
		}
		45% {
			translate: 2px;
		}
		70% {
			translate: -1px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.refusing {
			animation: none;
		}
	}
</style>

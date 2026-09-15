<script lang="ts">
	import ColorInfo from '@animated-color-icons/lucide-svelte/Info.svelte';
	import X from '@lucide/svelte/icons/x';
	import gsap from 'gsap';
	import { animate } from 'motion';
	import { untrack, type Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';
	import AnimatedIcon from './AnimatedIcon.svelte';
	import IconButton from './IconButton.svelte';
	import { PALETTE, type PaletteColor } from './palette';

	/**
	 * Something worth knowing once: a note in a pastel, an animated glyph at its
	 * head, a title and a line or two under it, and a ✕ that puts it away for
	 * good. Put away, it is remembered in this browser under
	 * `monfly:notice:<id>` and never shows there again (README → Data flow).
	 * `role="note"`: it explains, it doesn't interrupt as an alert would.
	 *
	 * It reads that memory as it mounts, so it belongs in what mounts in the
	 * browser — a panel, a popover. On the server nothing is known, and nothing
	 * is drawn.
	 *
	 * <Notice id="new-transaction" title="Adding a transaction">…</Notice>
	 */
	type Props = {
		/** What it is remembered by once put away. A new id shows it again. */
		id: string;
		title: string;
		/** A palette pastel. Sky by default: something to know, not to do. */
		color?: PaletteColor;
		/** The note under the title. */
		children: Snippet;
		/** The room around it — spacing goes here, and closes with it. */
		class?: string;
	};

	let { id, title, color = 'sky', children, class: className }: Props = $props();

	const uid = $props.id();
	const key = $derived(`monfly:notice:${id}`);

	/** Put away before, in this browser. With storage off or blocked, never: it shows. */
	function putAway(at: string) {
		try {
			return localStorage.getItem(at) === 'dismissed';
		} catch {
			return false;
		}
	}

	// Read once, as it mounts — synchronously, so whatever holds it measures it
	// in from the first frame rather than having it grow in a beat later.
	let shown = $state(untrack(() => browser && !putAway(key)));

	let box = $state<HTMLElement>();

	/**
	 * As it appears: the box fades and rises and its glyph springs in (Motion),
	 * and its title and note rise after it (GSAP). Its height isn't eased in: it
	 * arrives with whatever holds it, which is easing its own, and two eases
	 * would fight. Held at nothing first, since Motion's first keyframe can land
	 * a frame late.
	 */
	function arrive(node: HTMLElement) {
		if (prefersReducedMotion()) return;
		const words = node.querySelectorAll('[data-word]');
		const glyph = node.querySelector('[data-glyph]');

		node.style.opacity = '0';
		animate(
			node,
			{ opacity: [0, 1], y: [6, 0], scale: [0.98, 1] },
			{ duration: 0.4, ease: EASE_OUT_QUINT }
		)
			.finished.then(() => (node.style.opacity = ''))
			.catch(() => {});
		if (glyph) {
			animate(
				glyph,
				{ scale: [0.4, 1], rotate: [-20, 0] },
				{ type: 'spring', bounce: 0.5, duration: 0.5 }
			);
		}
		gsap.fromTo(
			words,
			{ opacity: 0, y: 6 },
			{ opacity: 1, y: 0, duration: 0.4, ease: 'power3.out', stagger: 0.06, delay: 0.08 }
		);

		return { destroy: () => gsap.killTweensOf(words) };
	}

	/**
	 * Put away for good — remembered first, so a reload mid-exit already knows.
	 * The title, note, glyph and ✕ drop away (GSAP), then the box closes its
	 * height and fades (Motion), so what's below glides up, and it leaves.
	 */
	async function dismiss() {
		try {
			localStorage.setItem(key, 'dismissed');
		} catch {
			// Storage off: it goes for this visit only.
		}

		const node = box;
		if (!node || prefersReducedMotion()) {
			shown = false;
			return;
		}

		const parts = node.querySelectorAll('[data-word], [data-glyph], [data-close]');
		gsap.killTweensOf(parts);
		await gsap.to(parts, { opacity: 0, y: -4, duration: 0.18, ease: 'power2.in', stagger: 0.03 });
		node.style.overflow = 'hidden';
		await animate(
			node,
			{ height: [`${node.offsetHeight}px`, '0px'], opacity: [1, 0] },
			{ duration: 0.34, ease: EASE_OUT_QUINT }
		).finished.catch(() => {});
		shown = false;
	}
</script>

{#if shown}
	<!-- `flow-root`, so the room the caller gives it sits inside the box that
	     closes, rather than a margin left behind to snap shut. -->
	<div bind:this={box} use:arrive class="flow-root" style="--tint: {PALETTE[color].css}">
		<div class={className}>
			<div
				role="note"
				aria-labelledby="{uid}-title"
				class="notice flex items-start gap-3 rounded-[var(--radius-chip)] border py-3 pr-2 pl-3"
			>
				<span
					data-glyph
					class="chip grid size-7 shrink-0 place-items-center rounded-lg"
					aria-hidden="true"
				>
					<AnimatedIcon icon={ColorInfo} set="color" trigger="mount" />
				</span>
				<div class="min-w-0 flex-1 pt-1">
					<p id="{uid}-title" data-word class="title text-[0.9375rem] leading-snug font-medium">
						{title}
					</p>
					<div data-word class="mt-1 text-sm leading-relaxed text-fg-muted">
						{@render children()}
					</div>
				</div>
				<span data-close class="flex">
					<!-- The ✕ every close wears, rim and all, so it reads as one. -->
					<IconButton size="sm" aria-label="Dismiss: {title}" onclick={dismiss}>
						<X />
					</IconButton>
				</span>
			</div>
		</div>
	</div>
{/if}

<style>
	/* The pastel mixed onto the card and rimmed a step deeper — solid, so
	   nothing under it shows through — as a narrowing pill wears its tint. */
	.notice {
		background: color-mix(in oklab, var(--tint) 16%, var(--color-card));
		border-color: color-mix(in oklab, var(--tint) 50%, var(--color-card));
	}

	/* Its glyph's chip and its title: the pastel taken down to a weight that
	   reads on it, as the ledger tools' chips take theirs. On dark the pastel is
	   light enough to be the colour itself. */
	.chip {
		background: color-mix(in oklab, var(--tint) 35%, var(--color-card));
		color: oklch(from var(--tint) 0.5 calc(c * 1.7) h);
	}

	.title {
		color: oklch(from var(--tint) 0.42 calc(c * 1.6) h);
	}

	:global(.dark) .chip,
	:global(.dark) .title {
		color: var(--tint);
	}
</style>

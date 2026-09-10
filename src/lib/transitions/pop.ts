import { animate } from 'motion';
import type { TransitionConfig } from 'svelte/transition';
import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

export type PopParams = {
	/** The scale it grows from, and shrinks back to. */
	scale?: number;
	/** Pixels it slides in from along x, and back out to. */
	x?: number;
	/** Seconds to appear; leaving takes three quarters of it. */
	duration?: number;
	/** Spring bounce for the entrance, 0–1. 0 keeps the plain ease-out. */
	bounce?: number;
};

/**
 * Svelte transition animated by Motion, for things that pop in and out —
 * tooltips and popovers, or a button that comes and goes. Svelte keeps the
 * node mounted for the returned duration, so the exit plays in full; Motion
 * runs the animation on the Web Animations API. It grows from the node's
 * `transform-origin`. Opacity only under reduced motion. Use as
 * `in:pop out:pop`, not `transition:pop` — the direction picks the animation.
 */
export function pop(
	node: HTMLElement,
	{ scale = 0.96, x = 0, duration = 0.18, bounce = 0 }: PopParams = {},
	options?: { direction?: 'in' | 'out' | 'both' }
): TransitionConfig {
	const entering = options?.direction !== 'out';
	const seconds = entering ? duration : duration * 0.75;
	const still = prefersReducedMotion();

	// Leaving animates from wherever the node is, so an exit that interrupts
	// an entrance doesn't jump.
	animate(
		node,
		entering
			? { opacity: [0, 1], scale: still ? 1 : [scale, 1], x: still ? 0 : [x, 0] }
			: { opacity: 0, scale: still ? 1 : scale, x: still ? 0 : x },
		entering && bounce > 0 && !still
			? { type: 'spring', bounce, duration: seconds }
			: { duration: seconds, ease: EASE_OUT_QUINT }
	);

	return { duration: seconds * 1000 };
}

import type { Action } from 'svelte/action';
import { animate, inView } from 'motion';
import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

export type RevealParams = {
	/** Vertical travel in px. Negative values fall from above. */
	y?: number;
	delay?: number;
	duration?: number;
	/** Replay every time the element re-enters the viewport. */
	repeat?: boolean;
	/** Portion of the element that must be visible to trigger. */
	amount?: 'some' | 'all' | number;
};

/**
 * Scroll-triggered entrance, powered by Motion's `inView`.
 * Respects prefers-reduced-motion by rendering the final state immediately.
 *
 * <div use:reveal={{ delay: 0.1 }}>…</div>
 */
export const reveal: Action<HTMLElement, RevealParams | undefined> = (node, params) => {
	const opts = { y: 16, delay: 0, duration: 0.6, repeat: false, amount: 0.25, ...params };

	if (prefersReducedMotion()) return {};

	node.style.opacity = '0';

	// A share of the element is only ever in view if the element fits: a column
	// four times the viewport can never show a quarter of itself, so the
	// entrance would never run and the content would sit at opacity 0 for good.
	// Anything that tall enters as soon as any of it arrives.
	const amount =
		typeof opts.amount === 'number' && node.offsetHeight * opts.amount > window.innerHeight
			? 'some'
			: opts.amount;

	const stop = inView(
		node,
		(element) => {
			const target = element as HTMLElement;
			target.style.willChange = 'opacity, transform';

			animate(
				target,
				{ opacity: [0, 1], y: [opts.y, 0] },
				{ duration: opts.duration, delay: opts.delay, ease: [...EASE_OUT_QUINT] }
			).finished.then(() => {
				target.style.willChange = '';
			});

			// Returning a handler makes Motion re-run the callback on re-entry.
			if (opts.repeat) {
				return () => {
					target.style.opacity = '0';
				};
			}
		},
		{ amount }
	);

	return {
		destroy: () => stop()
	};
};

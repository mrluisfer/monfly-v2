import type { Action } from 'svelte/action';
import { animate, hover, press } from 'motion';
import { prefersReducedMotion } from '$lib/utils';

export type SpringParams = {
	/** Scale while hovered. */
	hover?: number;
	/** Scale while pressed. */
	press?: number;
};

/**
 * Springy hover/press feedback through Motion's gesture helpers. Animates
 * scale only (compositor-friendly) and stays still under reduced motion.
 *
 * <button use:spring>…</button>
 */
export const spring: Action<HTMLElement, SpringParams | undefined> = (node, params) => {
	if (prefersReducedMotion()) return {};

	const { hover: hovered = 1.02, press: pressed = 0.97 } = params ?? {};
	const to = (scale: number) =>
		animate(node, { scale }, { type: 'spring', stiffness: 520, damping: 30 });

	const stopHover = hover(node, () => {
		to(hovered);
		return () => to(1);
	});
	// On release, settle back to the hover scale only if the pointer is still
	// over the element — touch has no hover, so it must return to 1.
	const stopPress = press(node, () => {
		to(pressed);
		return () => to(node.matches(':hover') ? hovered : 1);
	});

	return {
		destroy() {
			stopHover();
			stopPress();
		}
	};
};

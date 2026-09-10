/** Single source of truth for "should we animate at all?". */
export function prefersReducedMotion() {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Matches --ease-out-quint in app.css so CSS, Motion and GSAP agree. */
export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

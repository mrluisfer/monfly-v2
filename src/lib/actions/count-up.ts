import type { Action } from 'svelte/action';
import gsap from 'gsap';
import { prefersReducedMotion } from '$lib/utils';

export type CountUpParams = {
	value: number;
	duration?: number;
	/** Start the tween only once the element scrolls into view. */
	whenVisible?: boolean;
	/** Count up on mount too. Off, the first figure is written as it is and only changes count. */
	initial?: boolean;
	format?: (n: number) => string;
};

/**
 * Tweens a number to `value` with GSAP and writes it into the node.
 * Re-runs whenever `value` changes, easing from the current figure.
 *
 * <span use:countUp={{ value: 12480, format: formatCurrency }}></span>
 */
export const countUp: Action<HTMLElement, CountUpParams> = (node, params) => {
	const counter = { n: 0 };
	let tween: gsap.core.Tween | undefined;
	let observer: IntersectionObserver | undefined;

	// Always in the latest format: a chart's figures shorten when it gets crowded.
	const render = () => {
		const text = (params.format ?? ((n: number) => String(Math.round(n))))(counter.n);
		if (node.textContent !== text) node.textContent = text;
	};

	function run(to: number, duration: number) {
		tween?.kill();

		if (prefersReducedMotion()) {
			counter.n = to;
			render();
			return;
		}

		tween = gsap.to(counter, {
			n: to,
			duration,
			ease: 'power3.out',
			onUpdate: render
		});
	}

	function start(to: number, duration: number) {
		if (!params.whenVisible) {
			run(to, duration);
			return;
		}

		observer?.disconnect();
		observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					run(to, duration);
					observer?.disconnect();
				}
			},
			{ threshold: 0.3 }
		);
		observer.observe(node);
	}

	if (params.initial === false) counter.n = params.value;
	render();
	if (params.initial !== false) start(params.value, params.duration ?? 1.4);

	return {
		update(next: CountUpParams) {
			// Only a new figure is worth a tween. Params are rebuilt on every
			// render of the host, and re-running the count for a figure that
			// hasn't moved re-plays it from wherever it was — the same number
			// counting itself out again, and a tween nobody asked for.
			const moved = next.value !== params.value;
			params = next;
			if (moved) run(next.value, next.duration ?? 0.8);
			// A figure that stays is still rewritten if its format changed.
			else render();
		},
		destroy() {
			tween?.kill();
			observer?.disconnect();
		}
	};
};

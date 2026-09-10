import type { Action } from 'svelte/action';
import gsap from 'gsap';
import { prefersReducedMotion } from '$lib/utils';

export type CountUpParams = {
	value: number;
	duration?: number;
	/** Start the tween only once the element scrolls into view. */
	whenVisible?: boolean;
	format?: (n: number) => string;
};

/**
 * Tweens a number to `value` with GSAP and writes it into the node.
 * Re-runs whenever `value` changes, easing from the current figure.
 *
 * <span use:countUp={{ value: 12480, format: formatCurrency }}></span>
 */
export const countUp: Action<HTMLElement, CountUpParams> = (node, params) => {
	const format = params.format ?? ((n: number) => String(Math.round(n)));
	const counter = { n: 0 };
	let tween: gsap.core.Tween | undefined;
	let observer: IntersectionObserver | undefined;

	const render = () => {
		node.textContent = format(counter.n);
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

	render();
	start(params.value, params.duration ?? 1.4);

	return {
		update(next: CountUpParams) {
			params = next;
			run(next.value, next.duration ?? 0.8);
		},
		destroy() {
			tween?.kill();
			observer?.disconnect();
		}
	};
};

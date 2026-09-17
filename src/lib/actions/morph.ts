import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import type { Action } from 'svelte/action';
import { prefersReducedMotion } from '$lib/utils';

/** A path with a segment in it: a bare `M x,y` has nothing to morph. */
const segment = /[CLHV]/;

/**
 * A line takes its new shape by morphing into it (GSAP MorphSVG) rather than
 * being redrawn — the same series, moved. It starts from whatever the last
 * morph had got to, so a quick second change never jumps.
 *
 * <path d={line} use:morph={line} />
 */
export const morph: Action<SVGPathElement, string> = (node, initial) => {
	let target = initial;
	let drawn = initial;
	return {
		update(next) {
			if (next === target) return;
			const from = drawn;
			target = next;
			gsap.killTweensOf(node);
			// A line of one point — an account added today — is a bare `M x,y`,
			// which MorphSVG reads as a CSS selector and throws on. Only lines
			// with a segment in them morph; anything else simply takes its place.
			if (!segment.test(from) || !segment.test(next) || prefersReducedMotion()) {
				drawn = next;
				node.setAttribute('d', next);
				return;
			}
			gsap.registerPlugin(MorphSVGPlugin);
			gsap.fromTo(
				node,
				{ morphSVG: from },
				{
					morphSVG: next,
					duration: 0.9,
					ease: 'power3.inOut',
					onUpdate: () => {
						drawn = node.getAttribute('d') ?? next;
					},
					onComplete: () => {
						drawn = next;
					}
				}
			);
		},
		destroy: () => gsap.killTweensOf(node)
	};
};

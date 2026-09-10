import type { Action } from 'svelte/action';
import {
	arrow,
	autoUpdate,
	computePosition,
	flip,
	offset,
	shift,
	type Placement
} from '@floating-ui/dom';

export type AnchorParams = {
	/** The element this one is positioned against. */
	reference: HTMLElement;
	placement?: Placement;
	/** Gap between reference and floating element, in px. */
	gap?: number;
	/** Optional arrow element to position along the edge. */
	arrowEl?: HTMLElement;
};

/**
 * Positions the node against a reference element with Floating UI, keeping it
 * in place on scroll/resize via `autoUpdate`. Use for bespoke overlays; the
 * bits-ui primitives already position themselves.
 *
 * <div use:anchor={{ reference: triggerEl, placement: 'top' }}>…</div>
 */
export const anchor: Action<HTMLElement, AnchorParams> = (node, params) => {
	let opts = params;
	let cleanup: (() => void) | undefined;

	async function update() {
		const middleware = [
			offset(opts.gap ?? 8),
			flip({ padding: 8 }),
			shift({ padding: 8 }),
			...(opts.arrowEl ? [arrow({ element: opts.arrowEl, padding: 6 })] : [])
		];

		const position = await computePosition(opts.reference, node, {
			placement: opts.placement ?? 'top',
			strategy: 'absolute',
			middleware
		});

		Object.assign(node.style, {
			position: position.strategy,
			left: `${position.x}px`,
			top: `${position.y}px`
		});

		const arrowData = position.middlewareData.arrow;
		if (opts.arrowEl && arrowData) {
			const staticSide = {
				top: 'bottom',
				right: 'left',
				bottom: 'top',
				left: 'right'
			}[position.placement.split('-')[0]] as string;

			Object.assign(opts.arrowEl.style, {
				position: 'absolute',
				left: arrowData.x != null ? `${arrowData.x}px` : '',
				top: arrowData.y != null ? `${arrowData.y}px` : '',
				[staticSide]: '-4px'
			});
		}
	}

	function attach() {
		cleanup?.();
		cleanup = autoUpdate(opts.reference, node, update);
	}

	attach();

	return {
		update(next: AnchorParams) {
			opts = next;
			attach();
		},
		destroy() {
			cleanup?.();
		}
	};
};

import type { Action } from 'svelte/action';
import { moneyInput } from '$lib/finance';

/**
 * Keeps a field to money as it is typed, and reports what it kept.
 *
 * The filtering has to reach the element itself, not only the state behind it:
 * a rejected character leaves the state exactly as it was, so a component that
 * simply re-renders `value` would write nothing back and the letter would stay
 * on screen — the field and the figure reading from it saying two different
 * things. The caret is put back where the typing left it, less whatever was
 * dropped, so a paste lands cleanly.
 *
 * <input value={amount} use:moneyField={(next) => (amount = next)} />
 */
export const moneyField: Action<HTMLInputElement, (value: string) => void> = (node, report) => {
	let tell = report;

	function filter() {
		const kept = moneyInput(node.value);
		if (kept !== node.value) {
			const at = Math.max(
				0,
				(node.selectionStart ?? kept.length) - (node.value.length - kept.length)
			);
			node.value = kept;
			node.setSelectionRange(at, at);
		}
		tell(kept);
	}

	node.addEventListener('input', filter);

	return {
		update: (next) => (tell = next),
		destroy: () => node.removeEventListener('input', filter)
	};
};

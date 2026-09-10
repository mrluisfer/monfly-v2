import { goto } from '$app/navigation';
import { HOTKEYS, type Hotkey, type HotkeyId } from './registry';

/** How long the next key of a sequence may take before it starts over, in ms. */
const SEQUENCE_TIMEOUT = 900;

function isTyping(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
	);
}

const endsWith = (pressed: string[], keys: readonly string[]) =>
	pressed.length >= keys.length && keys.every((key, i) => pressed[pressed.length - keys.length + i] === key);

/**
 * Listens for every shortcut in `HOTKEYS` on `window` and runs its action —
 * `actions[id]` when given, otherwise navigation to its `href`. Call once,
 * from the app shell; returns the cleanup.
 */
export function bindHotkeys(actions: Partial<Record<HotkeyId, () => void>> = {}): () => void {
	const entries = Object.entries(HOTKEYS) as [HotkeyId, Hotkey][];
	let pressed: string[] = [];
	let timer: ReturnType<typeof setTimeout> | undefined;

	function onKeydown(event: KeyboardEvent) {
		// Leave modified keys to the browser and anything already handled — an
		// open menu's typeahead, say.
		if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTyping(event.target)) return;

		pressed = [...pressed, event.key.toLowerCase()].slice(-3);
		clearTimeout(timer);
		timer = setTimeout(() => (pressed = []), SEQUENCE_TIMEOUT);

		const match = entries.find(([, hotkey]) => endsWith(pressed, hotkey.keys));
		if (!match) return;

		const [id, hotkey] = match;
		event.preventDefault();
		pressed = [];
		const action = actions[id] ?? (hotkey.href ? () => goto(hotkey.href!) : undefined);
		action?.();
	}

	window.addEventListener('keydown', onKeydown);
	return () => {
		window.removeEventListener('keydown', onKeydown);
		clearTimeout(timer);
	};
}

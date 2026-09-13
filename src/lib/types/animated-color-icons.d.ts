/**
 * Animated Color Icons ships its glyphs as Svelte 4 components with no types of
 * their own, so every deep import would be `any`. These are the props each one
 * takes (DESIGN.md → Icons).
 */
declare module '@animated-color-icons/lucide-svelte/*.svelte' {
	import type { Component } from 'svelte';

	const Icon: Component<{
		size?: number;
		color?: string;
		primaryColor?: string;
		secondaryColor?: string;
		strokeWidth?: number;
		className?: string;
		/** Its accessible name; the glyph also carries it as a `<title>`. */
		label?: string;
	}>;
	export default Icon;
}

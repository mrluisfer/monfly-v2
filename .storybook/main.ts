import type { StorybookConfig } from '@storybook/sveltekit';

/**
 * Storybook for Monfly's design system. The SvelteKit framework reads
 * vite.config.ts, so Tailwind, `$lib` and the runes-mode compiler options are
 * the app's own. Stories are Svelte CSF, beside the component they show.
 */
const config: StorybookConfig = {
	stories: ['../src/**/*.stories.svelte'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@storybook/addon-docs',
		'@storybook/addon-a11y',
		// The light and dark toolbar: `.dark` on <html>, as mode-watcher sets it.
		'@storybook/addon-themes',
		// Serves this Storybook to agents at http://localhost:6006/mcp (.mcp.json).
		'@storybook/addon-mcp'
	],
	framework: '@storybook/sveltekit'
};

export default config;

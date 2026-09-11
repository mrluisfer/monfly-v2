/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: true,
	trailingComma: 'none',
	printWidth: 100,
	plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
	overrides: [
		{ files: '*.svelte', options: { parser: 'svelte' } },
		// Tabs in Markdown lists break nesting on GitHub.
		{ files: '*.md', options: { useTabs: false } }
	],
	tailwindStylesheet: './src/app.css'
};

export default config;

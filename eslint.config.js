import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint recommends against no-undef in TypeScript projects:
			// https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			// Monfly is served from the root (no `paths.base`), so resolve() adds nothing.
			'svelte/no-navigation-without-resolve': 'off',
			// Our svelte-ignore comments explain themselves after the code, and this
			// rule reads that explanation as more (unused) codes.
			'svelte/no-unused-svelte-ignore': 'off',
			// {' '} marks a deliberate space between inline elements.
			'svelte/no-useless-mustaches': 'off'
		}
	},
	{
		// Reading state inside $effect is how Svelte tracks it as a dependency.
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		rules: { '@typescript-eslint/no-unused-expressions': 'off' }
	}
);

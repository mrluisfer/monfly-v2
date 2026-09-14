/**
 * Bundles `src/*.js` into the single `code.js` a Figma plugin runs, and injects
 * the Lucide path data read straight out of `node_modules`, so the glyphs in
 * Figma are the ones the app actually ships rather than a copy that drifts.
 *
 *   node tools/figma-design-system/build.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');

/** Every glyph the app imports, from either icon package. */
const ICONS = [
	'arrow-left',
	'arrow-left-right',
	'arrow-right',
	'arrow-up',
	'banknote',
	'bell',
	'calendar-days',
	'car',
	'check',
	'chevron-left',
	'chevron-right',
	'credit-card',
	'eye',
	'gamepad-2',
	'gift',
	'graduation-cap',
	'hand-coins',
	'heart-pulse',
	'house',
	'lock-keyhole',
	'log-out',
	'minus',
	'pencil',
	'piggy-bank',
	'plane',
	'plus',
	'rotate-ccw',
	'search',
	'settings',
	'shirt',
	'shopping-cart',
	'smartphone',
	'star',
	'tag',
	'trending-down',
	'trending-up',
	'utensils-crossed',
	'x',
	'zap'
];

const iconDir = join(repo, 'node_modules', '@lucide', 'svelte', 'dist', 'icons');
const lucide = {};
const missing = [];

for (const name of ICONS) {
	try {
		const src = readFileSync(join(iconDir, `${name}.svelte`), 'utf8');
		const match = src.match(/const iconData = (\{[\s\S]*?\});/);
		if (!match) {
			missing.push(name);
			continue;
		}
		lucide[name] = JSON.parse(match[1])
			.node.map(([tag, attrs]) => {
				const pairs = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`);
				return `<${tag} ${pairs.join(' ')}/>`;
			})
			.join('');
	} catch {
		missing.push(name);
	}
}

if (missing.length) {
	console.error(`Missing from @lucide/svelte: ${missing.join(', ')}`);
	console.error('Run `pnpm install` first, or drop them from ICONS.');
	process.exit(1);
}

const parts = readdirSync(join(here, 'src'))
	.filter((f) => f.endsWith('.js'))
	.sort()
	.map(
		(f) =>
			`// ── ${f} ${'─'.repeat(Math.max(0, 68 - f.length))}\n${readFileSync(join(here, 'src', f), 'utf8')}`
	);

const banner = `/*
 * Monfly v2 — design system builder. GENERATED, do not edit.
 * Source: tools/figma-design-system/src/*.js — rebuild with
 *   node tools/figma-design-system/build.mjs
 */
`;

const icons = `const LUCIDE = ${JSON.stringify(lucide)};\n`;

writeFileSync(join(here, 'code.js'), banner + icons + '\n' + parts.join('\n'));
console.log(
	`code.js written — ${Object.keys(lucide).length} glyphs, ${parts.length} source files.`
);

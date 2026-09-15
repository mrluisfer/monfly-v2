<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { PALETTE, PALETTE_COLORS } from './palette';

	const { Story } = defineMeta({
		title: 'Foundations/Colors',
		parameters: { layout: 'padded' }
	});

	/**
	 * The tokens DESIGN.md lists, by what they're for. Switch the theme to see
	 * both. Each swatch is its utility written out whole: `@theme inline` only
	 * emits a `--color-*` variable that some CSS reads, so `var(--color-…)`
	 * would draw nothing for most of them, and a class put together at runtime
	 * is one Tailwind never sees.
	 */
	const TOKENS = [
		{
			group: 'Brand',
			note: 'Accents; constant in light and dark',
			swatches: [
				{ name: 'blue', class: 'bg-blue' },
				{ name: 'violet', class: 'bg-violet' },
				{ name: 'lime', class: 'bg-lime' },
				{ name: 'ink', class: 'bg-ink' }
			]
		},
		{
			group: 'Surfaces',
			note: '`sunken` for inset chips, inactive tabs, highlights',
			swatches: [
				{ name: 'window', class: 'bg-window' },
				{ name: 'canvas', class: 'bg-canvas' },
				{ name: 'card', class: 'bg-card' },
				{ name: 'sunken', class: 'bg-sunken' }
			]
		},
		{
			group: 'Lines',
			note: '`line` divides; `hairline` outlines controls',
			swatches: [
				{ name: 'line', class: 'bg-line' },
				{ name: 'line-strong', class: 'bg-line-strong' },
				{ name: 'hairline', class: 'bg-hairline' }
			]
		},
		{
			group: 'Text',
			note: 'Body, labels, placeholders and quiet figures',
			swatches: [
				{ name: 'fg', class: 'bg-fg' },
				{ name: 'fg-muted', class: 'bg-fg-muted' },
				{ name: 'fg-subtle', class: 'bg-fg-subtle' }
			]
		},
		{
			group: 'State',
			note: 'Every expense figure wears `spent`, never `negative`',
			swatches: [
				{ name: 'positive', class: 'bg-positive' },
				{ name: 'negative', class: 'bg-negative' },
				{ name: 'spent', class: 'bg-spent' }
			]
		}
	];
</script>

<Story name="Tokens">
	{#snippet template()}
		<div class="grid max-w-4xl gap-10">
			{#each TOKENS as { group, note, swatches } (group)}
				<section>
					<h2 class="font-display text-2xl font-medium">{group}</h2>
					<p class="mt-1 text-[0.9375rem] text-fg-muted">{note}</p>
					<div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
						{#each swatches as swatch (swatch.name)}
							<div class="rounded-[var(--radius-chip)] bg-card p-2">
								<div class="h-16 rounded-lg border border-line {swatch.class}"></div>
								<p class="mt-2 px-1 font-mono text-sm">{swatch.name}</p>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/snippet}
</Story>

<!-- Every colour a person can give something, stored by id. -->
<Story name="Palette">
	{#snippet template()}
		<div class="grid max-w-4xl grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
			{#each PALETTE_COLORS as id (id)}
				<div class="rounded-[var(--radius-chip)] bg-card p-2">
					<div class="h-16 rounded-lg" style="background: {PALETTE[id].css}"></div>
					<p class="mt-2 px-1 text-sm">{PALETTE[id].label}</p>
					<p class="px-1 font-mono text-xs text-fg-muted">{id}</p>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

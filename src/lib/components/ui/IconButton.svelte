<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		/**
		 * The mockup uses dashed rings for navigation affordances. `'until-hover'`
		 * leaves it dashed until you reach for it, then hands back the solid rim.
		 */
		dashed?: boolean | 'until-hover';
		size?: 'sm' | 'md' | 'lg';
		/** Renders a link with the same look — for an icon button that goes somewhere. */
		href?: string;
		class?: string;
		children: Snippet;
	} & Omit<HTMLButtonAttributes, 'class'>;

	let { dashed = false, size = 'md', href, class: className, children, ...rest }: Props = $props();

	const sizes = { sm: 'size-9', md: 'size-11', lg: 'size-14' };

	const classes = $derived(
		cn(
			'icon-button relative inline-grid shrink-0 place-items-center rounded-full border border-hairline',
			'press not-disabled:hover:bg-sunken disabled:border-transparent disabled:text-fg-subtle',
			'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
			'[&_svg]:size-[1.15rem] [&_svg]:stroke-[1.5]',
			dashed === true && 'border-dashed',
			dashed === 'until-hover' && 'firms-up',
			sizes[size],
			className
		)
	);
	const linkRest = $derived(rest as HTMLAnchorAttributes);
</script>

{#if href}
	<a {href} class={classes} {...linkRest}>
		{@render children()}
	</a>
{:else}
	<button type="button" class={classes} {...rest}>
		{@render children()}
	</button>
{/if}

<style>
	/* Disabled, the solid rim gives way to dashes — the ring navigation wears,
	   with nowhere to go — and the glyph steps back. A border's style can't
	   ease, so the dashes are a ring of their own: the rim fades out as they
	   fade in, turning into place. */
	.icon-button::before {
		content: '';
		position: absolute;
		inset: -1px;
		border: 1px dashed var(--color-hairline);
		border-radius: inherit;
		opacity: 0;
		rotate: -45deg;
		pointer-events: none;
		transition:
			opacity 0.3s var(--ease-out-quint),
			rotate 0.6s var(--ease-out-quint);
	}

	.icon-button:disabled::before {
		opacity: 1;
		rotate: 0deg;
	}

	/* Dashed until you reach for it: the same exchange the disabled state makes,
	   run the other way. At rest the rim is transparent and the dashes stand in
	   its place; pointed at or tabbed to, they turn away as the rim comes back. */
	.icon-button.firms-up {
		border-color: transparent;
		transition: border-color 0.3s var(--ease-out-quint);
	}

	.icon-button.firms-up::before {
		opacity: 1;
		rotate: 0deg;
	}

	.icon-button.firms-up:hover,
	.icon-button.firms-up:focus-visible {
		border-color: var(--color-hairline);
	}

	.icon-button.firms-up:hover::before,
	.icon-button.firms-up:focus-visible::before {
		opacity: 0;
		rotate: -45deg;
	}

	@media (prefers-reduced-motion: reduce) {
		.icon-button::before {
			transition: none;
		}

		.icon-button.firms-up {
			transition: none;
		}
	}
</style>

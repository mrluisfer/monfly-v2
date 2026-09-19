<script lang="ts">
	import gsap from 'gsap';
	import { animate, inView, stagger } from 'motion';
	import { categoryColor } from '$lib/categories';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { percent } from '$lib/components/insights/format';
	import { Card, Orb, OrbitRing, PALETTE, Sparkle, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, formatMoneyCompact, monthName, type BudgetMonth } from '$lib/finance';
	import { pop } from '$lib/transitions';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import LimitEditor from './LimitEditor.svelte';
	import { pack } from './pack';

	/**
	 * Where the month's money went, as bubbles: a category each, as big as
	 * what it took — area for amount — packed around the biggest, the long tail
	 * gathered into one hatched bubble. Each is the dashboard's `Orb` in its
	 * `OrbitRing`, neighbours turning opposite ways, with an arc over the ring
	 * for how much of its limit has gone (the alarm's colour past it; none with
	 * no limit). Pressing one sets its limit. Beside them, every bubble in
	 * words; pointing at either lights both. Below the fold they pop in as the
	 * card arrives (Motion), then drift on their own (GSAP), paused off screen;
	 * a new month glides them to their new places and sizes (CSS) as their
	 * rings surge.
	 */
	type Props = {
		month: BudgetMonth;
		categoryChoices?: Record<string, PaletteColor>;
		class?: string;
	};

	let { month, categoryChoices, class: className }: Props = $props();

	/** The most bubbles drawn one to a category; the rest share one. */
	const MOST = 9;
	/** The box's shape, width over height, which the packing spreads to fill. */
	const ASPECT = 1.5;

	const money = (cents: number) => formatMoney(cents, month.currency);
	// Under a thousand the decimal only adds noise ("$968"); past it, it tells two apart ("$1.5k").
	const compact = (cents: number) =>
		formatMoneyCompact(cents, month.currency, { whole: cents < 100_000 });

	type Bubble = {
		id: string;
		name: string;
		spent: number;
		limit: number | null;
		color: PaletteColor | null;
		x: number;
		y: number;
		/** Its width, as a share of the box's. */
		d: number;
	};

	const bubbles = $derived.by((): Bubble[] => {
		const spending = month.categories.filter((c) => c.spent > 0);
		const shown = spending.slice(0, MOST);
		const rest = spending.slice(MOST).reduce((sum, c) => sum + c.spent, 0);
		const items = [
			...shown.map((c) => ({
				id: c.name,
				name: c.name,
				spent: c.spent,
				limit: c.limit,
				color: categoryColor(c.name, categoryChoices)
			})),
			...(rest > 0
				? [{ id: '…rest', name: 'Everything else', spent: rest, limit: null, color: null }]
				: [])
		].sort((a, b) => b.spent - a.spent);
		if (items.length === 0) return [];

		// Area for amount, but never so small a bubble can't be pointed at.
		const biggest = Math.sqrt(items[0].spent);
		const radii = items.map((b) => Math.max(Math.sqrt(b.spent), biggest * 0.3));
		const placed = pack(radii, { gap: biggest * 0.05, aspect: ASPECT });

		const left = Math.min(...placed.map((c) => c.x - c.r));
		const right = Math.max(...placed.map((c) => c.x + c.r));
		const top = Math.min(...placed.map((c) => c.y - c.r));
		const bottom = Math.max(...placed.map((c) => c.y + c.r));
		// Fitted to the box with a little room at its edges, in units of its width.
		const scale = Math.min(0.96 / (right - left), 0.96 / ASPECT / (bottom - top));
		const cx = (left + right) / 2;
		const cy = (top + bottom) / 2;

		return items.map((item, i) => ({
			...item,
			x: 50 + (placed[i].x - cx) * scale * 100,
			y: 50 + (placed[i].y - cy) * scale * ASPECT * 100,
			d: placed[i].r * 2 * scale * 100
		}));
	});

	let lit = $state<string | null>(null);

	let box = $state<HTMLElement>();
	/** The box's width in px — a guess until it's measured, so the server draws something close. */
	let width = $state(600);

	/**
	 * An orb's blur in px: a tenth of its width, as the account blocks' orbs
	 * have — the orb sits inside its ring, 72% of the bubble across.
	 */
	const blurOf = (bubble: Bubble) => Math.max(3, Math.round((bubble.d / 100) * width * 0.72 * 0.1));

	// ── Motion ───────────────────────────────────────────────────────────

	// Below the fold on arrival, the bubbles pop in biggest first as the card
	// comes into view; already on screen, they're simply there.
	$effect(() => {
		if (!box || prefersReducedMotion()) return;
		if (box.getBoundingClientRect().top < window.innerHeight) return;
		const faces = box.querySelectorAll<HTMLElement>('[data-face]');
		faces.forEach((face) => (face.style.scale = '0'));
		return inView(box, () => {
			// Handed back to CSS once landed, so a bubble can still swell under the pointer.
			animate(
				faces,
				{ scale: [0, 1] },
				{ type: 'spring', bounce: 0.45, duration: 0.7, delay: stagger(0.06) }
			).finished.then(() => faces.forEach((face) => (face.style.scale = '')));
		});
	});

	// Each bubble drifts a few pixels on its own beat, and all of them stop
	// while the card is off screen.
	$effect(() => {
		void bubbles.length;
		if (!box || prefersReducedMotion()) return;
		const floats = [...box.querySelectorAll<HTMLElement>('[data-float]')];
		const tweens = floats.map((node, i) =>
			gsap.to(node, {
				x: i % 2 === 0 ? 2 : -2,
				y: i % 3 === 0 ? -4 : 3,
				duration: 3.2 + (i % 4) * 0.55,
				ease: 'sine.inOut',
				yoyo: true,
				repeat: -1,
				paused: true,
				delay: -(i * 0.7)
			})
		);
		const stop = inView(box, () => {
			tweens.forEach((t) => t.play());
			return () => tweens.forEach((t) => t.pause());
		});
		return () => {
			stop();
			tweens.forEach((t) => t.kill());
			floats.forEach((node) => gsap.set(node, { x: 0, y: 0 }));
		};
	});
</script>

{#snippet face(bubble: Bubble, i: number)}
	{@const ratio = bubble.limit ? bubble.spent / bubble.limit : null}
	<span
		data-face
		class={cn(
			'face absolute inset-0',
			!bubble.color && 'rest',
			(bubble.color === 'blue' || bubble.color === 'violet') && 'deep'
		)}
		style={bubble.color ? `--c: ${PALETTE[bubble.color].css}` : undefined}
	>
		<!-- The dashboard's orb in its turning ring; neighbours turn opposite
		     ways, and a new month surges them all. -->
		<OrbitRing
			class="size-full"
			markers={i % 2 === 0 ? [0.25, 0.75] : [0, 0.5]}
			direction={i % 2 === 0 ? 1 : -1}
			period={i % 2 === 0 ? 32 : 24}
			burst={month.month}
		>
			{#if bubble.color}
				<Orb color={bubble.color} blur={blurOf(bubble)} spread={80} class="size-full" />
			{:else}
				<span class="hatch block size-full"></span>
			{/if}
		</OrbitRing>
		{#if ratio !== null}
			<!-- The limit gone, over the ring's own circle, drawn round from the top. -->
			<svg
				viewBox="0 0 100 100"
				class="pointer-events-none absolute inset-0 size-full -rotate-90 overflow-visible"
				aria-hidden="true"
			>
				<circle
					cx="50"
					cy="50"
					r="48"
					fill="none"
					stroke-width="3"
					stroke-linecap="round"
					pathLength="100"
					stroke-dasharray="{Math.min(ratio, 1) * 100} 100"
					class={cn('ring', ratio > 1 && 'over')}
				/>
			</svg>
		{/if}
		<!-- Named on the orb once there's room for it: the orb's box is a container. -->
		<span
			class="label @container absolute inset-[14%] flex flex-col items-center justify-center px-[6%] text-center"
		>
			<span class="hidden w-full truncate text-[0.6875rem] leading-tight @min-[3.25rem]:block"
				>{bubble.name}</span
			>
			<span
				class="tabular hidden font-display text-sm leading-tight font-medium @min-[2.5rem]:block @min-[5rem]:text-lg"
				>{compact(bubble.spent)}</span
			>
		</span>
	</span>
{/snippet}

<Card class={cn('flex min-w-0 flex-col p-7', className)}>
	<div class="flex items-center gap-2.5">
		<Sparkle color="coral" animated burst={month.month} class="size-5 shrink-0" />
		<h2 class="font-display text-2xl font-medium">Where it's going</h2>
	</div>
	<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
		Each category as big as what it took in {monthName(month.month)}, ringed by how much of its
		limit is gone. Press one to set its limit.
	</p>

	{#if bubbles.length === 0}
		<div
			class="hatch mt-6 grid flex-1 place-items-center rounded-[var(--radius-chip)] border border-dashed border-hairline p-10 text-center"
		>
			<p class="text-[0.9375rem] text-fg-muted">Nothing spent in {monthName(month.month)} yet.</p>
		</div>
	{:else}
		<div class="mt-6 grid flex-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
			<div
				bind:this={box}
				bind:clientWidth={width}
				class={cn('bubbles relative aspect-[3/2] w-full', lit && 'dimmed')}
				role="presentation"
				onpointerleave={() => (lit = null)}
			>
				{#each bubbles as bubble, i (bubble.id)}
					<div
						class={cn('slot absolute -translate-1/2', lit === bubble.id && 'lit')}
						style="left: {bubble.x}%; top: {bubble.y}%; width: {bubble.d}%"
						in:pop={{ scale: 0.6, bounce: 0.4, duration: 0.5 }}
						out:pop={{ scale: 0.6, duration: 0.3 }}
					>
						<div data-float class="relative aspect-square w-full">
							{#if bubble.color}
								<LimitEditor
									category={bubble.name}
									lines={month.categories}
									currency={month.currency}
									{categoryChoices}
									align="center"
								>
									{#snippet trigger(props)}
										<button
											{...props}
											type="button"
											class="bubble absolute inset-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
											aria-label="{bubble.name}: {money(bubble.spent)}{bubble.limit
												? ` of a ${money(bubble.limit)} limit`
												: ', no limit'}. Set its limit."
											onpointerenter={() => (lit = bubble.id)}
											onfocus={() => (lit = bubble.id)}
											onblur={() => (lit = null)}
										>
											{@render face(bubble, i)}
										</button>
									{/snippet}
								</LimitEditor>
							{:else}
								<div
									class="bubble absolute inset-0 rounded-full"
									role="img"
									aria-label="Everything else: {money(bubble.spent)}"
									onpointerenter={() => (lit = bubble.id)}
								>
									{@render face(bubble, i)}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			<ul class="grid min-w-0 content-center gap-0.5" aria-label="Categories this month">
				{#each bubbles as bubble (bubble.id)}
					<li
						class={cn(
							'flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-[background-color,opacity] duration-200',
							lit === bubble.id && 'bg-sunken',
							lit !== null && lit !== bubble.id && 'opacity-50'
						)}
						onpointerenter={() => (lit = bubble.id)}
						onpointerleave={() => (lit = null)}
					>
						{#if bubble.color}
							<CategoryIcon category={bubble.name} color={bubble.color} class="size-6 rounded-md" />
						{:else}
							<span
								class="hatch size-6 shrink-0 rounded-md border border-hairline"
								aria-hidden="true"
							></span>
						{/if}
						<span class="min-w-0 flex-1 truncate">{bubble.name}</span>
						<span
							class={cn(
								'tabular text-xs',
								bubble.limit && bubble.spent > bubble.limit ? 'text-negative' : 'text-fg-muted'
							)}
						>
							{bubble.limit
								? percent(bubble.spent / bubble.limit, 0)
								: bubble.color
									? 'No limit'
									: ''}
						</span>
						<span class="tabular shrink-0 text-right">{money(bubble.spent)}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</Card>

<style>
	/* A new month glides each bubble to its new place and size. */
	.slot {
		transition:
			left 0.7s var(--ease-out-quint),
			top 0.7s var(--ease-out-quint),
			width 0.7s var(--ease-out-quint),
			opacity 0.3s var(--ease-out-quint);
	}

	/* One pointed at stays bright and swells; the others step back. */
	.dimmed .slot:not(.lit) {
		opacity: 0.45;
	}

	.face {
		transition: scale 0.45s var(--ease-spring);
	}

	.lit .face {
		scale: 1.06;
	}

	/* Figures in ink over a pastel orb, in white over the two deep brand ones;
	   the long tail's hatch keeps them quiet. */
	.face {
		color: var(--color-ink);
	}

	.face.deep {
		color: white;
	}

	.face.rest {
		color: var(--color-fg-muted);
	}

	/* The limit gone, at a glyph's weight; drawn round from the top. */
	.ring {
		stroke: oklch(from var(--c) 0.55 calc(c * 1.7) h);
		transition: stroke-dasharray 1s var(--ease-out-quint);

		@starting-style {
			stroke-dasharray: 0 100;
		}
	}

	:global(.dark) .ring {
		stroke: var(--c);
	}

	.ring.over {
		stroke: var(--color-negative);
	}
</style>

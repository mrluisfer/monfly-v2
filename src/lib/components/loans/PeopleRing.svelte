<script lang="ts">
	import gsap from 'gsap';
	import { untrack } from 'svelte';
	import { AnimatedIcon, Avatar, PALETTE, ShareBar, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Currency } from '$lib/finance';
	import { loanLeft, type Loan, type LoanDirection } from '$lib/loans';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { DIRECTION_CHIP, DIRECTION_GLYPH } from './tone';

	/**
	 * Who holds the money still open, either way: a ring of what's left with
	 * each person — the biggest five in colours of their own, the rest hatched
	 * as the expenses dial's tail — and the list under it, each with their
	 * blobatar, which way it runs, their share and the figure. A part and its
	 * row light together under the pointer; a row opens that person's loan.
	 */
	type Props = {
		loans: Loan[];
		currency: Currency;
		/** Opens a loan of theirs in the panel: the one with the most left. */
		onSelect: (id: string) => void;
		class?: string;
	};

	let { loans, currency, onSelect, class: className }: Props = $props();

	const uid = $props.id();

	/** Colours for people, none of them the two sides' own mint and rose. */
	const COLORS: PaletteColor[] = ['violet', 'sky', 'peach', 'teal', 'lemon'];
	const SHOWN = 5;

	type Part = {
		key: string;
		person: string;
		direction: LoanDirection;
		left: number;
		/** Their loan with the most left: what a press opens. */
		first: string;
		color: PaletteColor | null;
	};

	const parts = $derived.by(() => {
		const byKey: Record<string, Part & { most: number }> = {};
		for (const loan of loans) {
			const left = loanLeft(loan);
			if (loan.status === 'paid' || left <= 0) continue;
			const key = `${loan.direction}:${loan.person.toLocaleLowerCase()}`;
			const part = byKey[key];
			if (part) {
				part.left += left;
				if (left > part.most) {
					part.most = left;
					part.first = loan.id;
				}
			} else {
				byKey[key] = {
					key,
					person: loan.person,
					direction: loan.direction,
					left,
					first: loan.id,
					most: left,
					color: null
				};
			}
		}
		const sorted = Object.values(byKey).sort((a, b) => b.left - a.left);
		const top: Part[] = sorted.slice(0, SHOWN).map((part, i) => ({
			key: part.key,
			person: part.person,
			direction: part.direction,
			left: part.left,
			first: part.first,
			color: COLORS[i % COLORS.length]
		}));
		const rest = sorted.slice(SHOWN);
		return {
			top,
			rest: rest.reduce((sum, p) => sum + p.left, 0),
			restCount: rest.length
		};
	});

	const total = $derived(parts.top.reduce((sum, p) => sum + p.left, 0) + parts.rest);
	const people = $derived(
		new Set(loans.filter((l) => l.status !== 'paid').map((l) => l.person.toLocaleLowerCase())).size
	);
	const money = (cents: number) => formatMoney(Math.round(cents), currency);
	const percent = (share: number) => `${Math.round(share * 100)}%`;

	// The ring: a circle's worth of arcs, each drawn as a dash of the same circle.
	const R = 62;
	const C = 2 * Math.PI * R;
	/** Room between two parts, in length along the ring. */
	const GAP = 3;

	/** Each part's start and length along the ring, the hatched rest last. */
	const arcs = $derived.by(() => {
		if (total <= 0) return [];
		const list = [
			...parts.top.map((p) => ({ key: p.key, left: p.left, color: p.color })),
			...(parts.rest > 0 ? [{ key: 'rest', left: parts.rest, color: null }] : [])
		];
		const gap = list.length > 1 ? GAP : 0;
		let start = 0;
		return list.map((p) => {
			const length = (p.left / total) * C;
			const arc = { ...p, start: start + gap / 2, length: Math.max(0.5, length - gap) };
			start += length;
			return arc;
		});
	});

	/** How far round the ring is drawn: 1 on the server, swept from 0 as it comes into view. */
	let drawn = $state(1);
	/** While the sweep runs, the parts follow it frame by frame rather than easing after it. */
	let sweeping = $state(false);
	let lit = $state<string | null>(null);

	/**
	 * Arriving in view, the parts sweep round from the top (GSAP, 1.2 s
	 * `power4.out`), as the insights' income arc does; already swept, a change
	 * of shares simply eases in CSS.
	 */
	function sweep(node: SVGSVGElement) {
		if (prefersReducedMotion() || untrack(() => arcs.length) === 0) return;
		const state = { v: 0 };
		drawn = 0;
		sweeping = true;
		let tween: gsap.core.Tween | undefined;
		const seen = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				seen.disconnect();
				tween = gsap.to(state, {
					v: 1,
					duration: 1.2,
					ease: 'power4.out',
					onUpdate: () => {
						drawn = state.v;
					},
					onComplete: () => {
						sweeping = false;
					}
				});
			},
			{ threshold: 0.3 }
		);
		seen.observe(node);
		return () => {
			seen.disconnect();
			tween?.kill();
			drawn = 1;
			sweeping = false;
		};
	}

	const tintOf = (color: PaletteColor | null) =>
		color ? PALETTE[color].css : 'var(--line-strong)';
</script>

<div class={className}>
	{#if total <= 0}
		<p class="text-[0.9375rem] text-fg-muted">
			Nobody holds any of your money, and you hold nobody's.
		</p>
	{:else}
		<!-- The ring, with what's open in its middle. Decorative: the list reads it all. -->
		<div class={cn('relative mx-auto aspect-square w-full max-w-[13rem]', sweeping && 'sweeping')}>
			<svg viewBox="0 0 160 160" class="size-full -rotate-90" aria-hidden="true" {@attach sweep}>
				<defs>
					<pattern
						id="{uid}-rest"
						width="6"
						height="6"
						patternUnits="userSpaceOnUse"
						patternTransform="rotate(45)"
					>
						<rect width="6" height="6" fill="var(--sunken)" />
						<line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-strong)" stroke-width="1.5" />
					</pattern>
				</defs>
				<circle cx="80" cy="80" r={R} fill="none" stroke="var(--line)" stroke-width="1" />
				{#each arcs as arc (arc.key)}
					<circle
						cx="80"
						cy="80"
						r={R}
						fill="none"
						class={cn('arc', lit !== null && lit !== arc.key && 'dim', lit === arc.key && 'lit')}
						style="--tint: {tintOf(arc.color)};{arc.color ? '' : ` stroke: url(#${uid}-rest)`}"
						stroke-dasharray="{arc.length * drawn} {C}"
						stroke-dashoffset={-arc.start * drawn}
					/>
				{/each}
			</svg>
			<div class="absolute inset-0 flex flex-col items-center justify-center text-center">
				<p class="tabular font-display text-2xl leading-none font-light tracking-tight">
					{money(total)}
				</p>
				<p class="mt-1.5 text-xs text-fg-muted">
					open with {people}
					{people === 1 ? 'person' : 'people'}
				</p>
			</div>
		</div>

		<ul class="mt-6 grid gap-1">
			{#each parts.top as part (part.key)}
				<li>
					<button
						type="button"
						class="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
						onpointerenter={() => (lit = part.key)}
						onpointerleave={() => (lit = null)}
						onfocus={() => (lit = part.key)}
						onblur={() => (lit = null)}
						onclick={() => onSelect(part.first)}
					>
						<Avatar seed={part.person} class="size-7 shrink-0" />
						<span class="min-w-0 flex-1">
							<span class="flex items-center gap-1.5">
								<span class="truncate text-sm">{part.person}</span>
								<span
									class={cn(
										'grid size-4 shrink-0 place-items-center rounded',
										DIRECTION_CHIP[part.direction]
									)}
									title={part.direction === 'lent' ? 'Owes you' : 'You owe them'}
								>
									<AnimatedIcon {...DIRECTION_GLYPH[part.direction]} size={10} />
								</span>
							</span>
							<ShareBar
								track="hatch"
								segments={[{ id: part.key, share: part.left / total, color: part.color ?? 'blue' }]}
								class="mt-1.5 h-1.5"
							/>
						</span>
						<span class="shrink-0 text-right">
							<span class="tabular block text-sm">{money(part.left)}</span>
							<span class="tabular block text-xs text-fg-subtle">{percent(part.left / total)}</span>
						</span>
					</button>
				</li>
			{/each}
			{#if parts.rest > 0}
				<li class="flex items-center gap-3 px-2 py-2">
					<span class="hatch size-7 shrink-0 rounded-full border border-hairline"></span>
					<span class="min-w-0 flex-1 text-sm text-fg-muted">
						{parts.restCount} more {parts.restCount === 1 ? 'person' : 'people'}
					</span>
					<span class="tabular shrink-0 text-sm text-fg-muted">{money(parts.rest)}</span>
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	/* Each part in its person's colour, as their bar below wears it; the one
	   pointed at thickens and the rest step back, as the income arc's parts do. */
	.arc {
		stroke: var(--tint);
		stroke-width: 16;
		transition:
			stroke-width 0.3s var(--ease-out-quint),
			opacity 0.3s var(--ease-out-quint),
			stroke-dasharray 0.9s var(--ease-out-quint),
			stroke-dashoffset 0.9s var(--ease-out-quint);
	}

	.sweeping .arc {
		transition-property: stroke-width, opacity;
	}

	.arc.lit {
		stroke-width: 22;
	}

	.arc.dim {
		opacity: 0.35;
	}
</style>

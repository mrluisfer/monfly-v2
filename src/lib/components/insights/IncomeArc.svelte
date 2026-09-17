<script lang="ts">
	import gsap from 'gsap';
	import { inView } from 'motion';
	import { untrack } from 'svelte';
	import { countUp } from '$lib/actions';
	import { categoryColor } from '$lib/categories';
	import { Card, PALETTE, Sparkle, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Cents, type Currency } from '$lib/finance';
	import { kept, type Stretch } from '$lib/insights';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { percent } from './format';

	/**
	 * Where what came in went, as a half dial: the three biggest categories in
	 * their colours, everything else spent hatched as the dashboard's dial
	 * hatches its long tail, and what was kept in lime. Spending more than came
	 * in fills the dial with spending alone, and says by how much. The parts
	 * sweep round as the card scrolls into view and ease to new shares (GSAP);
	 * pointing at a part or its name lifts it and sets the rest back.
	 */
	type Props = {
		stretch: Stretch;
		currency: Currency;
		categoryChoices?: Record<string, PaletteColor>;
		class?: string;
	};

	let { stretch, currency, categoryChoices, class: className }: Props = $props();

	const uid = $props.id();

	type Part = { id: string; label: string; amount: Cents; color: PaletteColor | null };

	/**
	 * Five slots, always in this order — three categories, the rest, what was
	 * kept — so a new stretch eases each slot from its old share to its new one
	 * rather than shuffling colours round the dial.
	 */
	const slots = $derived.by((): (Part | null)[] => {
		const top = stretch.categories.slice(0, 3);
		const rest = stretch.total.spent - top.reduce((sum, c) => sum + c.spent, 0);
		const saved = kept(stretch.total);
		return [
			...[0, 1, 2].map((i) =>
				top[i]
					? {
							id: `category:${top[i].name}`,
							label: top[i].name,
							amount: top[i].spent,
							color: categoryColor(top[i].name, categoryChoices)
						}
					: null
			),
			rest > 0 ? { id: 'rest', label: 'Everything else', amount: rest, color: null } : null,
			saved > 0 ? { id: 'kept', label: 'Kept', amount: saved, color: 'lime' } : null
		];
	});

	/** What the dial is out of: what came in, or what went out when that was more. */
	const whole = $derived(Math.max(stretch.total.received, stretch.total.spent));
	const shares = $derived(slots.map((part) => (part && whole > 0 ? part.amount / whole : 0)));
	const over = $derived(stretch.total.spent - stretch.total.received);

	// ── Easing to new shares ─────────────────────────────────────────────

	/** The shares on the dial: the target, or on their way to it. */
	let eased = $state(untrack(() => [...shares]));
	let tween: gsap.core.Tween | undefined;

	$effect(() => {
		const next = shares;
		untrack(() => {
			tween?.kill();
			if (next.every((share, i) => share === eased[i])) return;
			if (prefersReducedMotion()) {
				eased = [...next];
				return;
			}
			const from = [...eased];
			const progress = { t: 0 };
			tween = gsap.to(progress, {
				t: 1,
				duration: 0.9,
				ease: 'power3.inOut',
				onUpdate: () => {
					eased = from.map((f, i) => f + (next[i] - f) * progress.t);
				}
			});
		});
		return () => tween?.kill();
	});

	// ── The drawing ──────────────────────────────────────────────────────

	const CX = 150;
	const CY = 150;
	const R = 118;
	const STROKE = 34;
	/** The gap between two parts, in radians. */
	const GAP = 0.035;

	const at = (angle: number) =>
		`${Math.round((CX + R * Math.cos(angle)) * 100) / 100},${Math.round((CY + R * Math.sin(angle)) * 100) / 100}`;

	/** An arc over the top, from `a0` to `a1` — π is the left end, 2π the right. */
	const arc = (a0: number, a1: number) => `M${at(a0)}A${R},${R} 0 0 1 ${at(a1)}`;
	const TRACK = arc(Math.PI, 2 * Math.PI);

	const arcs = $derived.by(() => {
		let angle = Math.PI;
		return eased.map((share, i) => {
			const sweep = share * Math.PI;
			const start = angle;
			angle += sweep;
			const gap = sweep > GAP * 2 ? GAP / 2 : 0;
			return { i, d: sweep > 0.004 ? arc(start + gap, angle - gap) : '' };
		});
	});

	/** The slot under the pointer, or null. */
	let lit = $state<number | null>(null);

	const money = (cents: number) => formatMoney(cents, currency);

	// Drawn in from nothing as it scrolls into view — but only if it isn't on
	// screen already: what's in view on arrival is simply there.
	let sweeper = $state<SVGPathElement>();
	let frame = $state<HTMLElement>();
	$effect(() => {
		if (!sweeper || !frame || prefersReducedMotion()) return;
		if (frame.getBoundingClientRect().top < window.innerHeight) return;
		const path = sweeper;
		gsap.set(path, { strokeDashoffset: 1 });
		return inView(frame, () => {
			gsap.to(path, { strokeDashoffset: 0, duration: 1.2, ease: 'power4.out' });
		});
	});
</script>

<Card class={cn('flex flex-col p-7', className)}>
	<div class="flex items-center gap-2.5">
		<Sparkle color="mint" animated burst={stretch.span.label} class="size-5 shrink-0" />
		<h2 class="font-display text-2xl font-medium">Where income went</h2>
	</div>
	<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
		Out of {money(stretch.total.received)} received, {stretch.span.label}.
	</p>

	<div bind:this={frame} class="relative mx-auto mt-6 w-full max-w-80">
		<svg viewBox="0 0 300 172" class="w-full overflow-visible" aria-hidden="true">
			<defs>
				<pattern
					id="{uid}-hatch"
					width="6"
					height="6"
					patternUnits="userSpaceOnUse"
					patternTransform="rotate(45)"
				>
					<rect width="1.25" height="6" class="hatch-line" />
				</pattern>
				<mask id="{uid}-sweep" maskUnits="userSpaceOnUse" x="-20" y="-20" width="340" height="212">
					<path
						bind:this={sweeper}
						d={TRACK}
						pathLength="1"
						stroke-dasharray="1"
						fill="none"
						stroke="white"
						stroke-width={STROKE + 12}
					/>
				</mask>
			</defs>
			<path d={TRACK} fill="none" stroke-width={STROKE} class="stroke-sunken" />
			<g mask="url(#{uid}-sweep)">
				{#each arcs as part (part.i)}
					{@const slot = slots[part.i]}
					{#if part.d}
						<path
							d={part.d}
							fill="none"
							stroke-width={lit === part.i ? STROKE + 6 : STROKE}
							class={cn(
								'part transition-[stroke-width,opacity] duration-300',
								lit !== null && lit !== part.i && 'opacity-35'
							)}
							style="stroke: {slot?.color ? PALETTE[slot.color].css : `url(#${uid}-hatch)`}"
							role="presentation"
							onpointerenter={() => (lit = part.i)}
							onpointerleave={() => (lit = null)}
						/>
					{/if}
				{/each}
			</g>
		</svg>

		<div class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
			<p class="text-sm text-fg-muted">Spent</p>
			<p
				class="tabular mt-1 font-display text-[2rem] leading-none font-light tracking-tight"
				use:countUp={{ value: stretch.total.spent, format: money, whenVisible: true }}
			>
				{money(stretch.total.spent)}
			</p>
		</div>
	</div>

	{#if whole === 0}
		<p class="mt-6 text-center text-[0.9375rem] text-fg-muted">
			Nothing came in or went out in {stretch.span.label}.
		</p>
	{:else}
		{#if over > 0}
			<p class="mt-4 text-center text-sm text-fg-muted">
				<span class="tabular font-medium text-fg">{money(over)}</span> more went out than came in.
			</p>
		{/if}
		<ul class="mt-6 grid gap-1">
			{#each slots as slot, i (i)}
				{#if slot}
					<li
						class={cn(
							'flex items-center gap-3 rounded-lg px-2 py-1.5 text-[0.9375rem] transition-[background-color,opacity] duration-200',
							lit === i && 'bg-sunken',
							lit !== null && lit !== i && 'opacity-50'
						)}
						onpointerenter={() => (lit = i)}
						onpointerleave={() => (lit = null)}
					>
						{#if slot.color}
							<span
								class="size-3 shrink-0 rounded-[4px]"
								style="background: {PALETTE[slot.color].css}"
								aria-hidden="true"
							></span>
						{:else}
							<span
								class="hatch size-3 shrink-0 rounded-[4px] border border-hairline"
								aria-hidden="true"
							></span>
						{/if}
						<span class="min-w-0 flex-1 truncate">{slot.label}</span>
						<span class="tabular text-sm text-fg-muted">{percent(shares[i], 0)}</span>
						<span class="tabular w-28 text-right text-sm">{money(slot.amount)}</span>
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</Card>

<style>
	.hatch-line {
		fill: var(--color-fg-subtle);
	}
</style>

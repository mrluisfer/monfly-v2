<script lang="ts">
	import gsap from 'gsap';
	import { animate, stagger } from 'motion';
	import { pop } from '$lib/transitions';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';

	/**
	 * Something on its way: a ring whose arc turns and crossfades through the
	 * brand's three colours, a glow behind the whole of it — ring and words —
	 * breathing in the colour the arc is in, and its words waving letter by
	 * letter. For what hasn't arrived the first time; a figure loading over the
	 * last one dims instead.
	 *
	 * Motion carries presence and colour — the pop in and out, the turn, the
	 * crossfade, the glow, the letters blurring in — and GSAP the wave, one
	 * timeline running along the letters. Each letter is two spans so the two
	 * never write the same property. Under reduced motion nothing travels: the
	 * colours still crossfade and the letters still brighten in turn.
	 *
	 * <Loader />  ·  <Loader label="Loading transactions" />
	 */
	type Props = {
		/** What it says, and what is read out. */
		label?: string;
		class?: string;
	};

	let { label = 'Loading', class: className }: Props = $props();

	/** The brand's three, in the order the arc passes through them. */
	const TINTS = ['blue', 'violet', 'lime'] as const;
	/** Seconds for the arc to pass through all three. */
	const CYCLE = 3;

	const letters = $derived(Array.from(label));

	let root = $state<HTMLElement>();
	let glow = $state<HTMLElement>();
	let rotor = $state<HTMLElement>();
	let word = $state<HTMLElement>();

	$effect(() => {
		if (!root || !glow || !rotor) return;
		const host = root;
		const still = prefersReducedMotion();

		// Every colour runs the same keyframes, a share of the cycle after the
		// one before: it fades in over the start of its share, holds, and fades
		// out over the start of the next one's — exactly while that one fades in.
		// A colour is its arc and its glow together, so the two change as one.
		const share = 1 / TINTS.length;
		const fade = share * 0.45;
		const running = TINTS.map((tint, i) =>
			animate(
				host.querySelectorAll(`[data-tint='${tint}']`),
				{ opacity: [0, 1, 1, 0, 0] },
				{
					duration: CYCLE,
					times: [0, fade, share, share + fade, 1],
					ease: 'easeInOut',
					delay: i * share * CYCLE,
					repeat: Infinity
				}
			)
		);

		if (!still) {
			running.push(
				animate(rotor, { rotate: [0, 360] }, { duration: 0.9, ease: 'linear', repeat: Infinity }),
				// Gentle: it's as wide as the loader, and a big glow swells a long way.
				animate(
					glow,
					{ scale: [0.94, 1.04], opacity: [0.6, 1] },
					{ duration: 1.2, ease: 'easeInOut', repeat: Infinity, repeatType: 'mirror' }
				)
			);
		}

		return () => running.forEach((animation) => animation.stop());
	});

	$effect(() => {
		void letters; // new words are new letters: enter and wave them again
		if (!word) return;
		const still = prefersReducedMotion();

		animate(
			word.children,
			still
				? { opacity: [0, 1] }
				: { opacity: [0, 1], y: [6, 0], filter: ['blur(4px)', 'blur(0px)'] },
			{ delay: stagger(0.04), duration: 0.4, ease: EASE_OUT_QUINT }
		);

		// A crest runs along the word and rests before it runs again: each letter
		// rises into full strength and settles back as the next one rises.
		const inner = word.querySelectorAll('[data-letter]');
		const wave = gsap
			.timeline({ delay: 0.3, repeat: -1, repeatDelay: 0.5 })
			.to(inner, {
				opacity: 1,
				y: still ? 0 : -3,
				duration: 0.3,
				ease: 'power2.out',
				stagger: 0.06
			})
			.to(inner, { opacity: 0.55, y: 0, duration: 0.5, ease: 'power2.inOut', stagger: 0.06 }, 0.3);

		return () => wave.kill();
	});
</script>

<div
	bind:this={root}
	role="status"
	class={cn('relative isolate inline-flex items-center gap-2.5 text-sm text-fg', className)}
	in:pop={{ scale: 0.92, duration: 0.3 }}
	out:pop={{ scale: 0.92, duration: 0.3 }}
>
	<!-- The glow behind all of it, ring and words, in the colour the arc is in.
	     Wider than the loader, so it fades out past the words rather than on
	     them; out of the flow, so it takes no room. -->
	<span
		bind:this={glow}
		class="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10"
		aria-hidden="true"
	>
		{#each TINTS as tint, i (tint)}
			<span data-tint={tint} class={cn('tint halo absolute inset-0', i > 0 && 'opacity-0')}></span>
		{/each}
	</span>

	<span class="relative size-5 shrink-0" aria-hidden="true">
		<svg viewBox="0 0 20 20" class="absolute inset-0 size-full">
			<circle cx="10" cy="10" r="8" fill="none" stroke-width="2" class="track" />
		</svg>
		<!-- The colours turn together, so the arc changes colour rather than
		     three arcs chasing one another. -->
		<span bind:this={rotor} class="absolute inset-0">
			{#each TINTS as tint, i (tint)}
				<span data-tint={tint} class={cn('tint absolute inset-0', i > 0 && 'opacity-0')}>
					<svg viewBox="0 0 20 20" class="absolute inset-0 size-full">
						<circle
							cx="10"
							cy="10"
							r="8"
							fill="none"
							stroke-width="2"
							stroke-linecap="round"
							pathLength="100"
							stroke-dasharray="28 72"
							class="arc"
						/>
					</svg>
				</span>
			{/each}
		</span>
	</span>

	<span class="sr-only">{label}</span>
	<span bind:this={word} class="whitespace-pre" aria-hidden="true"
		>{#each letters as letter, i (i)}<span class="inline-block"
				><span data-letter class="inline-block opacity-55">{letter}</span></span
			>{/each}</span
	>
</div>

<style>
	.track {
		stroke: var(--color-line);
	}

	.tint {
		--tint: var(--blue);
		--stroke: var(--tint);
	}

	.tint[data-tint='violet'] {
		--tint: var(--violet);
	}

	/* Lime is too light to be a line on white, so it takes a glyph's weight,
	   mixed toward ink; on the dark card it is the bright thing again. */
	.tint[data-tint='lime'] {
		--tint: var(--lime);
		--stroke: color-mix(in oklab, var(--lime) 40%, var(--ink));
	}

	:global(.dark) .tint[data-tint='lime'] {
		--stroke: var(--lime);
	}

	.arc {
		stroke: var(--stroke);
	}

	/* An ellipse the size of its box, strongest in the middle of the loader and
	   gone before the edge, so it has no rim to read as a surface. */
	.halo {
		background: radial-gradient(
			closest-side,
			color-mix(in oklab, var(--tint) 35%, transparent),
			transparent
		);
	}
</style>

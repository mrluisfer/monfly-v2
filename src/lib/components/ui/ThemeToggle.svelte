<script lang="ts">
	import { onDestroy } from 'svelte';
	import gsap from 'gsap';
	import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import IconButton from './IconButton.svelte';
	import Tooltip from './Tooltip.svelte';
	import { cn, prefersReducedMotion } from '$lib/utils';

	type Mode = 'light' | 'dark' | 'system';
	type ClickHandler = ((event: MouseEvent) => void) | undefined;

	/** No menu: each press moves to the next mode. */
	const NEXT: Record<Mode, Mode> = { light: 'dark', dark: 'system', system: 'light' };
	const NAME: Record<Mode, string> = { light: 'Light', dark: 'Dark', system: 'System' };

	/**
	 * The one outline that changes shape — sun disc, crescent moon, monitor
	 * screen — in Lucide's geometry. The sun's rays and the monitor's stand
	 * are separate groups that grow in and tuck away around it.
	 */
	const BODY: Record<Mode, string> = {
		light: 'M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8Z',
		dark: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z',
		system: 'M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z'
	};

	const mode = $derived((userPrefersMode.current ?? 'system') as Mode);
	// Server markup only: GSAP owns the shapes once mounted.
	const initial = (userPrefersMode.current ?? 'system') as Mode;

	let icon = $state<SVGSVGElement>();
	let body = $state<SVGPathElement>();
	let rays = $state<SVGGElement>();
	let stand = $state<SVGGElement>();
	let shown: Mode | null = null;
	let timeline: gsap.core.Timeline | undefined;

	// The server can't read the stored mode, so the icon waits, invisible,
	// until the first placement — no flash of the wrong one.
	let ready = $state(false);

	function morphTo(to: Mode, animated: boolean) {
		if (!icon || !body || !rays || !stand) return;
		const d = animated && !prefersReducedMotion() ? 1 : 0;
		const sun = to === 'light';
		const screen = to === 'system';

		timeline?.kill();
		timeline = gsap
			.timeline({ defaults: { ease: 'power3.inOut' } })
			.to(body, { morphSVG: BODY[to], duration: 0.55 * d }, 0)
			.to(
				rays,
				{
					svgOrigin: '12 12',
					scale: sun ? 1 : 0,
					rotate: sun ? 0 : -90,
					opacity: sun ? 1 : 0,
					duration: 0.45 * d,
					ease: sun ? 'back.out(1.8)' : 'power2.in'
				},
				sun ? 0.18 * d : 0
			)
			.to(stand, { y: screen ? 0 : -4, opacity: screen ? 1 : 0, duration: 0.35 * d }, screen ? 0.25 * d : 0);

		// A small twist as it changes, settling with a little overshoot.
		if (d) timeline.fromTo(icon, { rotate: -24 }, { rotate: 0, duration: 0.7, ease: 'back.out(2.2)' }, 0);
	}

	$effect(() => {
		const to = mode;
		if (!body) return;
		gsap.registerPlugin(MorphSVGPlugin);
		morphTo(to, shown !== null && shown !== to);
		shown = to;
		ready = true;
	});

	onDestroy(() => timeline?.kill());
</script>

<Tooltip label="{NAME[mode]} theme" side="bottom">
	{#snippet children({ props })}
		<!-- Spread `props` first: bits-ui ships its own onclick, and a later
		     spread would silently overwrite ours. -->
		<IconButton
			{...props}
			aria-label="Theme: {NAME[mode]}. Switch to {NAME[NEXT[mode]]}."
			onclick={(event: MouseEvent) => {
				(props.onclick as ClickHandler)?.(event);
				setMode(NEXT[mode]);
			}}
		>
			<svg
				bind:this={icon}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				class={cn('transition-opacity duration-300', !ready && 'opacity-0')}
			>
				<path bind:this={body} d={BODY[initial]} />
				<g bind:this={rays} opacity={initial === 'light' ? 1 : 0}>
					<path d="M12 2v2" />
					<path d="M12 20v2" />
					<path d="m4.93 4.93 1.41 1.41" />
					<path d="m17.66 17.66 1.41 1.41" />
					<path d="M2 12h2" />
					<path d="M20 12h2" />
					<path d="m6.34 17.66-1.41 1.41" />
					<path d="m19.07 4.93-1.41 1.41" />
				</g>
				<g bind:this={stand} opacity={initial === 'system' ? 1 : 0}>
					<path d="M8 21h8" />
					<path d="M12 17v4" />
				</g>
			</svg>
		</IconButton>
	{/snippet}
</Tooltip>

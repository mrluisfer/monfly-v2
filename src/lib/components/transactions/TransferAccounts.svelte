<script lang="ts">
	import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up';
	import gsap from 'gsap';
	import { animate } from 'motion';
	import { onMount, tick } from 'svelte';
	import { IconButton, PALETTE, Select, type PaletteColor } from '$lib/components/ui';
	import { EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * Where a transfer's money leaves and where it lands: two account pickers,
	 * one over the other, joined by the line the money runs down — a dot in the
	 * first account's colour taking on the second's as it goes — with the button
	 * that swaps them beside it. The dot runs whenever the pair changes, so the
	 * direction is shown as well as said.
	 */
	type Props = {
		/** The user's active accounts. */
		accounts: { id: string; name: string }[];
		/** Each account's colour, by id: the dots, and the one that runs. */
		colors?: Record<string, PaletteColor>;
		/** The account the money leaves. Bind it. */
		from: string | null;
		/** The account it lands in — never `from`. Bind it. */
		to: string | null;
	};

	let { accounts, colors = {}, from = $bindable(), to = $bindable() }: Props = $props();

	const label = 'mb-1.5 block text-sm text-fg-muted';

	const options = (except: string | null) =>
		accounts
			.filter((a) => a.id !== except)
			.map((a) => ({ value: a.id, label: a.name, color: colors[a.id] ?? 'blue' }));

	const tint = (id: string | null) => PALETTE[(id && colors[id]) || 'blue'].css;

	let fromSlot = $state<HTMLElement>();
	let toSlot = $state<HTMLElement>();
	let track = $state<HTMLElement>();
	let runner = $state<HTMLElement>();
	let arrival = $state<HTMLElement>();
	let glyph = $state<HTMLElement>();

	/**
	 * The money runs down the line once (GSAP): fading in under the first
	 * picker, taking on the second account's colour on the way, and fading out
	 * above the second. Waits a tick, so the dot already wears the new pair.
	 */
	async function run() {
		await tick();
		if (!track || !runner || !arrival || prefersReducedMotion() || !from || !to) return;
		const distance = track.offsetHeight - runner.offsetHeight;
		gsap.killTweensOf([runner, arrival]);
		gsap
			.timeline()
			.fromTo(
				runner,
				{ y: 0, scale: 0.6 },
				{ y: distance, scale: 1, duration: 0.9, ease: 'power2.inOut' }
			)
			.fromTo(runner, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out' }, 0)
			.fromTo(arrival, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.inOut' }, 0.1)
			.to(runner, { opacity: 0, duration: 0.25, ease: 'power1.in' }, 0.7);
	}

	/** Picking the account it lands in as the one it leaves turns the pair round. */
	function pickFrom(next: string) {
		if (next === to) to = from;
		from = next;
		run();
	}

	function pickTo(next: string) {
		to = next;
		run();
	}

	/**
	 * The two trade places: each picker glides from where the other one was
	 * (Motion, the one it now shows arriving from there) as the glyph turns over
	 * (GSAP) and the money runs the new way.
	 */
	function swap() {
		[from, to] = [to, from];
		run();
		if (!fromSlot || !toSlot || !glyph || prefersReducedMotion()) return;
		const distance = toSlot.offsetTop - fromSlot.offsetTop;
		animate(fromSlot, { y: [distance, 0] }, { duration: 0.5, ease: EASE_OUT_QUINT });
		animate(toSlot, { y: [-distance, 0] }, { duration: 0.5, ease: EASE_OUT_QUINT });
		gsap.to(glyph, { rotation: '+=180', duration: 0.55, ease: 'back.out(1.8)' });
	}

	// Once as it appears, after the fields have dealt in: which way it goes, drawn.
	onMount(() => {
		const wait = setTimeout(run, 350);
		return () => {
			clearTimeout(wait);
			gsap.killTweensOf([runner, arrival, glyph]);
		};
	});
</script>

<div class="relative grid">
	<span class={label}>From</span>
	<!-- Lifted over the line, so the two cross above it while they trade places. -->
	<div bind:this={fromSlot} class="relative z-[1]">
		<Select
			label="Account the money leaves"
			value={from ?? ''}
			onValueChange={pickFrom}
			options={options(null)}
			class="w-full justify-between"
		/>
	</div>

	<!-- The line runs under the pickers' dots, 20 px in: a pill's padding and half a dot. -->
	<div class="relative flex h-12 items-center justify-end">
		<span
			bind:this={track}
			aria-hidden="true"
			class="absolute inset-y-1 left-5 w-0 -translate-x-1/2 border-l border-dashed border-line-strong"
		></span>
		<span
			bind:this={runner}
			aria-hidden="true"
			class="absolute top-1 left-5 size-2 -translate-x-1/2 rounded-full opacity-0"
			style="background: {tint(from)}"
		>
			<span
				bind:this={arrival}
				class="absolute inset-0 rounded-full opacity-0"
				style="background: {tint(to)}"
			></span>
		</span>
		<IconButton size="sm" aria-label="Swap the two accounts" disabled={!from || !to} onclick={swap}>
			<span bind:this={glyph} class="flex"><ArrowDownUp /></span>
		</IconButton>
	</div>

	<span class={label}>To</span>
	<div bind:this={toSlot} class="relative z-[1]">
		<Select
			label="Account the money lands in"
			value={to ?? ''}
			onValueChange={pickTo}
			options={options(from)}
			class="w-full justify-between"
		/>
	</div>
</div>

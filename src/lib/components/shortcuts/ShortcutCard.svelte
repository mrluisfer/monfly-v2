<script lang="ts">
	import ColorLock from '@animated-color-icons/lucide-svelte/Lock.svelte';
	import MovingCheck from '@jis3r/icons/icons/check';
	import gsap from 'gsap';
	import { animate } from 'motion';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { AnimatedIcon, Card, ConfirmDialog, Kbd, PALETTE, Switch } from '$lib/components/ui';
	import type { Shortcut } from '$lib/shortcuts';
	import { pop } from '$lib/transitions';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import ShortcutIcon from './ShortcutIcon.svelte';

	/**
	 * One place a person can pin to the header: its glyph in a chip of its
	 * colour — the glyph its tab wears (`ShortcutIcon`) — what it is for, and the
	 * switch that pins it. Pinned, the colour comes into the chip; taken away, it
	 * steps back to grey.
	 *
	 * A locked shortcut (Overview) wears a lock instead of a switch while it's
	 * pinned. A press rattles it (GSAP); pressed four times in a row, harder each
	 * time and reddening, it springs open and asks whether to take it away
	 * (`ConfirmDialog`). Taken away, it gets a switch like the rest, and pinning
	 * it again locks it again.
	 */
	type Props = {
		shortcut: Shortcut;
		/** In the header right now. */
		pinned: boolean;
		/** The person turned it on or off — for a locked one, off only once they confirm. */
		onPinnedChange?: (pinned: boolean) => void;
		/** Its keys, when a "go to" hotkey leads there. */
		hotkey?: readonly string[];
		/** Why the last change didn't stick, said on the card. */
		error?: string | null;
		/** Nothing to save to yet: a session with no Monfly account. */
		disabled?: boolean;
	};

	let {
		shortcut,
		pinned,
		onPinnedChange,
		hotkey,
		error = null,
		disabled = false
	}: Props = $props();

	/** Presses in a row it takes to open the lock. */
	const PRESSES = 4;
	/** The longest pause, in ms, that still counts as in a row. */
	const IN_A_ROW = 800;

	const guarded = $derived(shortcut.locked && pinned);

	/** Pointed at, or focus inside: the glyph plays. */
	let engaged = $state(false);
	/** The glyphs play once as the cards arrive. */
	let arriving = $state(true);

	$effect(() => {
		const done = setTimeout(() => (arriving = false), 900);
		return () => clearTimeout(done);
	});

	let chip = $state<HTMLElement>();

	// Pinned or taken away, the chip springs as its colour comes or goes; the
	// first draw is left alone.
	let armed = false;
	$effect(() => {
		void pinned;
		if (!armed) {
			armed = true;
			return;
		}
		if (!chip || prefersReducedMotion()) return;
		animate(
			chip,
			{ scale: pinned ? [0.8, 1] : [1.08, 1] },
			{ type: 'spring', bounce: 0.5, duration: 0.5 }
		);
	});

	let lock = $state<HTMLElement>();
	let shake: gsap.core.Timeline | undefined;
	/** Presses so far in this run; the lock reddens with them and relaxes when they stop. */
	let presses = $state(0);
	let lastPress = 0;
	let relax: ReturnType<typeof setTimeout> | undefined;
	/** The question is open. */
	let asking = $state(false);
	/** The lock plays its gesture: as it arrives, and as it springs open. */
	let opening = $state(false);

	/** Tried and holding: it rattles on its shackle, harder with each press in a row. */
	function rattle(level: number) {
		if (!lock || prefersReducedMotion()) return;
		const k = 1 + (level - 1) * 0.45;
		shake?.kill();
		shake = gsap
			.timeline({ defaults: { transformOrigin: '50% 35%', ease: 'power1.inOut' } })
			.to(lock, { rotation: -14 * k, y: -1.5 * k, duration: 0.07, ease: 'power2.out' })
			.to(lock, { rotation: 11 * k, y: 0, duration: 0.1 })
			.to(lock, { rotation: -7 * k, duration: 0.09 })
			.to(lock, { rotation: 4 * k, duration: 0.08 })
			.to(lock, { rotation: 0, duration: 0.45, ease: 'elastic.out(1, 0.35)' });
	}

	/** Given way: the lock jumps its shackle and settles, open. */
	function springOpen() {
		opening = true;
		setTimeout(() => (opening = false), 900);
		if (!lock || prefersReducedMotion()) return;
		shake?.kill();
		shake = gsap
			.timeline({ defaults: { transformOrigin: '50% 35%' } })
			.to(lock, { y: -4, rotation: -20, scale: 1.18, duration: 0.18, ease: 'power2.out' })
			.to(lock, { y: 0, rotation: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
	}

	function pressLock() {
		const now = performance.now();
		presses = now - lastPress < IN_A_ROW ? presses + 1 : 1;
		lastPress = now;
		clearTimeout(relax);

		if (presses >= PRESSES) {
			presses = 0;
			springOpen();
			asking = true;
			return;
		}

		rattle(presses);
		relax = setTimeout(() => (presses = 0), IN_A_ROW);
	}

	// Kept after all: the lock snaps shut again, a small drop and a settle.
	let wasAsking = false;
	$effect(() => {
		const closedUnanswered = wasAsking && !asking && guarded;
		wasAsking = asking;
		if (!closedUnanswered || !lock || prefersReducedMotion()) return;
		gsap.fromTo(
			lock,
			{ y: -3 },
			{ y: 0, duration: 0.5, ease: 'bounce.out', transformOrigin: '50% 35%' }
		);
	});

	$effect(() => () => {
		shake?.kill();
		clearTimeout(relax);
	});

	const motion = (ms: number) => (prefersReducedMotion() ? 0 : ms);
</script>

<Card
	class="flex h-full flex-col p-7"
	onpointerenter={() => (engaged = true)}
	onpointerleave={() => (engaged = false)}
	onfocusin={() => (engaged = true)}
	onfocusout={() => (engaged = false)}
>
	<div class="flex min-h-11 items-center justify-between gap-4">
		<span
			bind:this={chip}
			class="chip grid size-11 shrink-0 place-items-center rounded-2xl"
			data-resting={!pinned || undefined}
			style="--tint: {PALETTE[shortcut.color].css}"
		>
			<ShortcutIcon {shortcut} size={20} trigger="none" play={engaged || arriving} />
		</span>

		<!-- The lock and the switch share one cell, so one pops out as the other pops in. -->
		<div class="grid justify-items-end [&>*]:[grid-area:1/1]">
			{#if guarded}
				<div in:pop={{ scale: 0.8, duration: 0.35, bounce: 0.4 }} out:pop={{ scale: 0.8 }}>
					<button
						type="button"
						onclick={pressLock}
						{disabled}
						aria-label="{shortcut.label} is locked in your header. Press it {PRESSES} times in a row to take it out."
						class={cn(
							'lock press inline-flex h-9 items-center gap-2 rounded-full border pr-3.5 pl-3',
							'text-sm whitespace-nowrap text-fg-muted hover:bg-sunken',
							'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue'
						)}
						style="--strain: {presses / (PRESSES - 1)}"
					>
						<span bind:this={lock} class="inline-flex">
							<AnimatedIcon icon={ColorLock} set="color" play={arriving || opening} />
						</span>
						Locked
					</button>
				</div>
			{:else}
				<div in:pop={{ scale: 0.8, duration: 0.35, bounce: 0.4 }} out:pop={{ scale: 0.8 }}>
					<Switch
						id="pin-{shortcut.id}"
						checked={pinned}
						{disabled}
						label="Show {shortcut.label} in the header"
						onCheckedChange={(next) => onPinnedChange?.(next)}
					/>
				</div>
			{/if}
		</div>
	</div>

	<h2 class="mt-6 font-display text-2xl font-medium">{shortcut.label}</h2>
	<p class="mt-1.5 text-[0.9375rem] leading-relaxed text-fg-muted">{shortcut.description}</p>

	{#if error}
		<p
			class="mt-3 text-sm text-negative"
			transition:slide={{ duration: motion(280), easing: quintOut }}
		>
			{error}
		</p>
	{/if}

	<div class="mt-auto flex min-h-7 items-center justify-between gap-4 pt-6 text-sm">
		<!-- Both states share one cell, so a change moves from one to the other
		     rather than blinking between them. -->
		<span class="state grid" data-on={pinned || undefined}>
			<span class="on flex items-center gap-1.5 text-fg">
				<AnimatedIcon
					icon={MovingCheck}
					set="moving"
					size={14}
					trigger="none"
					play={pinned}
					class="text-positive"
				/>
				{shortcut.locked ? 'Locked in your header' : 'In your header'}
			</span>
			<span class="off text-fg-subtle" aria-hidden={pinned}>Not in your header</span>
		</span>

		{#if hotkey}
			<Kbd keys={hotkey} />
		{/if}
	</div>
</Card>

{#if shortcut.locked}
	<ConfirmDialog
		open={asking}
		onOpenChange={(open) => (asking = open)}
		title="Take {shortcut.label} out of the header?"
		description="It's home, which is why it's locked. You can pin it again from this page whenever you like."
		action="Take it out"
		tone="danger"
		onConfirm={() => {
			asking = false;
			onPinnedChange?.(false);
		}}
	>
		<div class="flex items-center gap-3">
			<ShortcutIcon {shortcut} size={18} trigger="mount" />
			<span class="text-[0.9375rem]">{shortcut.label}</span>
			<span class="ml-auto font-mono text-sm text-fg-muted">{shortcut.href}</span>
		</div>
	</ConfirmDialog>
{/if}

<style>
	/* The chip is the colour at 15 %; the glyph inside wears it at a glyph's
	   weight (ShortcutIcon). */
	.chip {
		background: color-mix(in oklab, var(--tint) 15%, transparent);
		transition:
			filter 0.4s var(--ease-out-quint),
			opacity 0.4s var(--ease-out-quint);
	}

	:global(.dark) .chip {
		background: color-mix(in oklab, var(--tint) 20%, transparent);
	}

	/* Out of the header, the colour steps back; pinning brings it in. */
	.chip[data-resting] {
		filter: grayscale(1);
		opacity: 0.55;
	}

	/* Pressed in a row, the lock takes on the colour of what it guards against:
	   `negative`, mixed in a little more with each press, and let go of when the
	   presses stop. */
	.lock {
		border-color: color-mix(
			in oklab,
			var(--color-negative) calc(var(--strain, 0) * 55%),
			var(--color-hairline)
		);
		background-color: color-mix(
			in oklab,
			var(--color-negative) calc(var(--strain, 0) * 12%),
			transparent
		);
		color: color-mix(
			in oklab,
			var(--color-negative) calc(var(--strain, 0) * 100%),
			var(--color-fg-muted)
		);
		transition:
			border-color 0.3s var(--ease-out-quint),
			background-color 0.3s var(--ease-out-quint),
			color 0.3s var(--ease-out-quint);
	}

	.state > span {
		grid-area: 1 / 1;
		transition:
			opacity 0.3s var(--ease-out-quint),
			translate 0.4s var(--ease-out-quint);
	}

	.state .on {
		opacity: 0;
		translate: 0 6px;
	}

	.state[data-on] .on {
		opacity: 1;
		translate: 0 0;
	}

	.state[data-on] .off {
		opacity: 0;
		translate: 0 -6px;
	}
</style>

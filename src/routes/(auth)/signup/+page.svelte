<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import LockKeyhole from '@lucide/svelte/icons/lock-keyhole';
	import gsap from 'gsap';
	import { onMount } from 'svelte';
	// Direct paths, not the barrels: keeps bits-ui and Floating UI off this page.
	import { countUp } from '$lib/actions/count-up';
	import { spring } from '$lib/actions/spring';
	import Blob from '$lib/components/ui/Blob.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import OrbitRing from '$lib/components/ui/OrbitRing.svelte';
	import Logo from '$lib/components/ui/Logo.svelte';
	import Meter from '$lib/components/ui/Meter.svelte';
	import Sparkle from '$lib/components/ui/Sparkle.svelte';
	import { formatCurrency, prefersReducedMotion } from '$lib/utils';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Placeholder figures for the preview — there is no data behind them.
	const headline = 'Your money, in one calm view.'.split(' ');
	const promises = [
		{ text: 'Every card, budget and loan in one view', color: 'lime' as const },
		{ text: 'Numbers that update as you spend', color: 'blue' as const },
		{ text: 'Sign-in secured by Auth0', color: 'violet' as const }
	];
	const chips = [
		{ label: 'Groceries', color: 'lime' as const },
		{ label: 'Rent', color: 'blue' as const },
		{ label: 'Savings goal', color: 'violet' as const },
		{ label: 'Loan repaid', color: 'lime' as const }
	];

	let root = $state<HTMLElement>();
	let meter = $state(0);
	let pending = $state<'signup' | 'login' | null>(null);

	/*
	 * Entrance choreography. Elements marked [data-anim] start hidden only once
	 * JS runs (see `.js [data-anim]` in app.css), so there is no flash of the
	 * final state before hydration and no-JS visitors still see everything.
	 */
	onMount(() => {
		if (!root) return;
		const q = gsap.utils.selector(root);

		if (prefersReducedMotion()) {
			gsap.set(q('[data-anim]'), { autoAlpha: 1 });
			meter = 0.62;
			return;
		}

		const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
		const float = gsap.to(q('[data-anim="chip"]'), {
			y: -5,
			duration: 2.6,
			ease: 'sine.inOut',
			yoyo: true,
			repeat: -1,
			stagger: { each: 0.45, from: 'random' },
			paused: true
		});

		try {
			tl.fromTo(q('[data-anim="panel"], [data-anim="card"]'),
				{ autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 })
				.fromTo(q('[data-anim="word"]'),
					{ autoAlpha: 0, yPercent: 110 }, { autoAlpha: 1, yPercent: 0, duration: 0.7, stagger: 0.05 }, '-=0.45')
				.fromTo(q('[data-anim="lede"], [data-anim="promise"]'),
					{ autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.06 }, '-=0.4')
				.fromTo(q('[data-anim="tile"]'),
					{ autoAlpha: 0, y: 28, rotate: -2, scale: 0.96 },
					{ autoAlpha: 1, y: 0, rotate: 0, scale: 1, duration: 0.7, stagger: 0.09 }, '-=0.35')
				// The Meter fills through its own CSS width transition.
				.add(() => (meter = 0.62), '-=0.3')
				.fromTo(q('[data-anim="chip"]'),
					{ autoAlpha: 0, scale: 0.8 },
					{ autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: 'back.out(1.8)' }, '-=0.25')
				.eventCallback('onComplete', () => float.play());
		} catch {
			// Never leave content hidden because an animation failed.
			gsap.set(q('[data-anim]'), { autoAlpha: 1 });
			meter = 0.62;
		}

		return () => {
			tl.kill();
			float.kill();
		};
	});

	const submit: import('@sveltejs/kit').SubmitFunction = ({ submitter }) => {
		pending = submitter?.getAttribute('value') === 'login' ? 'login' : 'signup';
		return async ({ result }) => {
			// Auth0 lives on another origin; SvelteKit's goto() refuses those.
			if (result.type === 'redirect') {
				window.location.assign(result.location);
				return;
			}
			pending = null;
			await applyAction(result);
		};
	};
</script>

<svelte:head><title>Create account · Monfly</title></svelte:head>

<div bind:this={root} class="grid flex-1 gap-4 lg:grid-cols-[1.15fr_1fr]">
	<!-- ── Preview: the dashboard's visual language, assembled by GSAP ───── -->
	<section
		data-anim="panel"
		aria-label="What Monfly looks like"
		class="@container relative hidden flex-col overflow-hidden rounded-[var(--radius-card)] bg-card p-8 lg:flex xl:p-10"
	>
		<div aria-hidden="true" class="pointer-events-none absolute -right-28 -bottom-36 size-[30rem] opacity-60">
			<Blob color="violet" blur={40} spread={70} />
		</div>
		<div aria-hidden="true" class="pointer-events-none absolute -top-28 -left-20 size-80 opacity-50">
			<Blob color="lime" blur={36} spread={70} />
		</div>

		<a href="/" class="relative flex w-fit items-center gap-3">
			<Logo class="h-7 w-auto" />
			<span class="h-6 w-px bg-line-strong"></span>
			<span class="font-display text-xl font-medium tracking-tight">Monfly</span>
		</a>

		<p class="relative mt-auto font-display text-5xl leading-[1.04] font-light tracking-tight text-balance @2xl:text-6xl">
			{#each headline as word, i (i)}
				<span class="inline-block overflow-hidden py-[0.06em] align-bottom">
					<span data-anim="word" class="inline-block">{word}</span>
				</span>{' '}
			{/each}
		</p>
		<p data-anim="lede" class="relative mt-4 max-w-md text-[0.9375rem] leading-relaxed text-fg-muted">
			Track cards, budgets and loans side by side — the same dashboard you are about to open.
		</p>

		<div class="relative mt-10 grid gap-3 @xl:grid-cols-[1.35fr_1fr]">
			<div data-anim="tile" class="rounded-[1.25rem] bg-sunken/85 p-5 pt-6 backdrop-blur-sm">
				<div class="mb-5 flex items-baseline justify-between gap-3">
					<span class="text-sm text-fg-muted">Monthly budget</span>
					<span
						class="font-display tabular text-lg"
						use:countUp={{ value: 2400, format: formatCurrency, whenVisible: true }}
					></span>
				</div>
				<Meter value={meter} color="lime" />
			</div>

			<div data-anim="tile" class="flex items-center gap-4 rounded-[1.25rem] bg-sunken/85 p-5 backdrop-blur-sm">
				<OrbitRing class="w-16 shrink-0" markers={[0.25, 0.75]}>
					<div class="relative size-full"><Blob color="blue" blur={6} spread={80} /></div>
				</OrbitRing>
				<div class="min-w-0">
					<p class="text-sm text-fg-muted">Balance</p>
					<p
						class="font-display tabular text-2xl font-light"
						use:countUp={{ value: 12435, format: formatCurrency, whenVisible: true }}
					></p>
				</div>
			</div>
		</div>

		<ul class="relative mt-3 flex flex-wrap gap-2" aria-label="Example categories">
			{#each chips as chip (chip.label)}
				<li data-anim="chip" class="inline-flex items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1.5 text-sm">
					<Sparkle color={chip.color} class="size-3.5" />
					{chip.label}
				</li>
			{/each}
		</ul>
	</section>

	<!-- ── Auth card — fills its grid cell, mirroring the preview panel ──── -->
	<main class="flex">
		<Card class="@container flex w-full flex-col p-8 sm:p-10 xl:p-12" data-anim="card">
			<!-- Header row, like the dashboard's cards: title left, action right. -->
			<div class="flex items-center justify-between gap-4">
				<a href="/" class="flex items-center gap-3 lg:hidden">
					<Logo class="h-7 w-auto" />
					<span class="h-6 w-px bg-line-strong"></span>
					<span class="font-display text-xl font-medium tracking-tight">Monfly</span>
				</a>
				<p class="hidden font-display text-2xl font-medium lg:block">Create account</p>

				<!-- Submits the form below through its form="auth-form" attribute. -->
				<button
					form="auth-form"
					type="submit"
					name="intent"
					value="login"
					use:spring
					disabled={!data.auth0Ready || pending !== null}
					class="inline-flex h-10 shrink-0 items-center rounded-full border border-hairline px-5 text-sm transition-colors duration-200 hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-45"
				>
					{pending === 'login' ? 'Opening Auth0…' : 'Log in'}
				</button>
			</div>

			<!-- Anchored to the bottom, like the preview's headline, so both cards end together. -->
			<div class="mt-auto max-w-md pt-16">
				<h1 class="font-display text-[2.5rem] leading-[1.05] font-light tracking-tight text-balance @lg:text-5xl">
					Start with Monfly
				</h1>
				<p class="mt-3 text-[0.9375rem] text-fg-muted">One account for every card, budget and loan.</p>

				<ul class="mt-8 space-y-3">
					{#each promises as item (item.text)}
						<li data-anim="promise" class="flex items-center gap-3 text-[0.9375rem]">
							<Sparkle color={item.color} class="size-4 shrink-0" />
							{item.text}
						</li>
					{/each}
				</ul>

				<form id="auth-form" method="POST" class="mt-10" use:enhance={submit}>
					<input type="hidden" name="redirectTo" value={data.redirectTo ?? ''} />
					<button
						type="submit"
						name="intent"
						value="signup"
						use:spring
						disabled={!data.auth0Ready || pending !== null}
						class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-fg px-6 text-[0.9375rem] font-medium text-window transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
					>
						{pending === 'signup' ? 'Opening Auth0…' : 'Create account'}
						<ArrowRight class="size-4" />
					</button>
				</form>

				<div aria-live="polite">
					{#if form?.message || data.authError}
						<p role="alert" class="mt-5 rounded-xl bg-negative/10 p-3 text-sm text-negative">
							{form?.message ?? data.authError}
						</p>
					{/if}
					{#if !data.auth0Ready}
						<p class="mt-5 rounded-xl bg-sunken p-3 text-xs leading-relaxed text-fg-muted">
							Auth0 isn't configured yet — fill the <code>AUTH0_*</code> variables in <code>.env</code>
							(see <code>.env.example</code>).
						</p>
					{/if}
				</div>

				<p class="mt-6 flex items-start gap-2 text-xs leading-relaxed text-fg-subtle">
					<LockKeyhole class="mt-0.5 size-3.5 shrink-0" />
					<span>Secured by Auth0. By continuing you agree to the Terms and the Privacy Policy.</span>
				</p>
			</div>
		</Card>
	</main>
</div>

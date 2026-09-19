<script module lang="ts">
	/** What the panel does with the loan open: reads it, edits it, or records a payment on it. */
	export type LoanMode = 'read' | 'edit' | 'pay';
</script>

<script lang="ts">
	import MovingEye from '@jis3r/icons/icons/eye';
	import MovingHandCoins from '@jis3r/icons/icons/hand-coins';
	import MovingPencil from '@jis3r/icons/icons/pencil';
	import MovingPlus from '@jis3r/icons/icons/plus';
	import MovingTrash from '@jis3r/icons/icons/trash-2';
	import MovingUndo from '@jis3r/icons/icons/undo';
	import X from '@lucide/svelte/icons/x';
	import { createMutation, useQueryClient } from '@tanstack/svelte-query';
	import gsap from 'gsap';
	import { animate, stagger } from 'motion';
	import type { Account } from '$lib/accounts';
	import { countUp } from '$lib/actions';
	import {
		AnimatedIcon,
		Avatar,
		Card,
		ConfirmDialog,
		IconButton,
		Notice,
		Orb,
		PALETTE,
		PillButton,
		Sparkle,
		Tooltip,
		type PaletteColor
	} from '$lib/components/ui';
	import { formatMoney, type Currency, type DateKey } from '$lib/finance';
	import {
		LOAN_DIRECTION_LABEL,
		LOAN_STATUS_LABEL,
		loanDue,
		loanLeft,
		settledOffRecord,
		shortDay,
		type Loan
	} from '$lib/loans';
	import { deleteLoanMutation, settleLoanMutation, undoPaymentMutation } from '$lib/queries';
	import { pop } from '$lib/transitions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';
	import DueChip from './DueChip.svelte';
	import LoanDial from './LoanDial.svelte';
	import LoanEditor from './LoanEditor.svelte';
	import PaymentEditor from './PaymentEditor.svelte';
	import { DIRECTION_CHIP, DIRECTION_GLYPH, DIRECTION_TINT } from './tone';

	/**
	 * The panel beside the loans, where one is read and written — the ledger
	 * panel's modes in the same colours: it reads a loan (the eye, blue), edits
	 * it (the pencil, violet) or, with none open, writes a new one (the plus,
	 * lime). A fourth records a payment on it, under the hand of coins in the
	 * Loans colour. Reading, it's the loan's dial, its figures, its days and
	 * every payment recorded on it.
	 */
	type Props = {
		/** The loan on show, or nothing: then the panel writes a new one. */
		loan: Loan | null;
		mode: LoanMode;
		/** Everyone a loan was made with: the name field's suggestions. */
		people: string[];
		/** The active accounts: where a payment lands or leaves from. */
		accounts: Account[];
		/** Each account's colour, by id. */
		colors: Record<string, PaletteColor>;
		currency: Currency;
		timeZone: string;
		today: DateKey;
		/** A new loan can be given up on only when there's one to go back to. */
		cancellable: boolean;
		onModeChange: (mode: LoanMode) => void;
		/** A new loan was added — with its id — or writing one was given up on. */
		onDone: (id?: string) => void;
		/** The loan open was removed. */
		onDeleted: () => void;
	};

	let {
		loan,
		mode,
		people,
		accounts,
		colors,
		currency,
		timeZone,
		today,
		cancellable,
		onModeChange,
		onDone,
		onDeleted
	}: Props = $props();

	const queryClient = useQueryClient();
	const settle = createMutation(() => settleLoanMutation(queryClient));
	const remove = createMutation(() => deleteLoanMutation(queryClient));
	const undo = createMutation(() => undoPaymentMutation(queryClient));

	const writing = $derived(loan === null);
	const editing = $derived(loan !== null && mode === 'edit');
	const paying = $derived(loan !== null && mode === 'pay');
	/** What it's showing, so a change can turn it. */
	const showing = $derived(loan ? `${loan.id}:${mode}` : 'new');
	const subject = $derived(loan?.id ?? 'new');

	const money = (cents: number) => formatMoney(Math.round(cents), currency);
	const tint = $derived(loan ? DIRECTION_TINT[loan.direction] : 'lime');
	const left = $derived(loan ? loanLeft(loan) : 0);
	const offRecord = $derived(loan ? settledOffRecord(loan) : 0);
	const settled = $derived(loan?.status === 'paid');
	/** Opening it again changes something only while part of it was settled off the record. */
	const reopenable = $derived(settled && offRecord > 0);

	const longDay = (key: DateKey | null) => {
		if (!key) return '—';
		const [y, m, d] = key.split('-').map(Number);
		return new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(Date.UTC(y, m - 1, d)));
	};
	const paidOn = (iso: string) =>
		new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone }).format(
			new Date(iso)
		);

	let confirming = $state(false);
	/** The payment whose undo is being asked about. */
	let undoing = $state<Loan['payments'][number] | null>(null);
	let problem = $state<string | null>(null);

	function removeLoan() {
		if (!loan) return;
		remove.mutate(loan.id, {
			onSuccess: () => {
				confirming = false;
				onDeleted();
			}
		});
	}

	function undoPayment() {
		if (!loan || !undoing) return;
		undo.mutate({ loanId: loan.id, paymentId: undoing.id }, { onSuccess: () => (undoing = null) });
	}

	function toggleSettled() {
		if (!loan) return;
		problem = null;
		settle.mutate(
			{ id: loan.id, settled: !settled },
			{ onError: (error) => (problem = `Couldn't change it: ${error.message}`) }
		);
	}

	let panel = $state<HTMLElement | null>(null);
	let was = 0;
	let held: string | null = null;
	let easing: ReturnType<typeof animate> | null = null;

	/**
	 * The panel keeps its place while what's in it changes, easing its height
	 * so what's below glides with it; a loan arriving rises into it — the
	 * accounts panel's motion, measured the same way.
	 */
	$effect(() => {
		void showing;
		const node = panel;
		if (!node) return;

		easing?.stop();
		node.style.height = '';
		const to = node.offsetHeight;
		const from = was;
		const arrived = held !== null && held !== subject;
		was = to;
		held = subject;

		if (prefersReducedMotion()) return;

		if (from && from !== to) {
			easing = animate(
				node,
				{ height: [`${from}px`, `${to}px`] },
				{ duration: 0.42, ease: EASE_OUT_QUINT }
			);
			easing.finished
				.then(() => {
					node.style.height = '';
					easing = null;
				})
				.catch(() => {});
		}

		const card = node.firstElementChild;
		if (arrived && card instanceof HTMLElement) {
			card.style.opacity = '0';
			animate(card, { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, ease: EASE_OUT_QUINT })
				.finished.then(() => {
					card.style.opacity = '';
				})
				.catch(() => {});
		}
	});

	let halo = $state<HTMLElement | null>(null);
	let turned = false;

	/** A halo swells out of the mode's chip as the panel turns from one mode to another. */
	$effect(() => {
		void mode;
		void writing;
		if (!turned) {
			turned = true;
			return;
		}
		const ring = halo;
		if (!ring || prefersReducedMotion()) return;
		gsap.fromTo(
			ring,
			{ scale: 0.85, opacity: 0.35 },
			{ scale: 1.8, opacity: 0, duration: 0.55, ease: 'power2.out', overwrite: true }
		);
		return () => gsap.killTweensOf(ring);
	});

	/** Payment rows deal in, 40 ms apart, as the loan's facts appear. */
	function deal(node: HTMLElement) {
		if (prefersReducedMotion()) return;
		animate(
			node.children,
			{ opacity: [0, 1], y: [6, 0] },
			{ delay: stagger(0.04, { startDelay: 0.15 }), duration: 0.35, ease: EASE_OUT_QUINT }
		);
	}

	/** The Loans colour for the hand of coins: the lemon, at a glyph's weight on white. */
	const LEMON =
		'bg-[color-mix(in_oklab,var(--tint)_28%,transparent)] text-[oklch(from_var(--tint)_0.5_calc(c*1.6)_h)] dark:bg-[color-mix(in_oklab,var(--tint)_18%,transparent)] dark:text-(--tint)';
</script>

<div bind:this={panel} class="overflow-hidden">
	<Card class="p-7">
		<div class="flex items-start justify-between gap-4">
			<div class="flex min-w-0 items-center gap-2.5 text-[0.9375rem] text-fg-muted">
				<span
					class={cn(
						'relative grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-300',
						writing
							? 'bg-lime/30 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] dark:bg-lime/15 dark:text-lime'
							: paying
								? LEMON
								: editing
									? 'bg-violet/12 text-violet'
									: 'bg-blue/12 text-blue'
					)}
					style="--tint: {PALETTE.lemon.css}"
					aria-hidden="true"
				>
					<span
						bind:this={halo}
						class="pointer-events-none absolute inset-0 rounded-lg bg-current opacity-0"
					></span>
					{#key showing}
						<span class="relative flex" in:pop={{ scale: 0.5, bounce: 0.5, duration: 0.45 }}>
							<AnimatedIcon
								icon={writing
									? MovingPlus
									: paying
										? MovingHandCoins
										: editing
											? MovingPencil
											: MovingEye}
								set="moving"
								trigger="mount"
							/>
						</span>
					{/key}
				</span>
				<span class="truncate">
					{#if loan}
						{paying
							? 'Recording a payment'
							: editing
								? 'Editing'
								: LOAN_DIRECTION_LABEL[loan.direction]}
					{:else}
						New loan
					{/if}
				</span>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				{#if loan && !settled}
					<!-- Recording a payment: a toggle held down in the Loans colour while its
					     fields are open, as the pencil is in violet. -->
					<IconButton
						size="sm"
						aria-pressed={paying}
						aria-label={paying
							? 'Stop recording a payment'
							: `Record a payment from ${loan.person}`}
						onclick={() => onModeChange(paying ? 'read' : 'pay')}
						style="--tint: {PALETTE.lemon.css}"
						class={cn(
							'transition-colors duration-300',
							paying &&
								'border-[oklch(from_var(--tint)_calc(l-0.25)_c_h)] bg-[color-mix(in_oklab,var(--tint)_28%,transparent)] text-[oklch(from_var(--tint)_0.5_calc(c*1.6)_h)] dark:text-(--tint)'
						)}
					>
						<AnimatedIcon icon={MovingHandCoins} set="moving" play={paying} />
					</IconButton>
				{/if}
				{#if loan}
					<IconButton
						size="sm"
						aria-pressed={editing}
						aria-label={editing ? 'Stop editing' : 'Edit loan'}
						onclick={() => onModeChange(editing ? 'read' : 'edit')}
						class={cn(
							'transition-colors duration-300',
							editing && 'border-violet/40 bg-violet/12 text-violet not-disabled:hover:bg-violet/20'
						)}
					>
						<AnimatedIcon icon={MovingPencil} set="moving" play={editing} />
					</IconButton>
				{:else if cancellable}
					<IconButton size="sm" aria-label="Discard this loan" onclick={() => onDone()}>
						<X />
					</IconButton>
				{/if}
			</div>
		</div>

		{#if loan}
			<!-- Who it's with: their blobatar, alive under the pointer, and a sparkle
			     in the side's colour that flashes when the loan is settled. -->
			<div class="mt-5 flex items-start gap-3">
				<Avatar seed={loan.person} animated class="size-11 shrink-0" />
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-2">
						<h2 class="font-display text-2xl leading-tight font-medium text-balance wrap-anywhere">
							{loan.person}
						</h2>
						<Sparkle
							color={tint}
							animated
							burst={loan.status}
							class="size-4 shrink-0"
							label={LOAN_STATUS_LABEL[loan.status]}
						/>
					</div>
					<p class="mt-0.5 text-sm text-fg-muted">
						{loan.direction === 'lent' ? 'Lent' : 'Borrowed'} on {longDay(loan.issuedOn)}
					</p>
				</div>
			</div>
		{/if}

		{#if loan && paying}
			{#key loan.id}
				<PaymentEditor
					{loan}
					{accounts}
					{colors}
					{currency}
					{timeZone}
					onDone={() => onModeChange('read')}
				/>
			{/key}
		{:else if loan && !editing}
			<LoanDial amount={loan.amount} paid={loan.paid} color={tint} {currency} class="mt-8" />

			<dl class="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6">
				{#each [{ label: loan.direction === 'lent' ? 'Lent' : 'Borrowed', value: loan.amount, tone: '' }, { label: 'Settled', value: Math.min(loan.paid, loan.amount), tone: 'text-positive' }, { label: 'Left', value: left, tone: '' }] as fact (fact.label)}
					<div class="min-w-0">
						<dt class="text-sm text-fg-muted">{fact.label}</dt>
						<dd class="@container mt-1">
							<p
								class={cn('fit-figure tabular font-display leading-none font-light', fact.tone)}
								style="--fit: 1.25rem; --chars: {money(fact.value).length}"
								use:countUp={{ value: fact.value, format: money, whenVisible: true }}
							>
								{money(fact.value)}
							</p>
						</dd>
					</div>
				{/each}
			</dl>

			<dl class="mt-6 grid gap-3 border-t border-line pt-6">
				<div class="flex items-center justify-between gap-4">
					<dt class="text-sm text-fg-muted">Due</dt>
					<dd class="flex items-center gap-2 text-right text-[0.9375rem]">
						{#if loan.dueOn}<span class="tabular">{shortDay(loan.dueOn)}</span>{/if}
						<DueChip due={loanDue(loan, today)} dueOn={loan.dueOn} />
					</dd>
				</div>
				{#if loan.paidOn}
					<div class="flex items-baseline justify-between gap-4">
						<dt class="text-sm text-fg-muted">Settled on</dt>
						<dd class="text-right text-[0.9375rem]">{longDay(loan.paidOn)}</dd>
					</div>
				{/if}
				<div class="flex items-baseline justify-between gap-4">
					<dt class="text-sm text-fg-muted">Which way</dt>
					<dd>
						<span
							class={cn(
								'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium',
								DIRECTION_CHIP[loan.direction]
							)}
						>
							<AnimatedIcon {...DIRECTION_GLYPH[loan.direction]} size={12} trigger="mount" />
							{loan.direction === 'lent' ? 'Comes back to you' : 'Goes back from you'}
						</span>
					</dd>
				</div>
			</dl>

			{#if loan.notes}
				<p
					class="mt-5 rounded-[var(--radius-chip)] bg-sunken px-4 py-3 text-sm leading-relaxed text-fg-muted"
				>
					{loan.notes}
				</p>
			{/if}

			<!-- Every payment recorded on an account, newest first, each with its undo. -->
			<div class="mt-6 border-t border-line pt-6">
				<div class="flex items-baseline justify-between gap-3">
					<h3 class="text-[0.9375rem] font-medium">Payments</h3>
					{#if loan.payments.length > 0}
						<span class="text-sm text-fg-muted">{loan.payments.length}</span>
					{/if}
				</div>
				{#if loan.payments.length === 0 && offRecord === 0}
					<p class="mt-2 text-sm text-fg-muted">
						None recorded yet. {settled
							? ''
							: loan.direction === 'lent'
								? 'When some comes back, record it here.'
								: 'When you pay some back, record it here.'}
					</p>
				{:else}
					<ul class="mt-3 grid gap-1" use:deal>
						{#each loan.payments as payment (payment.id)}
							<li
								class="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-sunken"
							>
								<span class="tabular w-12 shrink-0 text-xs text-fg-muted"
									>{paidOn(payment.date)}</span
								>
								{#if payment.account}
									<Orb
										color={colors[payment.account.id] ?? 'blue'}
										blur={2.5}
										spread={80}
										class="size-4 shrink-0 rounded-full border border-line bg-card"
									/>
									<span class="min-w-0 flex-1 truncate text-sm">{payment.account.name}</span>
								{:else}
									<span
										class="size-4 shrink-0 rounded-full border border-dashed border-hairline"
										aria-hidden="true"
									></span>
									<span class="min-w-0 flex-1 truncate text-sm text-fg-muted">No account</span>
								{/if}
								<span
									class={cn(
										'tabular shrink-0 text-sm font-medium',
										loan.direction === 'lent' ? 'text-positive' : 'text-spent'
									)}
								>
									{loan.direction === 'lent' ? '+' : '−'}{money(payment.amount)}
								</span>
								<Tooltip label="Undo this payment" side="left">
									{#snippet children({ props })}
										<IconButton
											{...props}
											size="sm"
											aria-label="Undo the {money(payment.amount)} payment of {paidOn(
												payment.date
											)}"
											onclick={() => (undoing = payment)}
											class="shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
										>
											<AnimatedIcon icon={MovingUndo} set="moving" />
										</IconButton>
									{/snippet}
								</Tooltip>
							</li>
						{/each}
						{#if offRecord > 0}
							<li class="flex items-center gap-3 px-2 py-2 text-sm text-fg-muted">
								<span class="hatch size-4 shrink-0 rounded-full border border-hairline"></span>
								<span class="min-w-0 flex-1">Settled off the record</span>
								<span class="tabular shrink-0">{money(offRecord)}</span>
							</li>
						{/if}
					</ul>
				{/if}
			</div>

			{#if problem}
				<p class="mt-4 text-sm text-negative" role="alert">{problem}</p>
			{/if}

			<!-- What's done to the whole loan, apart at the two ends of the row. -->
			<div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
				{#if loan.payments.length > 0}
					<Tooltip label="Undo its payments first: they're recorded on your accounts">
						{#snippet children({ props })}
							<button
								{...props}
								type="button"
								aria-disabled="true"
								class="cursor-not-allowed text-sm text-fg-subtle">Delete</button
							>
						{/snippet}
					</Tooltip>
				{:else}
					<button
						type="button"
						class="group inline-flex items-center gap-1.5 text-sm text-negative underline-offset-2 hover:underline"
						onclick={() => (confirming = true)}
					>
						<AnimatedIcon icon={MovingTrash} set="moving" size={15} />
						Delete
					</button>
				{/if}
				{#if !settled}
					<PillButton size="sm" disabled={settle.isPending} onclick={toggleSettled}>
						{settle.isPending ? 'Settling…' : 'Mark as settled'}
					</PillButton>
				{:else if reopenable}
					<PillButton size="sm" disabled={settle.isPending} onclick={toggleSettled}>
						{settle.isPending ? 'Opening…' : 'Open it again'}
					</PillButton>
				{/if}
			</div>
		{:else}
			{#if !loan}
				<Notice id="new-loan" title="Writing down a loan" class="mt-6">
					Who it's with, how much, and when it falls due. Nothing moves on your accounts until a
					payment is recorded — then it lands on the account you pick.
				</Notice>
			{/if}
			{#key subject}
				<LoanEditor
					{loan}
					{people}
					{currency}
					{timeZone}
					cancellable={loan !== null || cancellable}
					onDone={(id) => (loan ? onModeChange('read') : onDone(id))}
				/>
			{/key}
		{/if}
	</Card>
</div>

{#if loan}
	<ConfirmDialog
		open={confirming}
		onOpenChange={(open) => (confirming = open)}
		title="Delete this loan?"
		description="The loan {loan.direction === 'lent' ? 'to' : 'from'} {loan.person} of {money(
			loan.amount
		)} goes for good. Nothing on your accounts moves."
		action="Delete loan"
		pending={remove.isPending}
		error={remove.error ? `Couldn't delete it: ${remove.error.message}` : null}
		onConfirm={removeLoan}
	/>
	<ConfirmDialog
		open={undoing !== null}
		onOpenChange={(open) => {
			if (!open) undoing = null;
		}}
		title="Undo this payment?"
		description={undoing
			? `The ${money(undoing.amount)} it recorded${undoing.account ? ` on ${undoing.account.name}` : ''} comes off, and the loan goes back to ${money(left + undoing.amount)} left.`
			: ''}
		action="Undo payment"
		pending={undo.isPending}
		error={undo.error ? `Couldn't undo it: ${undo.error.message}` : null}
		onConfirm={undoPayment}
	/>
{/if}

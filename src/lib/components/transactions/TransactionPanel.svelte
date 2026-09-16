<script lang="ts">
	import MovingEye from '@jis3r/icons/icons/eye';
	import MovingPencil from '@jis3r/icons/icons/pencil';
	import MovingPlus from '@jis3r/icons/icons/plus';
	import MovingSendHorizontal from '@jis3r/icons/icons/send-horizontal';
	import X from '@lucide/svelte/icons/x';
	import gsap from 'gsap';
	import {
		AnimatedIcon,
		Card,
		Figure,
		FIGURE_SIZES,
		IconButton,
		Notice,
		Orb,
		PALETTE,
		type FigureSize,
		type PaletteColor
	} from '$lib/components/ui';
	import { animate } from 'motion';
	import { moneyField } from '$lib/actions';
	import { formatMoney, MAX_MONEY_LENGTH, parseMoney, type Currency } from '$lib/finance';
	import { pop } from '$lib/transitions';
	import type { TransactionDraft } from '$lib/transaction-panel';
	import { signedAmount, type TransactionRow } from '$lib/transactions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';
	import TransactionEditor from './TransactionEditor.svelte';

	/**
	 * The panel beside the table, where a transaction is read and written. It
	 * does one of three things, and says which at the top: it reads a row, it
	 * edits that row, or — with no row at all — it writes a new one. All three
	 * are the same card in the same place, so there is one panel to learn
	 * rather than a page of its own for adding. A transfer is one of them too:
	 * the draft's type, or the row's, says so.
	 */
	type Props = {
		/** The row on show, or nothing at all: then the panel writes a new one. */
		row?: TransactionRow | null;
		currency: Currency;
		/** The viewer's zone: the date is drawn in it. */
		timeZone: string;
		colors?: Record<string, PaletteColor>;
		/** The user's active accounts: a new transaction can name one. */
		accounts?: { id: string; name: string }[];
		/** Every category the record names, most used first: the category field suggests them. */
		categories?: string[];
		/** Colours people picked for their categories (`User.colors.category`). */
		categoryChoices?: Record<string, PaletteColor>;
		/** The panel is open on a row's fields rather than its facts. */
		editing?: boolean;
		/**
		 * The fields while they're open, held by the page, which fills them as
		 * they open and keeps them in this browser (`$lib/transaction-panel`).
		 * The figure here writes the amount into it as the form below does, so
		 * pressing it is another way to type the amount rather than a second copy.
		 */
		draft: TransactionDraft;
		onEditingChange?: (editing: boolean) => void;
		onClose?: () => void;
	};

	let {
		row = null,
		currency,
		timeZone,
		colors = {},
		accounts = [],
		categories = [],
		categoryChoices,
		editing = false,
		draft,
		onEditingChange,
		onClose
	}: Props = $props();

	/** Writing a new one: no row to read, so the fields are all there is. */
	const writing = $derived(row === null);
	/** The fields are open, for a new transaction or an old one. */
	const fields = $derived(writing || editing);

	/** What the panel is showing, whatever mode: a row, or a new transaction. */
	const subject = $derived(row?.id ?? 'new');

	/** Money moved between two accounts: the row read, or the one being written. */
	const moving = $derived(row ? row.transfer !== null : draft.type === 'transfer');

	/** What the figure is worth: the row as recorded, or the draft as typed. */
	const typed = $derived(parseMoney(draft.amount) ?? 0);
	const amount = $derived(
		fields ? (draft.type === 'income' ? typed : -typed) : row ? signedAmount(row) : 0
	);
	// A transfer is neither in nor out, so it never wears green: one side of it is income only to v1.
	const income = $derived(!moving && (fields ? draft.type === 'income' : row?.type === 'income'));

	/** The figure has the caret: it shows what is being typed, not what it formats to. */
	let writingFigure = $state(false);
	const full = $derived(
		row
			? new Intl.DateTimeFormat('en-US', {
					timeZone,
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				}).format(new Date(row.date))
			: ''
	);

	const signed = (cents: number) =>
		`${cents > 0 ? '+' : cents < 0 ? '−' : ''}${formatMoney(Math.abs(cents), currency)}`;

	/**
	 * The figure as it reads. A recorded transaction keeps its sign, in reading
	 * and in editing alike: it already moved the balance one way, and that is
	 * half of what the panel says about it. One being written has none — which
	 * way it goes is the choice right below, still being made, and a sign over
	 * it would be the answer before the question. Neither has a transfer, which
	 * is out of one account and into another at once.
	 */
	const shown = $derived(
		writing || moving ? formatMoney(Math.abs(amount), currency) : signed(amount)
	);

	/**
	 * The largest type it still fits the card in. Across the whole 23rem column
	 * a figure runs to thirteen characters at `lg` — more than the longest
	 * amount anyone can record — and past that it steps down rather than being
	 * cut off mid-cent in the field.
	 */
	const size = $derived<FigureSize>(shown.length <= 13 ? 'lg' : shown.length <= 18 ? 'md' : 'sm');

	const facts = $derived(
		row
			? row.transfer
				? [
						{ label: 'Date', value: full },
						{ label: 'Kind', value: 'Between your accounts' }
					]
				: [
						{ label: 'Date', value: full },
						{ label: 'Category', value: row.category },
						{ label: 'Kind', value: row.type === 'income' ? 'Money in' : 'Money out' }
					]
			: []
	);

	let panel = $state<HTMLElement | null>(null);
	/** The height it was last drawn at, to ease away from. */
	let was = 0;
	/** Which transaction it was last drawn for: another one arrives, the same one turns. */
	let held: string | null = null;
	let easing: ReturnType<typeof animate> | null = null;

	/** What it is showing: a row, its fields, or a new transaction's or transfer's. */
	const showing = $derived(row ? `${row.id}:${editing}` : `new:${moving}`);

	/**
	 * The panel keeps its place while what's in it changes — the fields opening
	 * over the facts, another row taking it over, or a new transaction taking
	 * the place of either. Rather than snapping to the new height and dropping
	 * the cards below it a card's worth in one frame, it eases between the two
	 * (Motion) and they glide with it. A transaction arriving rises into it as a
	 * card's tabs swap; the fields deal themselves in, so they come with their
	 * own.
	 */
	$effect(() => {
		showing;

		const node = panel;
		if (!node) return;

		// Measure what it would be, not where a running ease left it.
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

		/*
		 * Only a transaction arriving rises in. The same one turning between its
		 * facts and its fields keeps what it has: the height easing carries that
		 * change, and fading the whole card from nothing over it read as a blink.
		 * Held at nothing first, as the fields' deal is, so Motion's first
		 * keyframe landing a frame late can't flash it at full strength.
		 */
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
	/** Past the first draw: the panel's own entrance carries that one. */
	let turned = false;

	/**
	 * The turn between one thing and another, marked where the panel says which
	 * it is doing: the chip eases to the new colour (CSS) as its glyph springs
	 * in (Motion, on the key below), and a halo in that colour swells out of it
	 * and fades (GSAP), so the change registers even when the eye is on the
	 * button that was pressed.
	 */
	$effect(() => {
		fields;
		writing;
		moving;

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
</script>

<!-- `overflow-hidden`, so the contents are clipped rather than spilling while
     the height eases between two of them. -->
<div bind:this={panel} class="overflow-hidden">
	<Card class="p-7">
		<!-- The label shares its line with the buttons; the figure takes the one
		     below, and with it the card's whole width — beside them it was reading
		     a third of a card's worth short, and long amounts were cut off. -->
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				<!-- What the panel is doing, in the glyph and colour it was offered
				     under: the eye in blue while it reads a row, the pencil in violet
				     while it edits one, the plus in lime — what's new — while it writes
				     one. Lime is too light for a glyph on white, so there it inverts,
				     as the budget's chip does. A new transfer wears sending, in the
				     lavender its rows are drawn in. -->
				<p class="flex items-center gap-2.5 text-[0.9375rem] text-fg-muted">
					<span
						class={cn(
							'relative grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-300',
							writing && moving
								? 'bg-[color-mix(in_oklab,var(--tint)_15%,transparent)] text-[oklch(from_var(--tint)_0.55_calc(c*1.7)_h)] dark:bg-[color-mix(in_oklab,var(--tint)_20%,transparent)] dark:text-(--tint)'
								: writing
									? 'bg-lime/30 text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] dark:bg-lime/15 dark:text-lime'
									: editing
										? 'bg-violet/12 text-violet'
										: 'bg-blue/12 text-blue'
						)}
						style="--tint: {PALETTE.lavender.css}"
						aria-hidden="true"
					>
						<!-- The halo the turn swells out of, in the mode's own colour. -->
						<span
							bind:this={halo}
							class="pointer-events-none absolute inset-0 rounded-lg bg-current opacity-0"
						></span>
						{#key showing}
							<span class="relative flex" in:pop={{ scale: 0.5, bounce: 0.5, duration: 0.45 }}>
								<AnimatedIcon
									icon={writing
										? moving
											? MovingSendHorizontal
											: MovingPlus
										: editing
											? MovingPencil
											: MovingEye}
									set="moving"
									trigger="mount"
								/>
							</span>
						{/key}
					</span>
					{#if row}
						{row.transfer ? 'Moved' : row.type === 'income' ? 'Received' : 'Spent'}
					{:else}
						{moving ? 'New transfer' : 'New transaction'}
					{/if}
				</p>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				{#if row}
					<!-- A toggle, not a way in: while the fields are open it stays held
				     down in configuration's violet — filled, rimmed and lit — so the
				     panel never leaves you guessing which of the two you are in. Its
				     pencil holds its own gesture meanwhile, as the Income card's gear
				     does while its settings are open. Disabled on a loan payment,
				     where it turns to dashes: those rules live in v1. -->
					<IconButton
						size="sm"
						aria-pressed={editing}
						aria-label={row.loanLinked
							? 'Editing a loan payment happens in Monfly v1'
							: editing
								? 'Stop editing'
								: 'Edit transaction'}
						disabled={row.loanLinked}
						onclick={() => onEditingChange?.(!editing)}
						class={cn(
							'transition-colors duration-300',
							editing && 'border-violet/40 bg-violet/12 text-violet not-disabled:hover:bg-violet/20'
						)}
					>
						<AnimatedIcon icon={MovingPencil} set="moving" play={editing} />
					</IconButton>
				{/if}
				{#if onClose}
					<IconButton
						size="sm"
						aria-label={writing
							? `Discard this ${moving ? 'transfer' : 'transaction'}`
							: 'Close details'}
						onclick={onClose}
					>
						<X />
					</IconButton>
				{/if}
			</div>
		</div>

		{#if fields}
			<!-- With the fields open the figure is the amount, not a copy of it:
				     press it and it takes the caret, in the same type at the same
				     size with no box around it — only what you type changes. It
				     writes into the field below and follows it back, and Enter
				     simply lets go. It reads as money again the moment it does. -->
			<input
				value={writingFigure ? draft.amount : shown}
				use:moneyField={(next) => (draft.amount = next)}
				inputmode="decimal"
				autocomplete="off"
				spellcheck="false"
				maxlength={MAX_MONEY_LENGTH}
				placeholder="0"
				aria-label="Amount"
				onfocus={() => (writingFigure = true)}
				onblur={() => (writingFigure = false)}
				onkeydown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						event.currentTarget.blur();
					}
				}}
				class={cn(
					'tabular mt-1 w-full bg-transparent font-display leading-none font-light tracking-tight',
					FIGURE_SIZES[size],
					'transition-colors duration-300 outline-none placeholder:text-fg-subtle',
					income && 'text-positive',
					typed === 0 && !writingFigure && 'text-fg-subtle'
				)}
			/>
		{:else}
			<Figure
				value={shown}
				{size}
				class={cn('mt-1 transition-colors duration-300', income && 'text-positive')}
			/>
		{/if}

		{#if row}
			<p class="mt-6 text-lg leading-snug font-medium">{row.category}</p>
			{#if row.description}
				<p class="mt-1 text-[0.9375rem] leading-relaxed text-fg-muted">{row.description}</p>
			{/if}
		{:else if moving}
			<!-- What a transfer does to the figures, said once, as adding one is. -->
			<Notice id="new-transfer" title="Moving money" class="mt-6">
				From one of your accounts to another. Both balances move and your total stays where it is:
				money that changed places isn't counted as income or spending.
			</Notice>
		{:else}
			<!-- What writing one does, said once: put away, it stays away in this browser. -->
			<Notice id="new-transaction" title="Adding a transaction" class="mt-6">
				What it was worth, what it was for, and the day it happened. It joins the ledger below, and
				the account you name takes it into its balance.
			</Notice>
		{/if}

		{#if fields}
			<!-- The same fields either way: a new one writes them from nothing, a row
			     opens on what it already holds. Turning between a transaction and a
			     transfer deals the fields in again, as opening them does. -->
			{#key moving}
				<TransactionEditor
					{row}
					{currency}
					{timeZone}
					{accounts}
					{colors}
					{categories}
					{categoryChoices}
					{draft}
					onDone={() => (writing ? onClose?.() : onEditingChange?.(false))}
				/>
			{/key}
		{:else if row}
			<dl class="mt-6 grid gap-3 border-t border-line pt-6">
				{#each facts as fact (fact.label)}
					<div class="flex items-baseline justify-between gap-4">
						<dt class="text-sm text-fg-muted">{fact.label}</dt>
						<dd class="text-right text-[0.9375rem]">{fact.value}</dd>
					</div>
				{/each}
				{#if row.transfer}
					<!-- Either side reads as the whole move: where it left, where it landed. -->
					{#each [{ label: 'From', account: row.transfer.from }, { label: 'To', account: row.transfer.to }] as end (end.label)}
						<div class="flex items-baseline justify-between gap-4">
							<dt class="text-sm text-fg-muted">{end.label}</dt>
							<dd class="text-right text-[0.9375rem]">
								{#if end.account}
									<span class="inline-flex items-center gap-2">
										<Orb color={colors[end.account.id] ?? 'blue'} class="size-4 shrink-0" />
										{end.account.name}
									</span>
								{:else}
									<span class="text-fg-subtle">No longer active</span>
								{/if}
							</dd>
						</div>
					{/each}
				{:else}
					<div class="flex items-baseline justify-between gap-4">
						<dt class="text-sm text-fg-muted">Account</dt>
						<dd class="text-right text-[0.9375rem]">
							{#if row.account}
								<span class="inline-flex items-center gap-2">
									<Orb color={colors[row.account.id] ?? 'blue'} class="size-4 shrink-0" />
									{row.account.name}
								</span>
							{:else}
								<span class="text-fg-subtle">None yet</span>
							{/if}
						</dd>
					</div>
				{/if}
			</dl>

			{#if row.transfer}
				<p class="mt-6 text-sm leading-relaxed text-fg-muted">
					Money that changed places between your accounts: it moved both balances, but not your
					total, and it isn't counted as income or spending.
				</p>
			{:else if !row.account}
				<p class="mt-6 text-sm leading-relaxed text-fg-muted">
					It has no account, so it moved your total but no balance. Give it one below and it joins
					that account's balance.
				</p>
			{/if}

			{#if row.loanLinked}
				<p class="mt-6 text-sm leading-relaxed text-fg-muted">
					It pays off a loan. Monfly v1 keeps what a loan is owed and what settles it, so this one
					is changed there.
				</p>
			{/if}
		{/if}
	</Card>
</div>

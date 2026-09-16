<script lang="ts">
	import { animate } from 'motion';
	import { IncomeBars } from '$lib/components/dashboard';
	import type { PaletteColor } from '$lib/components/ui';
	import {
		addMonths,
		currentMonth,
		formatMoney,
		formatMoneyCompact,
		monthName,
		type Currency,
		type MonthKey
	} from '$lib/finance';
	import type { TransactionRow } from '$lib/transactions';
	import { cn, EASE_OUT_QUINT, prefersReducedMotion } from '$lib/utils';

	/**
	 * A year of activity, month by month: how much left in each. Built on the
	 * dashboard's own bars rather than a second chart — same growth, same
	 * tooltip, one thing to maintain.
	 */
	type Props = {
		transactions: TransactionRow[];
		currency: Currency;
		/** The viewer's zone: months are drawn in it. */
		timeZone: string;
		/** How many months back the chart reaches, this one included. */
		months?: number;
		/**
		 * A month in focus: the chart draws it with the two before and the one
		 * after, the rest set back. Takes the place of `months`.
		 */
		month?: MonthKey;
		class?: string;
	};

	let { transactions, currency, timeZone, months = 12, month, class: className }: Props = $props();

	const COLORS: PaletteColor[] = ['lime', 'violet', 'blue'];

	/** Each month keeps its colour wherever it sits, so a sliding window doesn't repaint its bars. */
	const colorOf = (key: MonthKey) => {
		const [year, index] = key.split('-').map(Number);
		return COLORS[(year * 12 + index - 1) % COLORS.length];
	};

	/** The month a date falls in, as seen from the viewer's zone. */
	const monthOf = $derived.by(() => {
		const format = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit'
		});
		return (iso: string) => format.format(new Date(iso)).slice(0, 7) as MonthKey;
	});

	const now = $derived(currentMonth(timeZone));

	const keys = $derived.by(() => {
		if (month) return [-2, -1, 0, 1].map((delta) => addMonths(month, delta));
		return Array.from({ length: months }, (_, i) => addMonths(now, -(months - 1 - i)));
	});

	const totals = $derived.by(() => {
		// A plain record, not a Map: it is built and returned inside the
		// derivation, so nothing ever mutates it from outside.
		const out: Record<string, { spent: number; received: number; count: number }> = {};
		for (const key of keys) out[key] = { spent: 0, received: 0, count: 0 };
		for (const row of transactions) {
			const bucket = out[monthOf(row.date)];
			if (!bucket) continue; // outside the window
			if (row.transfer) continue; // moved between accounts: neither received nor spent
			if (row.type === 'income') bucket.received += row.amount;
			else bucket.spent += row.amount;
			bucket.count += 1;
		}
		return out;
	});

	// Many narrow bars: whole figures, or the labels collide.
	const dense = $derived(months > 8);

	const bars = $derived(
		keys.map((key) => {
			const bucket = totals[key] ?? { spent: 0, received: 0, count: 0 };
			const label = monthName(key, 'short');
			return {
				key,
				label,
				value: bucket.spent,
				valueLabel: formatMoneyCompact(bucket.spent, currency, { whole: dense }),
				color: colorOf(key),
				// The month after this one is a slot still to come.
				future: key > now,
				dimmed: month !== undefined && key !== month,
				count: bucket.count,
				received: bucket.received,
				spent: bucket.spent,
				description: `${label} ${key.slice(0, 4)}: ${formatMoney(bucket.spent, currency)} spent across ${bucket.count} ${bucket.count === 1 ? 'entry' : 'entries'}`
			};
		})
	);

	let track = $state<HTMLElement | null>(null);
	/** The months drawn last, to tell how far the window moved. */
	let drawn: MonthKey[] | null = null;

	// A new window moves in from where it was (Motion). With months still in
	// view it slides by the months it moved, each bar travelling to its new
	// slot — from wherever a slide still running left it, so quick steps
	// chain. With none left, it blurs into focus from the side it came from,
	// as an account's figures do. Heights and dimming ease in CSS meanwhile.
	$effect(() => {
		const next = keys;
		const before = drawn;
		drawn = next;
		if (!track || !before || before.join() === next.join() || prefersReducedMotion()) return;

		const forward = before.indexOf(next[0]);
		const back = next.indexOf(before[0]);
		const shift = before.length !== next.length ? 0 : forward > 0 ? forward : back > 0 ? -back : 0;

		if (shift !== 0) {
			const slot = track.offsetWidth / next.length;
			const at = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41;
			animate(track, { x: [at + shift * slot, 0] }, { duration: 0.6, ease: [...EASE_OUT_QUINT] });
			return;
		}

		const side = next[next.length - 1] < before[before.length - 1] ? -1 : 1;
		animate(
			track,
			{ x: [side * 24, 0], opacity: [0, 1], filter: ['blur(6px)', 'blur(0px)'] },
			{ duration: 0.6, ease: [...EASE_OUT_QUINT] }
		);
	});
</script>

<!-- Clipped, so a sliding window's bars pass under its edges. -->
<div class={cn('overflow-hidden', className)}>
	<div bind:this={track} class="h-full">
		<IncomeBars {bars} {dense} class="h-full">
			{#snippet tip(bar)}
				{@const entry = bars.find((b) => b.key === bar.key)}
				<div class="grid w-44 gap-2 font-normal">
					<p class="font-medium">{bar.label} {bar.key.slice(0, 4)}</p>
					<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
						<dt class="text-fg-muted">Spent</dt>
						<dd class="tabular text-right">{formatMoney(entry?.spent ?? 0, currency)}</dd>
						<dt class="text-fg-muted">Received</dt>
						<dd class="tabular text-right">{formatMoney(entry?.received ?? 0, currency)}</dd>
						<dt class="text-fg-muted">Entries</dt>
						<dd class="tabular text-right">{entry?.count ?? 0}</dd>
					</dl>
				</div>
			{/snippet}
		</IncomeBars>
	</div>
</div>

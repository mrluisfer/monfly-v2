<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';
	import { formatMoney, parseMoney, type Currency } from '$lib/finance';
	import { pop } from '$lib/transitions';
	import { cn, prefersReducedMotion } from '$lib/utils';
	import { EMPTY_FILTER, NO_ACCOUNT, type LedgerFilter } from './LedgerFilters.svelte';
	import { narrowing } from './LedgerTools.svelte';

	/**
	 * What the advanced filters narrow the ledger by, said under its bar — one
	 * chip for each kind that is on, each its own way out — so a short list is
	 * never a mystery. Chips pop in and out (Motion) while the rest glide into
	 * place, and the row makes room with the first and gives it back with the
	 * last.
	 */
	type Props = {
		filter: LedgerFilter;
		onChange: (filter: LedgerFilter) => void;
		/** The accounts the rows name, for the chip's words. */
		accounts: { id: string; name: string }[];
		currency: Currency;
	};

	let { filter, onChange, accounts, currency }: Props = $props();

	// Days are keys, not instants: read in UTC so a key never shifts a day.
	const SHORT = new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		month: 'short',
		day: 'numeric'
	});
	const LONG = new Intl.DateTimeFormat('en-US', {
		timeZone: 'UTC',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const year = String(new Date().getFullYear());
	/** "Sep 1", with its year when it isn't this one — as the ledger writes its days. */
	const day = (key: string) =>
		(key.startsWith(year) ? SHORT : LONG).format(new Date(`${key}T00:00:00Z`));

	/** The first two names, and how many more. */
	const names = (list: string[]) =>
		list.length <= 2 ? list.join(', ') : `${list.slice(0, 2).join(', ')} +${list.length - 2}`;

	const money = (cents: number) => formatMoney(cents, currency);

	type Chip = { key: string; kind: string; words: string; clear: Partial<LedgerFilter> };

	const chips = $derived.by(() => {
		const out: Chip[] = [];
		if (filter.accounts.length > 0) {
			const picked = filter.accounts.map((id) =>
				id === NO_ACCOUNT ? 'No account' : (accounts.find((a) => a.id === id)?.name ?? 'An account')
			);
			out.push({ key: 'accounts', kind: 'Account', words: names(picked), clear: { accounts: [] } });
		}
		if (filter.categories.length > 0) {
			out.push({
				key: 'categories',
				kind: 'Category',
				words: names(filter.categories),
				clear: { categories: [] }
			});
		}
		const { from, to } = filter;
		if (from !== '' || to !== '') {
			const words =
				from !== '' && to !== ''
					? `${day(from)} – ${day(to)}`
					: from !== ''
						? `from ${day(from)}`
						: `until ${day(to)}`;
			out.push({ key: 'dates', kind: 'Date', words, clear: { from: '', to: '' } });
		}
		const least = parseMoney(filter.min);
		const most = parseMoney(filter.max);
		if (least !== null || most !== null) {
			const words =
				least !== null && most !== null
					? `${money(least)} – ${money(most)}`
					: least !== null
						? `at least ${money(least)}`
						: `at most ${money(most as number)}`;
			out.push({ key: 'amounts', kind: 'Amount', words, clear: { min: '', max: '' } });
		}
		return out;
	});

	const glide = () => (prefersReducedMotion() ? 0 : 300);
</script>

{#if chips.length > 0}
	<!-- The row makes room as it opens, so the ledger below glides rather than drops. -->
	<div transition:slide={{ duration: glide(), easing: quintOut }}>
		<ul class="flex flex-wrap items-center gap-2 pt-3" aria-label="Filters on">
			{#each chips as chip (chip.key)}
				<li
					animate:flip={{ duration: glide(), easing: quintOut }}
					in:pop={{ scale: 0.8, bounce: 0.4, duration: 0.35 }}
					out:pop={{ scale: 0.8, duration: 0.25 }}
				>
					<!-- The Filters pill's own colour, the hairline's shape in it. -->
					<span
						class={cn(
							'flex h-8 max-w-full items-center gap-1.5 rounded-full border pr-1 pl-3 text-sm',
							narrowing
						)}
						style="--tint: var(--color-blue)"
					>
						<span class="font-medium">{chip.kind}</span>
						<span class="max-w-56 truncate">{chip.words}</span>
						<button
							type="button"
							aria-label="Remove the {chip.kind.toLowerCase()} filter"
							onclick={() => onChange({ ...filter, ...chip.clear })}
							class="grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--tint)_22%,transparent)] focus-visible:outline-2 focus-visible:outline-blue"
						>
							<X class="size-3.5 stroke-[1.75]" aria-hidden="true" />
						</button>
					</span>
				</li>
			{/each}
			{#if chips.length > 1}
				<li in:pop={{ scale: 0.8, duration: 0.3 }} out:pop={{ scale: 0.8, duration: 0.25 }}>
					<button
						type="button"
						onclick={() => onChange(EMPTY_FILTER)}
						class="h-8 rounded-full px-2 text-sm text-fg-muted underline-offset-2 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-blue"
					>
						Clear all
					</button>
				</li>
			{/if}
		</ul>
	</div>
{/if}

<script lang="ts">
	import MovingDownload from '@jis3r/icons/icons/download';
	import { categoryColor } from '$lib/categories';
	import { AnimatedIcon, CardTabs, PillButton, type PaletteColor } from '$lib/components/ui';
	import CategoryIcon from '$lib/components/transactions/CategoryIcon.svelte';
	import { formatMoney, monthName, type Currency } from '$lib/finance';
	import { entryCount, kept, keptRate, statementCsv, type Stretch } from '$lib/insights';
	import { percent, signedMoney } from './format';

	/**
	 * The stretch as a statement to hand over: month by month — in, out, what
	 * stayed, the share kept, how many entries — or by category, with a total
	 * under each. Every figure to the cent, and the lot as a spreadsheet to
	 * download for someone's own records or their accountant.
	 */
	type Props = {
		stretch: Stretch;
		currency: Currency;
		categoryChoices?: Record<string, PaletteColor>;
		class?: string;
	};

	let { stretch, currency, categoryChoices, class: className }: Props = $props();

	let tab = $state<'months' | 'categories'>('months');

	const money = (cents: number) => formatMoney(cents, currency);
	const signed = (cents: number) => signedMoney(cents, currency);

	/** The spreadsheet, built here from what's on screen and handed to the browser to save. */
	function download() {
		// A byte-order mark, so a spreadsheet opens accented category names as written.
		const csv = `\uFEFF${statementCsv(stretch, currency)}`;
		const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = `monfly-${stretch.span.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
		link.click();
		URL.revokeObjectURL(url);
	}

	/** Column names stick to the top of the scroller, their rule with them. */
	const head =
		'sticky top-0 z-10 bg-card px-3 pb-2.5 text-sm font-medium whitespace-nowrap text-fg-muted shadow-[inset_0_-1px_0_var(--color-line)]';
	const cell = 'px-3 py-2.5 whitespace-nowrap';
</script>

<CardTabs
	options={[
		{ value: 'months', label: 'By month' },
		{ value: 'categories', label: 'By category' }
	]}
	bind:value={tab}
	label="Statement"
	class={className}
>
	{#snippet panel(value)}
		<div class="flex h-full flex-col p-7">
			<div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
				<div class="min-w-0">
					<h2 class="font-display text-2xl font-medium">Statement</h2>
					<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
						{stretch.span.label}, in {currency}, to the cent — for your records or your accountant.
					</p>
				</div>
				<PillButton size="sm" onclick={download}>
					<AnimatedIcon icon={MovingDownload} set="moving" />
					Download CSV
				</PillButton>
			</div>

			<!-- A long table scrolls inside the card under its column names, and a
			     wide one sideways, rather than stretching the page or squeezing a
			     figure. It pulls out into the card's padding, so the first and last
			     columns line up with the heading. -->
			<div class="-mx-3 mt-6 max-h-[40rem] min-h-0 flex-1 overflow-auto">
				{#if value === 'months'}
					<table class="w-full min-w-[40rem] text-[0.9375rem]">
						<thead>
							<tr class="text-left">
								<th scope="col" class={head}>Month</th>
								<th scope="col" class="{head} text-right">Received</th>
								<th scope="col" class="{head} text-right">Spent</th>
								<th scope="col" class="{head} text-right">Kept</th>
								<th scope="col" class="{head} text-right">Share kept</th>
								<th scope="col" class="{head} text-right">Entries</th>
							</tr>
						</thead>
						<tbody class="tabular">
							{#each stretch.months as month (month.key)}
								<tr class="border-b border-line">
									<th scope="row" class="{cell} text-left font-normal">
										{monthName(month.key)}
										<span class="text-fg-muted">{month.key.slice(0, 4)}</span>
									</th>
									{#if month.future}
										{#each [0, 1, 2, 3, 4] as blank (blank)}
											<td class="{cell} text-right text-fg-subtle">—</td>
										{/each}
									{:else}
										<td class="{cell} text-right text-positive">{money(month.received)}</td>
										<td class="{cell} text-right text-spent">{money(month.spent)}</td>
										<td class="{cell} text-right">{signed(kept(month))}</td>
										<td class="{cell} text-right text-fg-muted">{percent(keptRate(month))}</td>
										<td class="{cell} text-right text-fg-muted">{entryCount(month)}</td>
									{/if}
								</tr>
							{/each}
						</tbody>
						<tfoot class="tabular font-medium">
							<tr>
								<th scope="row" class="{cell} pt-3.5 text-left">Total</th>
								<td class="{cell} pt-3.5 text-right text-positive"
									>{money(stretch.total.received)}</td
								>
								<td class="{cell} pt-3.5 text-right text-spent">{money(stretch.total.spent)}</td>
								<td class="{cell} pt-3.5 text-right">{signed(kept(stretch.total))}</td>
								<td class="{cell} pt-3.5 text-right">{percent(keptRate(stretch.total))}</td>
								<td class="{cell} pt-3.5 text-right">{entryCount(stretch.total)}</td>
							</tr>
						</tfoot>
					</table>
				{:else}
					<table class="w-full min-w-[36rem] text-[0.9375rem]">
						<thead>
							<tr class="text-left">
								<th scope="col" class={head}>Category</th>
								<th scope="col" class="{head} text-right">Spent</th>
								<th scope="col" class="{head} text-right">Share</th>
								<th scope="col" class="{head} text-right">Entries</th>
								<th scope="col" class="{head} text-right">Average</th>
							</tr>
						</thead>
						<tbody class="tabular">
							{#each stretch.categories as category (category.name)}
								<tr class="border-b border-line">
									<th scope="row" class="{cell} text-left font-normal">
										<span class="flex items-center gap-3">
											<CategoryIcon
												category={category.name}
												color={categoryColor(category.name, categoryChoices)}
											/>
											<span class="max-w-56 truncate">{category.name}</span>
										</span>
									</th>
									<td class="{cell} text-right text-spent">{money(category.spent)}</td>
									<td class="{cell} text-right text-fg-muted">
										{percent(stretch.total.spent > 0 ? category.spent / stretch.total.spent : null)}
									</td>
									<td class="{cell} text-right text-fg-muted">{category.count}</td>
									<td class="{cell} text-right text-fg-muted">
										{money(Math.round(category.spent / category.count))}
									</td>
								</tr>
							{:else}
								<tr>
									<td colspan="5" class="{cell} text-fg-muted"
										>Nothing spent in {stretch.span.label}.</td
									>
								</tr>
							{/each}
						</tbody>
						{#if stretch.categories.length > 0}
							<tfoot class="tabular font-medium">
								<tr>
									<th scope="row" class="{cell} pt-3.5 text-left">Total</th>
									<td class="{cell} pt-3.5 text-right text-spent">{money(stretch.total.spent)}</td>
									<td class="{cell} pt-3.5 text-right">100%</td>
									<td class="{cell} pt-3.5 text-right">{stretch.total.expenses}</td>
									<td class="{cell} pt-3.5 text-right">
										{stretch.total.expenses > 0
											? money(Math.round(stretch.total.spent / stretch.total.expenses))
											: '—'}
									</td>
								</tr>
							</tfoot>
						{/if}
					</table>
				{/if}
			</div>
		</div>
	{/snippet}
</CardTabs>

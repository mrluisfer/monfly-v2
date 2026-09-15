<script lang="ts">
	import { createQuery, keepPreviousData } from '@tanstack/svelte-query';
	import { animate, stagger } from 'motion';
	import { browser } from '$app/environment';
	import { countUp } from '$lib/actions';
	import { IncomeBars } from '$lib/components/dashboard';
	import { Card, ShareBar, Tooltip } from '$lib/components/ui';
	import { shortcutActivityQuery } from '$lib/queries';
	import { ACTIVITY_WEEKS, SHORTCUTS, type ShortcutSource } from '$lib/shortcuts';
	import { EASE_OUT_QUINT, cn, prefersReducedMotion } from '$lib/utils';
	import ShortcutIcon from './ShortcutIcon.svelte';

	/**
	 * What the shortcuts' history says, in three cards under them: how many
	 * changes each week, which shortcuts change most, and where changes are made.
	 * Counted in the database over the last weeks (`ShortcutEvent`). Each card is
	 * one series, so one colour — violet, configuration's — except the shortcuts,
	 * which keep their own, beside the glyph and name that say which is which.
	 * Every figure is written out; tooltips only add the split.
	 */
	type Props = {
		/** False for a session with no Monfly account to read. */
		enabled?: boolean;
	};

	let { enabled = true }: Props = $props();

	const query = createQuery(() => ({
		...shortcutActivityQuery(),
		enabled: browser && enabled,
		// A refetch keeps the last counts on screen, dimmed, rather than a blank.
		placeholderData: keepPreviousData
	}));

	const data = $derived(query.data);
	const total = $derived(data?.total ?? 0);

	// Week starts arrive as `YYYY-MM-DD` in the viewer's zone; drawn as they are.
	const dayFormat = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
	const day = (key: string) => dayFormat.format(new Date(`${key}T00:00:00Z`));
	const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
	const percent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 });

	const lastWeek = $derived(data?.weeks.at(-1)?.start);
	const weekName = (start: string) => (start === lastWeek ? 'This week' : `Week of ${day(start)}`);

	const bars = $derived(
		(data?.weeks ?? []).map((week) => {
			const changes = week.pinned + week.unpinned;
			return {
				key: week.start,
				label: day(week.start),
				value: changes,
				valueLabel: String(changes),
				color: 'violet' as const,
				description: `${weekName(week.start)}: ${count(week.pinned, 'pin', 'pins')}, ${count(week.unpinned, 'removal', 'removals')}`
			};
		})
	);

	/** Shortcuts that changed, most first; their bars are against the one changed most. */
	const changed = $derived.by(() => {
		const rows = data?.shortcuts ?? [];
		const most = Math.max(0, ...rows.map((row) => row.pinned + row.unpinned));
		return rows.flatMap((row) => {
			const shortcut = SHORTCUTS.find((s) => s.id === row.id);
			if (!shortcut) return [];
			const changes = row.pinned + row.unpinned;
			return [{ ...row, shortcut, changes, share: most > 0 ? changes / most : 0 }];
		});
	});

	const SOURCE_LABEL: Record<ShortcutSource, string> = {
		page: 'Switches on this page',
		header: 'The ✕ on a header tab',
		lock: "Overview's lock"
	};

	const sources = $derived.by(() => {
		const rows = data?.sources ?? [];
		const most = Math.max(0, ...rows.map((row) => row.count));
		const sum = rows.reduce((all, row) => all + row.count, 0);
		return rows.map((row) => ({
			...row,
			label: SOURCE_LABEL[row.source],
			share: most > 0 ? row.count / most : 0,
			part: sum > 0 ? row.count / sum : 0
		}));
	});

	let grid = $state<HTMLElement>();

	// The cards are dealt in after the shortcuts above them.
	$effect(() => {
		if (!grid || prefersReducedMotion()) return;
		animate(
			grid.children,
			{ opacity: [0, 1], y: [14, 0], scale: [0.97, 1] },
			{ delay: stagger(0.05, { startDelay: 0.45 }), duration: 0.55, ease: EASE_OUT_QUINT }
		);
	});
</script>

<section class="flex flex-col gap-4 pt-6" aria-labelledby="shortcut-activity">
	<div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
		<h2 id="shortcut-activity" class="font-display text-3xl font-light tracking-tight">Activity</h2>
		<p class="text-[0.9375rem] text-fg-muted">The last {ACTIVITY_WEEKS} weeks</p>
	</div>

	<div
		bind:this={grid}
		class={cn(
			'grid gap-4 transition-opacity duration-300 md:grid-cols-2 xl:grid-cols-3',
			query.isPlaceholderData && 'opacity-60'
		)}
	>
		<!-- Changes by week: the income chart's columns, one series. -->
		<Card class="flex flex-col p-7">
			<h3 class="font-display text-2xl font-medium">Changes</h3>
			<p class="mt-6 font-display text-[2.75rem] leading-none font-light tracking-tight">
				<span use:countUp={{ value: total, initial: false }}>{total}</span>
			</p>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
				{total === 1 ? 'change' : 'changes'} to your header, by week
			</p>

			<IncomeBars {bars} dense class="mt-8 h-44">
				{#snippet tip(bar)}
					{@const week = data?.weeks.find((w) => w.start === bar.key)}
					<div class="grid w-40 gap-2 font-normal">
						<p class="font-medium">{weekName(bar.key)}</p>
						<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
							<dt class="text-fg-muted">Pinned</dt>
							<dd class="tabular text-right">{week?.pinned ?? 0}</dd>
							<dt class="text-fg-muted">Taken out</dt>
							<dd class="tabular text-right">{week?.unpinned ?? 0}</dd>
						</dl>
					</div>
				{/snippet}
			</IncomeBars>
		</Card>

		<!-- Most changed: a bar each, in the shortcut's own colour beside its glyph. -->
		<Card class="flex flex-col p-7">
			<h3 class="font-display text-2xl font-medium">Most changed</h3>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">Pinned or taken out most often</p>

			{#if changed.length}
				<ul class="mt-auto flex flex-col gap-4 pt-6">
					{#each changed as row, i (row.shortcut.id)}
						<li>
							<Tooltip delay={80}>
								{#snippet content()}
									<dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-normal">
										<dt class="text-fg-muted">Pinned</dt>
										<dd class="tabular text-right">{row.pinned}</dd>
										<dt class="text-fg-muted">Taken out</dt>
										<dd class="tabular text-right">{row.unpinned}</dd>
									</dl>
								{/snippet}
								{#snippet children({ props })}
									<!-- svelte-ignore a11y_no_noninteractive_tabindex — focus is how keyboard users reach the split. -->
									<div
										{...props}
										tabindex="0"
										class="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue"
									>
										<div class="flex items-center justify-between gap-3">
											<span class="flex min-w-0 items-center gap-2.5 text-[0.9375rem]">
												<ShortcutIcon shortcut={row.shortcut} size={16} />
												<span class="truncate">{row.shortcut.label}</span>
											</span>
											<span class="tabular shrink-0 text-sm text-fg-muted">
												<span use:countUp={{ value: row.changes, initial: false }}
													>{row.changes}</span
												>
												{row.changes === 1 ? 'change' : 'changes'}
											</span>
										</div>
										<ShareBar
											segments={[
												{ id: row.shortcut.id, share: row.share, color: row.shortcut.color }
											]}
											track="hatch"
											delay={i * 60}
											class="mt-2 h-2"
										/>
									</div>
								{/snippet}
							</Tooltip>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-auto pt-6 text-[0.9375rem] text-fg-muted">
					Nothing pinned or taken out in these weeks. What you change above shows up here.
				</p>
			{/if}
		</Card>

		<!-- Where changes are made: the same bars, one series, in violet. -->
		<Card class="flex flex-col p-7">
			<h3 class="font-display text-2xl font-medium">Where you change them</h3>
			<p class="mt-1.5 text-[0.9375rem] text-fg-muted">
				A switch here, a tab's ✕, or Overview's lock
			</p>

			<ul class="mt-auto flex flex-col gap-4 pt-6">
				{#each sources as row, i (row.source)}
					<li>
						<div class="flex items-center justify-between gap-3">
							<span class="min-w-0 truncate text-[0.9375rem]">{row.label}</span>
							<span class="tabular shrink-0 text-sm text-fg-muted">
								<span use:countUp={{ value: row.count, initial: false }}>{row.count}</span>
								· {percent.format(row.part)}
							</span>
						</div>
						<ShareBar
							segments={[{ id: row.source, share: row.share, color: 'violet' }]}
							track="hatch"
							delay={i * 60}
							class="mt-2 h-2"
						/>
					</li>
				{/each}
			</ul>
		</Card>
	</div>
</section>

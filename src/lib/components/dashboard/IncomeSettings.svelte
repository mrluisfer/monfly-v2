<script lang="ts">
	import MovingSettings from '@jis3r/icons/icons/settings';
	import { Popover } from 'bits-ui';
	import { AnimatedIcon, IconButton, Segmented, Switch } from '$lib/components/ui';
	import type { YearUnit } from '$lib/finance';
	import type { IncomeView } from '$lib/income-view';
	import { pop } from '$lib/transitions';

	/**
	 * The gear beside the Income card's period: how its chart is drawn. Every
	 * change applies at once, and the card remembers it in this browser.
	 */
	type Props = {
		view: IncomeView;
		/** Called with the whole view after each change. */
		onChange: (view: IncomeView) => void;
	};

	let { view, onChange }: Props = $props();

	const uid = $props.id();
	const units: { value: YearUnit; label: string }[] = [
		{ value: 'quarter', label: 'Quarters' },
		{ value: 'month', label: 'Months' }
	];

	function set<K extends keyof IncomeView>(key: K, value: IncomeView[K]) {
		onChange({ ...view, [key]: value });
	}
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<IconButton size="sm" {...props} aria-label="Income chart settings">
				<!-- The gear plays with the button, as the account menu's does, and
				     holds while its settings are open. -->
				<AnimatedIcon icon={MovingSettings} set="moving" play={props['data-state'] === 'open'} />
			</IconButton>
		{/snippet}
	</Popover.Trigger>
	<Popover.Portal>
		<!-- Same surface and presence as every floating layer. -->
		<Popover.Content side="bottom" align="end" sideOffset={10} forceMount>
			{#snippet child({ props, wrapperProps, open })}
				{#if open}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							class="z-50 w-[min(20rem,calc(100vw-2rem))] origin-(--bits-floating-transform-origin) rounded-[var(--radius-chip)] border border-line bg-card p-4 shadow-lg outline-none"
						>
							<div class="flex items-center gap-3">
								<!-- Violet: configuration, as in the account menu. -->
								<span
									class="grid size-7 shrink-0 place-items-center rounded-lg bg-violet/12 text-violet"
								>
									<AnimatedIcon icon={MovingSettings} set="moving" trigger="mount" />
								</span>
								<div class="min-w-0">
									<p class="text-sm font-medium">Income chart</p>
									<p class="text-xs text-fg-muted">Saved in this browser.</p>
								</div>
							</div>

							<div class="mt-3 divide-y divide-line">
								<div class="flex items-center justify-between gap-4 pb-3">
									<span class="text-sm">This year by</span>
									<Segmented
										label="This year by"
										options={units}
										value={view.yearBy}
										onValueChange={(unit) => set('yearBy', unit)}
									/>
								</div>
								<div class="flex items-center justify-between gap-4 py-3">
									<label for="{uid}-figures" class="min-w-0">
										<span class="block text-sm">Amounts over bars</span>
										<span class="block text-xs text-fg-muted">
											Each bar's tooltip keeps the exact figure.
										</span>
									</label>
									<Switch
										id="{uid}-figures"
										checked={view.figures}
										onCheckedChange={(on) => set('figures', on)}
									/>
								</div>
								<div class="flex items-center justify-between gap-4 pt-3">
									<label for="{uid}-upcoming" class="min-w-0">
										<span class="block text-sm">Still to come</span>
										<span class="block text-xs text-fg-muted">
											Dashed slots for the rest of the period.
										</span>
									</label>
									<Switch
										id="{uid}-upcoming"
										checked={view.upcoming}
										onCheckedChange={(on) => set('upcoming', on)}
									/>
								</div>
							</div>
						</div>
					</div>
				{/if}
			{/snippet}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

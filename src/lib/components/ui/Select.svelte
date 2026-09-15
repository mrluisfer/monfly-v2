<script lang="ts" generics="T extends string">
	import MovingCheck from '@jis3r/icons/icons/check';
	import { Select } from 'bits-ui';
	import { blur } from 'svelte/transition';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import AnimatedIcon from './AnimatedIcon.svelte';
	import Caret from './Caret.svelte';
	import { PALETTE, type PaletteColor } from './palette';
	import PillButton from './PillButton.svelte';

	/** `color` marks an option with its palette dot — an account's, say. */
	type Option = { value: T; label: string; color?: PaletteColor };

	type Props = {
		/** The choices, in order. */
		options: Option[];
		/** The chosen option's value. Bind it, or pass it and listen to `onValueChange`. */
		value: T;
		/** Called with each new choice. */
		onValueChange?: (value: T) => void;
		/** Names the control for assistive tech: "Period". */
		label: string;
		/**
		 * `pill` wears the PillButton; `ghost` is muted text with a caret, for a
		 * filter tucked into a header ("Updated today ▾").
		 */
		variant?: 'pill' | 'ghost';
		class?: string;
	};

	let {
		options,
		value = $bindable(),
		onValueChange,
		label,
		variant = 'pill',
		class: className
	}: Props = $props();

	const selected = $derived(options.find((o) => o.value === value));
</script>

<!-- A trigger that opens a short list. Same surface and presence as every floating layer. -->
<Select.Root
	type="single"
	bind:value={
		() => value,
		(next) => {
			value = next as T;
			onValueChange?.(next as T);
		}
	}
	items={options}
>
	<Select.Trigger>
		{#snippet child({ props })}
			{#if variant === 'ghost'}
				<button
					{...props}
					type="button"
					aria-label="{label}: {selected?.label ?? 'none'}"
					class={cn(
						// One line: squeezed, it moves as a whole rather than breaking its words.
						'group press inline-flex items-center gap-2 rounded-md text-sm whitespace-nowrap text-fg-muted hover:text-fg',
						'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
						className
					)}
				>
					<!-- A new choice's words blur into focus. -->
					{#key selected?.value}
						<span in:blur={{ amount: 4, duration: 300 }}>{selected?.label ?? '—'}</span>
					{/key}
					<Caret
						class="shrink-0 transition-[rotate] duration-300 ease-[var(--ease-spring)] group-data-[state=open]:rotate-180"
					/>
				</button>
			{:else}
				<PillButton
					{...props}
					size="sm"
					caret
					aria-label="{label}: {selected?.label ?? 'none'}"
					class={className}
				>
					{#if selected?.color}
						<span
							class="size-2 shrink-0 rounded-full"
							style="background: {PALETTE[selected.color].css}"
						></span>
					{/if}
					{selected?.label ?? '—'}
				</PillButton>
			{/if}
		{/snippet}
	</Select.Trigger>
	<Select.Portal>
		<Select.Content side="bottom" align="end" sideOffset={8} forceMount>
			{#snippet child({ props, wrapperProps, open })}
				{#if open}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							class="z-50 max-h-80 min-w-40 origin-(--bits-floating-transform-origin) overflow-y-auto rounded-[var(--radius-chip)] border border-line bg-card p-1.5 shadow-lg outline-none"
						>
							<Select.Viewport>
								{#each options as option (option.value)}
									<Select.Item
										value={option.value}
										label={option.label}
										class="flex h-9 cursor-default items-center gap-3 rounded-[0.625rem] px-2.5 text-sm whitespace-nowrap transition-colors duration-150 outline-none select-none data-highlighted:bg-sunken"
									>
										{#snippet children({ selected: chosen })}
											{#if option.color}
												<span
													class="size-2 shrink-0 rounded-full"
													style="background: {PALETTE[option.color].css}"
												></span>
											{/if}
											{option.label}
											<AnimatedIcon
												icon={MovingCheck}
												set="moving"
												trigger="none"
												play={chosen}
												class={cn(
													'ml-auto text-blue transition-[opacity,scale] duration-300 ease-[var(--ease-spring)]',
													chosen ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
												)}
											/>
										{/snippet}
									</Select.Item>
								{/each}
							</Select.Viewport>
						</div>
					</div>
				{/if}
			{/snippet}
		</Select.Content>
	</Select.Portal>
</Select.Root>

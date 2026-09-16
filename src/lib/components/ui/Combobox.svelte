<script lang="ts">
	import MovingCheck from '@jis3r/icons/icons/check';
	import { Combobox } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { pop } from '$lib/transitions';
	import { cn } from '$lib/utils';
	import AnimatedIcon from './AnimatedIcon.svelte';
	import Caret from './Caret.svelte';

	/**
	 * A field that suggests what is already on record and still takes a name of
	 * its own — for the things v1 keeps as free text, a category above all,
	 * where there is no list to pick from and never was. What is typed is the
	 * value; the suggestions only save the typing. A name that isn't one of
	 * them is offered at the head of the list, marked as new, so Enter takes it
	 * as readily as it takes an old one.
	 *
	 * The row's own look is the caller's: `leading` draws whatever goes at the
	 * head of the field and of every row, so a category arrives in the same
	 * chip the ledger draws it in.
	 */
	type Props = {
		/** What to suggest, in the order they should be offered. */
		options: string[];
		/** What the field holds: one of the suggestions, or whatever was typed. */
		value: string;
		onValueChange?: (value: string) => void;
		/** The field's id, so a `<label for>` outside can name it. */
		id?: string;
		/** Names the field for assistive tech where no `<label for>` does. */
		label?: string;
		placeholder?: string;
		/** The bound the endpoint checks, so the two agree about what is too long. */
		maxlength?: number;
		/** The head of the field and of every row, drawn for the name it is given. */
		leading?: Snippet<[string]>;
		class?: string;
	};

	let {
		options,
		value = $bindable(),
		onValueChange,
		id,
		label,
		placeholder,
		maxlength,
		leading,
		class: className
	}: Props = $props();

	let list = $state(false);
	/**
	 * Typed into since the list opened. Until then the whole list is offered:
	 * what the field holds is also what it would search by, so a field holding
	 * "Groceries" would otherwise open on the one row it already names.
	 */
	let narrowed = $state(false);
	let field = $state<HTMLInputElement | null>(null);

	function set(next: string) {
		value = next;
		onValueChange?.(next);
	}

	const query = $derived(narrowed ? value.trim().toLowerCase() : '');
	const matches = $derived(
		query === '' ? options : options.filter((option) => option.toLowerCase().includes(query))
	);
	/** What is being typed is none of them, so it is offered as a name of its own. */
	const fresh = $derived(query !== '' && !options.some((option) => option.toLowerCase() === query));
	const rows = $derived(fresh ? [value.trim(), ...matches] : matches);
</script>

<Combobox.Root
	type="single"
	allowDeselect={false}
	bind:open={list}
	onOpenChange={(open) => {
		if (!open) narrowed = false;
	}}
	inputValue={value}
	items={rows.map((row) => ({ value: row, label: row }))}
	bind:value={() => value, set}
>
	<!-- The input is the whole field, the chip and the caret drawn over its
	     padding: what the list hangs off is the input, so anything beside it
	     would leave the list short of the field and out of line with it. -->
	<div class={cn('relative', className)}>
		{#if leading}
			<span class="pointer-events-none absolute inset-y-0 left-2 flex items-center">
				{@render leading(value)}
			</span>
		{/if}
		<Combobox.Input
			bind:ref={field}
			{id}
			aria-label={label}
			{placeholder}
			{maxlength}
			autocomplete="off"
			spellcheck="false"
			oninput={(event) => {
				narrowed = true;
				set(event.currentTarget.value);
			}}
			onclick={() => {
				// As a browser's address bar does: the first press opens it and takes
				// the name whole, so typing searches; a second places the caret.
				if (list) return;
				list = true;
				field?.select();
			}}
			class={cn(
				'peer h-11 w-full rounded-full border border-hairline bg-transparent pr-10 text-[0.9375rem]',
				'placeholder:text-fg-subtle',
				'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue',
				leading ? 'pl-12' : 'pl-4'
			)}
		/>
		<Caret
			class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-fg-muted transition-[rotate] duration-300 ease-[var(--ease-spring)] peer-data-[state=open]:rotate-180"
		/>
	</div>
	<Combobox.Portal>
		<Combobox.Content side="bottom" align="start" sideOffset={8} forceMount>
			{#snippet child({ props, wrapperProps, open })}
				<!-- Nothing to suggest and nothing typed: no list at all, rather than an
				     empty one over a field that works perfectly well on its own. -->
				{#if open && rows.length > 0}
					<div {...wrapperProps}>
						<div
							{...props}
							in:pop
							out:pop
							class="z-50 max-h-[min(20rem,var(--bits-floating-available-height))] w-(--bits-floating-anchor-width) origin-(--bits-floating-transform-origin) overflow-y-auto rounded-[var(--radius-chip)] border border-line bg-card p-1.5 shadow-lg outline-none"
						>
							<Combobox.Viewport>
								{#each rows as row, i (row)}
									<Combobox.Item
										value={row}
										label={row}
										class="flex h-10 cursor-default items-center gap-2.5 rounded-[0.625rem] px-1.5 text-sm transition-colors duration-150 outline-none select-none data-highlighted:bg-sunken"
									>
										{#snippet children({ selected })}
											{#if leading}
												{@render leading(row)}
											{/if}
											<span class="min-w-0 flex-1 truncate">{row}</span>
											{#if fresh && i === 0}
												<!-- Lime, as everything new in Monfly is: inverted on the white
												     card, where lime alone is too light to read. -->
												<span
													class="shrink-0 text-xs text-[color-mix(in_oklab,var(--lime)_40%,var(--ink))] dark:text-lime"
												>
													New
												</span>
											{:else}
												<AnimatedIcon
													icon={MovingCheck}
													set="moving"
													trigger="none"
													play={selected}
													class={cn(
														'shrink-0 text-blue transition-[opacity,scale] duration-300 ease-[var(--ease-spring)]',
														selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
													)}
												/>
											{/if}
										{/snippet}
									</Combobox.Item>
								{/each}
							</Combobox.Viewport>
						</div>
					</div>
				{/if}
			{/snippet}
		</Combobox.Content>
	</Combobox.Portal>
</Combobox.Root>

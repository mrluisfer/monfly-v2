<script lang="ts">
	import { countUp } from '$lib/actions';
	import { Orb, type PaletteColor } from '$lib/components/ui';
	import { formatMoney, type Cents, type Currency } from '$lib/finance';

	type Props = {
		label: string;
		/** Cents; counts up to each new value. */
		value: Cents;
		currency: Currency;
		/** Its wedge's colour on the dial. */
		color: PaletteColor;
		/** Called with a colour the person picked from the orb. Omit to keep the orb read-only. */
		onColorChange?: (color: PaletteColor) => void;
		/** Why the last pick didn't save, shown in the palette. */
		colorError?: string;
	};

	let { label, value, currency, color, onColorChange, colorError }: Props = $props();

	const format = (cents: number) => formatMoney(cents, currency);
</script>

<div class="rounded-[1.25rem] bg-sunken/90 p-4 backdrop-blur-sm">
	<Orb
		{color}
		editable={onColorChange !== undefined}
		label="the {label} category"
		onChange={onColorChange}
		error={colorError}
		class="mb-6 size-7 border border-line bg-card"
	/>
	<p class="truncate text-[0.8125rem] text-fg-muted" title={label}>{label}</p>
	<!-- The server writes the figure; countUp takes the node over once mounted. -->
	<p
		class="font-display tabular mt-0.5 text-xl font-light"
		use:countUp={{ value, format, whenVisible: true }}
	>
		{format(value)}
	</p>
</div>

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
	<!-- The server writes the figure; countUp takes the live one over once
	     mounted. The final figure, invisible beneath it, holds the width, so the
	     row sizes to it once instead of growing with every tick of the count. -->
	<p class="font-display tabular mt-0.5 grid text-xl whitespace-nowrap font-light">
		<span class="invisible col-start-1 row-start-1" aria-hidden="true">{format(value)}</span>
		<span class="col-start-1 row-start-1" use:countUp={{ value, format, whenVisible: true }}>
			{format(value)}
		</span>
	</p>
</div>

<script lang="ts">
	import { countUp } from '$lib/actions';
	import { Blob, Caret, DottedRing, Figure, Sparkle, type BlobColor } from '$lib/components/ui';
	import { formatCurrency } from '$lib/utils';

	type Props = {
		name: string;
		updated: string;
		balance: number;
		tracked: number;
		toReview: number;
		color: BlobColor;
	};

	let { name, updated, balance, tracked, toReview, color }: Props = $props();
</script>

<div class="p-7">
	<div class="flex items-center justify-between gap-4">
		<div class="flex items-center gap-2.5">
			<Sparkle {color} class="size-5" />
			<span class="font-display text-xl font-medium">{name}</span>
		</div>
		<button
			type="button"
			class="flex items-center gap-2 text-sm text-fg-muted transition-colors hover:text-fg"
		>
			{updated}
			<Caret />
		</button>
	</div>

	<div class="mt-6 grid grid-cols-[1fr_1fr_auto] gap-6">
		<div>
			<p class="text-sm text-fg-muted">Bank balance</p>
			<p
				class="font-display tabular mt-1 text-[1.75rem] leading-none font-light"
				use:countUp={{ value: balance, format: formatCurrency, whenVisible: true }}
			></p>
			<DottedRing class="mt-5 w-24" markers={[0.25, 0.75]}>
				<div class="relative size-full"><Blob {color} blur={7} spread={80} /></div>
			</DottedRing>
		</div>

		<div>
			<p class="text-sm text-fg-muted">Tracked</p>
			<p
				class="font-display tabular mt-1 text-[1.75rem] leading-none font-light"
				use:countUp={{ value: tracked, format: formatCurrency, whenVisible: true }}
			></p>
			<DottedRing class="mt-5 w-20" markers={[0, 0.5]}>
				<div class="relative size-full"><Blob color="blue" blur={8} spread={70} /></div>
			</DottedRing>
		</div>

		<div class="self-end text-right">
			<Figure value={String(toReview)} size="lg" />
			<p class="mt-1 text-sm text-fg-muted">To review</p>
		</div>
	</div>
</div>

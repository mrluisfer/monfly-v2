<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Blob, IconButton } from '$lib/components/ui';
</script>

<div class="flex h-full flex-col p-7">
	<h2 class="font-display text-2xl font-medium">Tips</h2>

	<div class="relative mx-auto my-4 aspect-square w-40 shrink-0">
		<div class="absolute inset-[22%] overflow-hidden rounded-full">
			<Blob color="lime" blur={10} spread={78} />
		</div>
		<svg viewBox="0 0 100 100" class="absolute inset-0 size-full" aria-hidden="true">
			<g fill="none" stroke="var(--fg)" stroke-width="0.6">
				<circle cx="50" cy="50" r="34" />
				<ellipse cx="50" cy="50" rx="13" ry="34" />
				<ellipse cx="50" cy="50" rx="25" ry="34" />
				<line x1="16" y1="50" x2="84" y2="50" />
				<ellipse cx="50" cy="50" rx="34" ry="13" />
				<ellipse cx="50" cy="50" rx="34" ry="25" />
				<line x1="50" y1="16" x2="50" y2="84" />
			</g>
		</svg>
	</div>

	<div class="mt-auto flex items-center gap-4 rounded-[1.25rem] bg-sunken p-5">
		<div class="min-w-0 flex-1">
			<p class="font-display text-lg leading-snug">
				Break <span class="font-bold">free</span> from the desk
			</p>
			<p class="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-muted">
				Snap receipts, track spending and settle loans from your phone.
			</p>
		</div>
		<IconButton dashed aria-label="Learn more">
			<ArrowRight />
		</IconButton>
	</div>
</div>

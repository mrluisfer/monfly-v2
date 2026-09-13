<script lang="ts">
	import MovingHandCoins from '@jis3r/icons/icons/hand-coins';
	import { AnimatedIcon } from '$lib/components/ui';
</script>

<!--
	The Loans tab's card. Empty until loans are read — the Loan table is already
	there, waiting on a query and a list to draw it with.
-->
<div class="flex h-full flex-col p-7">
	<div
		class="grid size-11 shrink-0 place-items-center rounded-full border border-dashed border-hairline text-fg-subtle"
	>
		<!-- Not a control: it plays once, as the tab opens. -->
		<AnimatedIcon icon={MovingHandCoins} set="moving" size={18} strokeWidth={1.5} trigger="mount" />
	</div>

	<p class="mt-5 text-[0.9375rem] text-fg-muted">No loans yet.</p>
	<p class="mt-1.5 text-[0.8125rem] leading-relaxed text-fg-muted">
		Money you lend or borrow will show here, with what's left to settle.
	</p>
</div>

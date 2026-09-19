<script lang="ts">
	import { AnimatedIcon } from '$lib/components/ui';
	import type { DateKey } from '$lib/finance';
	import { dueLabel, type LoanDue } from '$lib/loans';
	import { cn } from '$lib/utils';
	import { DUE_CHIP, DUE_GLYPH } from './tone';

	/**
	 * Where a loan stands against its due day, in a tinted chip: "3 days late",
	 * "Due today", "Due in 5 days", "Due Oct 4", "No due date". A late or
	 * due-today loan rings its glyph once as it appears; the rest play with the
	 * surface they sit on.
	 */
	type Props = {
		due: LoanDue;
		dueOn: DateKey | null;
		class?: string;
	};

	let { due, dueOn, class: className }: Props = $props();

	const urgent = $derived(due.kind === 'overdue' || due.kind === 'today');
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors duration-300',
		DUE_CHIP[due.kind],
		className
	)}
>
	<AnimatedIcon {...DUE_GLYPH[due.kind]} size={13} trigger={urgent ? 'mount' : 'control'} />
	{dueLabel(due, dueOn)}
</span>

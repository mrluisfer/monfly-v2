import MovingAlarmClock from '@jis3r/icons/icons/alarm-clock';
import MovingArrowDownLeft from '@jis3r/icons/icons/arrow-down-left';
import MovingArrowUpRight from '@jis3r/icons/icons/arrow-up-right';
import MovingBadgeCheck from '@jis3r/icons/icons/badge-check';
import MovingBellRing from '@jis3r/icons/icons/bell-ring';
import MovingCalendarDays from '@jis3r/icons/icons/calendar-days';
import MovingCalendarOff from '@jis3r/icons/icons/calendar-off';
import MovingClock from '@jis3r/icons/icons/clock';
import type { Glyph, PaletteColor } from '$lib/components/ui';
import type { LoanDirection, LoanDue } from '$lib/loans';

/**
 * How a loan is painted. Money coming back to them wears mint, as the insights
 * draw what's received; money they owe wears rose, `spent`'s own. The arrows
 * point the way it will move when it's settled: in to them, or out.
 */
export const DIRECTION_TINT: Record<LoanDirection, PaletteColor> = {
	lent: 'mint',
	borrowed: 'rose'
};

export const DIRECTION_GLYPH: Record<LoanDirection, Glyph> = {
	lent: { icon: MovingArrowDownLeft, set: 'moving' },
	borrowed: { icon: MovingArrowUpRight, set: 'moving' }
};

/** The side's chip: the ledger's in and out tints. */
export const DIRECTION_CHIP: Record<LoanDirection, string> = {
	lent: 'bg-positive/12 text-positive',
	borrowed: 'bg-spent/15 text-spent'
};

/** Where a loan stands against its due day, as a glyph that says it. */
export const DUE_GLYPH: Record<LoanDue['kind'], Glyph> = {
	overdue: { icon: MovingAlarmClock, set: 'moving' },
	today: { icon: MovingBellRing, set: 'moving' },
	soon: { icon: MovingClock, set: 'moving' },
	later: { icon: MovingCalendarDays, set: 'moving' },
	open: { icon: MovingCalendarOff, set: 'moving' },
	settled: { icon: MovingBadgeCheck, set: 'moving' }
};

/**
 * Its chip: late in `negative` — the one state that asks for something —
 * close in peach, the rest quiet, settled in `positive`.
 */
export const DUE_CHIP: Record<LoanDue['kind'], string> = {
	overdue: 'bg-negative/12 text-negative',
	today:
		'bg-[color-mix(in_oklab,var(--pastel-peach)_25%,transparent)] text-[oklch(from_var(--pastel-peach)_0.52_calc(c*1.8)_h)] dark:text-(--pastel-peach)',
	soon: 'bg-[color-mix(in_oklab,var(--pastel-peach)_25%,transparent)] text-[oklch(from_var(--pastel-peach)_0.52_calc(c*1.8)_h)] dark:text-(--pastel-peach)',
	later: 'bg-sunken text-fg-muted',
	open: 'bg-sunken text-fg-subtle',
	settled: 'bg-positive/12 text-positive'
};

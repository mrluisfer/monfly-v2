import { isMonthKey, type MonthKey } from '$lib/finance/period';

/** `[month=month]` route segments: `2026-09`, never `2026-9` or `2026-13`. */
export function match(param: string): param is MonthKey {
	return isMonthKey(param);
}

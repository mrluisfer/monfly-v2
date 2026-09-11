const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const DAY = 86_400_000;

/** How long ago `iso` was, in the largest unit that fits: "today", "yesterday", "4 days ago", "3 months ago". */
export function formatAge(iso: string, now = new Date()): string {
	const days = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY));
	if (days < 30) return relative.format(-days, 'day');
	if (days < 365) return relative.format(-Math.floor(days / 30), 'month');
	return relative.format(-Math.floor(days / 365), 'year');
}

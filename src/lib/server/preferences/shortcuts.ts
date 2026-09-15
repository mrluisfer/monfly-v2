import { eq, sql } from 'drizzle-orm';
import {
	ACTIVITY_WEEKS,
	DEFAULT_SHORTCUTS,
	SHORTCUT_SOURCES,
	type ShortcutActivity,
	type ShortcutId,
	type ShortcutSource
} from '../../shortcuts';
import type { db as appDb } from '../db';
import { shortcutEvent, user } from '../db/schema';

/** The shortcuts a user has pinned to the header, by id. */
export async function getPinnedShortcuts(
	db: Pick<typeof appDb, 'select'>,
	userId: string
): Promise<string[]> {
	const [row] = await db
		.select({ shortcuts: user.shortcuts })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);
	return row?.shortcuts ?? [...DEFAULT_SHORTCUTS];
}

/**
 * Pins one shortcut, or takes it away, and records the change: one statement,
 * so the array and its history can't disagree. The array changes in place
 * (`array_append` / `array_remove`), so two devices changing different
 * shortcuts at once can't overwrite each other, and pinning one twice keeps it
 * once. A request that changes nothing records nothing. Validate `id` and
 * `source` first. Returns every pinned id.
 */
export async function setShortcutPinned(
	db: Pick<typeof appDb, 'execute'>,
	userId: string,
	{ id, pinned, source }: { id: ShortcutId; pinned: boolean; source: ShortcutSource }
): Promise<string[]> {
	// The column's own default stands in for a row that has none.
	const current = sql`coalesce(${user.shortcuts}, ARRAY['overview', 'transactions']::text[])`;
	const next = pinned
		? sql`case when ${id}::text = any(${current}) then ${current} else array_append(${current}, ${id}::text) end`
		: sql`array_remove(${current}, ${id}::text)`;

	// Every statement in the query sees the row as it was, so `before` is the
	// array ahead of the update. Parameters are cast: an untyped one in an
	// INSERT … SELECT would arrive as text.
	const { rows } = await db.execute<{ shortcuts: string[] | null }>(sql`
		with before as (
			select ${id}::text = any(${current}) as was from ${user} where ${user.id} = ${userId}
		),
		changed as (
			update ${user} set "shortcuts" = ${next} where ${user.id} = ${userId}
			returning ${user.email} as email, ${user.shortcuts} as shortcuts
		),
		logged as (
			insert into ${shortcutEvent} ("id", "userEmail", "shortcutId", "pinned", "source")
			select ${crypto.randomUUID()}::text, changed.email, ${id}::text, ${pinned}::boolean, ${source}::text
			from changed, before
			where before.was is distinct from ${pinned}::boolean
			returning 1
		)
		select shortcuts from changed
	`);
	return rows[0]?.shortcuts ?? [];
}

/**
 * The last `ACTIVITY_WEEKS` weeks of changes, counted by week, by shortcut and
 * by source — in the database, not by loading the rows. Weeks start on Monday
 * in the viewer's zone, and one with nothing in it still gets its zeros; so
 * does a source nobody used.
 */
export async function getShortcutActivity(
	db: Pick<typeof appDb, 'execute'>,
	userEmail: string,
	timeZone: string
): Promise<ShortcutActivity> {
	// Stored as UTC wall time, as Prisma stored every timestamp: read in the viewer's zone.
	const week = sql`date_trunc('week', (${shortcutEvent.createdAt} at time zone 'UTC') at time zone ${timeZone})`;
	const thisWeek = sql`date_trunc('week', now() at time zone ${timeZone})`;
	const firstWeek = sql`${thisWeek} - make_interval(weeks => ${ACTIVITY_WEEKS - 1}::int)`;
	const inWindow = sql`${shortcutEvent.userEmail} = ${userEmail} and ${week} >= ${firstWeek}`;

	const [weeks, shortcuts, sources] = await Promise.all([
		db.execute<{ start: string; pinned: number; unpinned: number }>(sql`
			select to_char(weeks.start, 'YYYY-MM-DD') as start,
				(count(${shortcutEvent.id}) filter (where ${shortcutEvent.pinned}))::int as pinned,
				(count(${shortcutEvent.id}) filter (where not ${shortcutEvent.pinned}))::int as unpinned
			from generate_series(${firstWeek}, ${thisWeek}, interval '1 week') as weeks(start)
			left join ${shortcutEvent}
				on ${shortcutEvent.userEmail} = ${userEmail} and ${week} = weeks.start
			group by weeks.start
			order by weeks.start
		`),
		db.execute<{ id: string; pinned: number; unpinned: number }>(sql`
			select ${shortcutEvent.shortcutId} as id,
				(count(*) filter (where ${shortcutEvent.pinned}))::int as pinned,
				(count(*) filter (where not ${shortcutEvent.pinned}))::int as unpinned
			from ${shortcutEvent}
			where ${inWindow}
			group by ${shortcutEvent.shortcutId}
			order by count(*) desc, ${shortcutEvent.shortcutId}
		`),
		db.execute<{ source: string; count: number }>(sql`
			select ${shortcutEvent.source} as source, count(*)::int as count
			from ${shortcutEvent}
			where ${inWindow}
			group by ${shortcutEvent.source}
		`)
	]);

	const counted = new Map(sources.rows.map((row) => [row.source, row.count]));
	return {
		total: weeks.rows.reduce((sum, row) => sum + row.pinned + row.unpinned, 0),
		weeks: weeks.rows,
		shortcuts: shortcuts.rows,
		sources: SHORTCUT_SOURCES.map((source) => ({ source, count: counted.get(source) ?? 0 })).sort(
			(a, b) => b.count - a.count
		)
	};
}

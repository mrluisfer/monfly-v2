import { eq, sql } from 'drizzle-orm';
import type { ColorChoices, ColorKind } from '../../colors';
import type { PaletteColor } from '../../components/ui/palette';
import type { db as appDb } from '../db';
import { user } from '../db/schema';

/** The colours a user has picked; an empty document when none. */
export async function getColorChoices(
	db: Pick<typeof appDb, 'select'>,
	userId: string
): Promise<ColorChoices> {
	const [row] = await db.select({ colors: user.colors }).from(user).where(eq(user.id, userId)).limit(1);
	return row?.colors ?? {};
}

/**
 * Sets one choice — or, with null, forgets it — inside the JSON document in a
 * single statement, so two tabs recolouring at once can't overwrite each
 * other. Validate `color` against the palette first. Returns every choice.
 */
export async function setColorChoice(
	db: Pick<typeof appDb, 'update'>,
	userId: string,
	kind: ColorKind,
	key: string,
	color: PaletteColor | null
): Promise<ColorChoices> {
	const current = sql`coalesce(${user.colors}, '{}'::jsonb)`;
	const next =
		color === null
			? sql`${current} #- array[${kind}, ${key}]::text[]`
			: sql`${current} || jsonb_build_object(${kind}::text, coalesce(${current} -> ${kind}::text, '{}'::jsonb) || jsonb_build_object(${key}::text, ${color}::text))`;

	const [row] = await db
		.update(user)
		.set({ colors: next })
		.where(eq(user.id, userId))
		.returning({ colors: user.colors });
	return row?.colors ?? {};
}

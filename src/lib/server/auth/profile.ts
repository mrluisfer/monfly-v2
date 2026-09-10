import { eq, sql } from 'drizzle-orm';
import type { db as appDb } from '../db';
import { user } from '../db/schema';
import type { Session } from './session';

/** The Monfly account behind a session — never includes the password hash. */
export type MonflyUser = {
	id: string;
	email: string;
	name: string | null;
	avatarSeed: string | null;
	preferredCurrency: string | null;
};

const profileColumns = {
	id: user.id,
	email: user.email,
	name: user.name,
	avatarSeed: user.avatarSeed,
	preferredCurrency: user.preferredCurrency
};

const IMPORTED_PREFIX = 'auth0|';

/**
 * Finds the `User` row for an Auth0 session. Read-only.
 *
 * 1. By id — v1 users were imported with their ids preserved, so Auth0 names
 *    them `auth0|<User.id>`.
 * 2. By email, but only when Auth0 says it is verified: an unverified address
 *    could belong to anyone, and must never claim someone else's data. The
 *    match is case-insensitive, and anything but exactly one row stays unlinked.
 */
export async function findMonflyUser(
	db: Pick<typeof appDb, 'select'>,
	session: Session
): Promise<MonflyUser | null> {
	const { id, email, emailVerified } = session.user;

	if (id.startsWith(IMPORTED_PREFIX)) {
		const [byId] = await db
			.select(profileColumns)
			.from(user)
			.where(eq(user.id, id.slice(IMPORTED_PREFIX.length)))
			.limit(1);
		if (byId) return byId;
	}

	if (emailVerified && email) {
		// Don't assume stored emails are lowercased. The unique index is
		// case-sensitive, so two rows can differ only in case: with more than one
		// match, link neither rather than pick one.
		const matches = await db
			.select(profileColumns)
			.from(user)
			.where(sql`lower(${user.email}) = ${email.toLowerCase()}`)
			.limit(2);
		if (matches.length === 1) return matches[0];
		if (matches.length > 1) console.warn('Email matches several Monfly users; not linking', { sub: id });
	}

	return null;
}

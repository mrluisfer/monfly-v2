// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Set on every request by hooks.server.ts; null when signed out. */
			session: import('$lib/server/auth').Session | null;
			/**
			 * The Monfly `User` row behind the session, or null (signed out, or a new
			 * Auth0 user with no row yet). Lazy and memoised per request.
			 */
			getMonflyUser: () => Promise<import('$lib/server/auth').MonflyUser | null>;
			/** The viewer's IANA time zone (the `tz` cookie), or UTC. Set by hooks.server.ts. */
			timeZone: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

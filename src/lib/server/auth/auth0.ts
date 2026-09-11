import { env } from '$env/dynamic/private';
import {
	type CookieHandler,
	CookieTransactionStore,
	ServerClient,
	StatelessStateStore
} from '@auth0/auth0-server-js';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { safeRedirect } from './guard';

/*
 * Auth0 through its official server SDK. The SDK is framework-agnostic: it
 * reads and writes cookies only through the handler below, which is backed by
 * SvelteKit's per-request `event.cookies`. Every call passes `{ cookies }`.
 */

type StoreOptions = { cookies: Cookies };

/** What the login round-trip carries through Auth0 and back. */
type AppState = { returnTo: string };

const jar = (store?: StoreOptions): Cookies => {
	if (!store) throw new Error('Auth0 store options missing — pass { cookies: event.cookies }');
	return store.cookies;
};

const cookieHandler: CookieHandler<StoreOptions> = {
	// SvelteKit requires an explicit path; the SDK only sometimes sends one.
	setCookie: (name, value, options, store) =>
		jar(store).set(name, value, { ...options, path: options?.path ?? '/' }),
	getCookie: (name, store) => jar(store).get(name),
	getCookies: (store) =>
		Object.fromEntries(
			jar(store)
				.getAll()
				.map(({ name, value }) => [name, value])
		),
	deleteCookie: (name, store, options) =>
		jar(store).delete(name, { ...options, path: options?.path ?? '/' })
};

type Auth0Config = { domain: string; clientId: string; clientSecret: string; secret: string };
let config: Auth0Config | null | undefined;

/** Reads the AUTH0_* variables once; explains itself when they're half set. */
function readConfig(): Auth0Config | null {
	if (config !== undefined) return config;
	const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET } = env;
	const values = [AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET];
	config = null;

	if (values.every(Boolean)) {
		if (AUTH0_SECRET!.length < 32) {
			console.error(
				'AUTH0_SECRET must be at least 32 characters (openssl rand -hex 32) — Auth0 stays off.'
			);
		} else {
			config = {
				// The SDK wants a bare host; tolerate a pasted https:// URL.
				domain: AUTH0_DOMAIN!.replace(/^https?:\/\//, '').replace(/\/+$/, ''),
				clientId: AUTH0_CLIENT_ID!,
				clientSecret: AUTH0_CLIENT_SECRET!,
				secret: AUTH0_SECRET!
			};
		}
	} else if (values.some(Boolean)) {
		console.error('Auth0 is half configured — set all four AUTH0_* variables. Auth0 stays off.');
	}
	return config;
}

let client: ServerClient<StoreOptions> | undefined;

function auth0(): ServerClient<StoreOptions> {
	const cfg = readConfig();
	if (!cfg) throw new Error('Auth0 is not configured');
	client ??= new ServerClient<StoreOptions>({
		domain: cfg.domain,
		clientId: cfg.clientId,
		clientSecret: cfg.clientSecret,
		authorizationParams: { scope: 'openid profile email' },
		transactionStore: new CookieTransactionStore({ secret: cfg.secret }, cookieHandler),
		// Stateless: the whole session lives in the encrypted cookie — no store to run.
		stateStore: new StatelessStateStore({ secret: cfg.secret }, cookieHandler)
	});
	return client;
}

/** True when all four AUTH0_* variables are set and valid. */
export function isAuth0Configured(): boolean {
	return readConfig() !== null;
}

/**
 * Builds the Universal Login URL — its sign-up screen or login — and stores the
 * PKCE transaction in an encrypted cookie. The callback URL is derived from
 * the request, so every origin you register in Auth0 works unchanged.
 */
export function startAuth0Login(
	event: RequestEvent,
	{ screen, returnTo }: { screen: 'signup' | 'login'; returnTo: string }
): Promise<URL> {
	return auth0().startInteractiveLogin(
		{
			appState: { returnTo } satisfies AppState,
			authorizationParams: {
				redirect_uri: new URL('/auth/callback', event.url.origin).href,
				...(screen === 'signup' ? { screen_hint: 'signup' } : {})
			}
		},
		{ cookies: event.cookies }
	);
}

/** Exchanges the code on /auth/callback and says where to send the user. */
export async function completeAuth0Login(event: RequestEvent): Promise<{ returnTo: string }> {
	const { appState } = await auth0().completeInteractiveLogin<AppState>(event.url, {
		cookies: event.cookies
	});
	// Validated again: the value made a round-trip outside this server.
	return { returnTo: safeRedirect(appState?.returnTo) };
}

/** The signed-in user's claims, read from the session cookie — no network. */
export function getAuth0User(event: RequestEvent) {
	return auth0().getUser({ cookies: event.cookies });
}

/** Clears the local session and returns Auth0's logout URL to finish there. */
export function auth0Logout(event: RequestEvent, returnTo: string): Promise<URL> {
	return auth0().logout({ returnTo }, { cookies: event.cookies });
}

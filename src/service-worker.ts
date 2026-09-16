/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, prerendered, version } from '$service-worker';

/**
 * What makes Monfly installable, and what it is allowed to keep.
 *
 * The rule this file is built around: **the cache is written at install and
 * never again.** Everything stored is the shell — the hashed bundles, the
 * files in `static/`, and the one prerendered page below. No response to a
 * request is ever put in the cache, so nothing belonging to a person can land
 * on the disk of the computer they signed in from.
 *
 * That rules out reading the ledger with no connection, which is deliberate:
 * offline data is its own piece of work, with its own store and its own
 * answer for writes made while away (docs/decisions/0017). Until then, an
 * installed Monfly opens instantly, and says so plainly when it can't reach
 * the server.
 */

// `self` in a worker, which the DOM's `Window` type would otherwise claim.
const sw = self as unknown as ServiceWorkerGlobalScope;

/** One cache per build: `version` changes with every deploy. */
const CACHE = `monfly-${version}`;

/** The shell — hashed bundles, `static/`, and the page shown with no network. */
const SHELL = [...build, ...files, ...prerendered];
const SHELL_PATHS = new Set(SHELL);

/** Where a navigation lands when the network is gone. Prerendered, so it is in `prerendered`. */
const OFFLINE = '/offline';

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;

	// A write always goes to the network, and a failed one must stay failed:
	// the page's own error is the honest answer, not a cached success.
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	// Personal data, and the endpoints say `private, no-store`. The Cache API
	// isn't bound by that header, so the refusal has to be written here too.
	if (url.pathname.startsWith('/api/')) return;

	// The shell: hashed or versioned with the build, so the cache is the truth
	// and the network is never asked.
	if (SHELL_PATHS.has(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
		return;
	}

	// A page. Pages are rendered for whoever is signed in and guarded on the
	// server, so none of them is cached — with no network the visitor gets the
	// offline page rather than someone else's dashboard.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).catch(async () => (await caches.match(OFFLINE)) ?? Response.error())
		);
	}
});

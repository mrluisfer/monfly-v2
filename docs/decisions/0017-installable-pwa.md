# 0017. Monfly installs as a PWA; a desktop shell comes later

Status: accepted · 2026-09-16

**Context** — Monfly is wanted on the desktop, and Electron is the obvious
answer. It is the wrong first step. What makes a desktop app worth having —
opening instantly, surviving a reload, saying something useful with no
connection — lives in the data layer, not in the shell, and an Electron window
is Chromium: pointed at the deployed origin it runs the same manifest and the
same service worker a browser does. Everything built here is inherited by a
desktop shell later, and none of it is wasted if that shell never ships.

The shape of the app settles the rest. `DATABASE_URL` and `AUTH0_CLIENT_SECRET`
belong to the server, and an app bundle is a zip: whatever window Monfly ends up
in, it is a client of the deployment, not a copy of it. Auth0 is a Regular Web
Application with the session in a cookie ([0002](0002-auth0-universal-login.md))
and there are no social connections, so Universal Login renders inside an
installed window with nothing to change.

**Decision** — Monfly is installable: `static/manifest.webmanifest`, three icons
rasterised from `static/favicon.svg`, and `src/service-worker.ts`. `theme-color`
is left to ModeWatcher in the root layout, which already follows the theme.

The service worker is built around one rule — **it writes its cache at install
and never again**. It stores the shell: the hashed bundles, `static/`, and the
prerendered `/offline`. No response to a request is ever put in the cache, and
`/api/*` is passed straight through, so nothing belonging to a person lands on
the disk of the computer they signed in from. The Cache API is not bound by the
endpoints' `private, no-store`, so that refusal is written in the worker too.
With no network a navigation gets `/offline` rather than a stale dashboard.

Electron is not adopted. It becomes a shell over this same origin if and when
the desktop needs what a browser cannot give — a tray, global shortcuts, a
signed installer — and by then it inherits whatever the cache has grown into.

**Consequences** — Reading the ledger offline still doesn't work, deliberately:
offline data needs a store, a queue for writes made while away and an answer for
conflicts, which is its own decision. The ids help when it comes — they are
generated in JavaScript (`$defaultFn(crypto.randomUUID)`, no default in the
database), so a transaction written offline can carry its final id. The phases
from here to there are in [Offline and desktop](../offline-and-desktop.md).

Installing precaches about 1.6 MB, and the cache is keyed by the build's
`version`: every deploy costs each installed client one refetch of the shell,
and the old cache is deleted on activate. The new worker takes over on the next
launch, not mid-session, so a page is never left with chunks the shell no longer
has. `start_url` repeats `/dashboard` from `HOME_PATH` because a static manifest
cannot import it. An installed window shares the browser profile's cookies, so
signing in on either side carries to the other.

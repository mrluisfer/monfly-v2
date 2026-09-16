# Offline and desktop

The road from a website to an app that installs, opens instantly, keeps working
without a connection and, one day, lives in a desktop shell. Written when the
question was "should Monfly be an Electron app?"; the short answer is recorded
in [0017](decisions/0017-installable-pwa.md). This is the long one, and the
plan that follows from it.

**The finding that orders everything:** almost all of what makes a desktop app
worth having — speed, a cache that survives a reload, reading with no network —
lives in the data layer, not in the shell. Build it for the web and a desktop
shell inherits it. Build the shell first and it is an empty window.

## Where Monfly stands

What already helps:

- **The API is already an API.** Every read and write goes through `/api/*` by
  way of two functions, `getJson` and `sendJson` in `src/lib/queries/http.ts`.
  No component fetches on its own, so a change of origin or transport happens in
  one place.
- **Ids are made in JavaScript, not in Postgres.** `schema.ts` gives every table
  `$defaultFn(crypto.randomUUID)` and the columns have no default in the
  database. A row written offline can carry its final id — the part of offline
  writes that is usually hardest is already done.
- **`updatedAt` moves on every write** — v2 sets it in SQL
  (`src/lib/server/transactions/edit.ts`), v1 through Prisma's `@updatedAt`.
  Asking for "what changed since" is within reach.
- **Sessions resolve in one function.** `resolveSession`
  (`src/lib/server/auth/session.ts`) is the only place auth plugs in; the hook,
  the guard and every load read its result. A second way to sign in is one
  function, not a refactor.
- **The ledger already knows it can run out.** `MAX_TRANSACTIONS` (2000) comes
  with a `capped` flag instead of truncating quietly, and the totals are summed
  over the whole record in their own query, so paging the rows won't move the
  headline figures.

What holds it back:

- **Nothing is cached between visits.** All thirteen endpoints answer
  `private, no-store`, and TanStack Query keeps its cache in memory
  (`staleTime` 60s, `(app)/+layout.ts`). A reload starts from nothing.
- **The ledger's first paint waits on five requests**, two of which overlap: the
  whole record (up to 2000 rows) and the month on screen
  (`(app)/transactions/+page.ts`).
- **Every API call looks the user up.** `locals.getMonflyUser()` is one database
  round trip per request — memoised within a request, never across them.
- **A deletion can't be synced.** `Transaction` has no `deletedAt`, so an
  incremental "since" can report rows that changed but never rows that are gone.
- **Money is `double precision` in the database** — known debt, noted in
  `schema.ts`. Any arithmetic moved to the client for offline use makes float
  drift visible sooner.

## The desktop question

**The server keeps its secrets.** `DATABASE_URL` and `AUTH0_CLIENT_SECRET` can't
ship inside an app — a bundle is a zip, and the database is shared with v1 — so
whatever window Monfly runs in, it is a client of the deployment. That leaves
two shapes:

|                  | Window loads the deployed site             | Local bundle calling the remote API                               |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Sign-in          | Today's Auth0 cookie session, unchanged    | Auth0 Native app with PKCE, tokens in the OS keychain, Bearer API |
| CORS             | None: same origin                          | An allowlist, and preflights                                      |
| Server rendering | Kept                                       | Gone on desktop; the `(app)` server loads need client twins       |
| Cold start       | Needs the network (until the shell caches) | Instant                                                           |
| Cost             | Days                                       | Weeks                                                             |

**A service worker closes most of the gap.** An Electron window is Chromium, and
Chromium runs service workers. Pointed at the deployed origin, a desktop shell
gets the same install, the same cached shell and the same offline behaviour as
the browser, with no desktop-specific code. The right-hand column is only worth
its cost if starting with no network at all turns out to be a requirement.

Universal Login renders inside a desktop window as it is: there are no social
connections (the v1 users were imported with their password hashes), so
Google's block on embedded browsers doesn't apply. Adding "Sign in with Google"
changes that, and would mean opening the system browser and returning through a
`monfly://` link.

## Roadmap

Each phase is useful on its own, and the web gets every one of them before a
desktop shell exists.

### 1. Deploy

- [ ] v2 on Vercel. `adapter-auto` detects Vercel at build time; pin
      `@sveltejs/adapter-vercel` only when a region or runtime needs setting.
- [ ] The production origin in Auth0's Allowed Callback and Logout URLs.

### 2. Installable — done ([0017](decisions/0017-installable-pwa.md))

- [x] Manifest, icons, and a service worker that precaches the shell.
- [x] `/offline` for a navigation with no network.
- [x] Description, canonical and share-preview tags on the pages a crawler can
      reach (`src/lib/components/layout/Meta.svelte`).

### 3. Cache and performance

- [ ] **`ETag` + `private, no-cache` on the GET endpoints.** Still private and
      still revalidated every time, but an unchanged answer comes back as a 304
      with no body. It saves bytes, not the round trip — worth it on
      `/api/transactions`, not on `/api/me/colors`.
- [ ] **Persist the query cache to IndexedDB.** The page opens on what it last
      knew and refreshes behind it. The largest perceived speed-up available.
      Needs a decision on data at rest (see Open questions), and a purge on
      logout.
- [ ] **Stop waiting on the whole record.** Window or page the ledger instead of
      prefetching all of it alongside the month.
- [ ] **Measure `getMonflyUser`** before touching it; a claim in the token would
      remove it once Bearer auth exists.

### 4. Offline writes

- [ ] A queue for mutations made while away, replayed through `onlineManager`.
      The optimistic pattern already exists (`assignAccountMutation`).
- [ ] `deletedAt` on the synced tables, or a tombstone table — additive, so
      allowed while v1 runs ([0015](decisions/0015-drizzle-kit-owns-migrations.md)).
- [ ] `?since=<updatedAt>` on the list endpoints, with an index on
      `(userEmail, updatedAt)`.
- [ ] A written conflict policy (see Open questions).

### 5. Desktop shell over the same origin

- [ ] Only when the desktop needs what a browser can't give: a tray, global
      shortcuts, a signed installer an IT department can push.
- [ ] Electron (MIT) loading the production origin; signing and notarisation;
      an update feed (a bucket, not GitHub Releases — the repo is private);
      release builds in CI with actions pinned by SHA.

### 6. Local bundle — only if needed

- [ ] Auth0 Native app + PKCE, `Authorization: Bearer` accepted in
      `resolveSession`, a CORS allowlist, and client versions of the `(app)`
      server loads.

## Before launch

What a person has to fill in or decide; nothing here can be derived from the
code.

- [ ] **The description** — `DESCRIPTION` in
      `src/lib/components/layout/Meta.svelte` and `description` in
      `static/manifest.webmanifest`. Today both say "Where your money went, and
      what is left."
- [ ] **The share image** — `static/og-image.png`, 1200×630. Today it is the
      mark on ink; a designed one with the name and a line of copy would unfurl
      better.
- [ ] **Install on the real domain.** Installing needs HTTPS; `localhost` is the
      only exception, so the prompt first appears once deployed.
- [ ] **Check a shared link** in the debuggers of the places people will paste
      it (WhatsApp, Slack, X, LinkedIn); each caches the first preview it sees.

## Risks

- **Two ways to sign in are two surfaces to keep safe.** If Bearer auth arrives,
  it goes through `resolveSession` and nowhere else.
- **Financial data on disk.** A persisted cache outlives the tab. On a shared
  computer that is someone else's ledger.
- **A deploy costs every installed client one refetch of the shell** (about
  1.6 MB); the new worker takes over on the next launch, never mid-session.
- **Link previews are cached by the platforms**, not by us: a wrong image stays
  wrong until each platform is asked to scrape again.

## Open questions

- Is data at rest acceptable unencrypted in IndexedDB, or does a persisted cache
  need encrypting — or not exist on shared machines?
- Conflicts between devices: last write wins on `updatedAt`, or something
  stricter for money?
- Does the desktop need anything a browser can't give? If not, phase 5 may never
  be needed.
- Is starting with no network at all a requirement? If not, phase 6 never is.

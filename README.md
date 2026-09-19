# Monfly v2

Rewrite of Monfly on SvelteKit: the UI foundation, Auth0 sign-in, Drizzle on
the database v1 shares, and the first real dashboard data ("Spent this month").

## Stack

| Layer          | Choice                                                                         | Notes                                                                                                  |
| -------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Framework      | SvelteKit 2 + Svelte 5 (runes)                                                 | Runes forced on outside `node_modules`                                                                 |
| Styling        | Tailwind CSS 4                                                                 | OKLCH tokens in `src/app.css`, light + dark                                                            |
| Animation      | Motion                                                                         | `use:reveal`, `use:spring`, tab surface, `pop` transitions                                             |
| Animation      | GSAP                                                                           | `use:countUp`, the signup timeline, the theme-toggle morph                                             |
| Positioning    | Floating UI                                                                    | Inside bits-ui for tooltips/popovers; `use:anchor` otherwise                                           |
| Primitives     | bits-ui                                                                        | Accessible headless components                                                                         |
| Server state   | TanStack Query v6                                                              | Per-request client; `$lib/queries` (see Data flow)                                                     |
| Tables         | TanStack Table v9                                                              | Installed, not yet used                                                                                |
| Icons          | `@lucide/svelte`                                                               | The Svelte 5 package, not `lucide-svelte`                                                              |
| Animated icons | `@jis3r/icons`, `@animated-color-icons/lucide-svelte`, `svelte-animated-icons` | Svelte 5 sets only; which to pick in DESIGN.md → Icons ([0010](docs/decisions/0010-animated-icons.md)) |
| Theming        | mode-watcher                                                                   | Toggles `.dark` on `<html>`, no FOUC                                                                   |

## Design language

Based on a QuickBooks-style dashboard reference: browser-style workspace tabs
instead of a sidebar, heavily rounded cards on a grey canvas, blurred gradient
shapes and diagonal hatch fills for empty/remaining areas. The app runs full
bleed — the blue backdrop in the reference shot was only presentation framing,
so it is not part of the UI.

| Token    | Value     | Role                        |
| -------- | --------- | --------------------------- |
| `blue`   | `#495BFF` | Primary accent              |
| `violet` | `#AC49FF` | Secondary accent            |
| `lime`   | `#B0FF09` | Positive / highlight accent |
| `ink`    | `#050F1C` | Text, hairline outlines     |

Surfaces (`window`, `canvas`, `card`, `sunken`) and `hairline` are theme-swapped;
the four brand colours are constant across light and dark.

**Layout: grids of cards that fill their cells.** Every route composes its
content as cards in a grid — equal heights, the shared `gap-4` gutter, edges
aligned with their neighbours — so pages read as one homogeneous flow. No
content-sized boxes centred in empty space: when a card holds less than its
cell, keep the card full-size and anchor inside it (a header row on top — title
left, action right, like the dashboard cards — content at the bottom), and cap
line length with `max-w-*` rather than shrinking the card. `/dashboard` and
`/signup` are the reference layouts.

**Fonts.** The reference uses PP Formula + Lufga, both commercial. The closest
Google Fonts equivalents are in use, self-hosted via Fontsource (no external
request):

- **Space Grotesk** → PP Formula. Headings and figures, `font-display`.
- **Outfit** → Lufga. UI and body text, the default `font-sans`.

Two utilities carry the look: `.hatch` (diagonal stripe fill) and
`.outline-hairline` (the near-black 1px outlines, which are not the same as the
grey `--line` used for dividers).

The active workspace tab uses the browser-tab shape. Rather than each tab
morphing on its own, **one shared surface** carries the shape and slides between
tabs with Motion — the tabs themselves only change text colour. That keeps the
shoulders (pseudo-elements, so unreachable from JS) intact through the move, and
matches how a real browser animates its tabs.

`.tab-merge` draws the two concave shoulders: each is a canvas-coloured 16px
square with a quarter disc masked out, so they track the theme automatically.

Two constraints keep the slide clean, and both will bite if changed:

- **The strip's `gap-6` reserves the 16px each shoulder overhangs.** Tighten it
  and neighbouring pills sit on top of the shoulders.
- **Tab widths must be fixed.** The close `✕` is always rendered (transparent
  when inactive) precisely so a width change mid-slide can't reflow the strip
  and fight the animation.

**Interaction, motion and the rest of the taste live in [`DESIGN.md`](DESIGN.md)**
— press feedback, the `pop` transition, floating layers, the header, hotkeys,
with exact timings. Build new UI against it.

### Logo

`Logo.svelte` inlines the mark from `src/lib/assets/monfly-logo.svg`, which is
kept untouched as the master. Every colour in the component derives from the
brand tokens: the master's mint becomes `--lime`, its violet-blue `--blue`, the
middle bands a blue/violet mix and the shadow slices that mix sunk into ink.

- **Mix the blue → lime midpoint in oklab.** oklch keeps full chroma and clips
  to a neon cyan stripe between the two; oklab fades through a pale tone, like
  the `Blob` gradients.
- **Gradient ids come from `$props.id()`, one set per instance.** Clone the
  rendered SVG or paste the markup twice and the ids collide: every copy then
  paints from the first copy's `<defs>`, silently.

## Commands

```bash
pnpm dev          # dev server on :5173
pnpm build        # production build
pnpm preview      # preview the build
pnpm check        # svelte-check (types + a11y)
pnpm lint         # Oxfmt + ESLint
pnpm format       # format the whole repo
pnpm storybook    # Storybook on :6006: the design system, a story per component
pnpm build-storybook # static Storybook in storybook-static/
pnpm db:generate  # write the next migration from schema.ts into drizzle/
pnpm db:migrate   # apply pending migrations to develop
pnpm db:migrate:production # …then to production
pnpm db:pull      # develop's structure into drizzle-pull/ (read-only)
pnpm db:studio    # Drizzle Studio on develop — it can edit rows
```

## Layout

```
src/
  app.css                    design tokens — edit the palette here
  lib/
    actions/                 reveal + spring (Motion), countUp (GSAP), anchor (Floating UI)
    transitions/             pop — Svelte in/out transitions animated by Motion
    components/
      ui/                    Logo, Card, Meter, DottedRing, Blob, Sparkle, Caret,
                             PillButton, IconButton, Figure, Tooltip, ThemeToggle,
                             Kbd, Avatar, Orb, Select, Segmented, Switch
                             (+ palette.ts)
      layout/                AppShell, TopBar, TabStrip, UserMenu, PagePlaceholder
      dashboard/             ExpensesDial, AccountBlock, CategoryChip, IncomeBars,
                             TipCard, MeterStat, SpentThisMonth, BudgetEditor
      errors/                ErrorView picks NotFound or ServerError by status
    finance/                 money, months, budget and spending types (isomorphic)
    queries/                 TanStack Query options for our endpoints
    hotkeys/                 the shortcut registry (the dictionary) and its binder
    routes.ts                HOME_PATH, shared by client and server
    utils/                   cn, formatters, motion helpers
    server/auth/             session + route guard (server-only via $lib/server)
    server/db/               Drizzle client, schema, relations (server-only)
    server/finance/          spending and budget queries (server-only)
  hooks.server.ts            attaches the session, guards protected groups
  error.html                 last-resort error page, when +error.svelte can't render
  routes/
    +layout.svelte           global only: fonts, tokens, theme
    +error.svelte            every 404, and failures outside (app): fills the window
    (marketing)/             public — the landing, at /
    (auth)/                  public — signup page, /login, /auth/callback, /auth/logout
    (app)/                   protected — every route inside needs a session
      +layout.server.ts      user for the shell; forces a server round-trip
      +layout.ts             per-request QueryClient
      +layout.svelte         QueryClientProvider + AppShell
      +error.svelte          a failed page, under the header so the tabs stay
      dashboard/ …           /dashboard, /transactions, /insights, …
```

## Routing and auth

Route groups split the app by audience. They shape layouts, never URLs.

| Group         | Access    | URLs                             |
| ------------- | --------- | -------------------------------- |
| `(marketing)` | public    | `/`                              |
| `(auth)`      | public    | `/signup`, `/login`, `/auth/*`   |
| `(app)`       | protected | `/dashboard`, `/transactions`, … |

**The guard lives in `hooks.server.ts`,** not in a layout: hooks run before every
load, form action and endpoint, and SvelteKit turns a redirect thrown there into
a JSON redirect for the `__data.json` requests behind client-side navigation. It
matches the route _group_ — `event.route.id` starts with `/(app)/` — so a page
added anywhere inside `(app)` is protected with no extra code.

**Auth is Auth0,** through its official server SDK, `@auth0/auth0-server-js`.
Sign-up and login happen on Auth0's Universal Login; the session comes back as
an encrypted httpOnly cookie that the guard reads on the server. Until the
`AUTH0_*` variables are set, `resolveSession` falls back to a placeholder
session **in dev only** — a production build without them resolves none, so
`(app)` fails closed.

- **Keep a server load in `(app)/+layout.server.ts`.** It is what makes entering
  the group round-trip through the server even by client-side navigation; with a
  purely universal layout chain the shell renders without asking the server and
  the guard never runs.
- **`(app)/+layout.ts` must spread `data`.** A universal load replaces the server
  load's result rather than merging with it.
- **`redirectTo` always goes through `safeRedirect`.** It is parsed with browser
  URL rules and kept only if it stays on this origin, so `//evil.com`,
  `/\evil.com` and tab tricks fall back to `/dashboard`.

### Auth0 setup

1. Auth0 Dashboard → Applications → Create → **Regular Web Application**
   (not SPA: the session must be readable on the server).
2. Allowed Callback URLs `http://localhost:5173/auth/callback`, Allowed Logout
   URLs `http://localhost:5173/` — plus the production origin when it exists.
3. Fill `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` and
   `AUTH0_SECRET` (`openssl rand -hex 32`) in `.env`.

`/signup` opens Universal Login on its sign-up screen (`screen_hint=signup`);
`/login` opens it on login. The form itself is Auth0's — brand it under
Branding → Universal Login. Logging out is a POST to `/auth/logout`.

### Existing v1 users

The 6 v1 accounts were imported into Auth0 on 2026-09-10 with their bcrypt hashes
(`custom_password_hash`) and their v1 ids preserved: they log in with their old
password, and Auth0 names them `auth0|<User.id>`.

`locals.getMonflyUser()` links a session to its `User` row, lazily and once per
request — by that id first, then by email (case-insensitive, and only if it
matches exactly one row) **only when Auth0 marks it verified**
(an unverified email could belong to anyone). New Auth0 users have no row yet;
v2 will create it with `password` null. The column is optional since v1's
migration `20260910190000_make_user_password_optional` and kept only for v1's
legacy login, which refuses rows without a hash — so v1 must be deployed with
that guard before v2 creates any. Password changes made in v1 after the import
do not reach Auth0.

**Query owned data with `profile.email`** — the stored value — never the Auth0
email. One of the six v1 emails is mixed-case, and the `userEmail` foreign keys
compare case-sensitively: with the Auth0 spelling, that user sees an empty account.

## Installing it

Monfly is a PWA, so it installs to a dock or a taskbar and opens in its own
window ([0017](docs/decisions/0017-installable-pwa.md)). Three pieces:
`static/manifest.webmanifest`, the `icon-*.png` beside it, and
`src/service-worker.ts`. An installed window shares the browser profile's
cookies, so the Auth0 session carries over either way.

- **The service worker writes its cache at install, and never again.** It holds
  the shell — hashed bundles, `static/`, and the prerendered `/offline`. No
  response to a request is cached and `/api/*` is passed straight through, so
  nothing personal reaches the disk. The Cache API ignores the endpoints'
  `private, no-store`, which is why the worker has to refuse as well.
- **Try it against a build, not the dev server**: `pnpm build && pnpm preview`.
  The worker is only bundled for production. Stop the server and reload to see
  `/offline` — the page a navigation gets with nothing to fetch it from.
- **`theme-color` is ModeWatcher's**, set in the root layout so it follows the
  theme. Don't add a static one in `app.html`; the manifest's is for the
  install and splash only.
- **The icons come from `static/favicon.svg`**, so the artwork keeps one home.
  Each is that mark centred in a 512 square — inset 56px for `any`, 96px over
  `--ink` for `maskable` (well inside the 80% safe zone) — rasterised with
  `qlmanage -t -s <size> -o <dir> <wrapper>.svg`.
- **What a search result or a shared link shows is `Meta.svelte`**
  (`src/lib/components/layout/`), rendered by `(marketing)` and `(auth)` — the
  only layouts a crawler reaches. Its URLs are built on the request's origin, so
  no domain is written down anywhere. `static/og-image.png` is the 1200×630
  preview, the same mark on ink; QuickLook squares what it renders, so it was
  drawn on a 1200 square and cropped to its middle 630.

What comes after installing — caching, offline writes, a desktop shell — is
planned in [Offline and desktop](docs/offline-and-desktop.md).

## Database

Drizzle ORM on Neon Postgres, over Neon's HTTP driver. **The database is shared
with monfly-v1 while v1 lives, and v2 owns its schema:** Drizzle Kit writes and
runs the migrations ([0015](docs/decisions/0015-drizzle-kit-owns-migrations.md)).

| File                             | Role                                                               |
| -------------------------------- | ------------------------------------------------------------------ |
| `src/lib/server/db/schema.ts`    | the tables: the source of truth for migrations                     |
| `src/lib/server/db/relations.ts` | relations for `db.query.*`, named after Prisma                     |
| `src/lib/server/db/index.ts`     | the `db` client — server-only via `$lib/server`                    |
| `drizzle/`                       | migrations, a folder each: `migration.sql` and its `snapshot.json` |
| `drizzle.config.ts`              | develop (`.env.develop`): generate, migrate, pull, studio          |
| `drizzle.production.config.ts`   | production (`.env`): `db:migrate:production` only                  |

- **A schema change is a migration.** Edit `schema.ts`, run `pnpm db:generate`
  and read the SQL it wrote; a backfill goes in the same `migration.sql`. Then
  `pnpm db:migrate` applies it to develop, and `pnpm db:migrate:production` to
  production once develop is right. Never `drizzle-kit push`, and never an
  `ALTER` by hand: the database would drift from Drizzle's history.
- **Additive only while v1 lives.** v1's Prisma Client reads these tables: add
  columns, defaults and backfills, but don't rename or drop until v1 is retired.
  `_prisma_migrations` stays as history; don't run `prisma migrate` in v1.
- **Two Neon branches** (project `monfly`): `production`, in this app's
  `.env`, and `develop`, in `.env.develop` (gitignored, as every env file
  is). Each Drizzle config reads only its own file — an exported
  `DATABASE_URL` can't send a migration elsewhere — and runs on the direct host
  (`-pooler` removed), not the pooler.
- **`pnpm db:pull`** writes develop's structure to `drizzle-pull/`
  (gitignored), for comparing the database with `schema.ts` when something
  looks off.
- **Prisma generated some values client-side,** so the schema recreates them:
  ids through `$defaultFn`, `updatedAt` through `$onUpdate`. Without them an
  insert from v2 fails (no id) and `updatedAt` never moves.
- **Ownership is `userEmail` → `User.email`,** not the id — v1's design, kept.
- **The HTTP driver can't hold an interactive transaction.** Use `db.batch()`
  for atomic multi-statement writes — v1's loan and balance mutations will
  need it — or `drizzle-orm/neon-serverless` where a flow needs `db.transaction()`.
- Money is `double precision` (v1 debt; the plan is integer cents).

## Data flow

"Spent this month" on the dashboard is the reference path for every feature
that reads data:

| Layer                 | Where                                                     | Role                                                                                                                                        |
| --------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| domain (isomorphic)   | `src/lib/finance/`                                        | types, `YYYY-MM` months, money in cents — no I/O                                                                                            |
| service (server-only) | `src/lib/server/finance/`                                 | Drizzle queries, keyed by the stored `profile.email`                                                                                        |
| endpoint              | `src/routes/api/months/[month=month]/spending/+server.ts` | JSON over HTTP                                                                                                                              |
| endpoint              | `src/routes/api/me/budget/+server.ts`                     | PUT the monthly budget — cents, or null to clear                                                                                            |
| endpoint              | `src/routes/api/budgets/+server.ts`                       | GET a month against the budgets (`?month=`, this one by default); PUT one category's limit — cents, or null to take it away                 |
| endpoint              | `src/routes/api/expenses/categories/+server.ts`           | expenses by category: `?year=` or all time                                                                                                  |
| endpoint              | `src/routes/api/me/colors/+server.ts`                     | GET the colour choices; PATCH one (or null to forget)                                                                                       |
| endpoint              | `src/routes/api/me/shortcuts/+server.ts`                  | GET the pinned shortcuts; PATCH one on or off (Overview is always pinned)                                                                   |
| endpoint              | `src/routes/api/me/shortcuts/activity/+server.ts`         | GET the last eight weeks of shortcut changes: by week, by shortcut, by source                                                               |
| endpoint              | `src/routes/api/accounts/+server.ts`                      | active accounts, oldest first: now, or `?month=` for a past month's closing balances — plus what the total holds beyond them; POST adds one |
| endpoint              | `src/routes/api/accounts/[id]/+server.ts`                 | PATCH its role (`main`, `secondary`, `savings` or null), its status (`active` or `archived`), or the whole account; DELETE removes it       |
| endpoint              | `src/routes/api/accounts/archived/+server.ts`             | archived accounts, most recently changed first, with the balance each was left with                                                         |
| endpoint              | `src/routes/api/accounts/history/+server.ts`              | every active account's balance day by day: `?range=` 1m, 3m, 6m, 1y or all — plus openings and corrections                                  |
| endpoint              | `src/routes/api/transactions/unassigned/+server.ts`       | GET transactions with no account; POST `{ ids, accountId }` gives them one                                                                  |
| endpoint              | `src/routes/api/transfers/+server.ts`                     | POST money from one active account to another: two transactions, both balances, the total untouched                                         |
| endpoint              | `src/routes/api/transfers/[id]/+server.ts`                | PATCH a transfer whole (amount, accounts, day, note); DELETE both of its sides                                                              |
| endpoint              | `src/routes/api/income/+server.ts`                        | income by bucket; `?period=` month, quarter, year or all; `&by=month` splits the year by month                                              |
| endpoint              | `src/routes/api/expenses/+server.ts`                      | what was spent, in the income chart's buckets and with the same `?period=` and `&by=`                                                       |
| endpoint              | `src/routes/api/loans/+server.ts`                         | GET every loan with its recorded payments; POST a new one                                                                                   |
| endpoint              | `src/routes/api/loans/[id]/+server.ts`                    | PATCH a loan whole, or `{ settled }`; DELETE it (409 while payments stand)                                                                  |
| endpoint              | `src/routes/api/loans/[id]/payments/+server.ts`           | POST a payment — a transaction on an account, or the loan alone; DELETE `…/[paymentId]` undoes one                                          |
| query                 | `src/lib/queries/`                                        | TanStack `queryOptions`: key factory + fetcher                                                                                              |
| prefetch              | `src/routes/(app)/dashboard/+page.ts`                     | fills the cache during SSR                                                                                                                  |
| widget                | `src/lib/components/dashboard/SpentThisMonth.svelte`      | `createQuery` → `MeterStat` (presentation only)                                                                                             |

- **Every `/api/*` route requires a session.** The hook answers 401 JSON — a
  fetch can't follow a login redirect. Endpoints then call
  `requireMonflyUser(locals)` (403 for a session with no `User` row) and send
  `cache-control: private, no-store`.
- **Money crosses the wire as integer cents** plus a currency, from
  `preferredCurrency` (MXN when unset, as in v1). Queries round each
  `double precision` amount to cents in SQL; `formatMoney` renders it in the
  currency's home locale.
- **Months are drawn in the viewer's time zone.** app.html stores it in the
  `tz` cookie and the hook exposes `locals.timeZone` — UTC until the cookie
  exists, which is how v1 drew every month. Postgres turns local midnights
  into UTC bounds with `AT TIME ZONE`.
- **A transaction is dated to the minute, not the day.** The endpoints take a
  `date` (`YYYY-MM-DD`) and a `time` (`HH:MM`) in the viewer's zone and store
  that moment (`utcAt`); an edit that keeps both keeps the stored moment to the
  millisecond. They refuse a day after today, but not a minute later than now
  on today — that's the field's to catch, since a browser's clock can run a
  little ahead of the server's. Rows v2 wrote before this sit at local midnight.
- **Transaction `type` is `income` or `expense`; `amount` is always positive.**
  The `Budget`, `RecurringBill`, `Pot` and `MonthlySummary` tables exist only
  in the schema: v1 never implemented them, and they hold no rows.
- **The monthly budget lives on `User.monthlyBudgetCents`** (v1 migration
  `20260910210000_add_user_monthly_budget`): integer cents, the first money
  column stored the planned way. `PUT /api/me/budget` sets or clears it
  (`BudgetEditor`, the pencil); the spending endpoint returns it with the month.
- **Category limits live in `CategoryBudget`**: one row per category name, as
  transactions store it, in integer cents — a standing monthly limit, as the
  budget is. `PUT /api/budgets` writes or deletes one in a single statement, and
  `GET /api/budgets` returns them with the month they're measured in
  ([0024](docs/decisions/0024-category-budgets.md)).
- **Colour choices live in `User.colors`** (JSONB, v1 migration
  `20260910220000_add_user_colors`): `{ "category": { "<name>": "<palette id>" } }`,
  keyed by names as transactions store them. `PATCH /api/me/colors` changes one
  key in a single statement, so concurrent edits don't overwrite each other.
  The Expenses card's chips set them — optimistically, rolled back on error —
  and the dial's wedges follow.
- **Header shortcuts live in `User.shortcuts`**: a text array of ids from
  `$lib/shortcuts`, defaulting to `{overview,transactions}`. Overview is
  stored like the rest but locked: the page takes it out only after four presses
  on its lock and a confirmation. `PATCH /api/me/shortcuts` appends or removes
  one id in a single statement, so two devices can't overwrite each other. The
  session's profile carries the array and `(app)/+layout.ts` seeds the query
  with it, so the header draws on the server
  ([0014](docs/decisions/0014-shortcuts-on-the-user.md)).
- **Every real shortcut change is a `ShortcutEvent`**: which shortcut, which way,
  from where (`page`, `header` or `lock`) and when, written by the same
  statement that changes `User.shortcuts` and only when membership changed.
  `GET /api/me/shortcuts/activity` counts the last eight weeks in SQL for the
  shortcuts page's charts ([0016](docs/decisions/0016-shortcut-events.md)).
- **Featured accounts use `Card.role`** (v1 migration
  `20260910230000_add_card_role`): `main` or `secondary`, unique per user —
  NULLs never collide. `PATCH /api/accounts/[id]` moves a role, and the
  previous holder gives it up in the same transaction (`db.batch`). Unset
  roles fall back to the oldest accounts, in the order they were added.
  v1's `Card.color` stays v1's (hex values it draws with); v2's account
  colours live in `User.colors.account`.
- **The total balance is v1's `User.totalBalance`.** v1 shows that column as
  the total and moves it with every transaction, but moves an account's
  balance only for the transactions on it — and its profile page lets people
  type the total in by hand. `GET /api/accounts` returns what the total holds
  beyond the active accounts as `unassigned` (the dashboard's "Unknown" line),
  split into card-less income and spending since the first account and the
  rest. Card-less transactions dated before the first account aren't among
  those parts: the balance it was opened with already held them.
- **Giving a transaction an account** (`POST /api/transactions/unassigned`,
  the Transactions page) moves it the way v1 links one: the account's balance
  takes its signed amount and `User.totalBalance` stays put — v1 counted it
  when it was recorded. Transactions dated before the first account move no
  balance: the one it was opened with already holds them, and adding them
  again would count them twice. It's one SQL statement (data-modifying CTEs),
  so the balance moves by exactly the rows it updated. Any other v2 write
  must keep `totalBalance` and the balances in step the same way.
- **Accounts are written the way v1 writes them** (`$lib/server/accounts/write`),
  each in one statement, with the role's previous holder cleared first in the
  same `db.batch` where one is given. Adding one moves `totalBalance` by the
  balance it opens with; rewriting one moves it by the difference; archiving
  leaves it alone (the balance joins the Unknown line) and takes the role
  away; deleting one takes out the part of its balance no transaction backs,
  leaves its transactions card-less — still in the total — and forgets its
  colour choice.
- **A transfer is two transactions sharing a `transferId`**: money out of one
  account and into another, both filed under `Transfer`, written, rewritten and
  deleted together in one statement (`$lib/server/transactions/transfer`). The
  total doesn't move, and neither side is income or spending: every figure of
  those leaves them out (`notTransfer`), while balances and the history keep
  them. A side on its own can't be edited or deleted through
  `/api/transactions/[id]` ([0021](docs/decisions/0021-transfers.md)).
- **A balance set by hand is a `BalanceAdjustment`**: which account, what it
  moved by in signed cents (`bigint`) and when, written by the statement that
  rewrites the balance. `GET /api/accounts/history` winds each balance back from
  today through the transactions dated after a day and the corrections made
  after it, so a correction shows as a step on its day instead of redrawing
  the past. v1 never reads the table and its own hand edits leave no row;
  deleting the card deletes its rows, so v1's delete still works
  ([0019](docs/decisions/0019-balance-adjustments.md)).
- **Prefetch in universal loads with SvelteKit's `fetch`.** During SSR it
  calls the endpoint in-process with the visitor's cookies and inlines the
  response, so the server renders real figures and hydration doesn't refetch.
  Widgets read the same cache through `createQuery`; after a write, invalidate
  by key (`spendingKeys.all`).
- **Dashboard choices are per browser, in cookies.** The Income card's period
  and gear write `income-view` (`$lib/income-view`), and the accounts left out
  of the total write `accounts-left-out` (`$lib/accounts-view`); the
  dashboard's `+page.server.ts` reads both, so the prefetch asks for the chosen
  period and split and SSR draws them with nothing shifting on hydration, after
  a reload or a trip to another page. Why not the URL or localStorage:
  [0018](docs/decisions/0018-dashboard-choices-in-cookies.md). Keeping them on
  the account instead would take a v1 migration.
- **The transactions panel is per browser, in localStorage.**
  `$lib/transaction-panel` keeps what it is doing — the row it reads, or the
  fields half written for a row or a new transaction — under
  `monfly:transactions-panel:<User.id>`, so a reload or a trip to another page
  brings it back. The server never reads it: the page restores it after
  hydration, once the ledger has loaded. Fields are kept as typed, and the
  category by name, never a `Category.id`, so the format holds when the field
  becomes a select ([0011](docs/decisions/0011-transactions-panel-in-local-storage.md)).
- **Dismissed notices are per browser, in localStorage.** A `Notice` put away
  writes `monfly:notice:<id>` = `dismissed` and reads it as it mounts, so it
  never shows again in that browser; clearing site data brings it back. It
  isn't per user: a tip holds nothing private, and nothing else is kept.

## Conventions carried over from v1

- **Never hoist the QueryClient to module scope.** On the server that shares one
  cache across every visitor. It is created in `(app)/+layout.ts`.
- Charts, when they land, aggregate in the database — not by loading rows into JS.
  The exception is `/insights`, which re-slices the ledger's own record on every
  gesture and works its figures out in the browser (`$lib/insights`,
  [0023](docs/decisions/0023-insights-read-the-ledger-in-the-browser.md)).

## Gotchas

- **`Tooltip` trigger props must be spread first.** bits-ui ships its own
  `onclick`/`onpointerenter` in the `child` snippet props; spreading `{...props}`
  after your own handler silently overwrites it. See `ThemeToggle.svelte`.
- Every animation checks `prefers-reduced-motion` and renders the final state
  instead of tweening.
- `formatCurrency` drops cents, matching the design. Use `formatCurrencyCents`
  where cents genuinely matter.
- The horizontal gutter is `px-4 sm:px-6 lg:px-8`, set on both `TopBar` and the
  page content so they stay aligned. Change it in both places.
- mode-watcher defers the theme class swap to `requestAnimationFrame`, so in a
  background tab the toggle appears to do nothing until the tab is focused. That
  is throttling, not a bug — pass `synchronousModeChanges` if it ever matters.
- **`[data-anim]` elements start hidden whenever JS runs** (`app.html` adds `.js`
  before first paint; see `.js [data-anim]` in `app.css`). That avoids a flash of
  the final state before hydration, but it means the script that owns them must
  reveal them — animate `autoAlpha`, and set them visible in the reduced-motion
  branch and on failure, as `signup/+page.svelte` does.

## License

Proprietary — all rights reserved. See [LICENSE](LICENSE).

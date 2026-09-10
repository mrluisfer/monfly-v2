# Monfly v2

Rewrite of Monfly on SvelteKit. This is the **UI foundation only** — no data
layer, no auth, no business logic yet.

## Stack

| Layer        | Choice                          | Notes                                        |
| ------------ | ------------------------------- | -------------------------------------------- |
| Framework    | SvelteKit 2 + Svelte 5 (runes)  | Runes forced on outside `node_modules`       |
| Styling      | Tailwind CSS 4                  | OKLCH tokens in `src/app.css`, light + dark  |
| Animation    | Motion                          | Scroll reveals — `use:reveal`                |
| Animation    | GSAP                            | Number tweens — `use:countUp`                |
| Positioning  | Floating UI                     | Bespoke overlays — `use:anchor`              |
| Primitives   | bits-ui                         | Accessible headless components               |
| Server state | TanStack Query v6               | Per-request client, wired but unused         |
| Tables       | TanStack Table v9               | Installed, not yet used                      |
| Icons        | `@lucide/svelte`                | The Svelte 5 package, not `lucide-svelte`    |
| Theming      | mode-watcher                    | Toggles `.dark` on `<html>`, no FOUC         |

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

## Commands

```bash
pnpm dev          # dev server on :5173
pnpm build        # production build
pnpm preview      # preview the build
pnpm check        # svelte-check (types + a11y)
```

## Layout

```
src/
  app.css                    design tokens — edit the palette here
  lib/
    actions/                 reveal (Motion), countUp (GSAP), anchor (Floating UI)
    components/
      ui/                    Card, Meter, DottedRing, Blob, Sparkle, Caret,
                             PillButton, IconButton, Figure, Tooltip, ThemeToggle
      layout/                AppShell, TopBar, TabStrip, PagePlaceholder
      dashboard/             ExpensesDial, AccountBlock, CategoryChip,
                             IncomeBars, TipCard
    utils/                   cn, formatters, motion helpers
  routes/
    +layout.ts               per-request QueryClient
    +layout.svelte           providers + AppShell
    +page.svelte             stack showcase — replace this
```

## Conventions carried over from v1

- **Never hoist the QueryClient to module scope.** On the server that shares one
  cache across every visitor. It is created in `+layout.ts`.
- Charts, when they land, aggregate in the database — not by loading rows into JS.

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

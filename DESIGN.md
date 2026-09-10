# Monfly v2 — design and interaction guide

The taste that makes Monfly feel the way it does, written down so it survives.
Read it before building UI; when a decision here changes, change it here first.
Tokens live in `src/app.css`; the architecture is in `README.md`.

## Principles

1. **Calm surfaces, crisp outlines.** White cards on a grey canvas, separated by
   the gap — never by borders. Controls wear the near-black 1px hairline.
2. **Colour gives it life.** Monfly is not a muted design. The accents carry
   meaning — an icon wears its accent, a state its tone — so the calm surfaces
   never read as grey. Neutral is for text and structure, not for everything.
3. **Grids of cards that fill their cells.** Equal heights, aligned edges, one
   homogeneous flow. Never a content-sized box centred in empty space.
4. **Motion is feedback, not decoration.** Every animation answers something:
   you pressed this, this appeared, this moved from there to here. Fast in,
   soft out.
5. **Real data paints first.** Figures are server-rendered; animation only
   enhances what is already on screen. Nothing animates before mount.
6. **Reuse the vocabulary.** New UI is composed from `$lib/components/ui`, not
   restyled per page. If a primitive can't do it, extend the primitive.
7. **Accessible by default.** Keyboard, visible focus, reduced motion, labels —
   a hover-only affordance also shows on focus and on touch.

## Tokens

| Group     | Tokens                                                   | Use                                                   |
| --------- | -------------------------------------------------------- | ----------------------------------------------------- |
| Brand     | `blue` `violet` `lime` `ink`                             | Accents; constant in light and dark                   |
| Surfaces  | `window` (top bar) `canvas` (page) `card` `sunken`       | `sunken` for inset chips, inactive tabs, highlights   |
| Lines     | `line` `line-strong` `hairline`                          | `line` divides and frames layers; `hairline` outlines controls |
| Text      | `fg` `fg-muted` `fg-subtle`                              | Body, labels, placeholders and quiet figures          |
| State     | `positive` `negative`                                    | On track / over budget, errors, leaving (log out)     |
| Radii     | `--radius-card` 1.5rem · `--radius-chip` 1rem            | Cards · pills, popovers, menus                        |
| Easing    | `--ease-out-quint` (almost everything) · `--ease-spring` | `ease-spring` overshoots — small gestures only        |

Only use tokens that exist. A class like `bg-elevated` compiles to nothing and
fails silently — the old tooltip rendered transparent that way.

**Tints.** An accent at low opacity makes a chip: `bg-blue/12 text-blue`,
`bg-violet/12 text-violet`, `bg-negative/12 text-negative`. Lime is too light
to be a glyph on white, so it inverts: `bg-lime/30` with the glyph mixed toward
ink.

## Type

- **Space Grotesk (`font-display`)** for headings and figures: light weights,
  `tracking-tight`, `tabular` digits so numbers never reflow mid-tween.
  Page titles `text-6xl`/`7xl` light; card titles `text-2xl` medium; figures
  through `Figure` (`sm` → `xl`).
- **Outfit (`font-sans`)** for everything else. Labels `text-[0.9375rem]
  text-fg-muted`; meta `text-sm` / `text-xs`.
- Money: whole units in the currency's home locale (`formatMoney`), cents only
  where they matter. Missing values show `—`. UI copy is English, sentence case.

## Layout

- Page gutters `px-4 sm:px-6 lg:px-8`; cards `gap-4`; the header is `h-20` and
  sticky.
- Things side by side stay level: give header rows a fixed minimum height
  (`MeterStat` uses `min-h-9`, the action button's height) so one row's button
  doesn't push its neighbour's bar down.
- When a card holds less than its cell, keep the card full-size and anchor the
  content inside it: header row on top (title left, action right), content at
  the bottom. `/dashboard` and `/signup` are the references.

## The vocabulary

| Component    | Role                                                                                    |
| ------------ | --------------------------------------------------------------------------------------- |
| `Card`       | The white surface. Separation is the gap, not a border.                                 |
| `IconButton` | Circular, hairline. `dashed` marks **navigation** (back, new tab); solid marks actions. |
| `PillButton` | Text actions and dropdown-style pickers (`caret`).                                      |
| `Figure`     | Display numbers; `accentSymbol` colours the currency sign.                              |
| `Meter`      | Hatched track, white capsule fill, pin on the boundary. `role="meter"`, optional details tooltip. |
| `Tooltip`    | A label, or rich `content`; `anchor` points it at something other than its trigger.     |
| `Kbd`        | Keycaps for a shortcut, read from the hotkey registry.                                  |
| `Avatar`     | A person's blobatar — static, `animated` on hover, or `gaze` (alive, eyes on the pointer). |

Dashboard compositions live in `$lib/components/dashboard` (`MeterStat`,
`SpentThisMonth`, `BudgetEditor`, …); the shell in `$lib/components/layout`.

## Motion

**Motion** (Web Animations) for feedback and presence; **GSAP** for
choreographed timelines and SVG morphs; blobatar's own CSS layer for the
avatar. The specs, so new work matches:

| Pattern             | Where                                   | Spec                                                                                              |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Press               | `.press` — every `IconButton`/`PillButton`, the avatar | `scale(0.95)` in 90 ms, back in 200 ms, ease-out-quint. Disabled controls don't dip. |
| Pop                 | Tooltips, popovers, menus (`pop`)       | Opacity 0→1 and scale 0.96→1 in 180 ms from `--bits-floating-transform-origin`; exit 135 ms.    |
| Pop with spring     | The header's back button                | Scale 0.5→1 and x 10→0 px on a spring (bounce 0.4, 0.5 s); exit 0.3 s eased.                     |
| Make room           | Back button's wrapper                   | Svelte `slide` on x, 350 ms `quintOut`, so neighbours glide instead of jumping.                  |
| Hover reveal        | `MeterStat` action (the budget pencil)  | Opacity in 350 ms; scale 0.85→1 and x 6→0 px in 450 ms, ease-out-quint. Holds its space.         |
| Icon gesture        | Menu item glyphs, on highlight          | 300 ms on `--ease-spring`: the gear turns 90°, the profile glyph grows 1.15×, log-out leans right. |
| Tab surface         | `TabStrip`                              | One shared surface slides (x, width) in 0.45 s, ease-out-quint.                                  |
| Meter fill          | `Meter`                                 | Width and pin in 700 ms, ease-out-quint; grows in after mount.                                   |
| Theme morph         | `ThemeToggle`                           | MorphSVG outline 0.55 s `power3.inOut`; rays `back.out(1.8)`; a −24° twist settling on `back.out(2.2)`. |
| Gaze                | The header avatar (`Avatar gaze`)       | Breathes and blinks; eyes follow the pointer anywhere on the page, travel 4 viewBox units.       |
| Entrances           | `use:reveal`, `use:countUp`             | Scroll-triggered reveals; figures tween up.                                                       |

Rules:

- **Exits are quicker than entrances** — about three quarters of the time.
- **Exits start from the current state**, so interrupting an entrance never jumps.
- **Change state by moving or morphing, never by blinking** between two icons.
- **Small things may be playful.** A glyph's gesture can overshoot
  (`--ease-spring`); anything that moves layout or a large surface stays on
  ease-out-quint.
- **Animate compositor properties** (opacity, scale, translate, rotate). Width
  only where it buys spatial continuity: the meter fill, the back button's room.
- **Reduced motion:** `app.css` flattens CSS transitions; Motion and GSAP code
  checks `prefersReducedMotion()` and falls back to opacity-only or instant;
  blobatar goes still on its own.
- **SSR renders the final state.** Anything the server can't know — the stored
  theme — waits invisible and fades in once placed, rather than flashing.
- In the Chrome automation window animations crawl (hidden page, throttled
  frames). Judge end states there, not feel.

## Floating layers

- **Always bits-ui** — `Tooltip`, `Popover`, `DropdownMenu`. It positions with
  Floating UI and handles focus, Escape and ARIA. `use:anchor` (raw Floating UI)
  is only for bespoke overlays bits-ui can't express.
- **Presence pattern:** `forceMount` on the content, then the `child` snippet
  with `{#if open}` around `in:pop out:pop`, and
  `origin-(--bits-floating-transform-origin)` so it grows from its anchor.
- **Surface:** `rounded-[var(--radius-chip)] border border-line bg-card shadow-lg`.
  Tooltips are `rounded-lg px-2.5 py-1.5 text-xs`.
- **Placement:** open on the side that doesn't cover what the layer explains,
  and anchor to the exact point it describes (the meter's tip points at the
  fill's end, and opens below the bar).
- **Menus:** items `h-10 rounded-[0.625rem] px-1.5`, highlight `bg-sunken`.
  Each icon sits in a `size-7 rounded-lg` chip tinted with its accent (see
  Tints), glyph `size-4` at stroke 1.75, and makes its gesture on highlight.
  Accents follow meaning: blue for you (profile), violet for configuration
  (settings), lime for what's new (notifications), `negative` for leaving (log
  out). Separators `mx-1 my-1.5 h-px bg-line`; shortcuts right-aligned in `Kbd`;
  disabled items grey their chip and say why ("Soon").

## The header

Brand → back → tabs → theme → account.

- **Back** (dashed `IconButton`) shows on every (app) route but `/dashboard`.
  It walks the app's own history and goes home when there is none, so a deep
  link never sends anyone out of Monfly.
- **Tabs:** one shared surface carries the browser-tab shape between tabs; tab
  widths stay fixed (the ✕ is always rendered) so nothing reflows mid-slide.
- **Theme** cycles light → dark → system with no menu; its outline morphs
  between sun, moon and monitor.
- **Account:** the blobatar — alive, watching the pointer — opens a menu: who is
  signed in, Profile, Settings, Notifications (soon), Log out.

## Hotkeys

`src/lib/hotkeys/registry.ts` is the dictionary: every shortcut is added there,
and menus render their keycaps from it. Rules:

- **Sequences of plain keys** — G, then S — as GitHub and Linear do. Never a
  ⌘/Ctrl combination the browser owns (⌘P prints, ⌘S saves, ⌘B shows
  bookmarks).
- Ignored while typing in a field and when a modifier is held; the next key of
  a sequence has 900 ms.
- Show a shortcut wherever its action lives — beside the menu item, in the
  tooltip.

| Keys  | Action             |
| ----- | ------------------ |
| G O   | Go to Overview     |
| G T   | Go to Transactions |
| G I   | Go to Insights     |
| G P   | Go to Profile      |
| G S   | Go to Settings     |

## Avatars

`Avatar` draws a [blobatar](https://blobatar.dev) through `@blobatar/svelte`,
generated in the browser and on the server — no image request leaves the app.
It's deterministic: the seed is `avatarSeed`, else the name, else the email
(v1's rule, so an identity carries over).

- **Static by default:** a single `<img>`, right for lists.
- **`animated`** comes alive on hover (inline SVG plus `blobatar/motion.css`).
- **`gaze`** is always alive — breathing, blinking — and its eyes follow the
  pointer anywhere on the page (`@blobatar/svelte/gaze`, travel 4). One per
  screen: the header's. Blobatar attaches nothing under reduced motion or
  without a fine pointer, and a still pointer schedules no frames.
- It's decorative beside a visible name or inside a labelled button; pass
  `label` only when it stands alone.

## Accessibility checklist

- Icon-only buttons have an `aria-label`; toggles say the current state and
  what comes next ("Theme: Light. Switch to Dark.").
- Focus is visible: `outline-2 outline-offset-2 outline-blue`.
- Anything revealed on hover also appears on `:focus-within`, on touch and
  while its layer is open — and stays visible when it's the only way in (no
  budget yet → the pencil shows).
- Meters expose `aria-valuetext` in words; their tooltips open on focus too.
- Colour never carries meaning alone: every tinted icon has its label beside it.

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

| Group    | Tokens                                                   | Use                                                            |
| -------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| Brand    | `blue` `violet` `lime` `ink`                             | Accents; constant in light and dark                            |
| Surfaces | `window` (top bar) `canvas` (page) `card` `sunken`       | `sunken` for inset chips, inactive tabs, highlights            |
| Lines    | `line` `line-strong` `hairline`                          | `line` divides and frames layers; `hairline` outlines controls |
| Text     | `fg` `fg-muted` `fg-subtle`                              | Body, labels, placeholders and quiet figures                   |
| State    | `positive` `negative`                                    | On track / over budget, errors, leaving (log out)              |
| Radii    | `--radius-card` 1.5rem · `--radius-chip` 1rem            | Cards · pills, popovers, menus                                 |
| Easing   | `--ease-out-quint` (almost everything) · `--ease-spring` | `ease-spring` overshoots — small gestures only                 |

Only use tokens that exist. A class like `bg-elevated` compiles to nothing and
fails silently — the old tooltip rendered transparent that way.

**Tints.** An accent at low opacity makes a chip: `bg-blue/12 text-blue`,
`bg-violet/12 text-violet`, `bg-negative/12 text-negative`. Lime is too light
to be a glyph on white, so it inverts: `bg-lime/30` with the glyph mixed toward
ink. On dark surfaces it's light enough to be the glyph again:
`dark:bg-lime/15 dark:text-lime`.

**The palette** (`$lib/components/ui/palette.ts`) is every colour a person can
give something: the brand blue, violet and lime, then nine pastels — sky, teal,
mint, lemon, peach, coral, rose, pink, lavender. The pastels are OKLCH tokens
defined per theme in app.css: soft on white cards, a touch deeper and richer on
dark so they glow instead of washing out. User-chosen colours come from here
and nowhere else; add a colour by adding a token pair and a palette entry.
Choices are stored by palette id (`User.colors`), never as a CSS value, so
retuning a colour updates every place that wears it.

## Type

- **Space Grotesk (`font-display`)** for headings and figures: light weights,
  `tracking-tight`, `tabular` digits so numbers never reflow mid-tween.
  Page titles `text-6xl`/`7xl` light; card titles `text-2xl` medium; figures
  through `Figure` (`sm` → `xl`).
- **Outfit (`font-sans`)** for everything else. Labels `text-[0.9375rem]
text-fg-muted`; meta `text-sm` / `text-xs`.
- Money: always to the cent, in the currency's home locale (`formatMoney`) —
  never rounded to whole units. Only chart labels go compact ("$24.5k"), and
  their tooltip gives the exact figure. Missing values show `—`. UI copy is
  English, sentence case.
- Figures that can grow never spill or truncate. Where there's room to take,
  their box grows instead: the category chips widen leftward, over the dial's
  free space, and keep `text-xl`. Where there isn't, the figure fits its box:
  the box is a container (`@container`) and the figure `.fit-figure`, with
  `--fit` the size it wants and `--chars` the figure it's sized for — the
  longest of a row, so neighbours match (an account's two figures). It keeps
  its size until the room runs out, then shrinks just enough.

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

| Component    | Role                                                                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Card`       | The white surface. Separation is the gap, not a border.                                                                                                                                                                                          |
| `IconButton` | Circular, hairline. `dashed` marks **navigation** (back, new tab); solid marks actions.                                                                                                                                                          |
| `PillButton` | Text actions and dropdown-style pickers (`caret`).                                                                                                                                                                                               |
| `Figure`     | Display numbers; `accentSymbol` colours the currency sign.                                                                                                                                                                                       |
| `Meter`      | Hatched track, white capsule fill, pin on the boundary. `role="meter"`, optional details tooltip.                                                                                                                                                |
| `Tooltip`    | A label, or rich `content`; `anchor` points it at something other than its trigger.                                                                                                                                                              |
| `Kbd`        | Keycaps for a shortcut, read from the hotkey registry.                                                                                                                                                                                           |
| `Select`     | A `PillButton` with a caret opening a short list; the chosen item's blue check springs in. An option may carry a palette colour, drawn as a dot — an account's.                                                                                  |
| `Checkbox`   | A hairline square that fills blue when checked, its check springing in; a dash when some but not all are (`indeterminate`). Name it with `label`, or a `<label for>` on its `id`.                                                                |
| `Segmented`  | A few short choices side by side in a sunken capsule; one raised surface slides to the chosen one. A radio group: arrow keys move the choice.                                                                                                    |
| `Switch`     | On or off: a hairline capsule, grey off and blue on, whose thumb springs across. Name it with a `<label for>` on its `id`.                                                                                                                       |
| `Orb`        | The blurred gradient sphere, in any palette colour. `editable` makes it a button that opens the palette.                                                                                                                                         |
| `OrbitRing`  | The dashed gauge ring with pointer marks, turning slowly around what it holds (an orb).                                                                                                                                                          |
| `Sparkle`    | The four-pointed star, in a palette colour. `animated` brings it alive — it breathes and glows on a beat of its own, glints twinkle off it, a shine crosses it — and `burst` (or a pointer) flashes it. Still by default, for lists and bullets. |
| `Avatar`     | A person's blobatar — static, `animated` on hover, or `gaze` (alive, eyes on the pointer).                                                                                                                                                       |

Dashboard compositions live in `$lib/components/dashboard` (`MeterStat`,
`SpentThisMonth`, `BudgetEditor`, `ExpensesCard`, …); the shell in
`$lib/components/layout`.

**The expenses dial** is a pie of the whole period: the top four categories
are wedges of the total, clockwise from 270°, and the hatch is everything
else — the long tail. Each wedge wears its category's colour, and so does its
chip: the person picks it from the chip's orb, and it's stored in
`User.colors` (see `$lib/colors`). Until a category has a choice, it takes the
rank colours — blue, violet, lime, sky — skipping any colour a choice already
holds, so two of the four only match when someone chose that. A recolour
eases the wedge and the orb together. Every mark reads one angle scale, the
way a grammar-of-graphics polar chart does (TanStack Charts' `pie` and its
`startAngle`). As in the mockup, a `--hairline` divides each part from the
next — wedge from wedge, the last wedge from the hatch — running straight
from the hub, a small fixed four-point star, out past the rim to a black tag
whose tip points back at the hub. The wedges stay soft, blurred into one
another. Small parts' dividers ease apart to at least 14°, standing a few
degrees off their edges rather than bending (the soft colour hides the
degrees; nothing hides a kink), and it all turns and morphs with the wedges.
The chips may cover part of the dial: their own blur keeps it looking right.
Their row is at least 62% of the card and widens leftward when its longest
figure or label needs it; its two columns stay equal, the widest chip setting
both.

**The accounts column** opens with an overview card at its own height — the
"Accounts" header and actions, every active account's total, this month's net
movement as a tinted chip — a dot, where a pointer can hover, until pointed
at or focused — and a share bar where each account's slice wears
its colour. What v1's total holds beyond the accounts — money that moved with
no account, a total typed in by hand — takes one more slice, Unknown: no
palette colour but the hatch inside a hairline, a ring in the legend, sized by
how far it swings either way. Its tooltip splits it into money in, money out
and adjustments, each signed the way it moves the total. Pressing a slice
leaves that account out of the total and the
change until it's pressed again — for the visit, not stored — and the label
says how many are left out. Below it two featured accounts, a card each, split the rest of the
column 50/50 (`flex-1` on a zero basis) — each block's header sits on top and
its figures anchor to the bottom, so spare height spreads instead of pooling
under the second card. An account has one colour everywhere: orb, sparkle,
slice. They're the accounts marked main and secondary (the
pencil opens two `Select`s), else the oldest, in the order they were added.
Each header's filter shows the account now or as an earlier month of this year
ended. Each block keeps the mockup — balance and this month's
spending over orbiting rings that turn opposite ways — and its balance orb is
the account's colour, worn by its sparkle too: main starts lime, secondary
blue. "To review" is a link with an arrow that slides in; the header's
open-accounts button is an `IconButton` with `href`.

**The income chart** keeps the mockup's hatched columns and accent caps on
real data: this quarter by month (the default), this month by week, this year
by quarter or by month, all time by year. Bars scale to the tallest one; a past bucket
with nothing in it keeps a hairline, and one still to come is a dashed empty
slot with no figure. Hovering or focusing a bar shows its exact income, entry
count and share. The total keeps its lime symbol while its number counts.

The gear left of the period (`IncomeSettings`, a small `IconButton` level
with the `Select`) opens the chart's settings under a violet chip — violet is
configuration: **This year by** quarters or months (`Segmented`), then
**Amounts over bars** and **Still to come** (`Switch`es). Changes apply at
once. Past eight bars, the figures shrink and drop their decimal ("$25k");
turning off what's still to come folds those slots away. The settings are
per browser, in the `income-view` cookie: the dashboard's server load reads
it so SSR draws the chosen view, and the shared database never sees it.

**The transactions page** starts with what never got an account: one card
listing every card-less transaction in two groups. _Counted in your total_
are those dated since the first account — the dashboard's Unknown slice, with
its figure beside the heading — and giving one an account moves it into that
account's balance. _Before your first account_ are already in the balance it
was opened with, so an account only records where they came from. Checkboxes
pick rows (shift-click takes a range; a group's box takes the group, with a
dash for some), picked rows tint blue, and while any are picked a bar sticks
to the bottom of the view: how many, what would move where, the account
(`Select`, each with its colour dot, main first) and the action.

## Motion

**Motion** (Web Animations) for feedback and presence; **GSAP** for
choreographed timelines and SVG morphs; blobatar's own CSS layer for the
avatar. The specs, so new work matches:

| Pattern         | Where                                                  | Spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Press           | `.press` — every `IconButton`/`PillButton`, the avatar | `scale(0.95)` in 90 ms, back in 200 ms, ease-out-quint. Disabled controls don't dip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Pop             | Tooltips, popovers, menus (`pop`)                      | Opacity 0→1 and scale 0.96→1 in 180 ms from `--bits-floating-transform-origin`; exit 135 ms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Pop with spring | The header's back button                               | Scale 0.5→1 and x 10→0 px on a spring (bounce 0.4, 0.5 s); exit 0.3 s eased.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Make room       | Back button's wrapper                                  | Svelte `slide` on x, 350 ms `quintOut`, so neighbours glide instead of jumping.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Hover reveal    | `MeterStat` action (the budget pencil)                 | Opacity in 350 ms; scale 0.85→1 and x 6→0 px in 450 ms, ease-out-quint. Holds its space.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Icon gesture    | Menu item glyphs, on highlight                         | 300 ms on `--ease-spring`: the gear turns 90°, the profile glyph grows 1.15×, log-out leans right. The Income card's gear turns the same way on hover, on focus and while its settings are open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Tab surface     | `TabStrip`                                             | One shared surface slides (x, width) in 0.45 s, ease-out-quint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Tab lift-off    | `TabStrip`, on scroll                                  | Past 24 px of scroll (and back under 8, so it doesn't flicker; Motion `scroll()`), the surface's top, bottom and radius ease into the tab's own box and corners (`--radius-chip`) and its shoulders tuck in (CSS on `data-docked`, 450 ms in, 340 ms out); the box squashes and springs round (Motion, bounce 0.5); GSAP drips an ink drop from its underside, a stretched thread (160 ms) that lets go on `elastic.out(1, 0.45)`, drawn back in 1.5× quicker. A page loaded already scrolled is placed without motion.                                                                                                                                                                               |
| Meter fill      | `Meter`                                                | Width and pin in 700 ms, ease-out-quint; grows in after mount.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Dial morph      | `ExpensesDial`, on a new period                        | GSAP: the wedges, their dividers and the hub morph in 0.9 s `power3.inOut` while the dial turns −14° about its centre (`svgOrigin` in both halves of the tween) and settles on `back.out(1.7)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Deal            | `ExpensesCard` chips, on a new period                  | Motion: opacity, y 12→0 px and scale 0.94→1 in 550 ms, 60 ms apart, ease-out-quint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Count           | Figures (`use:countUp`)                                | GSAP tweens from the current figure to the new one in 0.8 s, `power3.out`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Recolour        | `Orb`, `Sparkle`                                       | The gradient morphs to the new colour in 450 ms (the registered `--orb-color`), and the orb springs back from 0.86 (bounce 0.5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Orbit           | `OrbitRing`                                            | GSAP: one linear turn per 32 s (24 s, the other way, beside it); pointing at it spins it up 6× over 0.8 s and it eases back; paused off screen.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Twinkle         | `Sparkle animated`                                     | CSS loops on one beat (`period`, 2.8 s), each instance on its own phase (from its id, so SSR agrees): the star breathes (scale 0.92↔1.06, ±4°), a halo in its colour swells with it (opacity 0.1↔0.55), three glints twinkle off its sides one after another (scale 0→1→0 through a quarter turn), and a white shine crosses it every other breath. `burst` or a pointer flashes it (Motion): a quarter-turn spring from 1.35 (bounce 0.5) and a spark off each point (0.65 s). Paused off screen; still under reduced motion.                                                                                                                                                                        |
| Link arrow      | "To review" and links like it                          | The arrow slides in on hover or focus (spring), then nudges its way every 1.4 s; always shown on touch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Month filter    | An account's header (`Select` ghost)                   | The figures count over (GSAP) and blur into focus from 6 px (Motion, 600 ms); both rings surge ×10 and glide back over 1.4 s; the chosen label blurs in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Caret flip      | Every dropdown trigger                                 | The caret turns 180° while its list is open (`data-state="open"`), 300 ms on `--ease-spring`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Bars grow       | `IncomeBars`, on a new period                          | New bars rise from the baseline 60 ms apart (`@starting-style` and a 700 ms height transition), their figures fading up after; bars that stay ease to their new height.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Slots fold      | `IncomeBars`, "Still to come" off                      | Slots still to come fold sideways (`flex-grow` → 0 in 0.45 s) and fade while the rest widen; back on, they unfold in 0.6 s. Figures turned off sink away (0.3 s, 30 ms apart) as the bars grow into their room.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Segmented slide | `Segmented`                                            | One raised surface slides to the chosen option (translate, 0.45 s, ease-out-quint), as the tab surface does.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Switch          | `Switch`                                               | The thumb crosses and turns white in 300 ms on `--ease-spring`; the track turns blue in 200 ms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Share bar       | `AccountsTotal`                                        | Slices grow from nothing 80 ms apart and ease to new shares (`flex-grow`, 900 ms, `@starting-style`); a soft sheen crosses the bar every 7 s; the change chip springs (bounce 0.45) when the totals move. Pointing at a slice — through a taller invisible target that tracks it — opens its amount in a tooltip, lifts it and dims the rest (`:has()`). Pressing one (click, Enter or Space) leaves its account out of the totals: the slice greys in place through the registered `--vivid` (a `color-mix()` percentage, 600 ms), its legend entry fades and strikes through, the total and the change count to the new sums (GSAP), and the slice squashes and springs back (Motion, bounce 0.55). |
| Chip reveal     | `AccountsTotal`'s change chip                          | Rests as a dot (the arrow) where a pointer can hover; pointing or focus opens it leftward out of a dot-wide slot, so the row never re-wraps. CSS eases a `0fr → 1fr` grid track — 450 ms open, 340 ms closed, ease-out-quint; GSAP brings the words in behind the edge ("this month", then the figure: opacity and x 8→0 px, 0.4 s `power3.out`, 70 ms apart) and runs back 1.35× quicker; Motion leans the arrow 1.5 px the way the money went (spring, bounce 0.5). Open on touch.                                                                                                                                                                                                                  |
| Rows fold out   | `UnassignedCard`, on assign                            | Assigned rows collapse at once (Svelte `slide`, 280 ms, `quintOut`) and the list closes up; a refused assignment brings them back. The picked bar rises in (y 16→0 px, 320 ms) and drops out quicker (220 ms).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Loading over    | A widget fetching its next period                      | The last period stays on screen (TanStack `keepPreviousData`), dimmed to 60 %, and animates from there.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Theme morph     | `ThemeToggle`                                          | MorphSVG outline 0.55 s `power3.inOut`; rays `back.out(1.8)`; a −24° twist settling on `back.out(2.2)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Gaze            | The header avatar (`Avatar gaze`)                      | Breathes and blinks; eyes follow the pointer anywhere on the page, travel 4 viewBox units.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Entrances       | `use:reveal`, `use:countUp`                            | Scroll-triggered reveals; figures tween up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Rules:

- **Exits are quicker than entrances** — about three quarters of the time.
- **Exits start from the current state**, so interrupting an entrance never jumps.
- **Change state by moving or morphing, never by blinking** between two icons.
- **Small things may be playful.** A glyph's gesture can overshoot
  (`--ease-spring`); anything that moves layout or a large surface stays on
  ease-out-quint.
- **Animate compositor properties** (opacity, scale, translate, rotate). Width
  only where it buys spatial continuity: the meter fill, the back button's room,
  the change chip opening out of its dot.
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
- **Chain, never replace, a trigger's handlers.** bits-ui hands its trigger's
  element `onpointerenter`, `onpointerleave`, `onfocus`, `onblur`, `onclick`
  and more through the spread `props`. Writing your own `onpointerleave={…}`
  after the spread replaces bits-ui's, and the layer never hears the pointer
  leave: it sticks open and stops responding. Call theirs, then yours — see
  `chain` in `AccountsTotal` or the `onclick` in `ThemeToggle`.
- **Surface:** `rounded-[var(--radius-chip)] border border-line bg-card shadow-lg`.
  Tooltips are `rounded-lg px-2.5 py-1.5 text-xs`, and their arrow is part of
  the surface: filled with the card, its two edges in the border's line,
  tucked 1px under the border so the two join.
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
- **Popovers** open with the same chip beside a title and a one-line note, its
  accent saying what the layer does: violet configures (Income chart), blue
  picks accounts (Featured accounts), lime sets the budget — the colour of the
  meter it moves, inverted as lime always is on white.

## The header

Brand → back → tabs → theme → account.

- **Back** (dashed `IconButton`) shows on every (app) route but `/dashboard`.
  It walks the app's own history and goes home when there is none, so a deep
  link never sends anyone out of Monfly.
- **Tabs:** one shared surface carries the browser-tab shape between tabs; tab
  widths stay fixed (the ✕ is always rendered) so nothing reflows mid-slide.
  Scrolled, the page no longer meets the tab, so the surface lets go: it lifts
  off into a flat box behind the tab, rounded like the tabs
  (`--radius-chip`), and a small ink drop drips out
  beneath it, marking the tab you're on. Back at the top it runs in reverse.
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

| Keys | Action             |
| ---- | ------------------ |
| G O  | Go to Overview     |
| G T  | Go to Transactions |
| G I  | Go to Insights     |
| G P  | Go to Profile      |
| G S  | Go to Settings     |

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

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

| Group    | Tokens                                                   | Use                                                                                                                                                              |
| -------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Brand    | `blue` `violet` `lime` `ink`                             | Accents; constant in light and dark                                                                                                                              |
| Surfaces | `window` (top bar) `canvas` (page) `card` `sunken`       | `sunken` for inset chips, inactive tabs, highlights                                                                                                              |
| Lines    | `line` `line-strong` `hairline`                          | `line` divides and frames layers; `hairline` outlines controls                                                                                                   |
| Text     | `fg` `fg-muted` `fg-subtle`                              | Body, labels, placeholders and quiet figures                                                                                                                     |
| State    | `positive` `negative` `spent`                            | On track / over budget, errors, leaving (log out); `spent` is the pastel red every expense figure wears — money out is not a fault, so it never takes `negative` |
| Radii    | `--radius-card` 1.5rem · `--radius-chip` 1rem            | Cards · pills, popovers, menus                                                                                                                                   |
| Easing   | `--ease-out-quint` (almost everything) · `--ease-spring` | `ease-spring` overshoots — small gestures only                                                                                                                   |

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
- **One fact per column.** A table column holds one thing — the category, the
  description, the account, the day, the amount — never two run together with a
  separator. The ledger and the two card-less lists share the same order, the
  category's glyph at the head of the row, so the eye runs down one thing at a
  time. Columns are 24 px apart (`px-3` on every cell; the lists carry it as `gap-x-6`) and the outer ones line up with the card's content, while a row's highlight overhangs them by 12 px into the card's padding, rounded (`rounded-lg`): the scroller pulls out by that much (`-mx-3`), so an overlay scrollbar rides there rather than over the last column. Room the columns can't give up becomes a sideways scroll — the ledger holds `min-w-[53.5rem]` and scrolls under it rather than crushing a description
  against an orb.
- **Every table names its columns** in a header that sticks to the top of its
  scroller and orders by them (`SortHeader`), draws `—` for a value a row
  hasn't got, and rules a line under each row but the last — the card's own
  edge closes the list, and a second line beside it reads as an empty row. The
  lines are the only part that is a choice: `dividers` is on by default and a
  quieter list turns it off. Rows sit 2 px apart, so two picked ones read as
  two blocks of colour rather than one long one, and a heading never takes a
  control of its own: what acts on the whole list is a `PillButton` saying so
  in words, at the right of the card where the description ends.
- **A list's columns belong to the list, not to its rows.** Where the rows
  aren't a `<table>`, the list is the grid and each row takes its tracks with
  `grid-cols-subgrid` (`UnassignedCard`). A grid per row would size each one to
  its own content, and a short day beside a long one would walk the column
  along with it.
- **A long list scrolls inside its card**, rather than stretching the column
  past the view: the ledger caps at `max-h-[32rem]`, the two card-less lists on
  `/transactions` at `22rem`. What the list is answered by — its title, count,
  figure and the box that picks the lot — stays above the scroller, in reach
  wherever the rows are.

## The vocabulary

| Component        | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Badge`          | A tinted chip that says something happened: the change chip's look (its tint mixed onto the card, `rounded-lg`), a Lucide icon at its head, figures in full weight and the words between them at 80%. A new `burst` plays it again, so a notice updates in place rather than a second one turning up.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Card`           | The white surface. Separation is the gap, not a border.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `CardTabs`       | A card under a small strip of tabs, the header's in miniature: the open tab is card-coloured, a touch taller and square at the foot, so it reads as the card's own top edge. Arrow keys move between tabs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DateLabel`      | A date in a table: "Sep 2", with the year in a clipped box beside it that unrolls left to right under the pointer. The box is in the flow from the first paint, so the label is always the whole date's width — a column of them lines up and no row reflows as one opens. A year the viewer isn't in is already out.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `CategoryIcon`   | A category's Lucide glyph in a `size-7 rounded-lg` chip tinted with the category's colour — the menu's chip, at the head of a row. The tint is the colour at 15%, and the glyph is that same colour taken to one weight for all twelve (`oklch(from … 0.55 calc(c * 1.7) h)`): hue kept, lightness dropped, chroma pushed, so a pastel reads as strongly on the white card as the menu's brand glyphs, and lime stops being a special case. On the dark card the colour is already bright enough to be the glyph itself. Decorative: the name is the column beside it. Glyph and colour come from `$lib/categories`, which reads the words in the name, so a category nobody has named before still arrives with both. |
| `SortHeader`     | The control that names a column and orders by it: the label, and one arrow that turns over rather than two that swap — quiet until the column is the one in force. It holds no state; whoever owns the ordering says which way this column is going. The ledger and the card-less lists both wear it, so ordering is the same gesture in all three tables.                                                                                                                                                                                                                                                                                                                                                             |
| `IconButton`     | Circular, hairline. `dashed` marks **navigation** (back, new tab); solid marks actions. Disabled, the rim turns to dashes and the glyph steps back to `fg-subtle`: nowhere to go.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `PillButton`     | Text actions and dropdown-style pickers (`caret`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Figure`         | Display numbers; `accentSymbol` colours the currency sign.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `ShareBar`       | A rounded bar of coloured segments, each as long as its share, in a gradient that lightens to the right, with a soft light crossing it every 7 s. `track`: `sunken` under segments that fill it (the accounts' total), `hatch` inside a hairline where the rest is room (_Where it went_). A segment with no colour is hatched, a gap rather than a holding; one `off` greys in place. Decorative.                                                                                                                                                                                                                                                                                                                     |
| `ShareBarPicker` | A `ShareBar` to read and press: taller invisible targets on the same tracks give each segment a tooltip and a toggle, light it while pointed at or focused, and spring it on a press. The owner decides what a press means and hands it back as `off`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Globe`          | The wireframe globe. It turns on its own and can be spun by hand; where you let go is where it keeps turning from.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Meter`          | Hatched track, white capsule fill, pin on the boundary. `role="meter"`, optional details tooltip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Tooltip`        | A label, or rich `content`; `anchor` points it at something other than its trigger.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Kbd`            | Keycaps for a shortcut, read from the hotkey registry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Select`         | A `PillButton` with a caret opening a short list; the chosen item's blue check springs in. An option may carry a palette colour, drawn as a dot — an account's.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Checkbox`       | A hairline square that fills blue when checked, its check springing in; a dash when some but not all are (`indeterminate`). Name it with `label`, or a `<label for>` on its `id`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Segmented`      | A few short choices side by side in a sunken capsule; one raised surface slides to the chosen one. A radio group: arrow keys move the choice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `Switch`         | On or off: a hairline capsule, grey off and blue on, whose thumb springs across. Name it with a `<label for>` on its `id`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `Orb`            | The blurred gradient sphere, in any palette colour. `editable` makes it a button that opens the palette.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `OrbitRing`      | The dashed gauge ring with pointer marks, turning slowly around what it holds (an orb).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Sparkle`        | The four-pointed star, in a palette colour. `animated` brings it alive — it breathes and glows on a beat of its own, glints twinkle off it, a shine crosses it — and `burst` (or a pointer) flashes it. Still by default, for lists and bullets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Avatar`         | A person's blobatar — static, `animated` on hover, or `gaze` (alive, eyes on the pointer).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

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
(`Select`, each with its colour dot, main first) and the action. What an
assignment did is said in a positive `Badge` under the first card's header for
5 s; another before it goes updates that same badge and starts the 5 s over.

The ledger opens on the whole record. A `Select` in its header narrows it,
and _Where it went_, to one month (_All time_, then every month from this one
back to the first on record); while a month is picked, arrows beside it walk
to the next and previous one, gone at either end. _Activity_ keeps reading the
whole record: it draws the picked month with the two before and the one after,
and sets the other three back (faded and greyed, their figures and tips still there to read). _Where it went_ paints each bar in its category's own colour (`categoryColor`, the one its glyph wears in the ledger), so a category keeps its colour whatever rank it takes from one month to the next.

## Motion

**Motion** (Web Animations) for feedback and presence; **GSAP** for
choreographed timelines, SVG morphs, and tweens of a value that lives inside a
string — the number it counts up, the clip inset `DateLabel` extends on;
blobatar's own CSS layer for the avatar. The specs, so new work matches:

| Pattern            | Where                                                   | Spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Press              | `.press` — every `IconButton`/`PillButton`, the avatar  | `scale(0.95)` in 90 ms, back in 200 ms, ease-out-quint. Disabled controls don't dip.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Rim to dashes      | `IconButton`, disabled                                  | A border's style can't ease, so the dashes are a ring of their own: the solid rim fades to transparent (200 ms) as a dashed ring fades in (0.3 s) turning from −45° into place (0.6 s), ease-out-quint, CSS; the glyph eases to `fg-subtle`. Back the same way.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Pager              | `TransactionsTable`'s page numbers                      | A raised surface over a sunken capsule, the `Segmented` thumb, slides to the page in view (CSS `translate`, 0.45 s). When the seven-slot window moves, numbers that stay glide to their slot (Svelte `flip`, 450 ms `quintOut`) and those arriving or leaving pop (Motion, scale 0.6, bounce 0.4). The “51–75 of 327” label enters 8 px from the side the page came from (Motion `pop`). A gap “…” is a `DropdownMenu` of the pages it stands for, each with its rows (“76–100”), opening upward over the ledger with every floating layer's `pop`.                                                                                                                                                   |
| Pop                | Tooltips, popovers, menus (`pop`)                       | Opacity 0→1 and scale 0.96→1 in 180 ms from `--bits-floating-transform-origin`; exit 135 ms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Pop with spring    | The header's back button                                | Scale 0.5→1 and x 10→0 px on a spring (bounce 0.4, 0.5 s); exit 0.3 s eased.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Make room          | Back button's wrapper; the month arrows on transactions | Svelte `slide` on x, 350 ms `quintOut`, so neighbours glide instead of jumping. The collapsing wrapper carries the gap as well: a flex `gap` outlives the control and snaps shut on unmount.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Hover reveal       | `MeterStat` action (budget, savings)                    | Opacity in 350 ms; scale 0.85→1 and x 6→0 px in 450 ms, ease-out-quint. Holds its space.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Icon gesture       | Menu item glyphs, on highlight                          | 300 ms on `--ease-spring`: the gear turns 90°, the profile glyph grows 1.15×, log-out leans right. The Income card's gear turns the same way on hover, on focus and while its settings are open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Date extend        | `DateLabel`, on hover                                   | The year unrolls out of the day, left to right: its box unclips (`clip-path` inset from the right, 100%→0) in 320 ms, back in 220 ms, `power4.out` — GSAP's quintic, the same curve as ease-out-quint. Nothing moves; the box held its place all along. Instant under reduced motion.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tab surface        | `TabStrip`                                              | One shared surface slides (x, width) in 0.45 s, ease-out-quint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Tab lift-off       | `TabStrip`, on scroll                                   | Past 24 px of scroll (and back under 8, so it doesn't flicker; Motion `scroll()`), the surface's top, bottom and radius ease into the tab's own box and corners (`--radius-chip`) and its shoulders tuck in (CSS on `data-docked`, 450 ms in, 340 ms out); the box squashes and springs round (Motion, bounce 0.5); GSAP drips an ink drop from its underside, a stretched thread (160 ms) that lets go on `elastic.out(1, 0.45)`, drawn back in 1.5× quicker. A page loaded already scrolled is placed without motion.                                                                                                                                                                               |
| Meter fill         | `Meter`                                                 | Width and pin in 700 ms, ease-out-quint; grows in after mount.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Dial morph         | `ExpensesDial`, on a new period                         | GSAP: the wedges, their dividers and the hub morph in 0.9 s `power3.inOut` while the dial turns −14° about its centre (`svgOrigin` in both halves of the tween) and settles on `back.out(1.7)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Deal               | `ExpensesCard` chips, on a new period                   | Motion: opacity, y 12→0 px and scale 0.94→1 in 550 ms, 60 ms apart, ease-out-quint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Count              | Figures (`use:countUp`)                                 | GSAP tweens from the current figure to the new one in 0.8 s, `power3.out`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Recolour           | `Orb`, `Sparkle`                                        | The gradient morphs to the new colour in 450 ms (the registered `--orb-color`), and the orb springs back from 0.86 (bounce 0.5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Orbit              | `OrbitRing`                                             | GSAP: one linear turn per 32 s (24 s, the other way, beside it); pointing at it spins it up 6× over 0.8 s and it eases back; paused off screen. A column of rings (_Where it sits_ on transactions) alternates the dashboard's pair down the rows: 32 s one way, 24 s the other.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Twinkle            | `Sparkle animated`                                      | CSS loops on one beat (`period`, 2.8 s), each instance on its own phase (from its id, so SSR agrees): the star breathes (scale 0.92↔1.06, ±4°), a halo in its colour swells with it (opacity 0.1↔0.55), three glints twinkle off its sides one after another (scale 0→1→0 through a quarter turn), and a white shine crosses it every other breath. `burst` or a pointer flashes it (Motion): a quarter-turn spring from 1.35 (bounce 0.5) and a spark off each point (0.65 s). Paused off screen; still under reduced motion.                                                                                                                                                                        |
| Link arrow         | "To review" and links like it                           | The arrow slides in on hover or focus (spring), then nudges its way every 1.4 s; always shown on touch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Month filter       | An account's header (`Select` ghost)                    | The figures count over (GSAP) and blur into focus from 6 px (Motion, 600 ms); both rings surge ×10 and glide back over 1.4 s; the chosen label blurs in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Caret flip         | Every dropdown trigger                                  | The caret turns 180° while its list is open (`data-state="open"`), 300 ms on `--ease-spring`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Bars grow          | `IncomeBars`, on a new period                           | New bars rise from the baseline 60 ms apart (`@starting-style` and a 700 ms height transition), their figures fading up after; bars that stay ease to their new height.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Slots fold         | `IncomeBars`, "Still to come" off                       | Slots still to come fold sideways (`flex-grow` → 0 in 0.45 s) and fade while the rest widen; back on, they unfold in 0.6 s. Figures turned off sink away (0.3 s, 30 ms apart) as the bars grow into their room.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Bars set back      | `IncomeBars`, a month in focus (transactions' Activity) | The other bars fade to 45 % and grey (`opacity` and `filter: grayscale`, 0.4 s ease-out-quint); they come back the same way.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Window slides      | `ActivityBars`, a new month                             | With months still in view, the bars slide by the months it moved (Motion, `x`, 0.6 s ease-out-quint), from wherever a running slide left them, under the chart's clipped edges; each month keeps its colour. With none left (a far jump, or to and from _All time_) the chart blurs into focus from 6 px and 24 px to the side it came from. Heights ease and bars set back meanwhile, in CSS.                                                                                                                                                                                                                                                                                                        |
| Categories reorder | `CategoryBars`, a new stretch                           | Rows that stay glide to their new order (Svelte `flip`, 450 ms `quintOut`); a new category fades up 6 px (CSS `@starting-style`, 0.42 s, 60 ms apart); figures count over (GSAP) and bars ease to their width.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Segmented slide    | `Segmented`                                             | One raised surface slides to the chosen option (translate, 0.45 s, ease-out-quint), as the tab surface does.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Card tab slide     | `CardTabs`                                              | One shared surface carries the open tab's shape and slides to it (x and width, 0.45 s, ease-out-quint, Motion), as the header's does; the tab arriving fades its sunken fill out over 300 ms so the surface lands on it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Card tab swap      | `CardTabs`                                              | The card stays; its contents change. The panel now open rises into it (opacity, y 10→0 px, 0.35 s, ease-out-quint, Motion) once bits-ui has swapped them. Opacity only under reduced motion, and not on the first draw — the page's reveal has that.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Globe turn         | `Globe`                                                 | GSAP's ticker advances the meridians' half-widths (`rx = R·                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | cos(θ + phase) | `), one turn every 24 s. The parallels hold still — the turn is about the polar axis. It doesn't turn on its own under reduced motion. |
| Globe throw        | `Globe`                                                 | Dragging takes the turn over: its full width is half a turn, whatever size it is drawn at. Let go mid-drag and the throw carries, easing back into the steady turn (GSAP, 1.8 s, `power2.out`, clamped to ±12 rad/s); held still first, it simply resumes. Dragging still works under reduced motion, without the carry.                                                                                                                                                                                                                                                                                                                                                                              |
| Switch             | `Switch`                                                | The thumb crosses and turns white in 300 ms on `--ease-spring`; the track turns blue in 200 ms.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Share bar          | `ShareBar` in `ShareBarPicker` (`AccountsTotal`)        | Slices grow from nothing 80 ms apart and ease to new shares (`flex-grow`, 900 ms, `@starting-style`); a soft sheen crosses the bar every 7 s; the change chip springs (bounce 0.45) when the totals move. Pointing at a slice — through a taller invisible target that tracks it — opens its amount in a tooltip, lifts it and dims the rest (`:has()`). Pressing one (click, Enter or Space) leaves its account out of the totals: the slice greys in place through the registered `--vivid` (a `color-mix()` percentage, 600 ms), its legend entry fades and strikes through, the total and the change count to the new sums (GSAP), and the slice squashes and springs back (Motion, bounce 0.55). |
| Chip reveal        | `AccountsTotal`'s change chip                           | Rests as a dot (the arrow) where a pointer can hover; pointing or focus opens it leftward out of a dot-wide slot, so the row never re-wraps. CSS eases a `0fr → 1fr` grid track — 450 ms open, 340 ms closed, ease-out-quint; GSAP brings the words in behind the edge ("this month", then the figure: opacity and x 8→0 px, 0.4 s `power3.out`, 70 ms apart) and runs back 1.35× quicker; Motion leans the arrow 1.5 px the way the money went (spring, bounce 0.5). Open on touch.                                                                                                                                                                                                                  |
| Notice             | `Badge`, in `UnassignedCard`                            | Arriving, its row opens (Svelte `slide`, 350 ms `quintOut`) as it pops in (Motion spring, scale 0.85, bounce 0.4); the words come in 70 ms apart (GSAP, opacity and x 8→0 px, 0.4 s `power3.out`), the check springs in (Motion, scale 0.4 and −20°) and the balance counts up (GSAP). A new `burst` springs the badge (scale 0.94→1, bounce 0.45) and plays the words and check again while the figure counts over. Leaving, it pops out and its row closes.                                                                                                                                                                                                                                         |
| Rows fold out      | `UnassignedCard`, on assign                             | Assigned rows collapse at once (Svelte `slide`, 280 ms, `quintOut`) and the list closes up; a refused assignment brings them back. The picked bar rises in (y 16→0 px, 320 ms) and drops out quicker (220 ms).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Ledger rows        | `TransactionsTable`                                     | Rows land one after another as they enter the list — the first draw, or a search that lets new ones in (CSS, opacity and y 6→0 px, 0.42 s, ease-out-quint, 24 ms apart and capped at twelve). Sorting reorders the rows that are already there, so it doesn't replay. Still under reduced motion.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Sort mark          | `TransactionsTable`'s header                            | The sorted column's stretch of the row's own line, 3 px of it. It slides and resizes to that column — the whole column, since `table-fixed` and a `colgroup` give each one a declared share — in 0.45 s, ease-out-quint, Motion, as the header's tab surface does, while CSS eases it to that column's pastel over the same beat. Each column names its own width and colour in `HEADS`. The label comes up to full strength and its arrow turns 180° on `--ease-spring` when the direction flips; sorting cleared fades the bar where it stands.                                                                                                                                                     |
| Category bars      | `CategoryBars`                                          | Each is a `ShareBar` on the hatched track: its segment grows to its share of the largest as the account slices do (`flex-grow`, 900 ms, ease-out-quint, from `@starting-style`), 60 ms after the bar above, whose sheen it also trails by 60 ms. Still under reduced motion.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Loading over       | A widget fetching its next period                       | The last period stays on screen (TanStack `keepPreviousData`), dimmed to 60 %, and animates from there.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Theme morph        | `ThemeToggle`                                           | MorphSVG outline 0.55 s `power3.inOut`; rays `back.out(1.8)`; a −24° twist settling on `back.out(2.2)`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Gaze               | The header avatar (`Avatar gaze`)                       | Breathes and blinks; eyes follow the pointer anywhere on the page, travel 4 viewBox units.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Entrances          | `use:reveal`, `use:countUp`                             | Scroll-triggered reveals; figures tween up. A page arrives in a cascade — the hero, then each column group 50 ms behind the last — so revealing a whole grid at once is a bug, not a shortcut.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

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
  `chain` in `ShareBarPicker` or the `onclick` in `ThemeToggle`.
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

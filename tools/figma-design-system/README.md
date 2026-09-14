# Monfly design system builder

A Figma plugin that builds the rest of the Monfly design system into
[Monfly v2 — Design System](https://www.figma.com/design/EB3RPD7RWX9nsJQmP7RqI6).
It exists because the Figma MCP server allows 20 tool calls a month on the
Starter plan — enough for the tokens and the first documentation pages, not for
the component library and the screens. A plugin runs locally and is not rate
limited.

## Run it

`code.js` is generated and not committed, so build it first:

```sh
node tools/figma-design-system/build.mjs
```

1. Open the design system file in the **Figma desktop app**.
2. **Plugins → Development → Import plugin from manifest…** and pick
   `tools/figma-design-system/manifest.json`.
3. Run **Monfly design system builder** and press the steps in order.

Each step is idempotent: it rebuilds its own section by name and touches
nothing else, so running one twice replaces its own work rather than
duplicating it. _Run every remaining step_ stops at the first failure, because
the later steps compose what the earlier ones make.

| Step | What it builds                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------ |
| 1    | Foundations → Spacing and radius                                                                 |
| 2    | Components → atoms (Logo, Sparkle, Orb, Caret, Avatar, Kbd, CategoryIcon) and every Lucide glyph |
| 3    | Components → controls (PillButton, IconButton, Checkbox, Switch, Segmented, Select)              |
| 4    | Components → surfaces (Card, CardTabs, Badge, Tooltip, Menu)                                     |
| 5    | Components → data (Figure, Meter, ShareBar, SortHeader, DateLabel)                               |
| 6    | Screens → `/signup` and the landing                                                              |
| 7    | Screens → `/dashboard`                                                                           |
| 8    | Screens → `/transactions`                                                                        |

The file must already hold the variables and styles the MCP run created — the
plugin looks every token up **by name**, never by id, so it survives a rebuilt
file but not a renamed token.

## What it assumes, and what it cannot do

- **One theme.** The Starter plan allows one mode per collection, so Light is
  the mode. The dark values exist as `dark/*` and `pastel-dark/*` primitives,
  ready to be wired into a Dark mode on a paid plan.
- **Three pages.** Also a Starter limit, so components are grouped into
  sections on one `Components` page rather than a page each.
- **Avatar is a stand-in.** Blobatars are generated at runtime from a seed;
  there is nothing to draw here. Use it for placement and size only.
- **A few colours are baked.** Gradient stops cannot carry a variable, so the
  Orb, the ShareBar's lightening and the logo read resolved values. Change a
  brand token and these need rebuilding — every flat fill, stroke, radius and
  gap stays bound.
- **The screens were built from the code, not from a render.** `/dashboard` and
  `/transactions` could not be screenshotted (they need an Auth0 session), so
  check those two frames first. The expenses dial in particular is a
  representation of the real chart, not a reproduction of it.

## Editing

`code.js` is generated — edit `src/*.js` and rebuild:

```sh
node tools/figma-design-system/build.mjs
```

The build concatenates `src/*.js` in filename order and injects the Lucide path
data read from `node_modules/@lucide/svelte`, so the glyphs in Figma stay the
ones the app actually ships.

Source order matters: `00-helpers` first, then foundations, components, the
shell, the screens, and `90-runner` last.

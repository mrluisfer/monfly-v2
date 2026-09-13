# 0010. Animated icons: three Svelte 5 sets beside Lucide

Status: accepted · 2026-09-12

**Context** — Lucide glyphs move only through gestures we write by hand in CSS.
Animated icon sets draw a motion per glyph, but most of them are React:
AnimateIcons (`@animateicons/react`), itshover and Iconimate install `.tsx`
components built on `motion/react` through the shadcn CLI, and none of them
runs in Svelte.

**Decision** — `@lucide/svelte` stays the icon set. Beside it, every animated
set that runs in Svelte 5 is installed and available, picked per glyph:

- `@jis3r/icons` — Moving Icons, MIT. Lucide glyphs and names, Svelte 5 runes,
  no dependencies. Plays on its `animate` prop and on its own hover.
- `@animated-color-icons/lucide-svelte` — Animated Color Icons, ISC. All of
  Lucide, same names in PascalCase files. CSS only: plays under its own
  `:hover` or an `.al-icon-wrapper` ancestor, and from `app.css` under a
  highlighted row or a focused wrapper.
- `svelte-animated-icons` — MIT. Heroicons, Ionicons and Flowbite glyphs with
  Svelte draw transitions. Not Lucide.

React-only sets aren't installed.

**Consequences** — Three sources need rules to read as one, in DESIGN.md →
Icons: the Lucide-based sets first, `svelte-animated-icons` only where no Lucide
glyph fits and never beside Lucide glyphs in one group. Moving Icons animates
in JavaScript and ignores `prefers-reduced-motion`, so callers gate `animate`;
the other two animate in CSS and follow `app.css`'s reduced-motion rule.
Animated Color Icons is written in Svelte 4 syntax and compiles in legacy mode,
and has no types beyond what `svelte-check` infers. The two Lucide-based sets
cover different glyphs, so one menu may use both: the drawings match, only the
motion differs.

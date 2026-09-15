# 0013. Storybook shows the design system

Status: accepted · 2026-09-14

**Context** — DESIGN.md names the vocabulary in words, but seeing a primitive
meant finding a page that uses it, signed in, with data that happens to reach
the state in question. Agents building UI had no way to look up what exists
either.

**Decision** — Storybook 10 with the SvelteKit framework, which reads
`vite.config.ts`, so Tailwind, `$lib` and the compiler options are the app's.
Stories are Svelte CSF (`*.stories.svelte`), beside the component they show:
snippets and `bind:` are written as the app writes them. The preview loads the
app's fonts and `app.css`, and the toolbar puts `.dark` on `<html>` as
mode-watcher does (`@storybook/addon-themes`). Docs and a11y addons are on, and
`@storybook/addon-mcp` serves the running Storybook to agents at
`localhost:6006/mcp` (`.mcp.json`). Stories cover what draws from its props —
`$lib/components/ui` and the presentational compositions. Widgets that read
TanStack Query stay out until they have fixtures.

**Consequences** — One more toolchain to keep in step: Storybook's majors follow
Vite's and Svelte's, and `@storybook/addon-svelte-csf` versions on its own
(5.x). Svelte gets no components manifest, so the MCP server's docs toolset
reports unavailable; its development tools work. CI runs `pnpm build-storybook`
after the app's build, so a story that no longer compiles against its component
fails the PR. Everything installed is MIT ([0004](0004-proprietary-code.md)).

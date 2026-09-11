# 0006. Oxfmt formats, ESLint lints

Status: accepted · 2026-09-11

**Context** — Prettier had formatted the repo since PR #10. Oxfmt, from the Oxc
project, is a faster Prettier-compatible formatter with Tailwind class sorting
built in.

**Decision** — Oxfmt with the same options, in `.oxfmtrc.jsonc`. ESLint stays for
lint rules, with `eslint-config-prettier` turning off anything stylistic. On this
codebase Oxfmt's output matched Prettier's file for file, so the switch
reformatted nothing.

**Consequences** — Oxfmt is still 0.x: a version bump can change its output, so a
Dependabot PR that fails `oxfmt --check` needs `pnpm format` on its branch.
Prettier plugins don't run; `.svelte` and Markdown go through the Prettier
bundled inside Oxfmt, which needs the `svelte` package installed.

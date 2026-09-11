# 0003. Repo tooling that works on GitHub Free

Status: accepted · 2026-09-11

**Context** — the repo is private on a personal GitHub Free account, with no paid
plan planned soon. Branch protection, rulesets and code owners need GitHub Pro;
GitHub code scanning needs Code Security; CodeQL's license excludes
closed-source code.

**Decision** — only what runs on Free: CI (lint, types, build), gitleaks and
Semgrep Community Edition in Actions with read-only tokens, Dependabot alerts,
security fixes and version updates with a 7-day cooldown, actions pinned by
commit SHA, and release-please for the changelog.

**Consequences** — checks report but can't block a merge: keeping `main` green
is a habit, not a rule. Pro-only setup waits until there's a plan for it.

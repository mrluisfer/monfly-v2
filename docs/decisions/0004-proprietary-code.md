# 0004. Proprietary code, commercial-friendly dependencies

Status: accepted · 2026-09-11

**Context** — Monfly will be sold as a SaaS.

**Decision** — all rights reserved (`LICENSE`, `"license": "UNLICENSED"`). New
dependencies must allow commercial, closed-source use: MIT, Apache-2.0, ISC and
BSD are fine; GPL, AGPL, SSPL, BUSL or non-commercial terms are not. Check with
`pnpm licenses list`.

**Consequences** — current exceptions are fine: GSAP (free for commercial use
since 2025; it only forbids building no-code animation tools that compete with
Webflow), OFL fonts, and `lightningcss` (MPL-2.0), which only runs at build time.

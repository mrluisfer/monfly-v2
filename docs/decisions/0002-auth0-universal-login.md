# 0002. Auth0 Universal Login with a server-side session

Status: accepted · 2026-09-10

**Context** — v2 needed sign-up and login that v1's existing users could keep
using, with a session the server can read.

**Decision** — Auth0 through `@auth0/auth0-server-js`, as a Regular Web
Application. Sign-up and login happen on Auth0's hosted Universal Login; the
session is an encrypted httpOnly cookie that `hooks.server.ts` checks for every
`(app)` route. v1's users were imported with their bcrypt hashes and ids.

**Consequences** — the login form is Auth0's, branded in its dashboard. Embedded
forms would need an Auth0 custom domain, which Monfly doesn't have yet; revisit
this only once it does.

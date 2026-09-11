# 0005. Secrets stay out of the repo

Status: accepted · 2026-09-11

**Context** — git-crypt could keep an encrypted `.env` in the repo, but the
ciphertext stays in history forever: removing someone's access would mean
rotating the production database password and the Auth0 secrets, and the master
key has to be backed up outside any one machine.

**Decision** — `.env` stays gitignored; `.env.example` lists the variables, and
the values are shared through a password manager. CI builds with a placeholder
`DATABASE_URL` and needs no secrets.

**Consequences** — each collaborator fills in their own `.env`, and revoking
access means removing them from the vault (rotating anything that may have
leaked). gitleaks scans every PR for secrets committed by mistake.

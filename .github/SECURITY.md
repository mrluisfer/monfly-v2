# Security

Found a vulnerability in Monfly? Please report it privately.

## How to report

Email **mrluisfeer@gmail.com** with "Security" in the subject: what you found,
where (URL, endpoint or file) and how to reproduce it. Don't open an issue or a
PR for it, and don't share it until it's fixed. You'll get a reply within a few
days.

Leaked a secret — a `.env`, a token, a connection string? Report it the same
way, right away: it has to be rotated, and deleting the commit is not enough.

## Ground rules

- Test only with your own account. Never read, change or delete other people's
  data: the database is live.
- No load testing, spam or automated attacks against production.

## Scope

The production app, built from `main`, and this repository; only the latest
version is supported. Problems in Auth0, Neon or Vercel themselves go to those
providers.

## Automated checks

Every PR runs the type check and build, gitleaks (secrets) and Semgrep (code);
Dependabot watches the dependencies.

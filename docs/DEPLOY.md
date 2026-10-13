<!--
Purpose: how this app runs somewhere other than the clerk's own machine (the demo deployment).
Current role: operator/deploy instructions; the only place deployment-only configuration is named.
Last meaningful change: 2026-10-13 — created with the Render demo blueprint (user: the manual
  “open another terminal and run legacy:start” step cannot be part of a demo, let alone a deploy).
Constraint/dependency: does not change any rule in AGENTS.md. The public-URL data question below is
  the user's call and is recorded in docs/OPEN_QUESTIONS.md (T21) — not decided here.
-->

# DEPLOY — running the demo off a laptop

Nothing in the app is deployment-specific except environment variables. Locally the same code runs
with defaults (loopback + local PostgreSQL); a hosted demo sets the four variables below.

## One service, one database (Render blueprint)

`render.yaml` at the repo root is a Render Blueprint with a single Node web service and a managed
PostgreSQL. In Render: **New → Blueprint → pick this repository** and it reads that file.

| Variable | Demo value | Why |
|---|---|---|
| `HOST` | `0.0.0.0` | Local default is `127.0.0.1` so the chart is never reachable from the LAN. A platform proxies into the container from outside, so it must bind all interfaces. |
| `DATABASE_URL` | from the blueprint database | `server/db.ts` uses the URL's own database (the local `panchavati3_dev` / `panchavati3_test` names are ignored unless `PANCHAVATI_DEV_DB`/`PANCHAVATI_TEST_DB` are set on purpose). |
| `LOG_LEVEL` | `info` | Request lines are pino `info`; they are off by default (`warn`) so a local dev console stays readable. |
| `LEGACY_URL` | the reference app's origin, or `none` | The `/legacy/<date>` entry redirects here. Unset → local `http://localhost:3101`; `none`/empty → an honest 404 instead of a dead localhost link. |
| `PANCHAVATI_KEEP_EXISTING` | `1` | Deployment-only guard: `db:seed:chart` leaves an already-populated chart alone, so a redeploy preserves the clerk's edits. |
| `PORT` | injected by the platform | Falls back to `3100`. |

Build runs `npm ci --include=dev && npm run db:migrate && npm run db:seed` (the free plan has no
`preDeployCommand`, and `tsx` is a devDependency, so dev deps must be installed). Start runs
`npm start`.

### Seeding — part of the build, and it never wipes a live demo

**User authorization (2026-10-13):** the demo deployment carries the station's real 10/09 chart
(“do it, we have permission”). Recorded in `docs/OPEN_QUESTIONS.md` T23; AGENTS.md's data rule is
unchanged for every other environment.

- `npm run db:seed:reference` — Layer-A masters (ranks, staff, locations, duties, scan config),
  idempotent.
- `npm run db:seed:chart` — the 10/09/2026 chart. Locally that is a wipe-and-reseed; with
  `PANCHAVATI_KEEP_EXISTING=1` (set in `render.yaml`) it **skips a chart that already has rows**, so a
  redeploy cannot throw away work done in the demo. Which branch it took is printed.

To re-seed deliberately on a deployed demo (destructive to that chart's DRAFT edits) run
`PANCHAVATI_KEEP_EXISTING=0 npm run db:seed:chart` from the service shell. Do not adjust a live
database with ad-hoc SQL: schema changes belong in a migration, data changes in the app.

The legacy six-page reference chart is a **separate application** with its own database and its own
repository (`…/DailyDutyPanchavati-ui-rebuild`, which ships its own `render.yaml`). Deploy it as a
second service if the demo needs it and set `LEGACY_URL` on this one. It is never proxied: its
assets are root-absolute and its `/api` shape differs, so a proxy renders a broken shell.

## Local commands (unchanged)

```bash
npm run dev            # this app only, 127.0.0.1:3100
npm run demo           # this app + both legacy reference apps, one Ctrl+C stops everything
npm run legacy:start   # only the legacy six-page chart (Kushal's build, :3101)
npm run stop           # stop whatever is listening on this project's ports
npm run stop:all       # taskkill /F /IM node.exe — every node process
```

`npm run demo` is the demo-day command on a laptop: it starts the chart app and both reference
apps, prefixes the reference apps' output, and reaps every child (and any leftover listener on the
project's ports) when you press Ctrl+C, so no stale `node.exe` survives the session.

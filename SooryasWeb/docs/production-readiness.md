# Production Readiness Register

Date: 5 June 2026
Scope: SooryasWeb Parlour App, Vercel + Supabase direction

## Current Decision

The production deployment target is the Next.js app under `SooryasWeb/next-app`, not the Git repository root or the legacy `SooryasWeb` root.

The app is closer to preview readiness after the latest hardening pass, but it should not be considered fully production-ready for real customer data until the open gates below are closed.

## Closed Gates

| Gate | Status | Evidence |
|---|---|---|
| Next production build | Pass | `npm.cmd run build` in `next-app`. |
| Next typecheck/lint script | Pass | `npm.cmd run lint` maps to `tsc --noEmit`. |
| Root test suite | Pass | 52 passing tests. |
| Legacy UI smoke suite | Pass | Playwright covers login/menu visibility, Customer CRM validation/save with WhatsApp consent, staff validation/commission cap, and Generate Bill on desktop and mobile. |
| PostgreSQL destructive test guard | Pass | Tests require `_test` database suffix. |
| Transient PostgreSQL retry guard | Pass | Legacy and Next DB modules include bounded retry helpers. |
| Startup schema compatibility guard | Pass | Legacy and Next DB modules add known missing customer/staff contact columns non-destructively on startup. |
| Vercel target guard | Pass | Root `vercel.json` removed; docs require Vercel root directory `SooryasWeb/next-app`. |
| Prototype password login guard | Partial pass | Next password login is blocked in production unless `ALLOW_PASSWORD_LOGIN=true`. |
| High/critical dependency audit | Pass | Root package clean; `next-app` has no high/critical audit findings. |

## Open Production Gates

| Gate | Required Before Real Data? | Current Status | Next Action |
|---|---|---|---|
| Supabase Auth Google provider | Yes | Not implemented. Prototype password login is only gated. | Implement US-AUTH-04 with invite-only approved email mapping. |
| Migration framework | Yes | `data/schema.sql` is reset-oriented and contains `DROP TABLE`. | Add forward-only migrations before running against live Supabase data. |
| Coverage target | Yes | 89.16% line coverage; target is approximately 95%. | Add tests for `src/server.js` validation/error/update branches and `src/db.js` retry/config branches. |
| Full security scan | Yes | Not completed in this pass. | Run a Codex Security repository scan before production launch. |
| Moderate dependency advisory | Before public launch | `next-app` audit reports moderate PostCSS advisory through Next; no safe npm auto-fix. | Monitor/upgrade Next when a non-breaking patched release is available. |
| Next browser/device QA | Yes | Legacy UI has automated desktop/mobile Playwright coverage; Next UI browser workflows still need equivalent coverage. | Test mobile/tablet workflows against the running Next app. |
| Backup/restore drill | Yes | Documented only. | Verify Supabase backup/export and restore before live use. |
| GST/legal copy review | Before invoice use | Not completed. | Confirm invoice and consent wording with CA/legal advisor. |

## Deployment Rule

Do not deploy the repository root to Vercel as the production app. Configure the Vercel project root directory as:

```text
SooryasWeb/next-app
```

Do not set `ALLOW_PASSWORD_LOGIN=true` in production after Google authentication is active.

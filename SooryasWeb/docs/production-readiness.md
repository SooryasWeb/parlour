# Production Readiness Register

Date: 6 June 2026  
Scope: SooryasWeb Parlour App, GoDaddy Node.js beta hosting

## Current Decision

The production deployment target is the root Node.js app under `SooryasWeb`, hosted on GoDaddy Node.js beta with GoDaddy managed MySQL.

The app is suitable for a private preview after GoDaddy deployment succeeds, but it should not be used with real customer data until the open gates below are closed.

## Closed Gates

| Gate | Status | Evidence |
|---|---|---|
| GoDaddy package metadata | Pass | Root `package.json` has `name`, `version`, `main`, `build`, and `start`. |
| Port binding | Pass | Server listens on `process.env.PORT || 3000`. |
| MySQL driver | Pass | `mysql2` is a runtime dependency. |
| Managed MySQL env vars | Pass | App reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. |
| MySQL connection lifecycle | Pass | App uses short-lived `mysql.createConnection` calls and closes connections after each query/transaction. |
| MySQL schema | Pass | `data/schema.mysql.sql` mirrors the current parlour schema and seed data. |
| Upload-size hygiene | Pass | `.gitignore` excludes generated artifacts such as `node_modules`, `.next`, test results, reports, and logs. |
| Static deployment checks | Pass | `tests/godaddy_deploy.test.js` verifies the hosting contract. |
| Root dependency audit | Pass | `npm.cmd audit --audit-level=high` found 0 vulnerabilities in the root app. |

## Open Production Gates

| Gate | Required Before Real Data? | Current Status | Next Action |
|---|---|---|---|
| GoDaddy MySQL smoke test | Yes | Not yet run because GoDaddy database credentials are not available locally. | Deploy with `ALLOW_SCHEMA_INIT=true`, log in, create test customer, generate test bill. |
| Strong production authentication | Yes | Username/password login exists for private preview. | Harden auth/RBAC before storing real customer data. |
| Backup/restore drill | Yes | Not verified. | Confirm GoDaddy MySQL backup/export and restore process. |
| Full DB-backed test run | Yes | Blocked locally while Docker/PostgreSQL is not running. | Re-run `npm.cmd test` when local DB is available or add MySQL CI smoke tests. |
| Coverage target | Before production hardening signoff | Last measured line coverage was below the 95% target. | Add tests for `src/server.js` edge/error/update branches and DB adapter branches. |
| Security scan | Yes | Not completed in this pass. | Run a repository security scan before public launch. |
| GST/legal copy review | Before invoice use | Not completed. | Confirm invoice and consent wording with CA/legal advisor. |

## Deployment Rule

Deploy only the root Node app:

```text
Root directory: SooryasWeb
Build command: npm install && npm run build
Start command: npm start
```

Use GoDaddy managed MySQL through `DB_*` environment variables. Do not configure external databases on blocked ports for production.

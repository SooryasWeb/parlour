# Testing Strategy

Source of truth: `BRD.md`  
User-story backlog: `user-stories.md`

## 1. Commands

Static and GoDaddy deployment checks:

```powershell
npm.cmd test -- tests/godaddy_deploy.test.js tests/db_reset_script.test.js tests/domain.test.js tests/test_runner_config.test.js
```

Full test suite, requiring local PostgreSQL:

```powershell
npm.cmd test
```

Coverage, requiring local PostgreSQL:

```powershell
npm.cmd run coverage
```

Browser UI smoke tests, requiring local PostgreSQL and Playwright Chromium:

```powershell
npm.cmd run test:ui:install
npm.cmd run test:ui
```

Build and dependency checks:

```powershell
npm.cmd run build
npm.cmd audit --audit-level=high
```

## 2. Current Evidence

Current automated checks cover:

- GoDaddy package contract: `name`, `version`, `main`, `build`, `start`;
- `process.env.PORT` binding;
- managed MySQL env variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`;
- MySQL driver presence through `mysql2`;
- upload exclusions for `node_modules`, build caches, logs, Playwright reports, and test results;
- domain helpers such as phone normalization, country code handling, email validation, time parsing, password verification, and commission calculation;
- local development reset guard for `_dev` database names;
- bounded retry logic and schema compatibility migrations;
- frontend static checks for mojibake, escaping, CRM contact validation fields, WhatsApp consent controls, and responsive control styling;
- API tests for auth, bookings, customers, invoices, payments, RBAC, audit logs, and tenant isolation when local PostgreSQL is running;
- Playwright desktop/mobile smoke tests for login/menu, customer save with WhatsApp consent, staff validation, and Generate Bill.

## 3. Current Limitations

- Full DB-backed tests currently require local PostgreSQL to be running.
- GoDaddy MySQL behavior still needs a live smoke test with GoDaddy-provided `DB_*` variables.
- The previous measured coverage was below the production target; coverage should be re-measured after a full DB-backed run.
- Production authentication and RBAC require additional hardening before real customer data.

## 4. GoDaddy Smoke Test

After deploying to GoDaddy with an empty managed MySQL database:

1. Set `ALLOW_SCHEMA_INIT=true` for the first deploy.
2. Open the deployed URL.
3. Log in with `soorya / password`.
4. Confirm the dashboard loads.
5. Add a fake customer with a valid `+91` phone.
6. Tick WhatsApp consent and save.
7. Add or verify a staff record.
8. Generate a test bill.
9. Confirm no server errors in GoDaddy logs.
10. Remove or disable `ALLOW_SCHEMA_INIT`.

## 5. Story Traceability

Tests should keep story IDs in their names where practical. Current UI story evidence:

| Story ID | Automated UI evidence |
|---|---|
| US-AUTH-02 | `tests/e2e/parlour.spec.js` verifies operational menu visibility after login on desktop and mobile. |
| US-CRM-01, US-CRM-03 | `tests/e2e/parlour.spec.js` verifies customer phone validation, email entry, WhatsApp consent capture, save success, and consent status display. |
| US-SVC-02 | `tests/e2e/parlour.spec.js` verifies staff country-code/phone entry and commission maximum validation. |
| US-BILL-01 | `tests/e2e/parlour.spec.js` verifies Generate Bill succeeds with a selected customer and service. |

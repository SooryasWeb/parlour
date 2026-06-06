# Testing Strategy

Source of truth: `BRD.md`  
User-story backlog: `user-stories.md`  
Agent manifest source: `future-agent-manifest.yaml`

## 1. Current Test Commands

```powershell
npm.cmd test
```

```powershell
npm.cmd run coverage
```

```powershell
npm.cmd run test:ui:install
npm.cmd run test:ui
```

The root test and coverage scripts intentionally run with `--test-concurrency=1` because the current integration suite performs destructive resets against one protected PostgreSQL `_test` database. Do not remove this until the test harness creates an isolated database or schema per worker.

The Playwright UI suite starts the app against the protected `sooryas_parlour_test` database and resets it before each browser scenario. It currently runs the same core story checks against Chromium desktop and a mobile Chrome profile.

## 2. Current Prototype Coverage

Latest measured coverage after the schema compatibility and Playwright UI test slice:

| Metric | Current |
|---|---:|
| Lines | 89.16% |
| Branches | 78.33% |
| Functions | 96.82% |

The target before production cutover is approximately 95% meaningful line coverage, with the remaining gap mainly in `src/server.js` error, validation, update, and edge branches plus `src/db.js` connection/config/retry branches.

Current tests cover:

- appointment conflict detection;
- authenticated dashboard API access;
- phone normalization;
- editable customer country code with default `+91`, Indian phone validation, optional email validation, and WhatsApp consent persistence;
- login/session cookie creation;
- appointment conflict rejection;
- invoice tax and discount calculation;
- race-safe sequential invoice numbering;
- missing service-line rejection before invoice generation;
- payment ledger reconciliation, including partial payments;
- staff country-code/phone validation and commission range validation;
- tenant-scoped audit logs for customer, booking, invoice, payment, booking completion, commission calculation, staff creation, service creation, and inventory item creation events;
- two-tenant reference checks that block cross-tenant booking customer/staff IDs and invoice customer IDs;
- accountant RBAC restrictions;
- protected `_test` database usage for destructive resets;
- serial test-runner configuration for shared PostgreSQL reset safety;
- bounded retry guards for transient PostgreSQL connection startup failures;
- non-destructive startup schema compatibility migrations for existing databases missing newer customer/staff contact fields;
- Next production password-login gate until Supabase Google auth is implemented;
- Vercel deployment guard proving production should target `next-app`, not the legacy root prototype;
- frontend mojibake regression detection;
- frontend escaping regression checks for legacy `innerHTML` rendering;
- legacy CRM static checks for contact validation controls and consent-gated WhatsApp actions;
- mobile/tablet CSS compactness checks for legacy surface radii and responsive controls;
- Playwright UI coverage for login/menu visibility, customer validation/save with WhatsApp consent, staff validation/commission cap, and Generate Bill on desktop and mobile;
- static app shell;
- core domain helpers.

Dependency audit status from this pass:

- root package: `npm.cmd audit --audit-level=high` found 0 vulnerabilities;
- `next-app`: no high/critical vulnerabilities, but npm reported 2 moderate advisories through Next's bundled PostCSS path. `npm audit fix --force` proposed a breaking downgrade, so this is tracked as a deployment risk to monitor rather than auto-fixed.

## 3. Required Test Types for Next Phase

The user-story backlog and future agent manifest identify the test classes needed for a safer production system.

| Test Type | Purpose |
|---|---|
| Unit tests | Validate domain rules in isolation. |
| Integration tests | Validate services working together. |
| Contract tests | Ensure service APIs and agent/service contracts do not drift. |
| Audit tests | Ensure every required write produces audit records. |
| Tenant isolation tests | Required before white-label rollout. |
| Tool/service failure simulation | Validate retries, fallback states, and human escalation. |
| Retry behavior tests | Ensure only safe retry actions happen. |
| Role/access tests | Ensure users only see permitted screens and records. |
| Privacy tests | Protect consent and skin/hair/medical notes. |

## 4. User Story Traceability

Every P0 and P1 story in `docs/user-stories.md` should have automated acceptance evidence before production data is used. Tests should name the related story ID in the test title, test file comment, or test-case description where practical.

| Story area | Priority test evidence |
|---|---|
| US-AUTH-01, US-AUTH-02, US-AUTH-04 | Supabase Google login/callback tests, invite-only approved email tests, login/session tests, role matrix tests, menu visibility tests, forbidden API tests. |
| US-AUTH-03 | Two-tenant seed tests proving no cross-tenant list/get/write leakage; current coverage blocks cross-tenant booking customer/staff IDs and invoice customer IDs. |
| US-BK-01..04 | Booking create/edit/reschedule/cancel/no-show tests, staff/chair conflict tests, concurrent booking test, responsive schedule QA. |
| US-CRM-01..03, US-AUD-02 | Customer profile tests, country-code/phone/email validation tests, WhatsApp consent create/update tests, consent update audit test, privacy/static field checks, role-limited note tests. |
| US-BILL-01..05 | Invoice creation, race-safe invoice numbering, payment ledger, partial/full payment reconciliation, core invoice/payment audit tests, consent-gated WhatsApp invoice link tests. |
| US-COMM-01..03 | Commission rule versioning, calculation, duplicate prevention, and override reason/audit tests. |
| US-INV-01..03 | Inventory CRUD, stock movement, negative-stock prevention, low-stock dashboard tests. |
| US-WA-01, US-WA-02 | Deterministic template tests, URL encoding tests, consent-gated link visibility tests, manual intent log tests. |
| US-SET-01, US-SET-02 | Tenant settings audit tests, translation toggle, Malayalam UTF-8/mojibake regression, mobile wrapping QA. |
| US-DEP-01, US-DEP-02, US-SCOPE-01 | Build/typecheck, Vercel/Supabase checklist review, `_test` database guard, Institute scope scan, Next audit-hook drift check. |

Current UI story evidence:

| Story ID | Automated UI evidence |
|---|---|
| US-AUTH-02 | `tests/e2e/parlour.spec.js` verifies operational menu visibility after login on desktop and mobile. |
| US-CRM-01, US-CRM-03 | `tests/e2e/parlour.spec.js` verifies customer phone validation, email entry, WhatsApp consent capture, save success, and consent status display. |
| US-SVC-02 | `tests/e2e/parlour.spec.js` verifies staff country-code/phone entry and commission maximum validation. |
| US-BILL-01 | `tests/e2e/parlour.spec.js` verifies Generate Bill succeeds with a selected customer and service. |

## 5. Phase 1 Test Priorities

Before rewriting the prototype, tests should be written for:

1. auth and role access;
2. booking conflict and reschedule history;
3. customer CRM contact validation and consent visibility;
4. invoice numbering and invoice/payment separation;
5. payment ledger balance updates;
6. commission calculation and override audit;
7. inventory stock movements and low-stock alerts;
8. WhatsApp template/manual-link event logging and consent-gated visibility;
9. parlour-only scope boundaries so institute features do not creep back into this repository;
10. audit logs for every write and override.

## 6. Manual QA Checklist

After starting the current prototype:

1. Open `http://localhost:3000`.
2. Confirm dashboard cards load.
3. Add an appointment.
4. Try adding an overlapping appointment for the same chair and confirm it is rejected.
5. Create an invoice for a completed service.
6. Record a payment.
7. Check low-stock inventory display.
8. Add a customer with invalid phone/email and confirm validation appears.
9. Add a customer with WhatsApp consent unchecked and confirm booking/invoice WhatsApp links show a consent-needed state.
10. Add/update a customer with WhatsApp consent checked and confirm manual booking/invoice `wa.me` links appear.
11. Resize the browser or open on phone/tablet and confirm navigation remains usable.

For the rewritten Phase 1 parlour app, this checklist must expand to include invoices, payments, commissions, inventory, WhatsApp logs, roles, and audit trails. Institute attendance/certificates belong in the separate Sooryas Institute app.

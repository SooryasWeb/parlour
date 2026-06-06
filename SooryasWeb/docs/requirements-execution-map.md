# SooryasWeb Requirements Execution Map

Version: 1.1  
Date: 6 June 2026  
Primary source: `docs/BRD.md`  
Deployment target: GoDaddy Node.js beta hosting with managed MySQL

## 1. Current Direction

This repository now has one implementation path:

```text
SooryasWeb root Node app -> GoDaddy Node.js -> GoDaddy managed MySQL
```

The root Node app in `src/` and `public/` is the deployable application. The Institute app remains a separate future repository and separate database.

## 2. Authority And Scope

| Topic | Decision |
|---|---|
| Source of truth | `docs/BRD.md` |
| User-story backlog | `docs/user-stories.md` |
| Deployment | GoDaddy Node.js beta hosting |
| Production database | GoDaddy managed MySQL through `DB_*` environment variables |
| Local test harness | Existing local PostgreSQL tests remain until MySQL CI/smoke tests are added |
| Authentication | Current username/password login is private-preview only; production auth/RBAC must be hardened before real customer data |
| WhatsApp | Manual `wa.me` links only |
| Customer self-booking | Out of scope |
| Institute features | Out of scope for this repo |

## 3. Requirement Status

| Area | Current evidence | Status | Next task |
|---|---|---|---|
| GoDaddy package contract | `package.json` has `main`, `build`, `start`; `tests/godaddy_deploy.test.js` verifies it. | Implemented | Smoke test on GoDaddy. |
| Managed MySQL | `src/db.js` selects MySQL when `DB_HOST` is present; `data/schema.mysql.sql` exists. | Implemented - needs live smoke | Deploy against GoDaddy MySQL with `ALLOW_SCHEMA_INIT=true` once. |
| Staff-managed bookings | API and current UI support booking records and conflict checks. | Partial | Add full booking create/edit screen coverage. |
| Booking conflict prevention | Staff/chair conflict logic exists in API tests. | Implemented - needs concurrency hardening | Add concurrent conflict test and clearer UI error copy. |
| Customer CRM | Contact validation, country code, email, and WhatsApp consent are implemented. | Partial | Add tags, preferences, profile/history view. |
| Staff setup | Staff phone/country-code validation and commission cap exist. | Partial | Add availability schedules and inactive assignment rules. |
| Invoice generation | Generate Bill flow exists and rejects missing service line. | Partial | Connect to completed booking checkout and print/share view. |
| Payment ledger | Partial/full payment reconciliation exists. | Implemented - needs UI polish | Add stronger payment UI and balance display. |
| Inventory | Catalogue and low-stock basics exist. | Partial | Add stock movement/audited adjustment flow. |
| Audit logs | Core writes generate audit records. | Partial | Extend to tenant settings, role changes, commission overrides, stock movements. |
| Tenant isolation | Cross-tenant booking/invoice references are blocked in tests. | Partial | Expand tenant isolation matrix across all list/get/write paths. |
| UI mobile/tablet | Playwright desktop/mobile smoke tests cover core flows. | Partial | Add screenshots and more workflow coverage. |

## 4. Immediate Next Tasks

1. Push the GoDaddy cleanup commit.
2. Create the GoDaddy Node.js app with root directory `SooryasWeb`.
3. Attach GoDaddy managed MySQL.
4. Set `SESSION_SECRET` and first-deploy `ALLOW_SCHEMA_INIT=true`.
5. Deploy and smoke test with fake data.
6. Remove or disable `ALLOW_SCHEMA_INIT` after schema creation.
7. Verify GoDaddy MySQL backup/export and restore.
8. Harden authentication/RBAC before real customer data.
9. Add MySQL live smoke tests or CI-compatible integration tests.
10. Continue feature work from `docs/user-stories.md`.

## 5. Phase 1 Completion Definition

Phase 1 is complete only when:

1. Staff can log in securely and see role-appropriate navigation/actions.
2. Reception can create, edit, reschedule, cancel, and no-show bookings.
3. Staff/chair conflicts are blocked, including concurrent attempts.
4. Customer CRM stores contact, consent, preferences, and basic notes only.
5. Completed billable services can produce invoices.
6. Payments can be partial or full and reconcile to invoice status.
7. Commission summaries are calculated from completed paid services.
8. Inventory tracks items, stock movements, and low-stock alerts.
9. Manual WhatsApp booking/invoice links are visible and gated by consent.
10. Important writes have audit logs or documented exceptions.
11. Tenant-scoped tests prove no cross-tenant leakage.
12. GoDaddy deployment and MySQL backup/restore are verified.
13. Institute features are absent from this repo and planned separately.
14. Mobile/tablet/desktop UI QA passes.
15. Critical tests pass and meaningful coverage approaches the production target.

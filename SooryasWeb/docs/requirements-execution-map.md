# SooryasWeb Requirements Execution Map

Version: 1.0  
Date: 5 June 2026  
Primary source: `docs/BRD.md`  
Supporting sources: `docs/user-stories.md`, `docs/ui-ux-design.md`, `docs/architecture.md`, `docs/testing.md`, `docs/production-readiness.md`, `docs/coding-agents-needed.md`, `docs/future-agent-manifest.yaml`, `next-app/docs/next-rewrite-plan.md`

## 1. Planning Position

This document converts the approved BRD into an execution map for the **SooryasWeb Parlour App in this repository**.

The current codebase now has two implementation paths:

1. **Legacy Node app:** `src/`, `public/`, `data/schema.sql`.
2. **Next.js rewrite:** `next-app/`, targeting Vercel + Supabase.

The execution direction should be:

1. Continue feature work in `next-app`.
2. Keep the legacy app runnable as a reference until parity is proven.
3. Promote `next-app` only after backend parity, UI workflows, security gates, and deployment checks pass.

## 2. Authority And Conflict Resolution

| Topic | Decision |
|---|---|
| Source of truth | `docs/BRD.md` is authoritative. |
| User-story backlog | `docs/user-stories.md` is the canonical implementation backlog for the parlour portal. |
| Product split | Parlour app remains in this repo; Institute app must be a separate repo and separate PostgreSQL database. |
| AI/agents | Phase 1 uses deterministic services/workflows, not LLM-driven automations. |
| Hosting | Free-tier target is Vercel + Supabase for the Next app. |
| Production authentication | Supabase Auth with Google provider; invite-only portal access by approved email. |
| WhatsApp | Manual `wa.me` links only in Phase 1, shown only for customers with WhatsApp consent and a valid phone number. |
| Customer self-booking | Out of scope in Phase 1. |
| Medical/deep skin/hair notes | Out of scope until legal/privacy review. |

### Documentation Boundary

Earlier planning versions implied a hidden Institute module inside the salon platform. The corrected current model is:

- no Institute module, API, navigation, dashboard, or hidden route in this repo;
- only an **Institute App Handoff** workstream documenting requirements for a separate repository.

The current corrected agent/workstream documents are:

- `docs/AGENT_Spec.md`
- `docs/future-agent-manifest.yaml`

## 2.1 User Story Traceability

Use `docs/user-stories.md` as the ticket-level backlog. Implementation agents should cite story IDs in code tasks, tests, QA notes, and acceptance evidence.

| Requirement area | Primary story IDs |
|---|---|
| Login, session, RBAC | US-AUTH-01, US-AUTH-02, US-AUTH-04 |
| Tenant isolation | US-AUTH-03 |
| Dashboard and operational alerts | US-DASH-01, US-DASH-02 |
| Staff-managed bookings | US-BK-01, US-BK-02, US-BK-03, US-BK-04 |
| Customer CRM and consent | US-CRM-01, US-CRM-02, US-CRM-03 |
| Services, staff, chairs/stations | US-SVC-01, US-SVC-02, US-SVC-03 |
| Invoices and payment ledger | US-BILL-01, US-BILL-02, US-BILL-03, US-BILL-04, US-BILL-05 |
| Staff commissions | US-COMM-01, US-COMM-02, US-COMM-03 |
| Inventory and stock movement | US-INV-01, US-INV-02, US-INV-03 |
| Manual WhatsApp workflows | US-WA-01, US-WA-02 |
| Reports and analytics | US-RPT-01, US-RPT-02 |
| Tenant settings and bilingual UI | US-SET-01, US-SET-02 |
| Audit and privacy | US-AUD-01, US-AUD-02 |
| Deployment/admin readiness | US-DEP-01, US-DEP-02, US-SCOPE-01 |

## 3. Requirement Status Legend

| Status | Meaning |
|---|---|
| `Implemented - needs hardening` | Exists in code but requires production-grade structure/tests/security. |
| `Partial` | Some code exists, but BRD requirement is not complete. |
| `Planned` | No meaningful implementation yet. |
| `Deferred` | Explicitly out of Phase 1 or belongs to another repo. |

## 4. Phase 1 Requirement-To-Task Map

| Req ID | Requirement | Current Evidence | Status | Execution Tasks | Owner / Coding Agent | Acceptance Evidence |
|---|---|---|---|---|---|---|
| BR-01 | Staff-only booking; no customer self-booking. | API requires authenticated user; no public booking page seen. | Partial | Add route-level tests proving no public create-booking route; ensure UI labels are staff-managed; hide customer self-booking concepts. | Auth/RBAC Agent, Frontend UX Agent | Role/access tests; no public booking route; QA confirms staff-only language. |
| BR-02 / FR-BK-03 | Prevent double booking by staff and chair/station. | Legacy and Next API check staff/chair overlap. | Implemented - needs hardening | Add DB transaction/locking strategy for concurrent booking attempts; add reschedule conflict tests; add clearer UI conflict messages. | Parlour Operations Agent, Test Harness Agent | Concurrent booking test; reschedule test; UI error copy verified. |
| BR-03 / FR-BI-01 | Every billable completed service needs invoice; invoicing and payment are separate. | Invoice/payment APIs exist; invoice creation now rejects missing service lines before transaction; payment ledger status fixed. | Partial | Add completed-booking checkout flow; block completed booking without invoice or show missing invoice alert; add invoice print/PDF view. | Billing & Payments Agent | End-to-end checkout test; missing service-line rejection test; unpaid/completed-service dashboard alert. |
| BR-04 / D-12 | GST/tax fields optional and configurable. | `tax_class` exists; tax logic hard-coded. | Partial | Add tenant/service tax settings; support exempt/GST-5/GST-18 consistently; add CA-reviewed invoice labels later. | Billing & Payments Agent, Data Model Agent | Unit tests for tax classes; settings UI; invoice output shows optional tax safely. |
| BR-05 / D-15 | CRM notes limited to basic operational notes. | Seed notes cleaned; no note privacy model yet. | Partial | Add sensitive-note policy; block deep medical categories; add privacy tests and role-limited note visibility. | Customer CRM Agent, Audit & Compliance Agent | Privacy tests; role tests; UI copy avoids diagnostic fields. |
| BR-06 / FR-TA-01 | Tenant-aware schema, tenant filtering, and production auth. | `tenant_id` exists; booking/invoice cross-reference ownership checks now block foreign customer/staff IDs; username/password login still exists as prototype auth. | Partial | Add tenant isolation tests for every API; add middleware/policy helper to enforce tenant scope; implement Supabase Auth Google provider with invite-only approved emails; prepare future subdomain resolver. | Data Model Agent, Auth/RBAC Agent, Codex Security Review | Current two-tenant test blocks cross-tenant booking/invoice references; add US-AUTH-04 Google callback/invite tests and expand tenant matrix across all list/get/write paths. |
| BR-07 | Parlour and Institute apps fully separate. | BRD/README/user stories/agent docs now say separate. | Implemented - needs scope scan | Keep automated docs/code scan preventing Institute nav/API in this repo. | Requirements Traceability Agent | Docs corrected; search/test proves no Institute app screens/API in `next-app`. |
| BR-08 / FR-WA-01 / FR-WA-02 | Free manual WhatsApp links for bookings and invoices. | Legacy UI gates booking/invoice `wa.me` links behind customer WhatsApp consent and a valid phone number; Next API carries `whatsapp_consent` for parity, but Next UI only references it. | Partial | Add deterministic template builder; finish Next booking/invoice link UI; log message intent without paid API. | WhatsApp Workflow Agent | Template unit tests; consent-gated visible `wa.me` links; communication log record. |
| BR-09 / FR-ST-02 / FR-ST-04 | Versioned commission rules; manual overrides require audit reason. | Basic commission fields exist; audit log only on paid invoice. | Partial | Add commission rule versions; commission records table; override form requiring reason; audit every override. | Commission & Inventory Agent, Audit & Compliance Agent | Commission tests; override audit test; UI requires reason. |
| BR-10 / FR-IN-* | Certificate eligibility and Institute requirements. | BRD says separate app; current repo must not implement. | Deferred | Create separate Institute repo plan only; do not add code here. | Institute App Handoff Agent | Separate repo backlog/spec exists; no Institute routes in this repo. |
| FR-TA-02 | Platform admin can onboard parlour tenants and subdomains. | Not implemented. | Planned | Defer to white-label phase; define schema now for tenants/users safely. | Tenant Provisioning Agent | Deferred ticket with acceptance criteria; no Phase 1 UI dependency. |
| FR-TA-03 | Tenant logo, address, contact, GSTIN settings. | Tenant table has fields; no Next settings form. | Partial | Add settings screen; tenant profile edit API; audit tenant setting edits. | Data Model Agent, Frontend UX Agent | Settings form tests; audit log for tenant edits. |
| FR-TA-04 / US-AUTH-04 | Production authentication uses Supabase Auth with Google provider and invite-only approved emails. | Prototype username/password auth exists; Supabase Google flow is not implemented yet. | Planned | Add Supabase client/server auth wiring, Google provider callback, approved user/invite mapping, disabled-user checks, and audit events for login/invite/user disable. | Auth/RBAC Agent, Test Harness Agent, Codex Security Review | Callback tests; unknown email rejection; disabled user rejection; role/tenant mapping tests; no public self-registration test. |
| FR-BK-01 | Create, view, edit, reschedule, cancel bookings. | API supports create/list/patch; UI lacks forms. | Partial | Build bookings screen with create/edit/cancel/no-show; add history/audit fields. | Parlour Operations Agent, Frontend UX Agent | UI workflow tests; API tests for status transitions. |
| FR-BK-02 | Visual booking calendar/schedule by staff and chair. | Dashboard agenda only. | Planned | Build day agenda first, then staff/chair schedule board; avoid complex calendar until agenda is stable. | Frontend UX Agent | Responsive schedule board screenshot and tests. |
| FR-BK-04 | Record booking lead source. | Schema/API support `source`; UI not complete. | Partial | Add source selector to booking form; report source in booking list. | Parlour Operations Agent | Form test; persisted source visible. |
| FR-CRM-01 | Customer name/contact/tags/preferences/basic notes. | Customer schema has basic fields, editable `country_code`, E.164-style phone storage, optional email validation, and WhatsApp consent; startup compatibility migrations add missing contact columns to existing dev databases; Playwright verifies customer validation/save and WhatsApp consent on desktop/mobile; no tags/preferences yet. | Partial | Add tags/preferences data model; customer profile screen; preserve phone/email validation in Next UI. | Customer CRM Agent | CRM screen tests; schema migration; privacy checks; phone/email validation tests. |
| FR-CRM-02 | Customer history. | History can be queried from bookings/invoices but no profile view. | Planned | Build customer profile with booking/service/invoice history. | Customer CRM Agent | Profile route test; query scoped by tenant. |
| FR-CRM-03 | Basic consent records. | `consent_status`, `consent_date`, and `whatsapp_consent` exist; legacy CRM form/list displays WhatsApp consent status. | Partial | Add final consent text, consent update UI, and audit logs for consent changes. | Customer CRM Agent, Audit & Compliance Agent | Consent update audit test; WhatsApp consent create/update tests. |
| FR-BI-02 | Sequential invoice numbers per tenant/year. | `invoice_sequences` exists. | Implemented - needs hardening | Add migration version; add concurrency test in Next API; verify financial-year reset expectation. | Billing & Payments Agent | Parallel invoice-number test. |
| FR-BI-03 | Record payments with mode, amount, reference, date. | Payment API exists. | Implemented - needs hardening | Add payment UI; add reconciliation screen; validate modes. | Billing & Payments Agent | Payment form test; partial/full payment tests. |
| FR-BI-04 | Partial payment ledger and final reconciliation. | Implemented in API. | Implemented - needs UI | Add paid/partial/unpaid visual states; show balance due. | Billing & Payments Agent, Frontend UX Agent | UI displays balance; API tests pass. |
| FR-ST-01 | Staff profiles with active status, roles, availability. | Staff profiles exist with validated country code/phone and commission range; startup compatibility migrations add missing staff contact columns to existing dev databases; Playwright verifies staff validation and commission cap on desktop/mobile; no availability model. | Partial | Add availability schedule model; staff screen; role filter. | Parlour Operations Agent | Availability tests; staff contact validation tests; UI screen. |
| FR-ST-03 | Commission summaries for completed invoices. | Audit text exists, no commission table/report. | Partial | Add commission records and summary reports. | Commission & Inventory Agent, Analytics Dashboard Agent | Commission report tests. |
| FR-INV-01 | Inventory catalogue. | Inventory table/API exists. | Partial | Build inventory management screen; separate retail/consumable filters. | Commission & Inventory Agent, Frontend UX Agent | Inventory CRUD tests; screen visible. |
| FR-INV-02 | Stock deduction on service checkout/retail sale. | Not implemented. | Planned | Add service-consumable mapping; stock movement table; audited adjustment flow. | Commission & Inventory Agent | Stock movement tests; no negative stock without override. |
| FR-INV-03 | Low-stock dashboard alerts. | Dashboard queries low-stock items. | Partial | Add low-stock panel and tests; show vendor/reorder actions. | Analytics Dashboard Agent, Inventory Agent | Dashboard low-stock test. |
| Analytics | Daily/weekly/monthly sales, repeat trends, staff productivity. | Today KPIs only. | Partial | Define metric contracts and freshness labels; build reports pages. | Analytics Dashboard Agent | Metric definition tests; date-range report tests. |
| Bilingual UI | English/Malayalam toggle. | Legacy has toggle; Next does not. | Planned | Add translation dictionary, language preference cookie, Malayalam wrapping tests. | Frontend UX Agent | UI toggle test; no mojibake; mobile screenshot. |

## 5. Cross-Cutting Security And Compliance Plan

| Security Requirement | Risk | Required Changes | Verification |
|---|---|---|---|
| Tenant isolation | Cross-tenant data leakage. | Cross-reference checks now block foreign booking customer/staff IDs and invoice customer IDs; still centralize tenant guard and add tests for every list/get/write. | Current two-tenant test covers booking/invoice references; expand automated tests to all resources. |
| RBAC | Staff/accountant could mutate restricted records. | Move permissions to a typed policy table/helper; apply to API and UI. | Role matrix tests for all routes and visible menu items. |
| Auth/session | Password handling, callback spoofing, or unauthorized Google accounts could expose portal data. | Move production auth to Supabase Auth with Google provider, validate authenticated email against an active tenant user/invite, keep signed HTTP-only app session if needed, and document any local password path as development/break-glass only. | US-AUTH-04 callback/invite tests, role matrix tests, deployment env checklist, and security review. |
| Audit logging | Some business records could still change without trace. | Customer/booking/invoice/payment/staff/service/inventory create audit writes now exist; extend wrapper to tenant settings, role changes, inventory movements/adjustments, and commission overrides. | Current audit tests cover customer, booking, invoice, payment, booking completion, staff creation, service creation, inventory item creation, and Next audit-hook drift; add remaining write-path tests. |
| Payment integrity | Invoice status may drift from ledger. | Compute invoice status from payment sum; no direct status override except audited void/correction. | Payment reconciliation tests. |
| Invoice integrity | Duplicate/race-prone invoice numbers. | Keep sequence table and add concurrent tests. | Parallel invoice test. |
| Privacy | Sensitive medical/deep skin notes. | Limit fields; role-based note visibility; flagged-keyword validation. | Privacy tests and UI copy review. |
| Frontend XSS | User-entered CRM/service/inventory text could execute in legacy HTML renderer. | Legacy renderer now escapes API data before using `innerHTML`; prefer React's default escaping in Next implementation. | Static escaping regression test in `tests/api.test.js`; future browser tests should attempt HTML/script customer names. |
| Supabase/Vercel secrets | Secrets may leak to client. | Server-only DB access; no `DATABASE_URL` in client components. | Static tests and code review. |
| Schema reset | Live data loss. | Replace reset SQL with migrations; keep `_test` destructive guard and serial test runner until per-worker isolation exists. | `_test` guard test, test-runner config test, migration tests, deployment review. |
| Schema drift | Existing local or preview databases can miss newly added columns. | Legacy and Next DB startup paths now apply additive compatibility migrations for known non-destructive customer/staff contact-field changes. | Schema compatibility static regression test; local startup smoke; future migration framework before production. |

## 6. Deterministic Agent / Service Workstreams

Phase 1 "agents" should be implemented as deterministic service modules and coding workstreams. Do not add LLM calls unless an owner explicitly approves a later phase.

| Workstream | Product Role | Code Scope | First Deliverables |
|---|---|---|---|
| Requirements Traceability Agent | Keeps build aligned to BRD. | `docs/requirements-execution-map.md`, issue backlog. | Requirement tickets, acceptance criteria, docs conflict cleanup. |
| Data Model Agent | Schema/migrations. | `data/`, `next-app/src/server/db.ts`, future migrations. | Migration framework, tenant isolation test seeds, audit schema. |
| Auth/RBAC Agent | Google-authenticated access and sessions. | `next-app/src/server/auth.ts`, Supabase Auth integration, policy helper, route guards. | Supabase Google login, invite-only user mapping, permission matrix tests, UI menu role checks. |
| Parlour Operations Agent | Booking/CRM/services. | Booking/customer APIs and screens. | Booking form, reschedule/cancel/no-show, conflict UI. |
| Billing & Payments Agent | Invoice/payment discipline. | Invoice/payment APIs and screens. | Checkout flow, invoice print view, payment reconciliation. |
| Commission & Inventory Agent | Staff commissions and stock. | Commission records, inventory movements. | Versioned commission rules, stock movement table. |
| WhatsApp Workflow Agent | Manual messaging. | Template builder and links. | Booking/invoice `wa.me` links and message logs. |
| Audit & Compliance Agent | Safety and traceability. | Audit wrapper, policy flags, review queues. | Audit every write, override reason enforcement. |
| Analytics Dashboard Agent | Owner visibility. | Dashboard/report queries and UI. | Metric definitions and weekly/monthly reports. |
| Frontend UX Agent | Mobile/tablet usability. | `next-app/app`, reusable UI components. | Role-aware shell, forms, responsive screens, Malayalam toggle. |
| Test Harness Agent | Confidence and regression prevention. | `tests/`, Next-specific tests, integration tests. | Route parity, RBAC, tenant isolation, audit, UI regression tests. |
| Institute App Handoff Agent | Separate Institute app planning. | Separate repo plan only. | Institute requirements spec and bootstrap checklist. |

## 7. Execution Waves

### Wave 0: Documentation Cleanup And Backlog

1. Keep `docs/user-stories.md`, `future-agent-manifest.yaml`, and `AGENT_Spec.md` aligned so hidden Institute module assumptions do not return.
2. Convert this map into issue tickets or a checklist.
3. Add a traceability status section to `docs/testing.md`.

Exit gate:

- no current source document instructs developers to build an Institute module inside this repo.

### Wave 1: Production Foundation

1. Replace reset-oriented `data/schema.sql` deployment path with migrations.
2. Add tenant isolation tests across all current APIs.
3. Implement US-AUTH-04 Supabase Auth with Google provider and invite-only approved emails.
4. Centralize RBAC policy and align UI navigation to it.
5. Add audit logging wrapper and audit table expansion if needed.
6. Add Vercel/Supabase preview deployment checklist.

Exit gate:

- auth, RBAC, tenant isolation, schema safety, and audit basics pass automated tests.

### Wave 2: Daily Parlour Operations

1. Build bookings screen with create/edit/cancel/no-show/reschedule.
2. Build customer CRM list/profile with consent and history.
3. Build service catalogue and staff availability basics.
4. Add WhatsApp booking confirmation manual links.

Exit gate:

- Soorya/receptionist can run a day agenda without using database tools.

### Wave 3: Billing, Payment, Commission

1. Build invoice creation and print/share flow.
2. Build payment logging with balance due and partial states.
3. Add commission records and summaries.
4. Enforce invoice/payment/commission audit logs.

Exit gate:

- full service checkout can be completed with invoice, partial/full payment, and commission output.

### Wave 4: Inventory And Analytics

1. Build inventory catalogue UI.
2. Add stock movement table and audited adjustments.
3. Add low-stock dashboard and reports.
4. Add weekly/monthly analytics and source labels.

Exit gate:

- owner dashboard answers today readiness, revenue, pending invoices, low stock, and commission payable.

### Wave 5: Localization And UX Hardening

1. Add English/Malayalam UI dictionary.
2. Add language preference cookie/user setting.
3. Add mobile/tablet QA screenshots.
4. Complete accessibility pass for forms, dialogs, focus states, and status labels.

Exit gate:

- app is usable on phone/tablet/desktop, contact/WhatsApp consent controls remain clear, and Malayalam labels do not wrap badly or corrupt.

### Wave 6: Cutover

1. Run legacy and Next parity checks.
2. Deploy Next app to Vercel preview with Supabase test DB.
3. Complete smoke test with Soorya user role.
4. Freeze legacy app; promote Next app after owner approval.

Exit gate:

- `next-app` is the primary deployed app and legacy code is archived only after approval.

## 8. Ambiguities Requiring Owner Or Specialist Input

| Area | Question | Recommended Default Until Answered |
|---|---|---|
| GST invoice wording | Exact invoice wording, tax treatment, GSTIN display. | Keep tax fields optional; mark invoice template "CA review required." |
| Financial year invoice reset | Calendar year vs Indian financial year. | Current code uses calendar year; plan migration to configurable financial year before production. |
| Customer consent policy | What exact consent text and retention policy? | Store signed/unsigned/date only; avoid detailed health notes. |
| Commission rules | Per staff, per service, per category, or mixed? | Start with current per-staff fixed/percentage; version before overrides. |
| Stock deduction | Which services consume which products and quantities? | No automatic deduction until service-consumable mapping exists. |
| Malayalam copy | Literal Malayalam labels vs bilingual English/Malayalam labels. | Add translation dictionary after UI strings stabilize. |
| Supabase backup | Manual export vs scheduled backup on free tier. | Document manual backup/export until paid backup is selected. |

## 9. Immediate Next Task List

1. Use `docs/user-stories.md` as the implementation backlog and keep story IDs attached to future tasks.
2. Clean agent docs whenever they drift from the separate Institute app boundary.
3. Add migration strategy and stop using reset SQL for deployment.
4. Implement Supabase Auth with Google provider for invite-only production login.
5. Second-tenant cross-reference test is implemented for booking/invoice; expand it to the full API matrix.
6. Extract RBAC policy to a single shared module for API and UI.
7. Build Next bookings screen as the first real operational workflow.
8. Audit logging for booking/customer/invoice/payment/staff/service/inventory create writes is implemented; extend it to tenant settings, role changes, commission overrides, and inventory stock movements.
9. Add WhatsApp template/link builder tests.
10. Raise meaningful line coverage from 89.16% toward the 95% production target, starting with `src/server.js` validation/error/update branches and `src/db.js` connection/config/retry branches.
11. Keep Playwright UI tests current for every accepted P0/P1 workflow, including desktop and mobile profiles.
12. Use `docs/production-readiness.md` as the go/no-go register before any real customer data is entered.

## 10. Completion Definition For Phase 1 Parlour MVP

Phase 1 is complete only when:

1. Staff can log in with Supabase Auth Google provider and see only role-permitted navigation/actions.
2. Reception can create, edit, reschedule, cancel, and no-show bookings.
3. Staff/chair conflicts are blocked, including concurrent attempts.
4. Customer CRM stores contact, consent, preferences, and basic notes only.
5. Completed billable services can produce invoices.
6. Payments can be partial or full and reconcile to invoice status.
7. Commission summaries are calculated from completed paid services.
8. Inventory tracks items, stock movements, and low-stock alerts.
9. Manual WhatsApp booking/invoice links are visible, deterministic, and gated by WhatsApp consent.
10. All writes have audit logs or documented exceptions.
11. Tenant-scoped tests prove no cross-tenant leakage.
12. Vercel + Supabase preview deployment is verified.
13. Institute features are absent from this repo and planned separately.
14. Mobile/tablet/desktop UI QA passes.
15. Critical tests pass and meaningful coverage is approximately 95% before production data is used.

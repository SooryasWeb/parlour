# SooryasWeb Beauty Parlour Portal User Stories

Version: 1.0
Date: 5 June 2026
Status: Canonical Phase 1 parlour backlog
Authority: `docs/BRD.md`
Supporting inputs: `docs/requirements-execution-map.md`, `docs/ui-ux-design.md`
Persona companion: `docs/soorya-persona-user-stories.md`

## 1. Scope Rules

These user stories apply only to the **SooryasWeb Parlour App in this repository**. The app is an internal operations portal for Soorya's Skin Hair and Makeup and future parlour tenants under `lifefil.ai`.

Phase 1 focuses on internal readiness:

- staff-managed bookings;
- customer CRM and consent;
- invoices and payment ledger;
- staff commissions;
- inventory and stock movement;
- dashboard and reports;
- manual WhatsApp links;
- tenant isolation, Supabase Auth Google login, RBAC, audit, and Vercel + Supabase readiness.

The following are explicitly out of scope for this repo and Phase 1:

- customer self-booking;
- Institute admissions, batches, attendance, trainee fees, exams, certificates, or course landing pages;
- paid WhatsApp API integration;
- online payment gateway integration;
- deep medical, diagnostic skin, or diagnostic hair-history records;
- OpenAI API, LLM, or AI-assisted product features.

## 2. Story Format

Each story uses this structure:

| Field | Meaning |
|---|---|
| Story ID | Stable backlog identifier. |
| Epic | Product capability area. |
| Role | Primary role that receives value. |
| User story | As a role, I want a goal, so that a business result is achieved. |
| Business value | Why this matters operationally. |
| Priority | `P0` for foundation/MVP, `P1` for required Phase 1 depth, `P2` for later polish. |
| BRD requirement links | BRD business rules, functional requirements, or decision IDs. |
| Acceptance criteria | Conditions that must be true before the story is accepted. |
| Test scenarios | Required automated or manual tests. |
| UX/RBAC/audit notes | Design, access-control, and traceability constraints. |

## 3. User Stories

### US-AUTH-01: Staff Login

| Field | Detail |
|---|---|
| Epic | Login, session, and RBAC |
| Role | Parlour staff user |
| User story | As a staff user, I want a secure login session so that I can access only the parlour tools assigned to my role. |
| Business value | Prevents anonymous access to customer, staff, and financial records. |
| Priority | P0 |
| BRD requirement links | BR-06, FR-TA-01, Section 6.1, US-AUTH-04 |
| Acceptance criteria | Production login uses the approved Google-authenticated flow; invalid or unauthorized identities show a plain error; session cookie is HTTP-only and signed; unauthenticated users cannot access protected data. |
| Test scenarios | Auth success; auth failure; protected route rejection; session cookie attributes; local password fallback disabled or explicitly limited outside production. |
| UX/RBAC/audit notes | Login page must be fast and operational, not marketing-led. Username/password should not be the normal production path after US-AUTH-04 is implemented. |

### US-AUTH-02: Role-Aware Navigation

| Field | Detail |
|---|---|
| Epic | Login, session, and RBAC |
| Role | Owner, manager, receptionist, staff, accountant |
| User story | As a logged-in user, I want menus and actions to match my role so that I do not see tools I am not allowed to use. |
| Business value | Reduces accidental misuse and supports production-grade access discipline. |
| Priority | P0 |
| BRD requirement links | Section 6.1, BR-06, FR-TA-01 |
| Acceptance criteria | Owner sees all Phase 1 parlour modules; receptionist sees booking, customer, and payment actions; accountant sees finance reports without operational mutation rights; staff sees assigned work and permitted notes only. |
| Test scenarios | Role-menu matrix tests; forbidden API action tests; staff/accountant negative tests. |
| UX/RBAC/audit notes | Hidden UI is not enough; API authorization must enforce the same policy. |

### US-AUTH-03: Tenant Isolation

| Field | Detail |
|---|---|
| Epic | Audit, tenant isolation, and privacy |
| Role | Platform owner |
| User story | As the platform owner, I want every business query and write scoped by tenant so that one parlour can never see another parlour's data. |
| Business value | Makes the Rs. 499/month future tenant model credible and safe. |
| Priority | P0 |
| BRD requirement links | BR-06, FR-TA-01, D-03 |
| Acceptance criteria | Every tenant-owned table has `tenant_id`; every list/get/write applies tenant scope; tests seed at least two tenants and prove no cross-tenant leakage. |
| Test scenarios | Tenant isolation tests for customers, bookings, invoices, payments, staff, inventory, audit logs. |
| UX/RBAC/audit notes | Tenant context should be derived from authenticated/session/subdomain context, not user input alone. |

Implementation status:

- Partial implementation exists for cross-reference validation: booking creation now rejects customer or staff IDs outside the authenticated tenant, and invoice creation rejects customer IDs outside the authenticated tenant.
- Current evidence: `tests/api.test.js` seeds a second tenant and proves cross-tenant booking/invoice references are blocked; `tests/next_rewrite.test.js` guards matching tenant ownership checks in the Next rewrite.
- Remaining work: expand the two-tenant test matrix across every list/get/write path, including inventory, staff, services, audit logs, and future tenant settings.

### US-AUTH-04: Supabase Auth With Google Provider

| Field | Detail |
|---|---|
| Epic | Login, session, and RBAC |
| Role | Owner, manager, receptionist, staff, accountant |
| User story | As a portal user, I want to register and log in using my Google-authenticated email through Supabase Auth so that SooryasWeb can verify my identity without managing normal production passwords. |
| Business value | Reduces password risk, improves staff onboarding trust, and aligns authentication with the selected Vercel + Supabase deployment model. |
| Priority | P0 before production cutover |
| BRD requirement links | BR-06, FR-TA-01, D-16, US-AUTH-01, US-AUTH-02, US-AUTH-03 |
| Acceptance criteria | Supabase Auth Google provider is the production login path; owner/manager can invite or pre-register a user by email, tenant, and role; login succeeds only when the Google-authenticated email matches an active portal user/invite; no public self-registration creates usable access; disabled users cannot log in; tenant and role are assigned from SooryasWeb records, not trusted directly from Google profile claims; legacy username/password login is removed from production or retained only as an explicitly documented break-glass/development path. |
| Test scenarios | Supabase Google callback success with invited email; unknown Google email rejection; email mismatch rejection; disabled user rejection; tenant assignment test; role-menu test after Google login; session cookie security test; audit events for invite creation, first login, login rejection, role change, and user disable. |
| UX/RBAC/audit notes | Login copy should say "Continue with Google." Registration should feel invite-only, not public signup. The app should request only minimal Google scopes: `openid`, `email`, and `profile`. WhatsApp login is out of scope. |

### US-DASH-01: Daily Readiness Dashboard

| Field | Detail |
|---|---|
| Epic | Dashboard and daily readiness |
| Role | Parlour owner or manager |
| User story | As Soorya, I want a daily readiness dashboard so that I can see today's bookings, expected revenue, collected payments, pending invoices, low-stock items, and attention items at a glance. |
| Business value | Gives the owner a reliable morning and mid-day operating view. |
| Priority | P0 |
| BRD requirement links | FR-INV-03, Section 4.1 Analytics Dashboards |
| Acceptance criteria | Dashboard shows today's schedule, KPI strip, operational alerts, and owner snapshot; each metric displays date range and source. |
| Test scenarios | Dashboard API test; metric definition tests; empty state test; mobile rendering check. |
| UX/RBAC/audit notes | Avoid vanity metrics and Institute metrics in this portal. |

### US-DASH-02: Operational Alerts

| Field | Detail |
|---|---|
| Epic | Dashboard and daily readiness |
| Role | Manager or receptionist |
| User story | As a manager, I want operational alerts for conflicts, consent gaps, unpaid invoices, and low stock so that the team can fix issues before they become service problems. |
| Business value | Converts stored records into timely action. |
| Priority | P1 |
| BRD requirement links | BR-02, BR-03, BR-05, FR-INV-03 |
| Acceptance criteria | Alerts appear for pending consent, missing invoice after completion, partial/unpaid invoice, and low-stock items; each alert links to the relevant screen. |
| Test scenarios | Alert creation tests; resolved-alert disappearance tests; role visibility tests. |
| UX/RBAC/audit notes | Alerts must use labels, not color alone. |

### US-BK-01: Create Staff-Managed Booking

| Field | Detail |
|---|---|
| Epic | Staff-managed bookings |
| Role | Receptionist |
| User story | As a receptionist, I want to create appointments for customers so that all bookings are staff-managed and visible in the parlour schedule. |
| Business value | Keeps appointment control inside the parlour and prevents customer self-booking scope creep. |
| Priority | P0 |
| BRD requirement links | BR-01, FR-BK-01, FR-BK-04 |
| Acceptance criteria | Booking form captures customer, service, staff, chair/station, start time, source, and notes; customer self-booking route does not exist; save creates an audit event. |
| Test scenarios | Create booking success; required-field validation; no public booking endpoint; audit log test. |
| UX/RBAC/audit notes | Use operational copy such as "Book appointment"; no public-facing booking language. |

### US-BK-02: Prevent Staff And Chair Conflicts

| Field | Detail |
|---|---|
| Epic | Staff-managed bookings |
| Role | Receptionist |
| User story | As a receptionist, I want the system to block overlapping bookings by staff member or chair so that the parlour does not double-book people or stations. |
| Business value | Protects service quality and schedule reliability. |
| Priority | P0 |
| BRD requirement links | BR-02, FR-BK-03 |
| Acceptance criteria | Save is blocked when staff overlaps; save is blocked when chair overlaps; conflict message explains which resource is unavailable; concurrent attempts do not create duplicate slots. |
| Test scenarios | Staff overlap test; chair overlap test; reschedule conflict test; concurrent booking test. |
| UX/RBAC/audit notes | Conflict messages must be clear before or immediately after save. |

### US-BK-03: Reschedule, Cancel, Complete, And No-Show Booking

| Field | Detail |
|---|---|
| Epic | Staff-managed bookings |
| Role | Receptionist or manager |
| User story | As a receptionist, I want to reschedule, cancel, complete, or mark no-show on a booking so that the day's schedule and customer history stay accurate. |
| Business value | Preserves operational truth for follow-up, billing, and reporting. |
| Priority | P0 |
| BRD requirement links | FR-BK-01, BR-03 |
| Acceptance criteria | Status transitions are limited to allowed states; reschedule runs conflict checks; cancellation/no-show reason can be recorded; every status change is audited. |
| Test scenarios | Valid status transition tests; invalid transition tests; reschedule conflict test; audit test. |
| UX/RBAC/audit notes | Destructive or audit-sensitive actions require confirmation. |

### US-BK-04: Day Agenda And Schedule Board

| Field | Detail |
|---|---|
| Epic | Staff-managed bookings |
| Role | Receptionist or manager |
| User story | As a receptionist, I want a day agenda organized by time, staff, and chair so that I can run today's schedule quickly on tablet or desktop. |
| Business value | Makes the portal useful during a real service day. |
| Priority | P1 |
| BRD requirement links | FR-BK-02 |
| Acceptance criteria | Day agenda shows time, customer, service, staff, chair, status, and quick actions; staff/chair filters are available; phone layout remains scannable. |
| Test scenarios | Schedule board rendering; filter tests; responsive screenshot/manual QA. |
| UX/RBAC/audit notes | Build a reliable agenda before a complex calendar grid. |

### US-CRM-01: Customer Profile Basics

| Field | Detail |
|---|---|
| Epic | Customer CRM and consent |
| Role | Receptionist or manager |
| User story | As a receptionist, I want to store customer name, phone, email, tags, preferences, and basic notes so that the team can serve repeat customers consistently. |
| Business value | Creates practical CRM value without over-collecting sensitive information. |
| Priority | P0 |
| BRD requirement links | FR-CRM-01, BR-05 |
| Acceptance criteria | Customer profile supports contact fields, editable country code defaulting to `+91`, phone validation, optional email validation, tags, preferences, and basic notes; duplicate phone handling is defined; sensitive diagnostic fields are absent. |
| Test scenarios | Customer create/update tests; country-code normalization; Indian 10-digit phone validation; non-India country-code preservation on phone-only edit; optional email validation; privacy keyword/static field check. |
| UX/RBAC/audit notes | Notes should be operational, not diagnostic. |

Implementation status:

- Partial implementation exists in the legacy app for customer name, editable country code defaulting to `+91`, exact 10-digit India phone validation, optional email validation, and WhatsApp consent capture/display.
- Current evidence: `tests/api.test.js` verifies API validation and persistence; `tests/e2e/parlour.spec.js` verifies customer validation/save and WhatsApp consent on desktop and mobile; `tests/db_reset_script.test.js` guards startup compatibility migrations for existing databases missing `customers.country_code` or `customers.whatsapp_consent`.
- Remaining work: add tags, preferences, customer profile/history view, duplicate phone policy, final consent copy, and Next UI parity.

### US-CRM-02: Customer History

| Field | Detail |
|---|---|
| Epic | Customer CRM and consent |
| Role | Manager or staff |
| User story | As a staff member, I want to view permitted customer service history so that I can understand prior services before the appointment. |
| Business value | Improves continuity while preserving privacy. |
| Priority | P1 |
| BRD requirement links | FR-CRM-02 |
| Acceptance criteria | Profile shows past bookings, completed services, assigned staff, invoices, and payment status according to role; tenant scope is enforced. |
| Test scenarios | Customer history query; tenant isolation; staff role limited view. |
| UX/RBAC/audit notes | Staff should not see finance details unless permitted. |

### US-CRM-03: Consent Status

| Field | Detail |
|---|---|
| Epic | Customer CRM and consent |
| Role | Receptionist |
| User story | As a receptionist, I want to record simple customer consent status, consent date, and explicit WhatsApp communication consent so that the parlour can track basic consent without storing detailed medical data. |
| Business value | Supports disciplined operations while avoiding premature legal exposure. |
| Priority | P0 |
| BRD requirement links | FR-CRM-03, BR-05 |
| Acceptance criteria | Consent can be marked signed/unsigned with date; WhatsApp reminder/invoice consent can be stored separately; changes are audited; customer list shows consent status and WhatsApp consent status; dashboard can show pending consent. |
| Test scenarios | Consent update; WhatsApp consent create/update; audit log; pending consent alert; role restriction; static UI check that WhatsApp consent is visible in the CRM form/list. |
| UX/RBAC/audit notes | Consent text should be reviewed before production use. WhatsApp consent is not the same as service consent and must be displayed separately. |

### US-SVC-01: Service Catalogue

| Field | Detail |
|---|---|
| Epic | Services, staff, and chair/station setup |
| Role | Owner or manager |
| User story | As a manager, I want to maintain service names, durations, prices, tax class, and active status so that bookings and invoices use consistent service data. |
| Business value | Reduces billing mistakes and makes schedule durations predictable. |
| Priority | P0 |
| BRD requirement links | FR-BK-01, FR-BI-01, BR-04 |
| Acceptance criteria | Services can be listed, created, updated, and deactivated; inactive services cannot be selected for new bookings; tax class is optional/configurable. |
| Test scenarios | Service CRUD; inactive selection block; tax class tests. |
| UX/RBAC/audit notes | Accountant should not manage services unless explicitly permitted. |

### US-SVC-02: Staff Profiles And Availability

| Field | Detail |
|---|---|
| Epic | Services, staff, and chair/station setup |
| Role | Manager |
| User story | As a manager, I want to configure staff profiles, roles, active status, and availability so that bookings and commissions use the correct staff data. |
| Business value | Creates a trusted staffing base for operations and reports. |
| Priority | P0 |
| BRD requirement links | FR-ST-01 |
| Acceptance criteria | Staff records include name, editable country code defaulting to `+91`, validated phone, role, active status, commission value capped at the configured limit, and availability; inactive staff cannot be assigned to new bookings; role changes are audited. |
| Test scenarios | Staff CRUD; country-code/phone validation; commission range validation; inactive assignment block; availability query; audit test. |
| UX/RBAC/audit notes | Staff users cannot edit their own commission rules. |

Implementation status:

- Partial implementation exists in the legacy app for staff name, editable country code defaulting to `+91`, exact 10-digit India phone validation, staff role, active status, and commission value capped at 33.
- Current evidence: `tests/api.test.js` verifies staff validation/persistence; `tests/e2e/parlour.spec.js` verifies staff phone and commission validation on desktop and mobile; `tests/db_reset_script.test.js` guards startup compatibility migration for existing databases missing `staff.country_code`.
- Remaining work: add availability schedules, inactive assignment blocking, richer staff profile editing, role-change audit, and Next UI parity.

### US-SVC-03: Chair And Station Setup

| Field | Detail |
|---|---|
| Epic | Services, staff, and chair/station setup |
| Role | Manager |
| User story | As a manager, I want to maintain active chairs or stations so that booking conflict checks match the physical parlour setup. |
| Business value | Keeps the schedule aligned with real capacity. |
| Priority | P0 |
| BRD requirement links | BR-02, FR-BK-03 |
| Acceptance criteria | Chairs/stations can be listed and activated/deactivated; deactivated chairs cannot be used for new bookings; existing history remains intact. |
| Test scenarios | Chair setup tests; inactive chair booking block; history preservation. |
| UX/RBAC/audit notes | Use the term "chair/station" consistently until final copy is chosen. |

### US-BILL-01: Generate GST-Ready Invoice

| Field | Detail |
|---|---|
| Epic | Invoices and payment ledger |
| Role | Receptionist or manager |
| User story | As a receptionist, I want to generate an invoice from completed billable services so that every completed service has a financial record. |
| Business value | Enforces billing discipline and reduces missed revenue. |
| Priority | P0 |
| BRD requirement links | BR-03, BR-04, FR-BI-01 |
| Acceptance criteria | Invoice includes customer, at least one valid service line item, service prices, discounts, optional tax fields, subtotal, tax total, grand total, and tenant details; completed billable services without invoice show an alert. |
| Test scenarios | Invoice creation; missing/invalid service-line rejection; optional GST/tax; completed-without-invoice alert; invoice audit. |
| UX/RBAC/audit notes | Invoice wording should be marked CA review required before production. |

Implementation status:

- Partial implementation exists in the legacy app for invoice generation from an authenticated customer and selected service line; missing service lines are rejected before the transaction.
- Current evidence: `tests/api.test.js` verifies invoice creation and missing service-line rejection; `tests/e2e/parlour.spec.js` verifies Generate Bill succeeds on desktop and mobile.
- Remaining work: connect invoice generation to completed booking checkout, add invoice print/PDF/share view, add completed-without-invoice alerts, and review GST wording with a CA.

### US-BILL-02: Race-Safe Invoice Numbering

| Field | Detail |
|---|---|
| Epic | Invoices and payment ledger |
| Role | Owner or accountant |
| User story | As an owner, I want invoice numbers to be unique and sequential per tenant and financial year so that accounts remain trustworthy. |
| Business value | Prevents duplicate invoices and financial confusion. |
| Priority | P0 |
| BRD requirement links | FR-BI-02 |
| Acceptance criteria | Invoice number comes from a sequence table or equivalent lock-safe mechanism; numbering is tenant-scoped; financial-year reset behavior is configurable before production. |
| Test scenarios | Parallel invoice test; tenant-separated sequences; financial-year configuration test when implemented. |
| UX/RBAC/audit notes | Do not use `COUNT + 1`. |

### US-BILL-03: Payment Logging

| Field | Detail |
|---|---|
| Epic | Invoices and payment ledger |
| Role | Receptionist or accountant |
| User story | As a receptionist, I want to record payment mode, amount, reference, and date so that at-premises payments are captured accurately. |
| Business value | Supports cash/UPI/card reconciliation without payment gateway cost. |
| Priority | P0 |
| BRD requirement links | FR-BI-03, FR-BI-04 |
| Acceptance criteria | Payment can be logged against an invoice; allowed modes include UPI, card, and cash; partial payments are allowed; overpayment is blocked or explicitly handled. |
| Test scenarios | Full payment; partial payment; overpayment rejection; payment mode validation. |
| UX/RBAC/audit notes | Payment entry must not directly mark paid unless total paid covers invoice total. |

### US-BILL-04: Payment Reconciliation States

| Field | Detail |
|---|---|
| Epic | Invoices and payment ledger |
| Role | Owner or accountant |
| User story | As an accountant, I want invoices to show unpaid, partial, or paid based on payment totals so that the ledger cannot drift from reality. |
| Business value | Protects cash discipline and reduces manual reconciliation. |
| Priority | P0 |
| BRD requirement links | BR-03, FR-BI-04 |
| Acceptance criteria | Invoice status is computed from payment sum; balance due is visible; status cannot be overwritten without an audited correction process. |
| Test scenarios | Unpaid/partial/paid state tests; balance due display; status override rejection. |
| UX/RBAC/audit notes | State color must be paired with text labels. |

### US-BILL-05: Invoice Print And WhatsApp Share Link

| Field | Detail |
|---|---|
| Epic | Invoices and payment ledger |
| Role | Receptionist |
| User story | As a receptionist, I want to print or share an invoice summary link through WhatsApp so that customers can receive their bill after payment or checkout. |
| Business value | Improves customer communication without paid integrations. |
| Priority | P1 |
| BRD requirement links | FR-WA-02, BR-08 |
| Acceptance criteria | Invoice screen has print view and a deterministic `wa.me` share link only when the customer has WhatsApp consent and a valid phone number; share text includes invoice number, summary, total, and payment/balance status; otherwise the UI shows a consent-needed state. |
| Test scenarios | WhatsApp invoice template test; URL encoding test; consent-gated link visibility test; print view smoke test. |
| UX/RBAC/audit notes | Sharing remains a manual user action. No delivery status is claimed without a paid WhatsApp API. |

### US-COMM-01: Commission Rule Setup

| Field | Detail |
|---|---|
| Epic | Staff commissions |
| Role | Owner or manager |
| User story | As the owner, I want to configure versioned commission rules so that staff commission calculations are transparent and historically accurate. |
| Business value | Builds staff trust and avoids payout disputes. |
| Priority | P1 |
| BRD requirement links | BR-09, FR-ST-02 |
| Acceptance criteria | Rules support fixed or percentage commission; rules are versioned; old invoices keep the applied rule reference. |
| Test scenarios | Rule create/update; version preservation; fixed/percentage calculation. |
| UX/RBAC/audit notes | Commission setup is owner/manager only. |

### US-COMM-02: Commission Calculation

| Field | Detail |
|---|---|
| Epic | Staff commissions |
| Role | Owner, manager, staff |
| User story | As the owner, I want commissions calculated from completed paid services so that payout summaries are reliable. |
| Business value | Reduces manual calculation and makes staff earnings visible. |
| Priority | P1 |
| BRD requirement links | FR-ST-03, BR-09 |
| Acceptance criteria | Commission record is generated only for eligible completed service/invoice events; duplicate calculation is prevented; staff can view their permitted summary. |
| Test scenarios | Commission calculation; duplicate prevention; staff view restriction. |
| UX/RBAC/audit notes | Commission payable should show date range and source. |

### US-COMM-03: Audited Commission Override

| Field | Detail |
|---|---|
| Epic | Staff commissions |
| Role | Owner or manager |
| User story | As an owner, I want to override commission only with a required reason so that exceptions are transparent. |
| Business value | Supports fair corrections without silent financial changes. |
| Priority | P1 |
| BRD requirement links | BR-09, FR-ST-04 |
| Acceptance criteria | Override requires reason; override creates audit event; old and new values are preserved. |
| Test scenarios | Override requires reason; audit event; forbidden staff override. |
| UX/RBAC/audit notes | Save button remains disabled until reason is entered. |

### US-INV-01: Inventory Catalogue

| Field | Detail |
|---|---|
| Epic | Inventory and stock movement |
| Role | Manager |
| User story | As a manager, I want an inventory catalogue for retail products and consumables so that stock is visible and organized. |
| Business value | Reduces stock surprises and supports service readiness. |
| Priority | P1 |
| BRD requirement links | FR-INV-01 |
| Acceptance criteria | Inventory items include name, type, stock quantity, reorder level, vendor, and active status; retail and consumable filters are available. |
| Test scenarios | Inventory CRUD; type filter; low-stock calculation. |
| UX/RBAC/audit notes | Use "consumable/backbar" consistently for internal stock. |

### US-INV-02: Stock Movement And Deduction

| Field | Detail |
|---|---|
| Epic | Inventory and stock movement |
| Role | Manager |
| User story | As a manager, I want stock movements recorded when items are consumed, sold, purchased, or adjusted so that inventory history is auditable. |
| Business value | Creates reliable stock records and prevents silent shrinkage. |
| Priority | P1 |
| BRD requirement links | FR-INV-02 |
| Acceptance criteria | Stock movement table records every deduction/addition/adjustment; no automatic deduction occurs without a service-consumable mapping; manual adjustments require reason. |
| Test scenarios | Stock movement creation; no ambiguous auto-deduction; negative stock prevention; audit test. |
| UX/RBAC/audit notes | Reversal should happen through an audited adjustment, not deletion. |

### US-INV-03: Low-Stock Alerts

| Field | Detail |
|---|---|
| Epic | Inventory and stock movement |
| Role | Manager or owner |
| User story | As an owner, I want low-stock alerts on the dashboard and inventory screen so that products can be reordered before services are affected. |
| Business value | Improves day readiness and retail/consumable control. |
| Priority | P1 |
| BRD requirement links | FR-INV-03 |
| Acceptance criteria | Item is marked low stock when quantity is at or below reorder level; dashboard shows count; inventory list shows vendor/reorder context. |
| Test scenarios | Low-stock threshold test; dashboard alert test; resolved alert test. |
| UX/RBAC/audit notes | Low-stock state must use label plus color. |

### US-WA-01: Booking WhatsApp Link

| Field | Detail |
|---|---|
| Epic | Manual WhatsApp workflows |
| Role | Receptionist |
| User story | As a receptionist, I want a pre-filled WhatsApp confirmation link for bookings so that I can quickly send date, time, and service details to customers. |
| Business value | Improves customer communication without paid WhatsApp cost. |
| Priority | P0 |
| BRD requirement links | BR-08, FR-WA-01 |
| Acceptance criteria | Confirmed booking shows a manual `wa.me` link only when the customer has WhatsApp consent and a valid phone number; message includes date, time, service, and parlour name; link is URL encoded; otherwise the UI shows a consent-needed state. |
| Test scenarios | Template builder test; URL encoding test; consent-gated link visibility test; role visibility test. |
| UX/RBAC/audit notes | Link click may log message intent but must not auto-send. Manual WhatsApp contact is supported; paid WhatsApp Business API integration is out of scope for Phase 1. |

### US-WA-02: Manual Message Log

| Field | Detail |
|---|---|
| Epic | Manual WhatsApp workflows |
| Role | Receptionist or manager |
| User story | As a manager, I want manual WhatsApp link usage logged as communication intent so that follow-ups can be reviewed later. |
| Business value | Gives lightweight communication traceability without paid integration. |
| Priority | P2 |
| BRD requirement links | BR-08, FR-WA-01, FR-WA-02 |
| Acceptance criteria | User action can record customer, booking/invoice, template type, timestamp, and actor; no delivery status is claimed. |
| Test scenarios | Message intent log test; no fake delivery state test. |
| UX/RBAC/audit notes | Label as "opened WhatsApp link", not "sent". |

### US-RPT-01: Sales And Payment Reports

| Field | Detail |
|---|---|
| Epic | Reports and analytics |
| Role | Owner or accountant |
| User story | As an owner, I want daily, weekly, and monthly sales and payment reports so that I can understand business performance. |
| Business value | Turns invoice/payment data into operating insight. |
| Priority | P1 |
| BRD requirement links | Section 4.1 Analytics Dashboards |
| Acceptance criteria | Reports support date ranges; distinguish invoiced amount, collected amount, pending amount, and payment mode totals; source and freshness are visible. |
| Test scenarios | Date range report tests; payment mode aggregation; role access tests. |
| UX/RBAC/audit notes | Accountant can view finance reports without broad operational write access. |

### US-RPT-02: Staff Productivity And Repeat Customer Reports

| Field | Detail |
|---|---|
| Epic | Reports and analytics |
| Role | Owner or manager |
| User story | As the owner, I want staff productivity and repeat customer trends so that I can manage service quality and retention. |
| Business value | Supports practical owner decisions after core records are reliable. |
| Priority | P2 |
| BRD requirement links | Section 4.1 Analytics Dashboards |
| Acceptance criteria | Report shows staff service count/revenue and repeat customer count for selected period; metric definitions are documented. |
| Test scenarios | Staff aggregation; repeat customer definition; date filtering. |
| UX/RBAC/audit notes | Do not add marketing ROI or Institute enrollment metrics. |

### US-SET-01: Tenant Profile And GST Settings

| Field | Detail |
|---|---|
| Epic | Settings and bilingual UI |
| Role | Owner or manager |
| User story | As the owner, I want to configure parlour name, logo, address, phone, and optional GSTIN so that invoices and tenant screens show correct business details. |
| Business value | Makes the portal production-ready for Sooryas and future tenants. |
| Priority | P0 |
| BRD requirement links | FR-TA-03, BR-04 |
| Acceptance criteria | Tenant settings can be viewed and updated; GSTIN is optional; updates are audited; invoice template reads tenant profile. |
| Test scenarios | Settings update; optional GSTIN; invoice tenant detail; audit test. |
| UX/RBAC/audit notes | Custom invoice layout builder is out of scope. |

### US-SET-02: Bilingual UI Toggle

| Field | Detail |
|---|---|
| Epic | Settings and bilingual UI |
| Role | Parlour staff user |
| User story | As a staff user, I want to switch between English and Malayalam UI labels so that the portal is comfortable for Malayalam-speaking staff. |
| Business value | Improves daily adoption without duplicating stored data fields. |
| Priority | P1 |
| BRD requirement links | Section 5.4, Section 4.1 Bilingual Interface |
| Acceptance criteria | Navigation, labels, statuses, validation messages, and toasts use a translation dictionary; user-entered text remains a single Unicode field; language preference is stored per session first. |
| Test scenarios | Translation toggle test; UTF-8/mojibake regression; Malayalam wrapping mobile QA. |
| UX/RBAC/audit notes | English stories are canonical first; Malayalam copy should be finalized after UI labels stabilize. |

### US-AUD-01: Audit Every Business Write

| Field | Detail |
|---|---|
| Epic | Audit, tenant isolation, and privacy |
| Role | Owner or compliance reviewer |
| User story | As the owner, I want every important business write audited so that record changes are traceable. |
| Business value | Protects trust in appointments, invoices, payments, inventory, and commissions. |
| Priority | P0 |
| BRD requirement links | BR-09, FR-ST-04, D-11 |
| Acceptance criteria | Booking, customer, invoice, payment, inventory, commission, role, and tenant-setting writes create audit logs or documented exceptions; audit records include actor, tenant, entity, action, timestamp, and summary. |
| Test scenarios | Audit tests for each write path; missing audit static/contract check. |
| UX/RBAC/audit notes | Audit logs should be append-only from the application perspective. |

Implementation status:

- Partial implementation exists for core Phase 1 write paths: customer create/update, booking create/update, invoice create, payment record, booking completion through paid invoice, commission calculation audit, staff creation, service creation, and inventory item creation.
- Current evidence: `tests/api.test.js` verifies tenant-scoped audit rows for customer, booking, invoice, payment, booking completion, staff creation, service creation, and inventory item creation; `tests/next_rewrite.test.js` guards matching audit hooks in the Next rewrite.
- Remaining work: extend audit coverage to tenant settings, commission overrides, role changes, inventory adjustments/stock movements, and every future write path.

### US-AUD-02: Privacy Boundary For Notes

| Field | Detail |
|---|---|
| Epic | Audit, tenant isolation, and privacy |
| Role | Owner or manager |
| User story | As the owner, I want customer notes limited to basic operational information so that the parlour avoids risky medical or diagnostic recordkeeping. |
| Business value | Reduces privacy and legal exposure while still helping staff serve customers. |
| Priority | P0 |
| BRD requirement links | BR-05, D-15 |
| Acceptance criteria | UI does not contain deep medical/skin/hair diagnosis fields; sensitive note visibility is role-limited; policy warning exists for prohibited note categories. |
| Test scenarios | Static field scan; role-limited notes; policy validation; UI copy review. |
| UX/RBAC/audit notes | Store "allergies mentioned by customer" only as operational notes until policy review. |

### US-DEP-01: Vercel And Supabase Preview Readiness

| Field | Detail |
|---|---|
| Epic | Deployment/admin readiness |
| Role | Platform owner or developer |
| User story | As the platform owner, I want a Vercel + Supabase preview deployment checklist so that the app can be tested cheaply before production use. |
| Business value | Supports the chosen free-tier hosting path for a low-usage Phase 1 portal. |
| Priority | P0 |
| BRD requirement links | D-16, deployment direction |
| Acceptance criteria | Deployment docs specify Vercel env vars, Supabase transaction pooler, schema/migration warning, SESSION_SECRET, test DB separation, and smoke-test steps. |
| Test scenarios | Build check; typecheck; deployment env checklist review; preview smoke test. |
| UX/RBAC/audit notes | Do not expose real customer data until production hardening gates pass. |

### US-DEP-02: Test Database Guard

| Field | Detail |
|---|---|
| Epic | Deployment/admin readiness |
| Role | Developer |
| User story | As a developer, I want destructive test resets blocked unless the configured database name ends with `_test` so that live Supabase data cannot be reset by tests. |
| Business value | Protects production data during local and CI test runs. |
| Priority | P0 |
| BRD requirement links | D-14, deployment safety |
| Acceptance criteria | Reset helper refuses non-test database names; tests prove guard behavior; deployment docs warn against reset SQL on live DB. |
| Test scenarios | `_test` allowed; non-test DB rejected; schema reset warning doc check. |
| UX/RBAC/audit notes | This is a hard engineering gate before production data. |

### US-SCOPE-01: Institute App Handoff Only

| Field | Detail |
|---|---|
| Epic | Deployment/admin readiness |
| Role | Product owner or developer |
| User story | As the product owner, I want Institute requirements kept as a separate-app handoff so that the parlour portal does not grow hidden admissions, fees, attendance, or certificate screens. |
| Business value | Prevents scope drift and preserves separate database/privacy boundaries. |
| Priority | P0 |
| BRD requirement links | BR-07, FR-IN-*, D-04, D-05 |
| Acceptance criteria | This repo has no Institute navigation, APIs, hidden routes, dashboard widgets, or database tables beyond handoff documentation; agent docs describe only a separate-repo handoff. |
| Test scenarios | Scope scan for Institute routes/API; docs scan; navigation QA. |
| UX/RBAC/audit notes | Institute features belong in a different repository and PostgreSQL database. |

## 4. Requirement Traceability Summary

| BRD item | Covered by stories |
|---|---|
| BR-01 | US-BK-01 |
| BR-02 / FR-BK-03 | US-BK-02, US-SVC-03 |
| BR-03 / FR-BI-01 | US-BILL-01, US-BILL-03, US-BILL-04 |
| BR-04 | US-SVC-01, US-BILL-01, US-SET-01 |
| BR-05 / FR-CRM-* | US-CRM-01, US-CRM-02, US-CRM-03, US-AUD-02 |
| BR-06 / FR-TA-01 | US-AUTH-01, US-AUTH-02, US-AUTH-03, US-AUTH-04 |
| BR-07 / FR-IN-* | US-SCOPE-01 |
| BR-08 / FR-WA-* | US-WA-01, US-WA-02, US-BILL-05 |
| BR-09 / FR-ST-02..04 | US-COMM-01, US-COMM-02, US-COMM-03, US-AUD-01 |
| FR-TA-02 | US-AUTH-03, US-SET-01, future white-label tenant onboarding stories |
| FR-TA-03 | US-SET-01 |
| FR-TA-04 | US-AUTH-04 |
| FR-BK-01 / FR-BK-02 / FR-BK-04 | US-BK-01, US-BK-03, US-BK-04 |
| FR-ST-01 | US-SVC-02 |
| FR-INV-* | US-INV-01, US-INV-02, US-INV-03 |
| Analytics dashboards | US-DASH-01, US-DASH-02, US-RPT-01, US-RPT-02 |
| Bilingual interface | US-SET-02 |
| Vercel + Supabase readiness | US-AUTH-04, US-DEP-01, US-DEP-02 |

## 5. Build Priority

1. Foundation + backend parity: US-AUTH-01, US-AUTH-02, US-AUTH-03 partial, US-AUTH-04, US-AUD-01 partial, US-DEP-01, US-DEP-02, US-SCOPE-01.
2. Core daily operations: US-DASH-01, US-BK-01, US-BK-02, US-BK-03, US-CRM-01, US-CRM-03, US-SVC-01, US-SVC-02, US-SVC-03, US-WA-01.
3. Billing discipline: US-BILL-01, US-BILL-02, US-BILL-03, US-BILL-04, US-BILL-05.
4. Operational control: US-COMM-01, US-COMM-02, US-COMM-03, US-INV-01, US-INV-02, US-INV-03.
5. Reports and UX hardening: US-DASH-02, US-BK-04, US-CRM-02, US-RPT-01, US-RPT-02, US-SET-02, US-WA-02.

# Coding Agents Needed Before Rewrite

Date: 4 June 2026  
Purpose: define specialist coding agents/workstreams before rewriting the current parlour prototype.  
Priority: SooryasWeb Parlour App readiness first. The Sooryas Institute App is separate.

Current execution map: `requirements-execution-map.md`
Canonical user-story backlog: `user-stories.md`

## 1. Recommended Coding-Agent Team

These are not AI business agents inside the product. These are development workstreams/coding agents that can help rewrite the app safely.

Each coding agent must take its implementation scope from story IDs in `docs/user-stories.md`. The BRD remains the business authority, but the user-story backlog is the implementation checklist and acceptance-criteria source.

| Agent | Ownership | Why Needed First |
|---|---|---|
| Requirements Traceability Agent | `docs/BRD.md`, specs, acceptance criteria | Converts BRD requirements into implementation tickets and testable acceptance criteria. |
| Data Model Agent | database schema, migrations, seed data | Designs durable parlour entities for tenants, customers, bookings, invoices, payments, staff, commissions, inventory, and audit logs. |
| Auth/RBAC Agent | Supabase Google auth, roles, permissions, protected routes | Required before real customer, staff, and billing data is used. |
| Parlour Operations Agent | bookings, CRM, services, staff availability | Builds the core daily parlour workflow. |
| Billing & Payments Agent | invoices, invoice numbering, payment ledger, reconciliation | Handles the money discipline requirement. |
| Commission & Inventory Agent | staff commissions, stock movements, low-stock alerts | Covers two operational risk areas that are mandatory in the BRD. |
| WhatsApp Workflow Agent | templates/manual links, message logs, reminders | Implements day-1 WhatsApp workflow without unnecessary AI cost. |
| Audit & Compliance Agent | audit logs, override reasons, sensitive-note access, policy checks | Keeps the system safe and traceable. |
| Analytics Dashboard Agent | dashboard metrics, reports, owner summaries | Turns records into operational visibility. |
| Frontend UX Agent | mobile/tablet UI, flows, forms, dashboard ergonomics | Makes the app usable for Soorya and staff in real daily work. |
| Test Harness Agent | unit, integration, contract, audit, role/access tests | Ensures rewrite does not drift from BRD. |

## 2. Recommended Sequence

### Wave 1: Foundation

1. Requirements Traceability Agent
2. Data Model Agent
3. Auth/RBAC Agent
4. Test Harness Agent

Reason: the rewrite needs stable requirements, schema, access model, and test discipline before feature agents start.

### Wave 2: Core Parlour Workflow

1. Parlour Operations Agent
2. Billing & Payments Agent
3. Audit & Compliance Agent

Reason: booking, CRM, invoice, payment, and audit are the operational spine.

### Wave 3: Business Control

1. Commission & Inventory Agent
2. WhatsApp Workflow Agent
3. Analytics Dashboard Agent

Reason: these reduce leakage, improve follow-up discipline, and create owner visibility.

### Wave 4: Institute App Handoff

1. Institute App Requirements Traceability Agent
2. Institute App Data Model Agent
3. Institute App Repository Bootstrap Agent

Reason: Sooryas first training batch needs admissions, attendance, fees, assessment/certificate readiness, and batch dashboards, but those belong in a separate app, repository, and PostgreSQL database.

## 3. Suggested Agent Briefs

### Requirements Traceability Agent

Deliverables:

- requirement-to-ticket matrix;
- story-to-requirement matrix using `docs/user-stories.md`;
- acceptance criteria for each Phase 1 requirement;
- list of out-of-scope items to prevent scope creep;
- test coverage map.

Must not:

- change product direction without owner approval;
- prioritize white-label Phase 3 above Sooryas Phase 1.

### Data Model Agent

Deliverables:

- schema proposal;
- migration plan;
- seed data plan;
- entity relationship notes;
- backup and restore assumptions.

Must include:

- audit log;
- role permissions;
- invoice/payment separation;
- customer consent and sensitive notes;
- stock movements.

### Auth/RBAC Agent

Deliverables:

- Supabase Auth with Google provider design;
- invite-only approved email mapping;
- login/session design;
- roles and permissions;
- protected route/API policy;
- sensitive-note visibility rules;
- future Institute app separation boundaries.

Must include:

- `US-AUTH-04` as the production authentication story;
- no public self-registration into usable portal access;
- disabled-user and unknown-Google-account rejection;
- owner/admin/receptionist/staff/accountant/trainer roles;
- future tenant readiness without requiring Phase 3 implementation.

### Parlour Operations Agent

Deliverables:

- booking flow;
- reschedule/cancel/no-show flow;
- customer CRM;
- staff availability;
- service catalogue.

Must include:

- staff-only booking;
- booking history preservation;
- conflict prevention.

Primary story IDs:

- US-BK-01 through US-BK-04;
- US-CRM-01 through US-CRM-03;
- US-SVC-01 through US-SVC-03.

### Billing & Payments Agent

Deliverables:

- invoice creation flow;
- invoice numbering;
- line items, discounts, tax fields;
- payment ledger;
- invoice sharing hooks.

Must include:

- invoice generation separate from payment collection;
- audit trail for invoice changes;
- no invoice deletion without audit.

Primary story IDs:

- US-BILL-01 through US-BILL-05.

### Commission & Inventory Agent

Deliverables:

- commission rule engine;
- commission override workflow;
- inventory items;
- stock movements;
- low-stock alerts.

Must include:

- versioned commission rules;
- override reason;
- no ambiguous auto-deduction.

Primary story IDs:

- US-COMM-01 through US-COMM-03;
- US-INV-01 through US-INV-03.

### Institute App Handoff Agent

Deliverables:

- admissions;
- batches;
- attendance;
- trainee fees and dues;
- assessments/exams;
- certificate eligibility;
- trainee progress.

Must include:

- separate repository and separate PostgreSQL database;
- 15-student target;
- 12 paid-booking go/no-go metric.

Must not:

- add Institute code, routes, navigation, APIs, or tables to this repository.

### WhatsApp Workflow Agent

Deliverables:

- message template model;
- manual WhatsApp links or send actions;
- communication logs;
- reminder schedules;
- failure/follow-up states.

Must include:

- no AI auto-send;
- approved template discipline;
- opt-out readiness.

Primary story IDs:

- US-WA-01;
- US-WA-02.

### Audit & Compliance Agent

Deliverables:

- immutable audit event model;
- write logging;
- override logging;
- policy checks;
- high-risk action flags.

Must include:

- invoice override;
- commission override;
- certificate issue in the separate Institute app;
- sensitive notes access;
- tenant boundary hooks for later.

Current implementation note:

- Core customer, booking, invoice, payment, paid-booking completion, and commission calculation audit events are implemented and tested.
- Remaining audit work should focus on staff, service catalogue, inventory, tenant settings, role changes, commission overrides, and future stock movements.

Primary story IDs:

- US-AUD-01;
- US-AUD-02;
- US-SCOPE-01.

### Analytics Dashboard Agent

Deliverables:

- dashboard metric definitions;
- parlour reports;
- commission/inventory reports.

Must include:

- source/date range labels;
- no inferred metrics without source.

Primary story IDs:

- US-DASH-01;
- US-DASH-02;
- US-RPT-01;
- US-RPT-02.

### Frontend UX Agent

Deliverables:

- mobile/tablet navigation;
- dense but usable operational screens;
- forms for all Phase 1 workflows;
- dashboard layouts.

Must include:

- no institute admissions landing page in this repository;
- operational UI first.

Primary story IDs:

- US-AUTH-02 for role-aware navigation;
- US-SET-01 and US-SET-02 for settings and bilingual UI;
- UI acceptance criteria across every P0/P1 story.

### Test Harness Agent

Deliverables:

- unit tests;
- integration tests;
- contract tests;
- audit tests;
- role/access tests;
- failure simulation tests.

Must include:

- test-first workflow for each new business rule.

## 4. Do Not Rewrite Yet Until

Before rewriting the codebase, complete:

1. Requirements traceability matrix.
2. Phase 1 parlour data model.
3. Auth/RBAC decision.
4. Invoice/GST field decision with CA input.
5. Test harness plan.

## 5. Recommended Immediate Next Step

Start with two planning workstreams:

1. **Requirements Traceability Agent:** convert `BRD.md` into an implementation ticket map.
2. **Data Model Agent:** propose the Phase 1 schema.

These two should happen before any serious code rewrite.

# SooryasWeb Deterministic Agent / Service Workstream Spec

Version: 2.0
Date: 5 June 2026
Authority: `docs/BRD.md`
Backlog source: `docs/user-stories.md`

## 1. Purpose

This document defines the development workstreams and future service boundaries for the **SooryasWeb Parlour App in this repository**.

Phase 1 does **not** implement OpenAI API calls, LLM agents, AI chat, or automated decisioning. The word "agent" in this repo means either:

1. a coding-agent workstream used during development, or
2. a deterministic service module that follows explicit inputs, outputs, policies, and tests.

The Sooryas Institute App is separate. This repository must not implement Institute admissions, batches, attendance, trainee fee ledgers, exams, certificates, course landing pages, hidden Institute routes, or Institute database tables.

## 2. Hard Scope Boundaries

| Boundary | Rule |
|---|---|
| Parlour app | This repo owns SooryasWeb parlour operations only. |
| Institute app | Separate repository, separate PostgreSQL database, separate deployment. |
| AI cost | No LLM calls in Phase 1. Deterministic code first. |
| WhatsApp | Manual `wa.me` links only; no paid WhatsApp API assumptions. |
| Booking | Staff-managed only; no customer self-booking. |
| Customer notes | Basic operational notes only; no deep medical/diagnostic records. |
| Payments | Manual at-premises payment logging only; no online gateway. |

## 3. Shared Contract For Deterministic Services

Each service/workstream must define:

| Field | Definition |
|---|---|
| Name | Stable identifier used in docs, tests, and code ownership. |
| Story IDs | User stories from `docs/user-stories.md` owned by the workstream. |
| Inputs | API payloads, UI actions, database events, or scheduled checks. |
| Outputs | Database writes, UI state, generated links, reports, or audit events. |
| Policies | Tenant isolation, RBAC, validation, scope rules, and privacy rules. |
| Failure modes | Expected errors and safe fallback behavior. |
| Tests | Unit, integration, contract, RBAC, audit, tenant isolation, or UI tests. |

## 4. Workstream Catalog

| Workstream | Product role | Priority | Primary story IDs |
|---|---|---|---|
| Requirements Traceability | Keeps BRD, user stories, execution map, and tests aligned. | Must | US-SCOPE-01 |
| Data Model | Owns schema, migrations, seeds, tenant scope, and destructive-test guard. | Must | US-AUTH-03, US-DEP-02 |
| Auth/RBAC | Owns secure portal login, sessions, role matrix, route guards, menu permissions. | Must | US-AUTH-01, US-AUTH-02, US-AUTH-04 |
| Parlour Operations | Owns bookings, day agenda, customers, services, staff, chairs. | Must | US-BK-01..04, US-CRM-01..03, US-SVC-01..03 |
| Billing & Payments | Owns invoices, invoice numbers, payment ledger, reconciliation. | Must | US-BILL-01..05 |
| Commission & Inventory | Owns commission rules, commission records, stock catalogue, stock movements. | Should | US-COMM-01..03, US-INV-01..03 |
| WhatsApp Workflow | Owns deterministic template text and manual `wa.me` links. | Must | US-WA-01, US-WA-02 |
| Audit & Compliance | Owns audit events, override reasons, privacy limits, risky action gates. | Must | US-AUD-01, US-AUD-02 |
| Analytics Dashboard | Owns dashboard KPIs, reports, metric definitions, freshness labels. | Should | US-DASH-01, US-DASH-02, US-RPT-01, US-RPT-02 |
| Frontend UX | Owns mobile/tablet/desktop workflows, accessible forms, bilingual UI. | Must | US-SET-02 plus UI acceptance criteria across stories |
| Test Harness | Owns traceability checks, regression tests, CI/test commands. | Must | All P0/P1 stories |
| Institute App Handoff | Documents separate-app requirements only. | Must | US-SCOPE-01 |

## 5. Service Specifications

### 5.1 Requirements Traceability

| Field | Spec |
|---|---|
| Purpose | Keep implementation aligned to BRD and user stories. |
| Inputs | BRD changes, user-story backlog, execution map, test results. |
| Outputs | Story-to-requirement map, scope checks, acceptance evidence. |
| Policies | `docs/BRD.md` remains authoritative; Institute features are separate-app only. |
| Failure modes | Scope drift, outdated tests, hidden Institute assumptions. |
| Tests | Docs scan for Institute routes/API instructions in this repo; story coverage check for Phase 1 BRD items. |

### 5.2 Data Model

| Field | Spec |
|---|---|
| Purpose | Provide safe PostgreSQL structures for tenant-scoped parlour operations. |
| Inputs | Migration definitions, seed data, tenant context, schema reset requests. |
| Outputs | Tenant-aware tables, migrations, seeds, reset guard behavior. |
| Policies | Every tenant-owned table uses `tenant_id`; destructive reset requires database name ending in `_test`. |
| Failure modes | Cross-tenant leakage, schema reset against live DB, missing audit fields. |
| Tests | Tenant isolation tests; `_test` reset guard tests; migration smoke tests. |

### 5.3 Auth/RBAC

| Field | Spec |
|---|---|
| Purpose | Protect the portal through approved-account authentication and restrict actions by role. |
| Inputs | Authenticated portal user, approved portal user record, session cookie, route/API action, user role. |
| Outputs | Authenticated user context, tenant/role mapping, allowed menu items, allowed API actions. |
| Policies | Production auth uses invite-only approved Google emails; HTTP-only signed cookies; shared RBAC helper for UI and API; no client-side-only authorization; no public self-registration into usable access. |
| Failure modes | Role bypass, unauthorized Google account access, email mismatch, weak session, stale menu permissions. |
| Tests | Approved-user login tests; disabled-user tests; login tests; role matrix tests; forbidden API tests; menu visibility tests. |

### 5.4 Parlour Operations

| Field | Spec |
|---|---|
| Purpose | Run staff-managed daily parlour appointments and CRM. |
| Inputs | Booking forms, customer profiles, service catalogue, staff/chair availability. |
| Outputs | Bookings, status changes, customer records, agenda views, audit events. |
| Policies | No customer self-booking; staff and chair conflict checks; basic CRM notes only. |
| Failure modes | Double booking, incomplete profile, privacy leak, invalid status transition. |
| Tests | Booking create/edit/reschedule/cancel/no-show tests; conflict tests; CRM consent tests. |

### 5.5 Billing & Payments

| Field | Spec |
|---|---|
| Purpose | Create invoices and reconcile manual at-premises payments. |
| Inputs | Completed services, invoice line items, tax settings, payment records. |
| Outputs | Invoice, invoice number, payment ledger entry, balance due, print/share view. |
| Policies | Invoice generation and payment collection are separate; status is derived from payment sum; sequence must be race-safe. |
| Failure modes | Duplicate invoice, overpayment, paid status without full payment, missing invoice. |
| Tests | Invoice creation; parallel invoice numbering; partial/full payment; reconciliation tests. |

### 5.6 Commission & Inventory

| Field | Spec |
|---|---|
| Purpose | Track payout rules and stock movement without silent changes. |
| Inputs | Paid completed services, commission rules, stock updates, service-consumable mappings. |
| Outputs | Commission records, payout summaries, stock movements, low-stock alerts. |
| Policies | Commission rules are versioned; overrides require reason; ambiguous stock deductions are blocked. |
| Failure modes | Double-counted commission, missing override audit, negative stock, duplicate deduction. |
| Tests | Commission calculations; override audit tests; stock movement tests; low-stock alert tests. |

### 5.7 WhatsApp Workflow

| Field | Spec |
|---|---|
| Purpose | Generate manual WhatsApp links for bookings and invoices. |
| Inputs | Booking or invoice context, customer phone, message template type. |
| Outputs | URL-encoded `wa.me` link, optional message-intent log. |
| Policies | Manual user action only; no paid API; no claimed delivery status. |
| Failure modes | Wrong phone, malformed URL, duplicate intent log, template drift. |
| Tests | Template tests; URL encoding tests; log wording tests. |

### 5.8 Audit & Compliance

| Field | Spec |
|---|---|
| Purpose | Preserve traceability and enforce high-risk action rules. |
| Inputs | Business writes, override requests, role changes, tenant-setting updates. |
| Outputs | Immutable audit events, validation errors, review flags. |
| Policies | Every important write has an audit event or documented exception; overrides require reason. |
| Failure modes | Missing audit log, false confidence, unauthorized override, privacy boundary breach. |
| Tests | Audit coverage tests for booking, CRM, invoice, payment, inventory, commission, role, and tenant-setting writes. |

### 5.9 Analytics Dashboard

| Field | Spec |
|---|---|
| Purpose | Provide daily readiness, sales, payment, staff, repeat-customer, and inventory insight. |
| Inputs | Booking, invoice, payment, customer, staff, commission, and inventory data. |
| Outputs | Dashboard KPIs, alerts, reports, metric definitions, freshness labels. |
| Policies | Tenant-scoped data only; no Institute metrics; no vanity marketing metrics in Phase 1. |
| Failure modes | Stale data, wrong aggregation, mixed tenant data, misleading metric. |
| Tests | KPI calculation tests; date-range report tests; dashboard rendering tests. |

### 5.10 Frontend UX

| Field | Spec |
|---|---|
| Purpose | Make the portal usable on phone, tablet, and desktop during a busy parlour day. |
| Inputs | User role, current workflow, form state, validation errors, language preference. |
| Outputs | Role-aware navigation, operational screens, forms, status labels, bilingual UI. |
| Policies | Internal operations console, not public landing page; accessible controls; English/Malayalam dictionary after labels stabilize. |
| Failure modes | Missing menu, cramped mobile forms, color-only states, Malayalam mojibake. |
| Tests | Responsive QA; accessibility checks; Malayalam UTF-8 regression; menu visibility tests. |

### 5.11 Test Harness

| Field | Spec |
|---|---|
| Purpose | Prove implementation stays aligned to BRD and stories. |
| Inputs | User stories, service contracts, API routes, UI screens, migrations. |
| Outputs | Unit, integration, contract, role, tenant, audit, and UI regression tests. |
| Policies | P0 stories require automated acceptance evidence before production data. |
| Failure modes | Uncovered business rule, fragile test DB, docs/code drift. |
| Tests | Story traceability check; Phase 1 regression suite; build/typecheck where applicable. |

### 5.12 Institute App Handoff

| Field | Spec |
|---|---|
| Purpose | Keep Institute requirements visible without implementing them in this repo. |
| Inputs | BRD Institute section, owner decisions, separate-app planning notes. |
| Outputs | Separate repository backlog/bootstrap checklist only. |
| Policies | No Institute code, routes, navigation, APIs, hidden modules, or database tables in SooryasWeb. |
| Failure modes | Hidden Institute scope returning to parlour portal. |
| Tests | Docs and route scan; navigation QA; dependency review. |

## 6. Minimal Build Set

Build these first before deeper UI redesign:

1. Requirements Traceability
2. Data Model
3. Auth/RBAC
4. Test Harness
5. Parlour Operations
6. Billing & Payments
7. Audit & Compliance

This sequence matches the current priority: **Foundation + Backend Parity first, then daily workflows, then deeper UX polish.**

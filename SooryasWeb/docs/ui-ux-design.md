# SooryasWeb UI/UX Design Proposal

Version: 1.0  
Date: 4 June 2026  
Scope: Phase 1 Sooryas Parlour App internal readiness

## 1. Product Positioning

SooryasWeb should feel like an internal parlour operations console: fast, clear, staff-managed, and reliable during a busy service day. The first release is not a public booking website, not the Sooryas Institute app, and not an AI-first assistant. Its job is to help Soorya's team manage appointments, customers, invoices, payments, commissions, inventory, WhatsApp follow-ups, and daily readiness from one browser-based workspace.

The current app shell already has the right broad structure: login, sidebar navigation, top bar, dashboard, bookings, CRM, billing, staff, inventory, language toggle, and manual WhatsApp links. The next UX step is to tighten these screens into role-aware daily workflows with stronger information hierarchy, better mobile ergonomics, and clearer operational states.

## 2. Navigation Structure

Primary navigation should remain compact and operations-led:

1. **Dashboard**: owner and manager readiness view for today.
2. **Bookings**: staff-managed appointment creation, schedule board, conflict warnings, status updates, WhatsApp confirmation links.
3. **Customers**: CRM profile, contact details, tags, consent status, basic notes, service history.
4. **Invoices & Payments**: invoice creation, invoice history, payment logging, partial payment status, WhatsApp invoice link.
5. **Staff & Commissions**: staff profiles, availability, role, commission rules, commission summaries, override audit state.
6. **Inventory**: product and consumable catalogue, stock levels, reorder alerts, stock adjustments.
7. **Settings**: tenant profile, GST configuration, chairs/stations, services catalogue, roles, language preference. This can be added after core CRUD screens are stable.

Keep the Institute app out of navigation. Do not add admissions, batches, trainee fees, attendance, assessments, certificates, or public landing pages to this repo.

## 3. Screen Inventory

### Login

- Production login should show brand, tenant context, and one primary "Continue with Google" action for invited users.
- Any username/password fields should be visually secondary and clearly labelled as local or break-glass fallback only.
- Keep error messages plain and local to the form, including unauthorized Google email, disabled user, callback failure, and local fallback failures.
- Avoid marketing language; staff need speed and confidence.

### Dashboard

Use the dashboard as a daily command center, not a generic analytics page.

Recommended sections:

- **Today KPI strip**: today's bookings, expected revenue, collected payments, pending invoices, low-stock count.
- **Today's schedule**: time, customer, service, staff, chair, status, quick actions.
- **Operational alerts**: double-booking attempts blocked, pending consent, unpaid invoices, low stock.
- **Owner snapshot**: weekly sales, repeat customer count, staff productivity, commission payable.

### Bookings

- Support quick appointment creation with customer, service, staff, chair, date, time, source, and notes.
- Show conflict feedback before save where possible; if server-side validation blocks a booking, explain whether the staff member, chair, or both are unavailable.
- Use status chips for pending, confirmed, completed, cancelled, and no-show.
- Put manual WhatsApp confirmation links beside confirmed bookings.
- Add a day agenda first; a full calendar grid can come after the simple board is reliable.

### Customers

- Prioritize name, phone, consent status, tags, preferences, and basic notes.
- Keep notes operational: preferences, allergies mentioned by customer, service comfort notes, communication preferences.
- Provide service history and invoice history in the profile view.
- Do not collect deep medical, diagnostic skin, or detailed hair-health history in Phase 1.

### Invoices & Payments

- Treat invoice generation and payment logging as related but separate steps.
- Show invoice number, customer, services, subtotal, discounts, optional GST/tax, grand total, paid amount, balance, and status.
- Payment logging should capture amount, mode, reference number, and date.
- Support partial payment states visually: unpaid, partial, paid.
- WhatsApp invoice sharing should remain a manual link.

### Staff & Commissions

- Show staff name, role, active status, phone, availability, and commission rule.
- Commission summaries should be grouped by date range and staff member.
- Manual overrides need an explicit reason field and visible audit marker.
- Staff users should see only assigned bookings and permitted customer notes.

### Inventory

- Separate retail products from consumables/backbar stock.
- Show current stock, reorder level, vendor, last adjustment, and low-stock badge.
- Use low-stock alerts on dashboard and inventory list.
- Stock deduction on service completion should be visible and reversible only through an audited adjustment.

### Settings

- Tenant profile: name, address, logo, phone, optional GSTIN.
- Service catalogue: service name, duration, price, tax class, active status.
- Chairs/stations: active station list used by booking conflict checks.
- User roles and permissions.
- Language preference and default locale.

## 4. Mobile and Tablet Layout Guidance

Mobile is likely to be used at reception or by staff between services. Prioritize quick scanning and short actions.

- Convert the sidebar into a bottom or top tab pattern on phones; keep no more than six primary destinations visible.
- Use single-column forms on mobile. Avoid side-by-side date/time or amount/reference fields below 640px.
- Keep list cards compact: customer/service first, then time, staff, chair, and status.
- Make primary actions full width in forms and at least 44px high.
- Put destructive or audit-sensitive actions behind confirmation.
- Keep WhatsApp links visually distinct but secondary to core save/complete/payment actions.

Tablet layout should support reception-desk work:

- Use a two-pane layout where useful: form on the left, list or schedule on the right.
- Keep the day schedule visible while creating or editing bookings.
- Use sticky headers for date, filters, and primary actions.
- Avoid modal-heavy workflows on tablet; side panels are easier to review and correct.

Desktop can keep the current sidebar and two-column work grids, but reduce decorative motion and glass effects where they compete with dense operational data.

## 5. Form Ergonomics

- Put required fields before optional fields.
- Use defaults: today's date, current business day, common payment mode, default chair only when safe.
- Use input masks or examples for Indian phone numbers and payment references.
- Use searchable selects for customers, services, and staff once lists grow.
- Preserve partially entered form data when validation fails.
- Show inline validation next to the field, plus a short toast for save results.
- Clearly label optional GST fields as optional.
- Use plain operational labels: "Book appointment", "Generate invoice", "Log payment", "Mark completed".
- For invoice flows, show a live total summary before save.
- For commission overrides, require reason before enabling save.

## 6. Dashboard KPIs

Phase 1 dashboard KPIs should answer: "Are we ready for today, and what needs attention?"

Recommended KPI set:

- Today's bookings count.
- Today's expected revenue from scheduled/completed services.
- Today's collected payments.
- Pending invoice amount.
- Low-stock items count.
- Repeat customers this week.
- Staff utilization today.
- Commission payable for selected date range.
- No-show/cancellation count.
- Pending consent count.

Avoid vanity metrics in Phase 1. Marketing ROI, customer acquisition funnels, course enrolment metrics, certificate readiness, and AI summary cards belong outside this app or later phases.

## 7. Visual System

The current premium dark palette can stay, but it should be tuned for long operational use.

- **Base**: dark neutral surfaces with enough contrast for lists and forms.
- **Brand**: Sooryas burgundy as the main accent, used for active navigation and primary actions.
- **Support accents**: warm coral for warnings, green only for WhatsApp/success, red only for destructive or overdue states.
- **Surfaces**: use restrained panels with 8px or smaller radius for dense work areas; avoid overly soft card styling in operational screens.
- **Typography**: keep display font for page titles and navigation; use a highly legible body font for tables, forms, and lists.
- **Icons**: replace emoji-style icons with consistent UI icons when the app moves beyond prototype quality.
- **Density**: staff tools should be compact, scannable, and calm. Avoid large hero-like headings inside work screens.

State colors must not be the only way status is conveyed. Pair color with labels such as "Paid", "Partial", "Low stock", "Consent pending", or "Conflict".

## 8. Accessibility

- Maintain keyboard access for navigation, forms, dialogs, and payment logging.
- Use visible focus states with strong contrast.
- Ensure text contrast meets WCAG AA, especially muted labels on dark surfaces.
- Make touch targets at least 44px on mobile.
- Use `aria-live` for toast/status updates without interrupting form entry.
- Dialogs should trap focus, close via Escape, and return focus to the triggering button.
- Do not rely on emoji as the only accessible label for actions.
- Error messages should be specific and programmatically associated with fields where possible.
- Tables and schedule boards need meaningful headings, labels, and empty states.

## 9. Bilingual UI Guidance

The app should support English and Malayalam UI labels without duplicating data fields.

- Keep one Unicode field for customer names, notes, services, and other user-entered text.
- Translate navigation, labels, buttons, statuses, empty states, validation messages, and toasts.
- Test Malayalam strings for wrapping; Malayalam labels may need more vertical space.
- Avoid abbreviations that do not translate cleanly.
- Store the user's language preference per session first, then per user when profiles mature.
- Do not translate invoice numbers, phone numbers, GSTIN, currency values, dates, or payment references.
- Use locale-aware date and currency formatting while keeping financial records stable.

The current translation strings appear visually corrupted in source display, so the implementation should verify UTF-8 handling end to end before relying on Malayalam production copy.

## 10. What to Avoid

- No customer self-booking in Phase 1.
- No Institute screens, admissions workflows, student fee ledgers, attendance, assessments, certificates, or public course landing pages in this repo.
- No AI-heavy UX, AI chat panels, generated recommendations, or automated decisioning in Phase 1.
- No paid WhatsApp Business API assumptions; keep manual `wa.me` links.
- No deep medical/skin/hair diagnostic records until legal policy review.
- No decorative landing page as the first authenticated experience.
- No marketing dashboard creep before core operations are reliable.
- No custom invoice layout builder in Phase 1.
- No hidden conflict resolution; staff and chair booking conflicts must be clear.
- No color-only status communication.

## 11. Recommended UX Build Order

1. Stabilize the authenticated app shell, role-aware navigation, and bilingual label system.
2. Tighten dashboard readiness KPIs and operational alerts.
3. Improve booking creation, day agenda, conflict messages, and WhatsApp confirmation links.
4. Expand customer CRM profile with consent and basic history.
5. Harden invoice and payment states, including partial payments and WhatsApp invoice links.
6. Add commission summaries and audited override UX.
7. Improve inventory catalogue, low-stock alerts, and stock adjustment audit visibility.
8. Add settings for tenant profile, services, GST configuration, chairs/stations, and language defaults.

This sequence keeps Phase 1 focused on internal readiness and gives the team usable operational value before broadening into white-label tenant polish.

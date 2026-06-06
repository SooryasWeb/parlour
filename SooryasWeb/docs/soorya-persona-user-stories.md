# Soorya Persona User Stories

Version: 1.0
Date: 5 June 2026
Perspective: Soorya, proprietor of Soorya's Skin Hair and Makeup
Scope: SooryasWeb Parlour App only

## 1. Persona

I am Soorya. I run a working ladies beauty parlour at Kumarapuram, Thiruvananthapuram. My day is not spent sitting calmly in front of a computer. I move between customers, staff, phone calls, WhatsApp messages, payments, products, and decisions.

I need the app to feel like a dependable assistant at the reception desk and in my hand, not like a complicated software system. It should help me know what is happening today, what needs my attention, who owes money, which staff member is assigned where, what stock is low, and whether the business is becoming more disciplined.

The app should protect my customer relationships, my cash discipline, my staff trust, and my time.

## 2. What I Need The App To Do For Me

### SOO-01: Start My Day With Confidence

As Soorya, I want to open the dashboard in the morning and immediately see today's appointments, expected revenue, pending payments, low-stock items, and any customer consent gaps so that I know whether the parlour is ready for the day.

Acceptance signals:

- I can understand today's workload within 30 seconds.
- I can see which bookings need attention before the customer arrives.
- I do not have to ask staff separately for basic schedule status.

Related canonical stories: US-DASH-01, US-DASH-02, US-BK-04, US-INV-03.

### SOO-02: Avoid Embarrassing Double Bookings

As Soorya, I want the app to stop my team from booking the same staff member or chair for overlapping times so that customers do not arrive into confusion.

Acceptance signals:

- The app clearly says whether the staff member or chair is unavailable.
- Reception can quickly choose another slot without re-entering everything.
- Conflict prevention works even when two people try to save close together.

Related canonical stories: US-BK-02, US-SVC-03.

### SOO-03: Know Who Is Coming And Why

As Soorya, I want each appointment to show customer name, phone, service, staff, chair, source, and notes so that I can quickly understand the customer context.

Acceptance signals:

- Walk-in, phone, WhatsApp, Instagram, and referral sources are visible.
- Staff can see the permitted service notes before the appointment.
- Notes stay practical and do not become risky medical records.

Related canonical stories: US-BK-01, US-BK-04, US-CRM-01, US-AUD-02.

### SOO-04: Preserve Customer Memory Without Depending On My Memory

As Soorya, I want customer profiles to remember preferences, basic notes, consent status, past services, and previous staff assignments so that repeat customers feel recognized.

Acceptance signals:

- I can search a customer by name or phone.
- I can see prior visits and service history.
- I can store simple preferences without creating deep medical or diagnostic records.

Related canonical stories: US-CRM-01, US-CRM-02, US-CRM-03.

### SOO-05: Make Billing Non-Negotiable

As Soorya, I want every completed billable service to have an invoice so that money does not disappear between service completion and payment.

Acceptance signals:

- Completed services without invoices are visible as alerts.
- Invoice totals are clear before saving.
- Discounts and optional GST/tax are shown transparently.

Related canonical stories: US-BILL-01, US-BILL-02, US-DASH-02.

### SOO-06: Separate Service, Invoice, And Payment Truth

As Soorya, I want the app to treat service completion, invoice creation, and payment collection as separate events so that partial payments and pending balances are not hidden.

Acceptance signals:

- I can see unpaid, partial, and paid status.
- The app calculates balance due from actual payment entries.
- Nobody can mark an invoice paid unless the payment total covers it.

Related canonical stories: US-BILL-03, US-BILL-04, US-AUD-01.

### SOO-07: Handle UPI, Cash, And Card Payments Without Overcomplication

As Soorya, I want staff to record UPI, cash, and card payments with amount, date, and reference so that daily collection can be reviewed later.

Acceptance signals:

- Payment entry is quick on mobile or tablet.
- UPI reference can be entered when available.
- Cash payments are clearly distinguishable from UPI/card.

Related canonical stories: US-BILL-03, US-RPT-01.

### SOO-08: Share Booking And Invoice Details Through WhatsApp

As Soorya, I want one-tap WhatsApp links for booking confirmations and invoice summaries so that customers receive clear information without paying for WhatsApp API automation.

Acceptance signals:

- The app opens WhatsApp with a pre-filled message.
- The customer phone number and message are correct.
- The app does not pretend the message was delivered unless a human actually sends it.

Related canonical stories: US-WA-01, US-WA-02, US-BILL-05.

### SOO-09: Keep Staff Commissions Transparent

As Soorya, I want commission rules and payout summaries to be clear so that staff trust the calculation and I can handle exceptions fairly.

Acceptance signals:

- Staff commission is linked to completed paid services.
- Manual overrides require a reason.
- I can review commission payable by staff and date range.

Related canonical stories: US-COMM-01, US-COMM-02, US-COMM-03.

### SOO-10: Know When Products Are Running Low

As Soorya, I want low-stock alerts for retail products and consumables so that service quality is not affected by missing stock.

Acceptance signals:

- Dashboard shows low-stock count.
- Inventory page shows item, quantity, reorder level, and vendor.
- Manual stock adjustments require a reason.

Related canonical stories: US-INV-01, US-INV-02, US-INV-03.

### SOO-11: See The Business Without Becoming An Accountant

As Soorya, I want simple daily, weekly, and monthly reports for sales, collections, pending invoices, repeat customers, staff productivity, and commission payable so that I can make decisions without spreadsheet work.

Acceptance signals:

- Reports explain what date range they cover.
- Sales and collected payments are not mixed up.
- I can see useful trends without marketing vanity metrics.

Related canonical stories: US-RPT-01, US-RPT-02, US-DASH-01.

### SOO-12: Use The App Comfortably In Malayalam-Friendly Workflows

As Soorya, I want the app to support English and Malayalam labels so that staff who are more comfortable in Malayalam can use it confidently.

Acceptance signals:

- Malayalam text is not corrupted.
- Labels fit on mobile screens.
- Customer-entered names and notes can be stored in either script.

Related canonical stories: US-SET-02.

### SOO-13: Trust That Staff See Only What They Need

As Soorya, I want staff, receptionist, accountant, and manager access to be separated so that customer details and business finance are not exposed unnecessarily.

Acceptance signals:

- Staff see assigned work and permitted notes.
- Accountant can view billing and payment records without changing parlour operations.
- Restricted actions are blocked by the server, not only hidden in the menu.

Related canonical stories: US-AUTH-01, US-AUTH-02, US-AUTH-03.

### SOO-14: Know Who Changed What

As Soorya, I want important changes to appointments, customers, invoices, payments, inventory, staff rules, and commissions to be audited so that mistakes or disputes can be traced calmly.

Acceptance signals:

- Audit logs show actor, action, tenant, entity, time, and useful details.
- Payment and invoice changes are traceable.
- Commission and stock overrides cannot happen silently.

Related canonical stories: US-AUD-01, US-COMM-03, US-INV-02.

### SOO-15: Keep Institute Work Separate From Parlour Work

As Soorya, I want the parlour app to stay focused on parlour operations so that student admissions, fees, attendance, exams, and certificates do not clutter daily parlour work.

Acceptance signals:

- No Institute screens appear in the parlour menu.
- Institute data is planned in a separate app and database.
- The parlour dashboard shows parlour readiness only.

Related canonical stories: US-SCOPE-01.

### SOO-16: Use It On A Busy Day Without Feeling Trapped

As Soorya, I want the app to work well on phone, tablet, and desktop so that I can use it at reception, during a customer gap, or after closing.

Acceptance signals:

- Common actions are reachable in one or two taps.
- Forms are not cramped on mobile.
- If validation fails, entered data is not lost.

Related canonical stories: US-BK-04, US-SET-02, UI acceptance criteria across P0/P1 stories.

## 3. Product Design Implications

These stories imply a few product principles:

- The first screen after login should be a working dashboard, not a landing page.
- Booking, billing, and payment flows should be faster than paper, not merely more "digital."
- Status labels must be plain: confirmed, completed, unpaid, partial, paid, low stock, consent pending.
- The system should protect Soorya from silent mistakes: double bookings, unpaid invoices, hidden stock changes, commission disputes, and cross-tenant leakage.
- Malayalam support is an adoption feature, but operational reliability is the moat.

## 4. Build Priority From Soorya's Point Of View

1. Login, role-aware menu, and dashboard.
2. Booking creation, day agenda, and conflict prevention.
3. Customer profile, consent, and service history.
4. Invoice generation and payment ledger.
5. WhatsApp booking and invoice links.
6. Staff commission visibility.
7. Inventory and low-stock alerts.
8. Reports and Malayalam UI polish.

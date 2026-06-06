import type { SessionUser } from '@/src/server/auth';

type AppointmentSummary = {
  id: string;
  customer_name: string | null;
  service_name: string | null;
  staff_name: string | null;
  chair_id: string;
  start_time: string;
  end_time: string;
  status: string;
};

type InvoiceSummary = {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  grand_total: string;
  status: string;
};

type InventorySummary = {
  name: string;
  stock_quantity: number;
  reorder_level: number;
};

export type OperationalSnapshot = {
  todayAppointments: number;
  todayRevenue: number;
  customers: number;
  pendingInvoices: number;
  lowStockItems: InventorySummary[];
  appointments: AppointmentSummary[];
  invoices: InvoiceSummary[];
  inventory: InventorySummary[];
};

const menu = [
  { label: 'Dashboard', href: '#dashboard', roles: ['admin', 'manager', 'receptionist', 'beautician', 'accountant'] },
  { label: 'Bookings', href: '#bookings', roles: ['admin', 'manager', 'receptionist', 'beautician'] },
  { label: 'Customers', href: '#customers', roles: ['admin', 'manager', 'receptionist', 'beautician'] },
  { label: 'Billing', href: '#billing', roles: ['admin', 'manager', 'receptionist', 'accountant'] },
  { label: 'Staff', href: '#staff', roles: ['admin', 'manager'] },
  { label: 'Inventory', href: '#inventory', roles: ['admin', 'manager', 'beautician'] },
  { label: 'Settings', href: '#settings', roles: ['admin', 'manager'] },
];

export function AppShell({
  session,
  snapshot,
  logoutAction,
}: {
  session: SessionUser;
  snapshot: OperationalSnapshot;
  logoutAction: () => void;
}) {
  const visibleMenu = menu.filter((item) => item.roles.includes(session.role));

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-[var(--border)] bg-[var(--surface)] px-4 py-5 lg:block">
          <BrandBlock session={session} />
          <nav aria-label="Primary" className="mt-7 space-y-1">
            {visibleMenu.map((item) => (
              <a className="menu-link" href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <section>
          <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[rgba(22,19,18,0.94)] px-4 py-4 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">role-aware operations console</p>
                <h1 className="mt-1 text-xl font-semibold md:text-2xl">Today at {session.tenantName}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--muted)]">
                  {session.username} · {session.role}
                </div>
                <form action={logoutAction}>
                  <button className="secondary-action" type="submit">
                    Log out
                  </button>
                </form>
              </div>
            </div>
            <nav aria-label="Mobile primary" className="mobile-menu mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {visibleMenu.map((item) => (
                <a className="mobile-menu-link" href={item.href} key={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          </header>

          <div className="space-y-6 px-4 py-5 md:px-6">
            <section id="dashboard" className="scroll-mt-28">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Metric label="Bookings Today" value={snapshot.todayAppointments} />
                <Metric label="Collected Today" value={`Rs. ${snapshot.todayRevenue.toLocaleString('en-IN')}`} />
                <Metric label="Customers" value={snapshot.customers} />
                <Metric label="Pending Invoices" value={snapshot.pendingInvoices} />
                <Metric label="Low Stock" value={snapshot.lowStockItems.length} tone={snapshot.lowStockItems.length ? 'warn' : 'normal'} />
              </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel id="bookings" title="Bookings" subtitle="Day agenda and service readiness">
                <div className="space-y-2">
                  {snapshot.appointments.length ? (
                    snapshot.appointments.map((item) => (
                      <div className="dense-row" key={item.id}>
                        <div>
                          <p className="font-medium">{item.customer_name || 'Walk-in customer'}</p>
                          <p className="text-sm text-[var(--muted)]">
                            {item.service_name || 'Service'} · {item.staff_name || 'Unassigned'} · {item.chair_id}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p>{item.start_time}-{item.end_time}</p>
                          <Status value={item.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No bookings are visible for this account yet." />
                  )}
                </div>
              </Panel>

              <Panel id="customers" title="Customers" subtitle="CRM health and consent discipline">
                <div className="space-y-3">
                  <ReadinessLine label="Total customer records" value={snapshot.customers.toString()} />
                  <ReadinessLine label="Visible menu for this role" value={visibleMenu.map((item) => item.label).join(', ')} />
                  <ReadinessLine label="Current scope" value="Parlour app only" />
                </div>
              </Panel>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <Panel id="billing" title="Billing" subtitle="Invoices, partial payments, and WhatsApp sharing">
                <div className="space-y-2">
                  {snapshot.invoices.length ? (
                    snapshot.invoices.map((invoice) => (
                      <div className="dense-row" key={invoice.id}>
                        <div>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-sm text-[var(--muted)]">{invoice.customer_name || 'Customer'}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>Rs. {Number(invoice.grand_total).toLocaleString('en-IN')}</p>
                          <Status value={invoice.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="No invoice records yet." />
                  )}
                </div>
              </Panel>

              <Panel id="inventory" title="Inventory" subtitle="Low-stock watchlist and retail/consumable readiness">
                <div className="space-y-2">
                  {snapshot.inventory.length ? (
                    snapshot.inventory.map((item) => (
                      <div className="dense-row" key={item.name}>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-[var(--muted)]">Reorder at {item.reorder_level}</p>
                        </div>
                        <span className={item.stock_quantity <= item.reorder_level ? 'badge-warn' : 'badge'}>
                          {item.stock_quantity} left
                        </span>
                      </div>
                    ))
                  ) : (
                    <EmptyState text="Inventory records will appear here." />
                  )}
                </div>
              </Panel>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
              <Panel id="staff" title="Staff" subtitle="Commission summaries and role access">
                <div className="space-y-3">
                  <ReadinessLine label="Current user role" value={session.role} />
                  <ReadinessLine label="Commission trigger" value="Paid invoice linked to booking" />
                  <ReadinessLine label="Override policy" value="Requires audit reason in next phase" />
                </div>
              </Panel>

              <Panel id="settings" title="Settings" subtitle="Tenant, services, chairs, tax, and language defaults">
                <div className="space-y-3">
                  <ReadinessLine label="Tenant" value={session.tenantName} />
                  <ReadinessLine label="Hosting target" value="Vercel + Supabase" />
                  <ReadinessLine label="Institute app" value="Separate repo and database" />
                </div>
              </Panel>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandBlock({ session }: { session: SessionUser }) {
  return (
    <div>
      <div className="brand-mark" aria-hidden="true">S</div>
      <p className="mt-4 text-sm text-[var(--muted)]">SooryasWeb</p>
      <h2 className="mt-1 text-lg font-semibold leading-6">Parlour Operations</h2>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{session.tenantName}</p>
    </div>
  );
}

function Metric({ label, value, tone = 'normal' }: { label: string; value: string | number; tone?: 'normal' | 'warn' }) {
  return (
    <div className={tone === 'warn' ? 'metric metric-warn' : 'metric'}>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ id, title, subtitle, children }: { id: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="panel scroll-mt-32" id={id}>
      <div className="mb-4 border-b border-[var(--border)] pb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Status({ value }: { value: string }) {
  const normalized = value.replace('_', ' ');
  return <span className={value === 'paid' || value === 'completed' ? 'badge-ok' : value === 'partially_paid' ? 'badge-warn' : 'badge'}>{normalized}</span>;
}

function ReadinessLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-b-0">
      <span className="text-sm text-[var(--muted)]">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">{text}</p>;
}

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { verifySessionCookie } from '@/src/server/auth';
import { query } from '@/src/server/db';
import { AppShell, type OperationalSnapshot } from './ui/app-shell';
import { LoginForm } from './ui/login-form';

async function getOperationalSnapshot(tenantId: string): Promise<OperationalSnapshot> {
  const [todayRes, revRes, custRes, pendingInvoicesRes, lowStockRes, appointmentsRes, invoicesRes, inventoryRes] = await Promise.all([
    query('SELECT COUNT(*)::integer as count FROM bookings WHERE tenant_id = $1 AND date = CURRENT_DATE AND status != $2', [
      tenantId,
      'cancelled',
    ]),
    query("SELECT COALESCE(SUM(grand_total), 0)::numeric as total FROM invoices WHERE tenant_id = $1 AND status = 'paid' AND DATE(created_at) = CURRENT_DATE", [
      tenantId,
    ]),
    query('SELECT COUNT(*)::integer as count FROM customers WHERE tenant_id = $1', [tenantId]),
    query("SELECT COUNT(*)::integer as count FROM invoices WHERE tenant_id = $1 AND status != 'paid'", [tenantId]),
    query('SELECT name, stock_quantity, reorder_level FROM inventory_items WHERE tenant_id = $1 AND stock_quantity <= reorder_level', [
      tenantId,
    ]),
    query(
      `SELECT b.id, c.name as customer_name, s.name as staff_name, sv.name as service_name, b.chair_id, b.start_time, b.end_time, b.status
       FROM bookings b
       LEFT JOIN customers c ON b.customer_id = c.id
       LEFT JOIN staff s ON b.staff_id = s.id
       LEFT JOIN services sv ON b.service_id = sv.id
       WHERE b.tenant_id = $1 AND b.date = CURRENT_DATE
       ORDER BY b.start_time ASC
       LIMIT 8`,
      [tenantId]
    ),
    query(
      `SELECT i.id, i.invoice_number, c.name as customer_name, i.grand_total, i.status
       FROM invoices i
       LEFT JOIN customers c ON i.customer_id = c.id
       WHERE i.tenant_id = $1
       ORDER BY i.created_at DESC
       LIMIT 6`,
      [tenantId]
    ),
    query(
      `SELECT name, stock_quantity, reorder_level
       FROM inventory_items
       WHERE tenant_id = $1
       ORDER BY stock_quantity ASC, name ASC
       LIMIT 8`,
      [tenantId]
    ),
  ]);

  return {
    todayAppointments: todayRes.rows[0].count as number,
    todayRevenue: Number.parseFloat(revRes.rows[0].total),
    customers: custRes.rows[0].count as number,
    pendingInvoices: pendingInvoicesRes.rows[0].count as number,
    lowStockItems: lowStockRes.rows as Array<{ name: string; stock_quantity: number; reorder_level: number }>,
    appointments: appointmentsRes.rows as OperationalSnapshot['appointments'],
    invoices: invoicesRes.rows as OperationalSnapshot['invoices'],
    inventory: inventoryRes.rows as OperationalSnapshot['inventory'],
  };
}

export default async function Home() {
  const cookieStore = await cookies();
  const session = verifySessionCookie(cookieStore.get('session_token')?.value);

  if (!session) {
    return <LoginForm />;
  }

  const snapshot = await getOperationalSnapshot(session.tenantId);

  async function logout() {
    'use server';
    const store = await cookies();
    store.delete('session_token');
    redirect('/');
  }

  return <AppShell logoutAction={logout} session={session} snapshot={snapshot} />;
}

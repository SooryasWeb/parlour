const state = {
  user: null,
  dashboard: {},
  customers: [],
  appointments: [],
  staff: [],
  services: [],
  invoices: [],
  inventory: [],
  currentLang: 'en',
};

const translations = {
  ml: {
    'page-title': 'ഡാഷ്‌ബോർഡ്',
    'top-eyebrow': 'കുമരപുരം, തിരുവനന്തപുരം',
    'sidebar-brand-sub': 'പാർലർ ഒഎസ്',
    'nav-text-dashboard': 'ഡാഷ്‌ബോർഡ്',
    'nav-text-bookings': 'ബുക്കിംഗുകൾ',
    'nav-text-customers': 'സിആർഎം',
    'nav-text-billing': 'ഇൻവോയ്സും ബില്ലിംഗും',
    'nav-text-staff': 'സ്റ്റാഫും കമ്മീഷനും',
    'nav-text-inventory': 'ഇൻവെന്ററി',
    'logout-text': 'ലോഗ് ഔട്ട്',
    'kpi-lbl-bookings': 'ഇന്നത്തെ ബുക്കിംഗുകൾ',
    'kpi-lbl-revenue': 'ഇന്നത്തെ വരുമാനം',
    'kpi-lbl-customers': 'രജിസ്റ്റർ ചെയ്ത ക്ലയന്റുകൾ',
    'dash-inventory-alerts-title': 'കുറഞ്ഞ സ്റ്റോക്ക് മുന്നറിയിപ്പുകൾ',
    'dash-schedule-title': 'ഇന്നത്തെ ഷെഡ്യൂൾ',
    'form-booking-title': 'പുതിയ ബുക്കിംഗ്',
    'bookings-board-title': 'അപ്പോയിന്റ്മെന്റ് ബോർഡ്',
    'form-customer-title': 'കസ്റ്റമറെ ചേർക്കുക',
    'customers-list-title': 'ക്ലയന്റ് റെക്കോർഡുകൾ',
    'form-invoice-title': 'ബിൽ തയ്യാറാക്കുക',
    'invoices-board-title': 'ഇൻവോയ്സ് ചരിത്രം',
    'form-staff-title': 'സ്റ്റാഫിനെ ചേർക്കുക',
    'staff-commissions-title': 'കമ്മീഷൻ ലെഡ്ജർ',
    'form-inventory-title': 'സാധനങ്ങൾ സ്റ്റോക്കിൽ ചേർക്കുക',
    'inventory-stock-title': 'സ്റ്റോക്ക് കാറ്റലോഗ്',
    'btn-save-booking': 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക',
    'btn-save-customer': 'സേവ് ചെയ്യുക',
    'btn-generate-invoice': 'ബിൽ ജനറേറ്റ് ചെയ്യുക',
    'btn-save-staff': 'സ്റ്റാഫിനെ ചേർക്കുക',
    'btn-save-inventory': 'സ്റ്റോക്ക് ചേർക്കുക',
  },
  en: {
    'page-title': 'Dashboard',
    'top-eyebrow': 'Kumarapuram, Thiruvananthapuram',
    'sidebar-brand-sub': 'Parlour OS',
    'nav-text-dashboard': 'Dashboard',
    'nav-text-bookings': 'Bookings',
    'nav-text-customers': 'Customers CRM',
    'nav-text-billing': 'Invoices & Billing',
    'nav-text-staff': 'Staff & Commission',
    'nav-text-inventory': 'Inventory',
    'logout-text': 'Log Out',
    'kpi-lbl-bookings': "Today's Bookings",
    'kpi-lbl-revenue': "Today's Revenue",
    'kpi-lbl-customers': 'Registered Clients',
    'dash-inventory-alerts-title': 'Low Stock Alerts',
    'dash-schedule-title': "Today's Schedule",
    'form-booking-title': 'New Booking',
    'bookings-board-title': 'Appointments Board',
    'form-customer-title': 'Add Customer',
    'customers-list-title': 'Client Records',
    'form-invoice-title': 'Generate Invoice',
    'invoices-board-title': 'Invoices History',
    'form-staff-title': 'Add Staff Member',
    'staff-commissions-title': 'Commission Ledger',
    'form-inventory-title': 'Add Inventory Item',
    'inventory-stock-title': 'Stock Catalog',
    'btn-save-booking': 'Book Appointment',
    'btn-save-customer': 'Save Customer',
    'btn-generate-invoice': 'Generate Bill',
    'btn-save-staff': 'Onboard Staff',
    'btn-save-inventory': 'Add to Stock',
  }
};

const formatInr = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

function plainText(value, fallback = '') {
  return escapeHtml(value ?? fallback);
}

function cleanPhone(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function canUseWhatsApp(item) {
  return Boolean(item.whatsapp_consent && cleanPhone(item.phone).length >= 8);
}

function statusTone(status) {
  if (status === 'completed' || status === 'paid' || status === 'signed') return 'success';
  if (status === 'cancelled' || status === 'unpaid') return 'danger';
  return 'warning';
}

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  
  if (response.status === 401 && path !== '/api/auth/me') {
    showLogin(true);
    throw new Error('Session expired. Please log in.');
  }

  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
};

function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message;
  node.classList.add('show');
  setTimeout(() => node.classList.remove('show'), 3000);
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function validateCustomerPayload(payload) {
  if (!/^\+\d{1,3}$/.test(String(payload.countryCode || '+91'))) {
    throw new Error('Country code must look like +91.');
  }
  const phoneDigits = String(payload.phone || '').replace(/\D/g, '');
  if (phoneDigits.length !== 10) {
    throw new Error('Phone number must have exactly 10 digits.');
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email))) {
    throw new Error('Invalid email address.');
  }
}

function validateStaffPayload(payload) {
  validateCustomerPayload({
    countryCode: payload.countryCode,
    phone: payload.phone,
    email: '',
  });
  const commissionValue = Number(payload.commissionValue);
  if (!Number.isFinite(commissionValue) || commissionValue < 0 || commissionValue > 33) {
    throw new Error('Commission value must be between 0 and 33.');
  }
}

function validateInvoicePayload(payload) {
  if (!payload.customerId) {
    throw new Error('Please select a customer before generating the bill.');
  }
  if (!payload.serviceId) {
    throw new Error('Please select a completed service before generating the bill.');
  }
}

function setTodayDefaults() {
  const today = new Date().toISOString().slice(0, 10);
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    if (!input.value) input.value = today;
  });
}

function showLogin(visible) {
  const loginView = document.querySelector('#login-view');
  const appContainer = document.querySelector('#app-container');
  if (visible) {
    loginView.style.display = 'flex';
    appContainer.style.display = 'none';
  } else {
    loginView.style.display = 'none';
    appContainer.style.display = 'grid';
  }
}

// BILINGUAL DYNAMIC TRANSLATION
function updateLanguageUI(lang) {
  state.currentLang = lang;
  
  // Highlight active labels
  if (lang === 'ml') {
    document.querySelector('#lang-ml-label').classList.add('active');
    document.querySelector('#lang-en-label').classList.remove('active');
  } else {
    document.querySelector('#lang-en-label').classList.add('active');
    document.querySelector('#lang-ml-label').classList.remove('active');
  }

  const dict = translations[lang];
  for (const [id, value] of Object.entries(dict)) {
    const el = document.getElementById(id);
    if (el) {
      // If there are spans/icons inside, preserve them
      const icon = el.querySelector('[aria-hidden="true"]');
      if (icon) {
        // Just change text component
        const txtNode = el.querySelector('.nav-text') || el;
        if (txtNode) {
          txtNode.textContent = value;
        }
      } else {
        el.textContent = value;
      }
    }
  }

  // Update dynamic page-title placeholder matching active navigation
  const activeNav = document.querySelector('.nav-item.active');
  if (activeNav) {
    const viewName = activeNav.dataset.view;
    document.querySelector('#page-title').textContent = translations[lang][`nav-text-${viewName}`];
  }
}

// RENDER OPERATIONS
function renderDashboard() {
  const dashboard = state.dashboard || {};
  document.querySelector('#kpi-val-bookings').textContent = dashboard.todayAppointments || 0;
  document.querySelector('#kpi-val-revenue').textContent = formatInr(dashboard.todayRevenue);
  document.querySelector('#kpi-val-customers').textContent = dashboard.customers || 0;

  // Render Low Stock Items
  const stockList = document.querySelector('#dashboard-stock-list');
  if (dashboard.lowStockItems && dashboard.lowStockItems.length > 0) {
    stockList.innerHTML = dashboard.lowStockItems.map((item) => {
      const name = plainText(item.name);
      const stockQuantity = plainText(item.stock_quantity);
      const reorderLevel = plainText(item.reorder_level);
      return `
        <div class="inventory-item-card">
          <div class="inventory-info">
            <strong>${name}</strong>
            <span>Current Stock: ${stockQuantity} (Reorder limit: ${reorderLevel})</span>
          </div>
          <span class="inventory-badge low">Low Stock</span>
        </div>
      `;
    }).join('');
  } else {
    stockList.innerHTML = `<p class="meta">All inventory levels normal.</p>`;
  }

  // Render Today's Schedule
  const today = new Date().toISOString().slice(0, 10);
  const todays = state.appointments.filter((item) => item.date.slice(0, 10) === today);
  const schedList = document.querySelector('#dashboard-schedule-list');
  
  if (todays.length > 0) {
    schedList.innerHTML = todays.map((item) => {
      const customerName = plainText(item.customer_name);
      const serviceName = plainText(item.service_name);
      const startTime = plainText(item.start_time);
      const endTime = plainText(item.end_time);
      const chairId = plainText(item.chair_id);
      const status = plainText(item.status);
      return `
        <div class="list-item">
          <div class="list-item-content">
            <strong>${customerName}</strong>
            <span>${serviceName} · ${startTime}-${endTime} · ${chairId}</span>
          </div>
          <div class="list-item-side">
            <span class="amount">${formatInr(item.amount)}</span>
            <span class="status-pill ${statusTone(item.status)}">${status}</span>
          </div>
        </div>
      `;
    }).join('');
  } else {
    schedList.innerHTML = `<p class="meta">No bookings scheduled for today.</p>`;
  }
}

function renderBookings() {
  const container = document.querySelector('#bookings-list');
  if (state.appointments.length === 0) {
    container.innerHTML = `<p class="meta">No appointments scheduled.</p>`;
    return;
  }

  container.innerHTML = state.appointments.map((item) => {
    const customerNameRaw = item.customer_name || 'Customer';
    const serviceNameRaw = item.service_name || 'service';
    const bookingDateRaw = item.date ? item.date.slice(0, 10) : '';
    const startTimeRaw = item.start_time || '';
    const textMsg = `Hi ${customerNameRaw}, your booking for ${serviceNameRaw} at Soorya's Beauty Parlour is confirmed on ${bookingDateRaw} at ${startTimeRaw}. Thank you!`;
    const waLink = `https://wa.me/${cleanPhone(item.phone)}?text=${encodeURIComponent(textMsg)}`;
    const customerName = plainText(customerNameRaw);
    const serviceName = plainText(serviceNameRaw);
    const bookingDate = plainText(bookingDateRaw);
    const startTime = plainText(startTimeRaw);
    const endTime = plainText(item.end_time);
    const chairId = plainText(item.chair_id);
    const staffName = plainText(item.staff_name, 'Unassigned');
    const status = plainText(item.status);
    const whatsappAction = canUseWhatsApp(item)
      ? `<a class="whatsapp-trigger" href="${escapeHtml(waLink)}" target="_blank" rel="noopener"><span>Send Confirmation</span></a>`
      : '<span class="status-pill warning">WhatsApp Consent Needed</span>';
    
    return `
      <div class="list-item">
        <div class="list-item-content">
          <strong>${customerName}</strong>
          <span>${serviceName} · ${bookingDate} · ${startTime}-${endTime} (${chairId})</span>
          <span>Stylist: ${staffName}</span>
        </div>
        <div class="list-item-side">
          <span class="amount">${formatInr(item.amount)}</span>
          <span class="status-pill ${statusTone(item.status)}">${status}</span>
          ${whatsappAction}
        </div>
      </div>
    `;
  }).join('');
}

function renderCustomers() {
  const container = document.querySelector('#customers-list');
  if (state.customers.length === 0) {
    container.innerHTML = `<p class="meta">No customer profiles registered.</p>`;
    return;
  }

  container.innerHTML = state.customers.map((item) => {
    const name = plainText(item.name);
    const phone = plainText(item.phone);
    const email = item.email ? ` · Email: ${plainText(item.email)}` : '';
    const notes = plainText(item.notes, 'None');
    const consentText = item.consent_status === 'signed' ? 'Consent Signed' : 'Consent Pending';
    const whatsappText = item.whatsapp_consent ? 'WhatsApp OK' : 'WhatsApp Consent Needed';
    return `
      <div class="list-item">
        <div class="list-item-content">
          <strong>${name}</strong>
          <span>Phone: ${phone}${email}</span>
          <span>Notes: ${notes}</span>
        </div>
        <div class="list-item-side">
          <span class="status-pill ${statusTone(item.consent_status)}">${consentText}</span>
          <span class="status-pill ${item.whatsapp_consent ? 'success' : 'warning'}">${whatsappText}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderBilling() {
  const container = document.querySelector('#invoices-list');
  if (state.invoices.length === 0) {
    container.innerHTML = `<p class="meta">No invoice records found.</p>`;
    return;
  }

  container.innerHTML = state.invoices.map((item) => {
    const customerNameRaw = item.customer_name || 'Customer';
    const invoiceNumberRaw = item.invoice_number || '';
    const statusRaw = item.status || 'unpaid';
    const textMsg = `Hi ${customerNameRaw}, your invoice ${invoiceNumberRaw} is ready. Total: ${formatInr(item.grand_total)} (Status: ${statusRaw.toUpperCase()}). Thank you! - Sooryas`;
    const waLink = `https://wa.me/${cleanPhone(item.phone)}?text=${encodeURIComponent(textMsg)}`;
    const invoiceId = plainText(item.id);
    const invoiceNumber = plainText(invoiceNumberRaw);
    const customerName = plainText(customerNameRaw);
    const status = plainText(statusRaw);
    const paymentButton = item.status !== 'paid'
      ? `<button class="secondary-btn" style="min-height: 28px; font-size:11px;" onclick="openPaymentModal('${invoiceId}', '${plainText(item.grand_total)}')">💳 Log Payment</button>`
      : '';
    const whatsappAction = canUseWhatsApp(item)
      ? `<a class="whatsapp-trigger" href="${escapeHtml(waLink)}" target="_blank" rel="noopener"><span>Share bill</span></a>`
      : '<span class="status-pill warning">WhatsApp Consent Needed</span>';
    
    return `
      <div class="list-item">
        <div class="list-item-content">
          <strong>Invoice ${invoiceNumber}</strong>
          <span>Client: ${customerName}</span>
          <span>Subtotal: ${formatInr(item.subtotal)} · Tax: ${formatInr(item.tax_total)} · Disc: ${formatInr(item.discount_total)}</span>
        </div>
        <div class="list-item-side">
          <span class="amount">${formatInr(item.grand_total)}</span>
          <span class="status-pill ${statusTone(item.status)}">${status}</span>
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            ${paymentButton}
            ${whatsappAction}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStaff() {
  const container = document.querySelector('#staff-list');
  if (state.staff.length === 0) {
    container.innerHTML = `<p class="meta">No staff profiles onboarded.</p>`;
    return;
  }

  container.innerHTML = state.staff.map((item) => {
    const name = plainText(item.name);
    const role = plainText(item.role);
    const phone = plainText(item.phone, 'N/A');
    const commissionValue = plainText(item.commission_value);
    const commissionModel = item.commission_type === 'percentage' ? `${commissionValue}%` : `INR ${commissionValue} flat`;
    const status = plainText(item.status);
    return `
      <div class="list-item">
        <div class="list-item-content">
          <strong>${name}</strong>
          <span>Role: ${role} · Phone: ${phone}</span>
          <span>Commission Model: ${commissionModel}</span>
        </div>
        <div class="list-item-side">
          <span class="status-pill ${statusTone(item.status)}">${status}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderInventory() {
  const container = document.querySelector('#inventory-list');
  if (state.inventory.length === 0) {
    container.innerHTML = `<p class="meta">No stock items registered.</p>`;
    return;
  }

  container.innerHTML = state.inventory.map((item) => {
    const name = plainText(item.name);
    const type = plainText(String(item.type || '').toUpperCase());
    const vendorName = plainText(item.vendor_name, 'N/A');
    const reorderLevel = plainText(item.reorder_level);
    const stockQuantity = plainText(item.stock_quantity);
    const stockState = item.stock_quantity <= item.reorder_level ? 'Low Stock' : 'In Stock';
    return `
      <div class="list-item">
        <div class="list-item-content">
          <strong>${name}</strong>
          <span>Type: ${type} · Vendor: ${vendorName}</span>
          <span>Reorder limit threshold: ${reorderLevel}</span>
        </div>
        <div class="list-item-side">
          <span class="amount">${stockQuantity} units</span>
          <span class="inventory-badge ${item.stock_quantity <= item.reorder_level ? 'low' : 'normal'}">
            ${stockState}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// SELECT OPTION POPULATORS
function updateFormSelects() {
  const customerOptions = state.customers.map(c => `<option value="${escapeHtml(c.id)}">${plainText(c.name)} (${plainText(c.phone)})</option>`).join('');
  const staffOptions = state.staff.map(s => `<option value="${escapeHtml(s.id)}">${plainText(s.name)} (${plainText(s.role)})</option>`).join('');
  const serviceOptions = state.services.map(sv => `<option value="${escapeHtml(sv.id)}">${plainText(sv.name)} (${formatInr(sv.price)})</option>`).join('');

  document.querySelector('#booking-customer-id').innerHTML = customerOptions;
  document.querySelector('#booking-staff-id').innerHTML = staffOptions;
  document.querySelector('#booking-service-id').innerHTML = serviceOptions;

  document.querySelector('#invoice-customer-id').innerHTML = customerOptions;
  document.querySelector('#invoice-item-service').innerHTML = serviceOptions;
}

function renderAll() {
  renderDashboard();
  renderBookings();
  renderCustomers();
  renderBilling();
  renderStaff();
  renderInventory();
  updateFormSelects();
  updateLanguageUI(state.currentLang);
}

// DATA LOADER
async function loadData() {
  const [health, dashboard, customers, appointments, staff, services, invoices, inventory] = await Promise.all([
    api('/api/health'),
    api('/api/dashboard'),
    api('/api/customers'),
    api('/api/appointments'),
    api('/api/staff'),
    api('/api/services'),
    api('/api/invoices'),
    api('/api/inventory'),
  ]);

  Object.assign(state, { dashboard, customers, appointments, staff, services, invoices, inventory });
  
  const pill = document.querySelector('#health-pill');
  if (health.ok) {
    pill.textContent = 'ONLINE';
    pill.className = 'status-pill success';
  } else {
    pill.textContent = 'CHECK';
    pill.className = 'status-pill warning';
  }

  renderAll();
}

// BIND NAVIGATION EVENTS
function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
      document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
      button.classList.add('active');
      document.querySelector(`#view-${button.dataset.view}`).classList.add('active');
      
      const pageTitle = document.querySelector('#page-title');
      const textNode = button.querySelector('.nav-text') || button;
      pageTitle.textContent = textNode.textContent;
    });
  });
}

// DIALOG MODAL CONTROLS
window.openPaymentModal = function(invoiceId, grandTotal) {
  document.querySelector('#payment-invoice-id').value = invoiceId;
  document.querySelector('#payment-amount').value = grandTotal;
  document.querySelector('#payment-modal').style.display = 'block';
};

function closePaymentModal() {
  document.querySelector('#payment-modal').style.display = 'none';
  document.querySelector('#payment-form').reset();
}

// FORM SUBMISSION TRIGGERS
function bindForm(formId, endpoint, successMessage) {
  const form = document.querySelector(formId);
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    try {
      const payload = formData(formElement);
      
      // Special payload structure for invoices POST (expects list of items)
      let customPayload = payload;
      if (formId === '#invoice-form') {
        validateInvoicePayload(payload);
        customPayload = {
          customerId: payload.customerId,
          discountTotal: parseFloat(payload.discountTotal || 0),
          items: [{
            serviceId: payload.serviceId || document.querySelector('#invoice-item-service').value,
            quantity: 1
          }]
        };
      }
      if (formId === '#customer-form') {
        validateCustomerPayload(payload);
        customPayload = {
          ...payload,
          whatsappConsent: payload.whatsappConsent === 'true',
        };
      }
      if (formId === '#staff-form') {
        validateStaffPayload(payload);
      }

      await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(customPayload)
      });

      formElement.reset();
      setTodayDefaults();
      await loadData();
      toast(successMessage);
    } catch (error) {
      toast(error.message);
    }
  });
}

function bindAuthenticationForms() {
  // Login flow
  document.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const creds = formData(e.currentTarget);
      const user = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(creds)
      });
      state.user = user;
      document.querySelector('#user-display-name').textContent = user.username;
      document.querySelector('#user-display-role').textContent = user.role.toUpperCase();
      document.querySelector('#user-avatar').textContent = user.username.slice(0, 1).toUpperCase();
      
      showLogin(false);
      await loadData();
      toast(`Welcome back, ${user.username}!`);
    } catch (error) {
      toast(error.message);
    }
  });

  // Logout flow
  document.querySelector('#btn-logout').addEventListener('click', async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
      state.user = null;
      showLogin(true);
      toast('Logged out successfully.');
    } catch (error) {
      toast(error.message);
    }
  });
}

// INITIAL STARTUP & CHECK SESSION
async function initApp() {
  try {
    const user = await api('/api/auth/me');
    if (user.authenticated) {
      state.user = user;
      document.querySelector('#user-display-name').textContent = user.username;
      document.querySelector('#user-display-role').textContent = user.role.toUpperCase();
      document.querySelector('#user-avatar').textContent = user.username.slice(0, 1).toUpperCase();
      
      showLogin(false);
      await loadData();
    } else {
      showLogin(true);
    }
  } catch (error) {
    showLogin(true);
  }
}

// DOCUMENT EVENT BINDINGS
setTodayDefaults();
bindNavigation();
bindAuthenticationForms();

bindForm('#booking-form', '/api/appointments', 'Appointment successfully booked.');
bindForm('#customer-form', '/api/customers', 'Customer record saved.');
bindForm('#invoice-form', '/api/invoices', 'Invoice successfully generated.');
bindForm('#staff-form', '/api/staff', 'Staff onboarded successfully.');
bindForm('#inventory-form', '/api/inventory', 'Inventory item added to catalog.');

// Language toggle switch binding
document.querySelector('#lang-toggle').addEventListener('change', (e) => {
  const lang = e.target.checked ? 'ml' : 'en';
  updateLanguageUI(lang);
});

// Refresh button trigger
document.querySelector('#refresh-button').addEventListener('click', () => {
  loadData().then(() => toast('Data updated.')).catch(err => toast(err.message));
});

// Payment form submission in modal
document.querySelector('#payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const invoiceId = document.querySelector('#payment-invoice-id').value;
    const amount = document.querySelector('#payment-amount').value;
    const paymentMode = document.querySelector('#payment-mode').value;
    const referenceNumber = document.querySelector('#payment-reference').value;

    await api('/api/payments', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, amount, paymentMode, referenceNumber })
    });

    closePaymentModal();
    await loadData();
    toast('Payment logged and invoice updated.');
  } catch (error) {
    toast(error.message);
  }
});

// Modal close action
document.querySelector('#btn-close-payment-modal').addEventListener('click', closePaymentModal);

// Initial check
initApp();

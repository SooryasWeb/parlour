-- Drop tables if they exist (for schema reset/migrations)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS invoice_sequences CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Tenants Table
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  gstin TEXT,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (for authentication & RBAC)
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- 'admin', 'manager', 'receptionist', 'beautician', 'accountant'
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table (CRM)
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+91',
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  consent_status TEXT DEFAULT 'unsigned', -- 'unsigned', 'signed'
  consent_date DATE,
  whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+91',
  phone TEXT,
  role TEXT NOT NULL, -- 'stylist', 'therapist', 'beautician'
  commission_type TEXT NOT NULL, -- 'percentage', 'fixed'
  commission_value NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services Catalogue
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  tax_class TEXT, -- 'GST-18', 'GST-5', 'exempt'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  staff_id TEXT REFERENCES staff(id) ON DELETE SET NULL,
  chair_id TEXT NOT NULL, -- e.g., 'chair-1', 'station-2'
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL, -- e.g., '10:00'
  end_time TEXT NOT NULL, -- e.g., '11:00'
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'pending', 'confirmed', 'completed', 'cancelled', 'no-show'
  source TEXT NOT NULL DEFAULT 'walk-in', -- 'whatsapp', 'phone', 'instagram', 'referral', 'walk-in'
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices Table
CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL, -- e.g., 'INV-2026-0001'
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_total NUMERIC NOT NULL DEFAULT 0,
  discount_total NUMERIC NOT NULL DEFAULT 0,
  grand_total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'partially_paid', 'paid', 'void'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_invoice_number_per_tenant UNIQUE (tenant_id, invoice_number)
);

-- Race-safe invoice sequence by tenant and calendar year.
CREATE TABLE invoice_sequences (
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, invoice_year)
);

-- Invoice Items Table
CREATE TABLE invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0
);

-- Payments Table (Ledger)
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL, -- 'UPI', 'card', 'cash'
  reference_number TEXT,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table (Products and Consumables)
CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'retail', 'consumable'
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  vendor_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit/Compliance Logs
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT, -- username or user ID
  action TEXT NOT NULL, -- e.g., 'override_commission', 'edit_invoice', 'view_sensitive_notes'
  entity_name TEXT, -- e.g., 'invoices', 'customers'
  entity_id TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details TEXT
);

-- INDEXES for performance & multi-tenancy speed
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_staff_tenant ON staff(tenant_id);
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_inventory_tenant ON inventory_items(tenant_id);

-- SEED DATA

-- 1. Default Tenant (Sooryas)
INSERT INTO tenants (id, name, subdomain, logo_url, gstin, address, phone)
VALUES (
  'tenant-sooryas',
  'Sooryas Skin Hair and Makeup',
  'sooryas',
  '/logo.svg',
  '32AAAAA0000A1Z1', -- Sample Kerala GSTIN
  'Kumarapuram, Thiruvananthapuram, Kerala, 695011',
  '+919847011111'
);

-- 2. Seed Users (passwords hashed using Scrypt or PBKDF2; here we seed default PBKDF2 hash of "password" with salt "salt")
-- PBKDF2 with salt 'salt', 100000 iterations, sha512:
-- 2d665b11eb113dc5ad07cf5957d383b7ffc2db6d66e7456d987e35b71946dc496cc0765c9284247502cd43e74516ff83e74a682f6e91129b0a191f6305a41bf7
INSERT INTO users (id, tenant_id, username, password_hash, role, status)
VALUES 
('user-soorya', 'tenant-sooryas', 'soorya', 'f5d17022c96af46c0a1dc49a58bbe654a28e98104883e4af4de974cda2c74122dd082f4105a93fc80692ca4eb1a784cfeda81bfaa33f5192cc9143d818bd7581', 'admin', 'active'),
('user-manager', 'tenant-sooryas', 'manager', 'f5d17022c96af46c0a1dc49a58bbe654a28e98104883e4af4de974cda2c74122dd082f4105a93fc80692ca4eb1a784cfeda81bfaa33f5192cc9143d818bd7581', 'manager', 'active'),
('user-receptionist', 'tenant-sooryas', 'receptionist', 'f5d17022c96af46c0a1dc49a58bbe654a28e98104883e4af4de974cda2c74122dd082f4105a93fc80692ca4eb1a784cfeda81bfaa33f5192cc9143d818bd7581', 'receptionist', 'active'),
('user-accountant', 'tenant-sooryas', 'accountant', 'f5d17022c96af46c0a1dc49a58bbe654a28e98104883e4af4de974cda2c74122dd082f4105a93fc80692ca4eb1a784cfeda81bfaa33f5192cc9143d818bd7581', 'accountant', 'active');

-- 3. Seed Customers
INSERT INTO customers (id, tenant_id, name, country_code, phone, email, notes, consent_status, consent_date, whatsapp_consent)
VALUES 
('customer-meera', 'tenant-sooryas', 'Meera Nair', '+91', '+919847011111', 'meera@example.com', 'Prefers evening appointments.', 'signed', '2026-06-01', TRUE),
('customer-lekshmi', 'tenant-sooryas', 'Lekshmi A', '+91', '+919847022222', 'lekshmi@example.com', 'Hair care consultation requested.', 'unsigned', NULL, FALSE);

-- 4. Seed Staff
INSERT INTO staff (id, tenant_id, name, country_code, phone, role, commission_type, commission_value, status)
VALUES 
('staff-priya', 'tenant-sooryas', 'Priya S', '+91', '+919847033333', 'stylist', 'percentage', 15.0, 'active'),
('staff-anisha', 'tenant-sooryas', 'Anisha K', '+91', '+919847044444', 'beautician', 'fixed', 200.0, 'active');

-- 5. Seed Services
INSERT INTO services (id, tenant_id, name, duration_minutes, price, tax_class, is_active)
VALUES 
('service-bridal', 'tenant-sooryas', 'Bridal Makeup Intensive', 180, 15000.00, 'GST-18', TRUE),
('service-facial', 'tenant-sooryas', 'Herbal Facial Treatment', 60, 1800.00, 'GST-18', TRUE),
('service-haircut', 'tenant-sooryas', 'Layer Haircut & Styling', 45, 1200.00, 'GST-18', TRUE),
('service-threading', 'tenant-sooryas', 'Eyebrow Threading', 15, 100.00, 'exempt', TRUE);

-- 6. Seed Bookings
INSERT INTO bookings (id, tenant_id, customer_id, staff_id, chair_id, service_id, date, start_time, end_time, status, source, amount, notes)
VALUES 
('booking-demo-1', 'tenant-sooryas', 'customer-meera', 'staff-priya', 'chair-1', 'service-facial', CURRENT_DATE, '10:00', '11:00', 'confirmed', 'instagram', 1800.00, 'Trial makeup discussion'),
('booking-demo-2', 'tenant-sooryas', 'customer-lekshmi', 'staff-anisha', 'chair-2', 'service-haircut', CURRENT_DATE, '11:30', '12:15', 'completed', 'phone', 1200.00, 'Wants deep conditioning recommendation');

-- 7. Seed Inventory
INSERT INTO inventory_items (id, tenant_id, name, type, stock_quantity, reorder_level, vendor_name)
VALUES 
('inv-facial-kit', 'tenant-sooryas', 'Organic Herbal Facial Kit', 'consumable', 12, 3, 'BioBeauty Distributors'),
('inv-hair-serum', 'tenant-sooryas', 'Professional Hair Serum 100ml', 'retail', 2, 5, 'KeraCare Kerala');

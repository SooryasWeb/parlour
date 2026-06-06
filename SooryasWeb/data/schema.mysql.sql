SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS invoice_sequences;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE tenants (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(120) UNIQUE NOT NULL,
  logo_url VARCHAR(255),
  gstin VARCHAR(32),
  address TEXT,
  phone VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  username VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL,
  status VARCHAR(40) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customers (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(8) NOT NULL DEFAULT '+91',
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  consent_status VARCHAR(40) DEFAULT 'unsigned',
  consent_date DATE,
  whatsapp_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE staff (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(8) NOT NULL DEFAULT '+91',
  phone VARCHAR(32),
  role VARCHAR(40) NOT NULL,
  commission_type VARCHAR(40) NOT NULL,
  commission_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(40) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE services (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  tax_class VARCHAR(40),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  customer_id VARCHAR(64),
  staff_id VARCHAR(64),
  chair_id VARCHAR(64) NOT NULL,
  service_id VARCHAR(64),
  date DATE NOT NULL,
  start_time VARCHAR(8) NOT NULL,
  end_time VARCHAR(8) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'confirmed',
  source VARCHAR(40) NOT NULL DEFAULT 'walk-in',
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
  CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoices (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  invoice_number VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64),
  booking_id VARCHAR(64),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_invoice_number_per_tenant UNIQUE (tenant_id, invoice_number),
  CONSTRAINT fk_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoices_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_sequences (
  tenant_id VARCHAR(64),
  invoice_year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, invoice_year),
  CONSTRAINT fk_invoice_sequences_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoice_items (
  id VARCHAR(64) PRIMARY KEY,
  invoice_id VARCHAR(64),
  service_id VARCHAR(64),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_items_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  invoice_id VARCHAR(64),
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_mode VARCHAR(40) NOT NULL,
  reference_number VARCHAR(120),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventory_items (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(40) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  vendor_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64),
  user_id VARCHAR(120),
  action VARCHAR(120) NOT NULL,
  entity_name VARCHAR(120),
  entity_id VARCHAR(64),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  details TEXT,
  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_staff_tenant ON staff(tenant_id);
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_inventory_tenant ON inventory_items(tenant_id);

INSERT INTO tenants (id, name, subdomain, logo_url, gstin, address, phone)
VALUES (
  'tenant-sooryas',
  'Sooryas Skin Hair and Makeup',
  'sooryas',
  '/logo.svg',
  '32AAAAA0000A1Z1',
  'Kumarapuram, Thiruvananthapuram, Kerala, 695011',
  '+919847011111'
);

INSERT INTO users (id, tenant_id, username, password_hash, role, status)
VALUES
('user-soorya', 'tenant-sooryas', 'soorya', 'f5d17022c96af46c0a1dc49a58bbe654a28e98104883e4af4de974cda2c74122dd082f4105a93fc80692ca4eb1a784cfeda81bfaa33f5192cc9143d818bd7581', 'admin', 'active'),
('user-manager', 'tenant-sooryas', 'manager', 'f5d17022c96af46c0a1dc49a58bbe654a28e98104883e4af4de974cda2c74122dd082f4105a93fc80692ca4eb1a784cfeda81bfaa33f5192cc9143d818bd7581', 'manager', 'active'),
('user-receptionist', 'tenant-sooryas', 'receptionist', 'f5d17022c96af46c0a1dc49a58bbe654a28e98104883e4af4de974cda2c74122dd082f4105a93fc80692ca4eb1a784cfeda81bfaa33f5192cc9143d818bd7581', 'receptionist', 'active'),
('user-accountant', 'tenant-sooryas', 'accountant', 'f5d17022c96af46c0a1dc49a58bbe654a28e98104883e4af4de974cda2c74122dd082f4105a93fc80692ca4eb1a784cfeda81bfaa33f5192cc9143d818bd7581', 'accountant', 'active');

INSERT INTO customers (id, tenant_id, name, country_code, phone, email, notes, consent_status, consent_date, whatsapp_consent)
VALUES
('customer-meera', 'tenant-sooryas', 'Meera Nair', '+91', '+919847011111', 'meera@example.com', 'Prefers evening appointments.', 'signed', '2026-06-01', TRUE),
('customer-lekshmi', 'tenant-sooryas', 'Lekshmi A', '+91', '+919847022222', 'lekshmi@example.com', 'Hair care consultation requested.', 'unsigned', NULL, FALSE);

INSERT INTO staff (id, tenant_id, name, country_code, phone, role, commission_type, commission_value, status)
VALUES
('staff-priya', 'tenant-sooryas', 'Priya S', '+91', '+919847033333', 'stylist', 'percentage', 15.0, 'active'),
('staff-anisha', 'tenant-sooryas', 'Anisha K', '+91', '+919847044444', 'beautician', 'fixed', 200.0, 'active');

INSERT INTO services (id, tenant_id, name, duration_minutes, price, tax_class, is_active)
VALUES
('service-bridal', 'tenant-sooryas', 'Bridal Makeup Intensive', 180, 15000.00, 'GST-18', TRUE),
('service-facial', 'tenant-sooryas', 'Herbal Facial Treatment', 60, 1800.00, 'GST-18', TRUE),
('service-haircut', 'tenant-sooryas', 'Layer Haircut & Styling', 45, 1200.00, 'GST-18', TRUE),
('service-threading', 'tenant-sooryas', 'Eyebrow Threading', 15, 100.00, 'exempt', TRUE);

INSERT INTO bookings (id, tenant_id, customer_id, staff_id, chair_id, service_id, date, start_time, end_time, status, source, amount, notes)
VALUES
('booking-demo-1', 'tenant-sooryas', 'customer-meera', 'staff-priya', 'chair-1', 'service-facial', CURRENT_DATE, '10:00', '11:00', 'confirmed', 'instagram', 1800.00, 'Trial makeup discussion'),
('booking-demo-2', 'tenant-sooryas', 'customer-lekshmi', 'staff-anisha', 'chair-2', 'service-haircut', CURRENT_DATE, '11:30', '12:15', 'completed', 'phone', 1200.00, 'Wants deep conditioning recommendation');

INSERT INTO inventory_items (id, tenant_id, name, type, stock_quantity, reorder_level, vendor_name)
VALUES
('inv-facial-kit', 'tenant-sooryas', 'Organic Herbal Facial Kit', 'consumable', 12, 3, 'BioBeauty Distributors'),
('inv-hair-serum', 'tenant-sooryas', 'Professional Hair Serum 100ml', 'retail', 2, 5, 'KeraCare Kerala');

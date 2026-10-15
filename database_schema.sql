-- ==============================================================================
-- WOLFZONE POS - DATABASE SCHEMA DEFINITION (PostgreSQL)
-- File: database_schema.sql
-- ==============================================================================

-- 1. Tabla de Plazas / Cajones de Estacionamiento (spots)
CREATE TABLE IF NOT EXISTS spots (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    rate_per_hour NUMERIC(12, 2) DEFAULT 0,
    current_ticket_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_spots_status ON spots(status);
CREATE INDEX IF NOT EXISTS idx_spots_type ON spots(type);

-- 2. Tabla de Tickets Activos (active_tickets)
CREATE TABLE IF NOT EXISTS active_tickets (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(100) NOT NULL UNIQUE,
    plate VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    spot_code VARCHAR(50),
    entry_time TIMESTAMPTZ NOT NULL,
    terminal_id VARCHAR(100),
    operator VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_active_tickets_plate ON active_tickets(plate);
CREATE INDEX IF NOT EXISTS idx_active_tickets_spot ON active_tickets(spot_code);

-- 3. Tabla de Tickets Pagados / Facturación Histórica (paid_tickets)
CREATE TABLE IF NOT EXISTS paid_tickets (
    id VARCHAR(100) PRIMARY KEY,
    ticket_number VARCHAR(100) NOT NULL,
    plate VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    spot_code VARCHAR(50),
    entry_time TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL,
    terminal_id VARCHAR(100),
    operator VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_paid_tickets_plate ON paid_tickets(plate);
CREATE INDEX IF NOT EXISTS idx_paid_tickets_paid_at ON paid_tickets(paid_at);
CREATE INDEX IF NOT EXISTS idx_paid_tickets_method ON paid_tickets(payment_method);

-- 4. Tabla de Turnos y Arqueos de Caja (cash_shifts)
CREATE TABLE IF NOT EXISTS cash_shifts (
    id VARCHAR(100) PRIMARY KEY,
    terminal_id VARCHAR(100) NOT NULL,
    operator VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    initial_cash NUMERIC(12, 2) DEFAULT 0,
    final_cash NUMERIC(12, 2) DEFAULT 0,
    total_collected NUMERIC(12, 2) DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_status ON cash_shifts(status);
CREATE INDEX IF NOT EXISTS idx_cash_shifts_terminal ON cash_shifts(terminal_id);

-- 5. Tabla de Configuraciones del Sistema POS (configs)
CREATE TABLE IF NOT EXISTS configs (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL
);

-- 6. Tabla de Usuarios, Roles y Accesos (users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    name VARCHAR(150),
    pin VARCHAR(50),
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 7. Tabla de Registro de Auditoría y Trazabilidad (audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(100) PRIMARY KEY,
    terminal_id VARCHAR(100),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    operator VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

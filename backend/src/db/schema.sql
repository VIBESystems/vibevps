CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hypervisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('proxmox', 'vmware')),
    host TEXT NOT NULL,
    port INTEGER DEFAULT 8006,
    node TEXT DEFAULT 'pve',
    api_token_id TEXT,
    api_token_secret TEXT,
    verify_ssl INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vm_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hypervisor_id INTEGER REFERENCES hypervisors(id) ON DELETE CASCADE,
    vm_id TEXT NOT NULL,
    vm_name TEXT,
    action TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vm_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hypervisor_id INTEGER REFERENCES hypervisors(id) ON DELETE CASCADE,
    source_vm_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    default_cores INTEGER DEFAULT 2,
    default_memory_mb INTEGER DEFAULT 2048,
    default_disk_gb INTEGER DEFAULT 20,
    os_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS license_info (
    id INTEGER PRIMARY KEY DEFAULT 1,
    server_id TEXT UNIQUE NOT NULL,
    license_key TEXT,
    customer_name TEXT,
    customer_email TEXT,
    plan_name TEXT,
    max_hypervisors INTEGER DEFAULT 0,
    max_vms INTEGER DEFAULT 0,
    expires_at DATETIME,
    is_lifetime INTEGER DEFAULT 0,
    activated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

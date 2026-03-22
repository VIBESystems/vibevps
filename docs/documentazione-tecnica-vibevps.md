# VIBEVps - Documentazione Tecnica

## 1. Panoramica del Progetto

**VIBEVps** è una dashboard web per la gestione centralizzata di hypervisor locali (Proxmox VE). Permette di visualizzare, controllare e creare macchine virtuali direttamente dal browser, con provisioning automatizzato tramite template preconfigurati e configurazione cloud-init (hostname, IP statico, resize disco, guest agent).

---

## 2. Obiettivi Principali

| # | Obiettivo | Descrizione |
|---|-----------|-------------|
| 1 | **Connessione Hypervisor** | Collegarsi a uno o più hypervisor nella rete locale via API (auto-detect nome nodo) |
| 2 | **Dashboard VM** | Visualizzare tutte le VM con stato, risorse, IP, uptime |
| 3 | **Gestione VM** | Start, stop, restart, suspend, delete, console SSH |
| 4 | **Creazione rapida da template** | Creare VM da template con IP statico, hostname e auto-update preconfigurati |
| 5 | **Post-provisioning** | Cloud-init al primo avvio + espansione disco via guest agent |
| 6 | **Monitoraggio** | Stato VM in tempo reale via WebSocket (polling 5s) |

---

## 3. Stack Tecnologico

Stack scelto per leggerezza e velocità:

| Componente | Tecnologia | Motivazione |
|------------|------------|-------------|
| **Backend** | **Node.js + Fastify 5** | Più veloce di Express, basso overhead |
| **Frontend** | **React 19 + Vite 8** | Build rapidissimo, HMR istantaneo, no overhead SSR |
| **UI** | **TailwindCSS 4 + Radix UI** | Componenti pronti, design coerente con la suite VIBE |
| **Database** | **SQLite (better-sqlite3)** | Zero configurazione, un file, perfetto per single-instance |
| **Realtime** | **WebSocket (@fastify/websocket)** | Aggiornamenti stato VM in tempo reale |
| **Auth** | **JWT (@fastify/jwt) + bcrypt** | Semplice, stateless, no dipendenze esterne |
| **State** | **Zustand 5** | State management leggero per React |
| **HTTP Client** | **undici** | Chiamate HTTP dirette verso API Proxmox |
| **SSH Proxy** | **ssh2** | Connessione SSH dal backend alle VM |
| **Terminale Web** | **xterm.js** | Emulatore terminale nel browser |
| **Validation** | **Zod 4** | Validazione input su route backend |

> **Perché non Next.js?** Per una dashboard di gestione infrastruttura non serve SSR. Vite + React è più leggero, più veloce in dev e in produzione. Fastify come backend separato dà pieno controllo sulle WebSocket e sulle connessioni persistenti agli hypervisor.

---

## 4. Hypervisor Supportati

### 4.1 Proxmox VE (Implementato)
- **API**: REST API nativa su porta 8006 (HTTPS)
- **Autenticazione**: API Token (`PVEAPIToken=user@realm!tokenid=secret`)
- **Operazioni**: Full CRUD VM, clone template, cloud-init config, resize disco, guest agent exec
- **Libreria**: Chiamate HTTP dirette con `undici`
- **Auto-detect nodo**: All'aggiunta di un hypervisor, il nome del nodo Proxmox viene rilevato automaticamente via `/api2/json/nodes`

### 4.2 VMware ESXi / vCenter (Non implementato)
- Previsto in futuro. L'interfaccia adapter (`HypervisorAdapter`) è predisposta ma nessun adapter VMware esiste.

---

## 5. Architettura

```
┌─────────────────────────────────────┐
│           Browser (React)           │
│  Dashboard │ VM List │ Create VM    │
└──────────────┬──────────────────────┘
               │ HTTP + WebSocket
┌──────────────▼──────────────────────┐
│         Fastify Backend             │
│  ┌───────┐ ┌───────┐ ┌─────┐ ┌─────┐│
│  │ Auth  │ │VM Ctrl│ │ WS  │ │ SSH ││
│  │Module │ │Module │ │ Hub │ │Proxy││
│  └───────┘ └───┬───┘ └──┬──┘ └──┬──┘│
│                    │          │    │  │
│  ┌─────────────────▼──────────▼──▼┐ │
│  │     Hypervisor Adapter Layer   │ │
│  │  ┌──────────┐                  │ │
│  │  │ Proxmox  │                  │ │
│  │  │ Adapter  │                  │ │
│  │  └──────────┘                  │ │
│  └────────────────────────────────┘ │
│                    │                │
│  ┌─────────────────▼──────────────┐ │
│  │        SQLite Database         │ │
│  │  users, hypervisors, vm_logs,  │ │
│  │  vm_templates, settings        │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │     Proxmox VE      │
    │   (rete locale)     │
    └─────────────────────┘
```

---

## 6. Struttura del Progetto

```
vibevps/
├── package.json                   # Root workspace (npm workspaces)
├── data/
│   └── vibevps.db                 # Database SQLite (generato a runtime)
├── docs/
│   └── documentazione-tecnica-vibevps.md
├── installer/
│   └── vibevps-installer-v1.0.0/
│       ├── install.sh             # Installer automatico (Ubuntu 24.04)
│       ├── scripts/update.sh      # Script aggiornamento online
│       ├── config/
│       │   ├── .env.template      # Template variabili ambiente
│       │   └── nginx-vibevps.conf # Config reverse proxy Nginx
│       ├── backend/               # Sorgenti backend
│       ├── frontend/              # Sorgenti frontend
│       ├── package.json
│       └── package-lock.json
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts              # Entry point Fastify
│       ├── config.ts              # Configurazione app (env vars)
│       ├── db/
│       │   ├── schema.sql         # Schema SQLite
│       │   └── database.ts        # Connessione DB + seed admin
│       ├── auth/
│       │   ├── auth.routes.ts     # Login, me, cambio password
│       │   └── auth.guard.ts      # Middleware JWT
│       ├── hypervisors/
│       │   ├── hypervisor.routes.ts   # CRUD + test + status
│       │   ├── hypervisor.service.ts  # Adapter factory + cache
│       │   └── adapters/
│       │       ├── adapter.interface.ts  # Interfaccia comune
│       │       └── proxmox.adapter.ts    # Proxmox API client
│       ├── vms/
│       │   └── vm.routes.ts       # CRUD VM + create + logs
│       ├── templates/
│       │   └── template.routes.ts # CRUD template + discover
│       ├── settings/
│       │   └── settings.routes.ts # CRUD impostazioni (key-value)
│       ├── updates/
│       │   ├── updates.routes.ts      # Check update, install, licenze
│       │   ├── license.service.ts     # Servizio licenze (VIBEVault)
│       │   └── update-sequencer.ts    # Gestione update sequenziali
│       └── ws/
│           ├── ws.hub.ts          # WebSocket polling (5s)
│           └── ssh.handler.ts     # WebSocket SSH proxy (xterm.js ↔ ssh2)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts             # Proxy /api → :3001, alias @/
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                # Router + ProtectedRoute
│       ├── index.css              # TailwindCSS v4 imports
│       ├── api/
│       │   └── client.ts          # ApiClient singleton (JWT in localStorage)
│       ├── components/
│       │   ├── ui/                # Card, Button, Input, Modal, StatusBadge
│       │   ├── layout/            # Layout (Outlet), Sidebar
│       │   └── SshTerminal.tsx    # Terminale SSH web (xterm.js + WebSocket)
│       ├── hooks/
│       │   └── useWebSocket.ts    # Hook WebSocket real-time
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── VmList.tsx
│       │   ├── VmDetail.tsx
│       │   ├── CreateVm.tsx
│       │   ├── Hypervisors.tsx
│       │   ├── Templates.tsx
│       │   ├── Logs.tsx
│       │   ├── Settings.tsx
│       │   └── Updates.tsx          # Aggiornamenti + gestione licenza
│       ├── store/
│       │   ├── auth.ts            # Zustand: login, logout, checkAuth
│       │   └── vms.ts             # Zustand: stato VM
│       └── lib/
│           └── utils.ts           # Utility (cn, formatBytes, ecc.)
└── node_modules/
```

---

## 7. Database Schema (SQLite)

```sql
-- Utenti dashboard
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Hypervisor registrati
CREATE TABLE IF NOT EXISTS hypervisors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('proxmox', 'vmware')),
    host TEXT NOT NULL,              -- IP o hostname
    port INTEGER DEFAULT 8006,
    node TEXT DEFAULT 'pve',         -- nome nodo Proxmox (auto-detected)
    api_token_id TEXT,               -- user@realm!tokenid
    api_token_secret TEXT,           -- token secret (in chiaro)
    verify_ssl INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Log attività VM
CREATE TABLE IF NOT EXISTS vm_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hypervisor_id INTEGER REFERENCES hypervisors(id) ON DELETE CASCADE,
    vm_id TEXT NOT NULL,             -- ID VM sull'hypervisor
    vm_name TEXT,                    -- nome VM (per visualizzazione log)
    action TEXT NOT NULL,            -- 'create', 'start', 'stop', 'restart', 'suspend', 'delete'
    details TEXT,                    -- JSON con dettagli
    status TEXT DEFAULT 'success',   -- 'success' | 'error'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Template VM salvati
CREATE TABLE IF NOT EXISTS vm_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hypervisor_id INTEGER REFERENCES hypervisors(id) ON DELETE CASCADE,
    source_vm_id TEXT NOT NULL,      -- ID template sull'hypervisor
    name TEXT NOT NULL,
    description TEXT,
    default_cores INTEGER DEFAULT 2,
    default_memory_mb INTEGER DEFAULT 2048,
    default_disk_gb INTEGER DEFAULT 20,
    os_type TEXT,                    -- 'ubuntu', 'debian', 'centos', etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Impostazioni applicazione
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Informazioni licenza (attivazione via VIBEVault)
CREATE TABLE IF NOT EXISTS license_info (
    id INTEGER PRIMARY KEY DEFAULT 1,
    server_id TEXT UNIQUE NOT NULL,     -- UUID univoco dell'installazione
    license_key TEXT,                    -- Chiave VV-XXXX-XXXX-XXXX
    customer_name TEXT,
    customer_email TEXT,
    plan_name TEXT,
    max_hypervisors INTEGER DEFAULT 0,  -- 0 = illimitati
    max_vms INTEGER DEFAULT 0,          -- 0 = illimitate
    expires_at DATETIME,
    is_lifetime INTEGER DEFAULT 0,
    activated_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Note:**
- Lo schema usa `IF NOT EXISTS` — viene eseguito ad ogni avvio senza rischi
- Il seed crea automaticamente l'utente `admin` / `admin123!` se non esiste
- WAL mode e foreign keys attivati via pragma
- I token API degli hypervisor sono salvati **in chiaro** nel DB (la crittografia AES-256-GCM è predisposta in config ma non ancora implementata)

---

## 8. API Routes

### Auth
| Metodo | Route | Descrizione |
|--------|-------|-------------|
| POST | `/api/auth/login` | Login, restituisce JWT (scadenza 8h) |
| GET | `/api/auth/me` | Dati utente autenticato |
| POST | `/api/auth/change-password` | Cambio password (richiede password attuale) |

### Hypervisors
| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET | `/api/hypervisors` | Lista hypervisor configurati (senza credenziali) |
| POST | `/api/hypervisors` | Aggiungi hypervisor (auto-detect nodo Proxmox) |
| PUT | `/api/hypervisors/:id` | Modifica hypervisor (partial update) |
| DELETE | `/api/hypervisors/:id` | Rimuovi hypervisor |
| GET | `/api/hypervisors/:id/test` | Test connessione + info nodo (hostname, versione) |
| GET | `/api/hypervisors/:id/status` | Stato risorse nodo (CPU, RAM, disco) |
| GET | `/api/hypervisors/:id/storages` | Lista storage Proxmox con uso e capacità |

### Virtual Machines
| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET | `/api/vms` | Lista tutte le VM (da tutti gli hypervisor attivi) |
| GET | `/api/vms/:hypervisorId/:vmId` | Dettaglio singola VM + config |
| POST | `/api/vms/:hypervisorId/:vmId/start` | Avvia VM |
| POST | `/api/vms/:hypervisorId/:vmId/stop` | Ferma VM |
| POST | `/api/vms/:hypervisorId/:vmId/restart` | Riavvia VM |
| POST | `/api/vms/:hypervisorId/:vmId/suspend` | Sospendi VM |
| DELETE | `/api/vms/:hypervisorId/:vmId` | Elimina VM (stop automatico se running) |
| POST | `/api/vms/create` | **Crea VM da template** (clone + cloud-init + resize + start) |
| GET | `/api/vms/logs` | Log attività VM (parametro `limit`, default 50) |

### Templates
| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET | `/api/templates` | Lista template salvati (con nome hypervisor) |
| GET | `/api/templates/discover/:hypervisorId` | Auto-discover template dall'hypervisor |
| POST | `/api/templates` | Salva template |
| DELETE | `/api/templates/:id` | Elimina template |

### Settings
| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET | `/api/settings` | Tutte le impostazioni (key-value, JSON-parsed) |
| GET | `/api/settings/:key` | Singola impostazione |
| PUT | `/api/settings/:key` | Crea/aggiorna impostazione (upsert) |

### Updates & Licenze
| Metodo | Route | Descrizione |
|--------|-------|-------------|
| GET | `/api/updates` | Controlla aggiornamenti disponibili (via VIBEVault) |
| POST | `/api/updates/install` | Scarica e installa aggiornamento (esegue `update.sh` in background) |
| GET | `/api/license` | Informazioni licenza e server ID |
| POST | `/api/license/activate` | Attiva o aggiorna licenza (chiave VV- + email) |
| POST | `/api/license/verify` | Verifica licenza corrente con VIBEVault |

### WebSocket
| Protocollo | Route | Descrizione |
|------------|-------|-------------|
| WS | `/ws` | Stream real-time stato VM + nodi + storage (polling 5s) |
| WS | `/ws/ssh` | Console SSH web — proxy bidirezionale tra browser e VM via ssh2 |

---

## 9. Creazione VM da Template

Questo è il flusso core del progetto, implementato nel `ProxmoxAdapter.cloneFromTemplate()`:

### 9.1 Flusso di Creazione

```
1. Frontend invia POST /api/vms/create
2. Backend risolve template_id → source_vm_id
3. ProxmoxAdapter:
   a. Ottiene prossimo VM ID libero (/cluster/nextid)
   b. Clone del template (full clone)
   c. Attende completamento task clone (polling /tasks/{upid}/status)
   d. Rileva storage dal disco esistente
   e. Aggiunge drive cloud-init se assente (ide0/ide1/ide3)
   f. Resize disco se richiesto (solo grow, Proxmox non può shrink)
   g. Genera MAC address univoco per net0 (evita conflitti DHCP)
   h. Configura VM: cores, memory, agent, net0, cloud-init (hostname, IP, DNS, SSH keys)
   i. Avvia la VM
   j. [Async, non-blocking] Rigenera machine-id + rinnova DHCP lease
   k. [Async, non-blocking] Espande partizione + filesystem via guest agent
```

### 9.2 Payload Creazione VM

```json
{
    "hypervisor_id": 1,
    "template_id": 1,
    "name": "web-server-03",
    "hostname": "web-server-03",
    "network": {
        "ip": "172.0.10.50",
        "netmask": "255.255.255.0",
        "gateway": "172.0.10.1",
        "dns": ["8.8.8.8", "1.1.1.1"]
    },
    "resources": {
        "cores": 2,
        "memory_mb": 4096,
        "disk_gb": 40
    },
    "post_install": {
        "auto_update": true,
        "packages": ["nginx", "curl"],
        "ssh_keys": ["ssh-rsa AAAA..."]
    }
}
```

**Nota:** si può passare `template_vm_id` (stringa) direttamente al posto di `template_id` per bypassare il lookup nel DB.

### 9.3 Cloud-Init via Proxmox API

Il backend NON genera file YAML cloud-init. Configura cloud-init tramite i parametri nativi dell'API Proxmox.

**Modalita rete supportate:**
- **DHCP**: `ipconfig0: "ip=dhcp"` — la VM ottiene IP automaticamente dal server DHCP
- **IP Statico**: `ipconfig0: "ip=172.0.10.50/24,gw=172.0.10.1"` — IP e gateway configurati manualmente

```
PUT /nodes/{node}/qemu/{vmid}/config
{
    ciuser: "root",
    ciupgrade: 1,                          # auto-update
    ipconfig0: "ip=dhcp",                  # oppure "ip=172.0.10.50/24,gw=172.0.10.1"
    nameserver: "8.8.8.8 1.1.1.1",        # opzionale con DHCP
    searchdomain: "local",
    name: "web-server-03",                 # hostname
    sshkeys: "ssh-rsa%20AAAA...",          # URL-encoded
    agent: "1,fstrim_cloned_disks=1"       # abilita guest agent
}
```

### 9.4 Espansione Disco via Guest Agent

Dopo l'avvio della VM, il backend tenta (in modo non-blocking) di espandere la partizione e il filesystem via `qemu-guest-agent`:

```
POST /nodes/{node}/qemu/{vmid}/agent/exec
{
    command: "/bin/bash",
    "input-data": "growpart /dev/sda 3\npvresize /dev/sda3\nlvextend -l +100%FREE ...\nresize2fs ..."
}
```

**Importante:** il guest agent exec di Proxmox richiede il parametro `input-data` per passare script complessi via stdin. Il pattern `arg-0, arg-1` NON funziona per comandi multi-step.

### 9.5 MAC Address Univoco e DHCP

Quando si clona un template, Proxmox copia anche il MAC address della NIC. Questo causa conflitti DHCP: il router assegna lo stesso IP a VM diverse perché riconosce lo stesso DUID (derivato dal `machine-id` del sistema operativo).

**Soluzione implementata (doppia):**

1. **MAC address random**: ad ogni clone viene generato un nuovo MAC address con prefisso locally-administered (`x2:xx:xx:xx:xx:xx`) e applicato a `net0`, preservando bridge e firewall dal template.

2. **Rigenerazione machine-id post-boot**: via guest agent, dopo l'avvio della VM:
   - Cancella `/etc/machine-id` e lo rigenera con `systemd-machine-id-setup`
   - Rimuove i vecchi lease DHCP (dhclient, NetworkManager, systemd-networkd)
   - Riavvia il networking per ottenere un nuovo lease con il DUID corretto

### 9.6 Auto-installazione QEMU Guest Agent (v1.2.4)

Alla creazione di ogni nuova VM, il backend cerca automaticamente uno storage Proxmox con supporto `snippets` e carica un file cloud-init **vendor-data** che installa `qemu-guest-agent` al primo boot.

**Flusso:**
1. `findSnippetStorage()` — cerca uno storage con `content` che include `snippets`
2. `uploadVendorData(vmId, storage)` — carica un file YAML via `POST /nodes/{node}/storage/{storage}/upload` (multipart/form-data)
3. Imposta `cicustom: vendor={storage}:snippets/vibevps-{vmId}-vendor.yml` nella config VM
4. Al primo boot, cloud-init installa e avvia `qemu-guest-agent` automaticamente

**Vendor-data YAML:**
```yaml
#cloud-config
packages:
  - qemu-guest-agent
runcmd:
  - systemctl enable qemu-guest-agent
  - systemctl start qemu-guest-agent
```

**Note:**
- Usa il tipo `vendor` (non `user`) per non sovrascrivere i parametri cloud-init standard di Proxmox (ciuser, ipconfig0, sshkeys)
- Se nessuno storage supporta snippets, la creazione VM procede normalmente senza guest agent pre-installato
- Il guest agent è necessario per il rilevamento automatico dell'IP della VM (usato dalla console SSH)

### 9.7 Console SSH Web (v1.2.0)

La pagina VmDetail include un pulsante "SSH" (visibile solo quando la VM è running) che apre un terminale web integrato per connettersi in SSH alla VM.

**Architettura:**
```
Browser (xterm.js) ←→ WebSocket /ws/ssh ←→ Backend (ssh2) ←→ SSH ←→ VM
```

**Flusso:**
1. L'utente clicca "SSH" → si apre un dialog modale con form login (username/password)
2. Il frontend apre una connessione WebSocket a `/ws/ssh?hypervisorId=X&vmId=Y`
3. Invia le credenziali SSH via messaggio `{ type: 'auth', username, password }`
4. Il backend:
   - Recupera l'IP della VM tramite QEMU Guest Agent (`/agent/network-get-interfaces`)
   - Fallback: campo `ip` dal detail VM, oppure `ipconfig0` dalla config cloud-init
   - Apre connessione SSH alla VM con la libreria `ssh2`
   - Risponde con `{ type: 'status', status: 'connected' }`
5. Il frontend inizializza xterm.js nel div del terminale (callback ref)
6. Proxy bidirezionale: dati terminale + resize tra WebSocket e SSH stream

**Protocollo WebSocket SSH:**
```
Client → Server: { type: 'auth', username, password }
Client → Server: { type: 'data', data: string }
Client → Server: { type: 'resize', cols, rows }
Server → Client: { type: 'data', data: string }
Server → Client: { type: 'status', status: 'connected' | 'error' | 'disconnected', message? }
```

**File coinvolti:**
- `backend/src/ws/ssh.handler.ts` — handler WebSocket, proxy SSH via ssh2
- `frontend/src/components/SshTerminal.tsx` — componente React con xterm.js
- `frontend/src/pages/VmDetail.tsx` — pulsante SSH + dialog modale

**Prerequisiti sulla VM:**
- Il pacchetto `qemu-guest-agent` deve essere installato e attivo
- L'opzione `agent=1` deve essere abilitata nella config Proxmox della VM
- La VM deve essere raggiungibile via SSH (porta 22) dal server VIBEVps
- Dopo aver abilitato `agent=1`, è necessario un riavvio della VM

---

## 10. Proxmox Adapter - Interfaccia

```typescript
interface HypervisorAdapter {
    testConnection(): Promise<boolean>;
    getNodeStatus(): Promise<NodeStatus>;
    listStorages(): Promise<StorageInfo[]>;
    listVMs(): Promise<VM[]>;
    getVM(vmId: string): Promise<VMDetail>;
    startVM(vmId: string): Promise<string>;
    stopVM(vmId: string): Promise<string>;
    restartVM(vmId: string): Promise<string>;
    suspendVM(vmId: string): Promise<string>;
    deleteVM(vmId: string): Promise<string>;
    cloneFromTemplate(config: CreateVMConfig): Promise<string>;
    getNextVmId(): Promise<number>;
}
```

**Note sull'interfaccia reale:**
- I metodi VM restituiscono `Promise<string>` (UPID del task Proxmox), non `Promise<void>`
- Non esiste `listTemplates()` — i template vengono scoperti filtrando `listVMs()` per `template === true`
- Non esiste `getVMMetrics()` — le metriche arrivano via WebSocket (polling `listVMs` + `getNodeStatus`)
- Non esiste `getVNCTicket()` — la console VNC non è implementata (SSH proxy usato al suo posto)

### Chiamate Proxmox API utilizzate:

| Operazione | Metodo | Endpoint Proxmox |
|------------|--------|-------------------|
| Auto-detect nodo | GET | `/api2/json/nodes` |
| Stato nodo | GET | `/api2/json/nodes/{node}/status` |
| Lista VM | GET | `/api2/json/nodes/{node}/qemu` |
| Dettaglio VM | GET | `/api2/json/nodes/{node}/qemu/{vmid}/status/current` |
| Config VM | GET | `/api2/json/nodes/{node}/qemu/{vmid}/config` |
| Avvia | POST | `/api2/json/nodes/{node}/qemu/{vmid}/status/start` |
| Ferma | POST | `/api2/json/nodes/{node}/qemu/{vmid}/status/stop` |
| Riavvia | POST | `/api2/json/nodes/{node}/qemu/{vmid}/status/reboot` |
| Sospendi | POST | `/api2/json/nodes/{node}/qemu/{vmid}/status/suspend` |
| Elimina | DELETE | `/api2/json/nodes/{node}/qemu/{vmid}` |
| Clone | POST | `/api2/json/nodes/{node}/qemu/{vmid}/clone` |
| Config VM | PUT | `/api2/json/nodes/{node}/qemu/{vmid}/config` |
| Resize disco | PUT | `/api2/json/nodes/{node}/qemu/{vmid}/resize` |
| Stato task | GET | `/api2/json/nodes/{node}/tasks/{upid}/status` |
| Prossimo ID | GET | `/api2/json/cluster/nextid` |
| Guest agent info | GET | `/api2/json/nodes/{node}/qemu/{vmid}/agent/info` |
| Guest agent exec | POST | `/api2/json/nodes/{node}/qemu/{vmid}/agent/exec` |
| Guest agent IP | GET | `/api2/json/nodes/{node}/qemu/{vmid}/agent/network-get-interfaces` |
| Lista storage | GET | `/api2/json/nodes/{node}/storage` |
| Upload snippet | POST | `/api2/json/nodes/{node}/storage/{storage}/upload` |

---

## 11. Pagine Frontend

### 11.1 Dashboard
- Riepilogo hypervisor connessi (stato, CPU, RAM, disco del nodo) con icona refresh manuale
- **Traffico di rete**: card affiancata al nodo, mostra Download/Upload in tempo reale (bytes/sec) aggregando netin/netout di tutte le VM. Rate calcolato dal delta tra due snapshot WebSocket (5s). Barre colorate (verde IN, blu OUT), totali cumulativi e combinato.
- Conteggio VM totali / running / stopped
- **Monitoraggio storage**: card per ogni storage abilitato dall'utente nelle Settings, con barra d'uso, tipo, spazio usato/totale. Aggiornamento real-time via WebSocket. Link "Configura" per gestire la visibilità.
- Ultime attività (log)

### 11.2 Lista VM (`/vms`)
- Tabella con: nome, stato (running/stopped/suspended), CPU%, RAM%, hypervisor
- Azioni rapide: start/stop/restart inline

### 11.3 Dettaglio VM (`/vms/:hypervisorId/:vmId`)
- Info complete: cores, RAM, disco, network, uptime
- Aggiornamento real-time via WebSocket
- Azioni: start, stop, restart, suspend, delete
- **Console SSH**: pulsante "SSH" (visibile solo VM running) apre terminale web integrato

### 11.4 Crea VM (`/create`)
- Wizard a 5 step: Template → Identita → Rete → Risorse → Riepilogo
- **Rete**: toggle DHCP / IP Statico. In modalita DHCP i campi IP, Netmask e Gateway sono nascosti. DNS opzionale in entrambi i modi.
- Post-install: auto-update, pacchetti extra, SSH keys

### 11.5 Gestione Hypervisor (`/hypervisors`)
- Lista hypervisor configurati
- Form aggiungi/modifica (host, porta, token API)
- Test connessione con info nodo
- Modale di conferma eliminazione

### 11.6 Templates (`/templates`)
- Lista template salvati
- Auto-discover template dall'hypervisor
- Eliminazione con conferma

### 11.7 Logs (`/logs`)
- Log attività VM con dettagli

### 11.8 Settings (`/settings`)
- Profilo utente
- **Storage in Dashboard**: per ogni hypervisor, lista di tutti gli storage disponibili con toggle on/off. Lo stato viene salvato nella tabella `settings` con chiave `dashboard_storages` (JSON array). Il salvataggio è immediato al click.
- Cambio password

### 11.9 Aggiornamenti (`/updates`)
- **Versione corrente**: badge con versione installata
- **Check aggiornamenti**: controlla VIBEVault per nuove versioni disponibili
- **Installazione online**: scarica e applica l'aggiornamento in background (usa `update.sh`), la pagina si ricarica automaticamente dopo 15 secondi
- **Download manuale**: link diretto al file zip
- **Changelog**: timeline visuale delle versioni con lista modifiche
- **Gestione licenza**: mostra piano, cliente, limiti (max hypervisors/VMs), scadenza, server ID
- **Attivazione/Upgrade licenza**: form per inserire nuova chiave VV- ed email cliente

---

## 12. Tema e Design

Coerente con la suite VIBESystems:

| Elemento | Colore |
|----------|--------|
| **Primario** | Cyan/Teal (`#06b6d4` - cyan-500) |
| **Accento** | Blue (`#3b82f6` - blue-500) |
| **Sfondo** | Slate scuro (`#0f172a` - slate-900) |
| **Card** | Slate (`#1e293b` - slate-800) |
| **Testo** | Slate chiaro (`#e2e8f0` - slate-200) |
| **Successo** | Green-500 |
| **Warning** | Amber-500 |
| **Errore** | Red-500 |

Dark theme di default. TailwindCSS v4 (plugin Vite, senza file `tailwind.config.ts`).

### 12.2 Responsive Design (v1.3.0)

L'intera webapp è completamente responsive, ottimizzata per mobile, tablet e desktop.

**Breakpoint strategy:**

| Breakpoint | Larghezza | Comportamento |
|-----------|-----------|---------------|
| Default | < 640px | Mobile: sidebar nascosta, layout single-column, card-based |
| `sm:` | >= 640px | Small tablet: griglie 2 colonne, label visibili |
| `md:` | >= 768px | Tablet: griglie intermedie |
| `lg:` | >= 1024px | Desktop: sidebar sempre visibile, tabelle, layout completo |

**Componenti chiave:**

- **Sidebar**: nascosta su mobile con hamburger menu nell'header, overlay scuro, slide-in animato. Su desktop (`lg:`) sempre visibile e statica
- **Layout**: header mobile sticky con hamburger + logo. Padding `p-4` su mobile, `p-6` su desktop
- **Modal**: bottom-sheet su mobile (sale dal basso), centrato su desktop. Scroll interno per contenuti lunghi
- **VmList**: tabella su desktop, card list su mobile con info compatte e azioni inline
- **VmDetail**: pulsanti azioni wrappano su mobile, testo nascosto su schermi piccoli (solo icone)
- **CreateVm**: step indicator compatto su mobile (solo icone, no label), scroll orizzontale
- **SshTerminal**: altezza adattiva (`300px` mobile, `400px` tablet, `450px` desktop)

### 12.3 Lingua dell'interfaccia (v1.3.1)

A partire dalla versione 1.3.1, l'intera interfaccia utente e tutti i messaggi API sono in **inglese**. Non è presente un sistema i18n — le stringhe sono hardcoded nei componenti React e nelle route backend. La traduzione ha coinvolto 15 file frontend e 9 file backend (~230 stringhe totali). Anche i formati data sono stati aggiornati da `it-IT` a `en-US`.

---

## 13. Sicurezza

Stato attuale:
- JWT con scadenza 8h (no refresh token)
- Password utenti hash con bcrypt (salt 10 rounds)
- CORS configurabile via env `CORS_ORIGIN` (default: `http://localhost:5173`)
- Validazione input con Zod sulle route principali (auth, hypervisors, vms/create, templates)
- HTTPS in produzione (behind reverse proxy)

**Non ancora implementato:**
- Crittografia API token hypervisor nel DB (la chiave `encryptionKey` è predisposta in `config.ts` ma non utilizzata)
- Rate limiting su login
- Refresh token
- Multi-utente con ruoli/permessi (il campo `role` esiste ma non è usato per autorizzazione)

---

## 14. Installer e Sistema di Aggiornamento

### 14.1 Installer (`installer/vibevps-installer-v1.0.0/`)

Script di installazione automatica per Ubuntu 24.04 LTS. Installa: Node.js 20, PM2, Nginx, VIBEVps.

**Non richiede** MySQL o altri servizi — VIBEVps usa SQLite embedded.

```bash
unzip vibevps-installer-v1.0.0.zip
cd vibevps-installer-v1.0.0
sudo ./install.sh
```

**Flusso install.sh:**
1. Verifica root + OS Ubuntu 24.04
2. Chiede porta Nginx (default: 80)
3. Auto-genera JWT_SECRET e ENCRYPTION_KEY
4. Installa Node.js 20 via NodeSource (GPG + apt repo)
5. Installa PM2 + configura startup automatico
6. Installa Nginx + virtual host (reverse proxy → porta 3001, WebSocket su `/ws`)
7. Copia sorgenti in `/var/www/vibevps`
8. Crea `.env` da template con credenziali generate
9. `npm install` + `npm run build`
10. Crea `ecosystem.config.cjs` per PM2 (carica `.env` via `--env-file`)
11. Avvia con PM2 + salva

**Directory produzione:** `/var/www/vibevps`
**Processo PM2:** `vibevps`
**Database:** `/var/www/vibevps/data/vibevps.db` (creato automaticamente al primo avvio)
**Credenziali default:** `admin` / `admin123!`

### 14.2 Sistema di Aggiornamento Online

Il sistema di aggiornamento segue lo stesso modello di VIBERad, integrato con VIBEVault (license server), ma **senza richiedere licenza**. Gli aggiornamenti sono sempre disponibili gratuitamente.

**Differenza rispetto a VIBERad:** VIBERad usa `POST /api/updates/check` (richiede licenza valida). VIBEVps usa `POST /api/updates/check-free` (nessuna licenza richiesta, solo `product` e `current_version`).

**Flusso aggiornamento:**
1. La pagina `/updates` chiama `GET /api/updates` → il backend contatta VIBEVault (`POST /api/updates/check-free`)
2. Se c'è un aggiornamento, mostra versione, changelog e pulsante "Installa"
3. Click su "Installa" → `POST /api/updates/install`:
   - Riceve `downloadTokens` (oggetto con token per ogni versione), `targetVersion`, `changelog`
   - Calcola il path di aggiornamento (supporta salti multi-versione via `update-sequencer`)
   - Scarica lo zip dal license server usando il token della versione corretta
   - Salva la chain in `/tmp/update-chain.json` per aggiornamenti multi-step
   - Lancia `scripts/update.sh` in background (nohup)
4. `update.sh` esegue:
   - Lock file anti-duplicazione
   - Backup completo (sorgenti + DB + .env)
   - Estrazione zip (esclude `.env`, `node_modules/`, `data/`)
   - Clean install dipendenze + rebuild
   - Restart PM2
   - Pulizia backup vecchi (mantiene ultimi 5)
   - Version history tracking (`.version-history.json`)

**License server:** `https://vibevault.vibesystems.dev`
**Prefisso chiavi licenza:** `VV-` (opzionale, per funzionalità premium future)

### 14.4 Generazione Pacchetti Update

Lo script `installer/build-update.sh` genera i pacchetti zip da caricare su VIBEVault.

**Contenuto dello zip:**
```
vibevps/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/          # Sorgenti TypeScript completi
├── frontend/
│   ├── package.json, vite.config.ts, index.html, tsconfig*.json
│   ├── src/          # Sorgenti React completi
│   └── public/       # Asset statici
├── scripts/
│   └── update.sh     # Script di aggiornamento
├── package.json      # Root workspace
└── package-lock.json
```

**Esclusi:** `node_modules/`, `.env`, `data/`, `.git/`, `installer/`, `docs/`

**Flusso pubblicazione:**
```bash
# 1. Aggiornare la versione in package.json
# 2. Generare il pacchetto
cd installer && bash build-update.sh

# 3. Caricare su VIBEVault
scp vibevps-update-v{VERSION}.zip fabrizio@172.0.10.201:/var/www/vibevault/updates/VIBEVps/{VERSION}/vibevps.zip

# 4. Aggiornare il manifest su VIBEVault (o tramite admin panel)
```

**Struttura su VIBEVault:**
```
/var/www/vibevault/updates/VIBEVps/
├── manifest.json        # Indice versioni con changelog e file_size
├── 1.0.0/
│   └── vibevps.zip
└── {VERSION}/
    └── vibevps.zip
```

**Endpoint VIBEVault per prodotti free:**
- `POST /api/updates/check-free` — body: `{ product, current_version }` → restituisce `download_tokens` per versione
- `GET /api/updates/download/:token` — scarica lo zip (token monouso, scade dopo 1h)

### 14.3 Variabili Ambiente Produzione (`.env`)

```env
PORT=3001
HOST=0.0.0.0
JWT_SECRET=<auto-generato>
DB_PATH=/var/www/vibevps/data/vibevps.db
CORS_ORIGIN=http://<server-ip>:<nginx-port>
ENCRYPTION_KEY=<auto-generato>
```

---

## 15. Fasi di Sviluppo

### Fase 1 - Core (MVP) — Completata

- [x] Setup progetto (Vite + Fastify + SQLite + npm workspaces)
- [x] Auth (login, JWT, cambio password)
- [x] Registrazione hypervisor Proxmox (con auto-detect nodo)
- [x] Lista VM dall'hypervisor
- [x] Azioni base: start, stop, restart, suspend, delete
- [x] Dashboard con overview
- [x] WebSocket per aggiornamenti real-time (polling 5s)

### Fase 2 - Creazione VM — Completata
- [x] Gestione template (CRUD + auto-discover)
- [x] Creazione VM da template con cloud-init via API Proxmox
- [x] IP statico + hostname + DNS
- [x] Supporto DHCP nella creazione VM
- [x] MAC address univoco per ogni clone (evita conflitti DHCP)
- [x] Rigenerazione machine-id post-boot (nuovo DUID per DHCP)
- [x] Resize disco + espansione filesystem via guest agent
- [x] Abilitazione automatica qemu-guest-agent
- [x] Log attività con stato success/error

### Fase 2.5 - Installer e Aggiornamenti — Completata
- [x] Installer automatico per Ubuntu 24.04 (`install.sh`)
- [x] Script di aggiornamento online (`update.sh`) con backup, chain mode, rsync extraction
- [x] Pagina Aggiornamenti frontend con check, install, changelog
- [x] Gestione licenza (attivazione, verifica, upgrade via VIBEVault)
- [x] Update sequencer per aggiornamenti multi-versione
- [x] Ecosystem PM2 con caricamento `.env`
- [x] Script `build-update.sh` per generazione pacchetti update locali
- [x] Endpoint `check-free` su VIBEVault (aggiornamenti senza licenza)
- [x] Download tokens per versione (`downloadTokens` object)

### Fase 2.6 - Filtro Multi-Hypervisor — Completata (v1.1.0)
- [x] Filtro hypervisor in Dashboard (stats, nodi, storage, traffico, VM recenti)
- [x] Filtro hypervisor in VM List (accanto a search e status filter)
- [x] Filtro hypervisor in Templates
- [x] Filtri visibili solo con 2+ hypervisor configurati
- [x] CreateVm: selettore hypervisor già presente nello step Template

### Fase 2.7 - Console SSH Web — Completata (v1.2.0 → v1.2.5)
- [x] Console SSH web integrata nella pagina VM (xterm.js + ssh2)
- [x] Proxy WebSocket bidirezionale (browser ↔ backend ↔ VM)
- [x] Rilevamento automatico IP via QEMU Guest Agent con fallback multipli
- [x] Auto-installazione qemu-guest-agent via cloud-init vendor-data su nuove VM
- [x] Supporto resize terminale e buffer dati pre-rendering

### Fase 3 - Monitoraggio — Non implementata
- [ ] Grafici CPU/RAM/Rete per VM (metriche Proxmox rrddata)
- [ ] Grafici risorse nodo hypervisor
- [ ] Console VNC integrata (noVNC)

### Fase 4 - Funzionalità Avanzate — Non implementata
- [ ] Supporto VMware ESXi (adapter)
- [ ] Snapshot: crea, ripristina, elimina
- [ ] Backup VM schedulati
- [ ] Migrazione VM tra nodi
- [ ] Template builder (converti VM in template)
- [ ] Notifiche (email/webhook) per eventi VM
- [ ] API pubblica con chiavi API
- [ ] Multi-utente con permessi (admin/viewer)
- [ ] Crittografia token hypervisor nel DB
- [ ] Rate limiting login

---

## 16. Dipendenze Principali

### Backend
```json
{
    "fastify": "^5.8.2",
    "better-sqlite3": "^12.6.2",
    "@fastify/jwt": "^10.0.0",
    "@fastify/cors": "^11.2.0",
    "@fastify/websocket": "^11.2.0",
    "@fastify/static": "^9.0.0",
    "zod": "^4.3.6",
    "bcrypt": "^6.0.0",
    "undici": "^7.24.0",
    "ssh2": "^1.16.0"
}
```

### Frontend
```json
{
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.1",
    "zustand": "^5.0.11",
    "recharts": "^3.8.0",
    "tailwindcss": "^4.2.1",
    "@tailwindcss/vite": "^4.2.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "lucide-react": "^0.577.0",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-toast": "^1.2.15",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0"
}
```

---

## 17. Comandi di Sviluppo

```bash
# Install dipendenze (workspace root)
npm install

# Dev mode (backend + frontend in parallelo)
npm run dev

# Solo backend
npm run dev:backend    # tsx watch, porta 3001

# Solo frontend
npm run dev:frontend   # vite, porta 5173

# Lint (solo frontend)
cd frontend && npm run lint

# Build produzione
npm run build          # frontend (vite) + backend (tsc)

# Start produzione
npm run start          # Fastify serve anche i file statici del frontend
```

---

## 18. Deploy in Produzione

### Installazione automatica (consigliata)
```bash
unzip vibevps-installer-v1.0.0.zip
cd vibevps-installer-v1.0.0
sudo ./install.sh
```
Vedi sezione 14.1 per il flusso completo.

### Struttura produzione (`/var/www/vibevps`)
```
vibevps/
├── backend/
│   ├── src/           # Sorgenti TypeScript
│   └── dist/          # Codice compilato (tsc + schema.sql copiato)
├── frontend/
│   ├── src/           # Sorgenti React
│   └── dist/          # Build statica (servita da Fastify)
├── scripts/
│   └── update.sh      # Script aggiornamento online
├── data/
│   └── vibevps.db     # Database SQLite
├── .env               # Variabili ambiente (generato dall'installer)
└── ecosystem.config.cjs  # Config PM2
```

- **PM2**: processo `vibevps` (avviato via `ecosystem.config.cjs`)
- **Porta**: 3001 (dietro reverse proxy Nginx sulla porta 80)
- **Nginx**: proxy `/` → `localhost:3001`, supporto WebSocket su `/ws`
- **Database**: `/var/www/vibevps/data/vibevps.db` (file singolo, incluso nel backup automatico)
- **SPA fallback**: Fastify serve `index.html` per tutte le route non-API
- **Utente default**: `admin` / `admin123!`
- **Aggiornamenti**: pagina `/updates` o manualmente via `scripts/update.sh`

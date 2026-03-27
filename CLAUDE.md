# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VIBEVps is a web dashboard for managing Proxmox VE hypervisors and virtual machines. It connects to hypervisors via API, lists/controls VMs, and provisions new VMs from templates with cloud-init configuration (hostname, static IP, auto-update).

## Commands

```bash
# Install dependencies (npm workspaces)
npm install

# Dev mode (backend :3001 + frontend :5173 concurrently)
npm run dev

# Individual services
npm run dev:backend    # tsx watch, port 3001
npm run dev:frontend   # vite, port 5173

# Build
npm run build          # builds frontend then backend

# Lint (frontend only)
cd frontend && npm run lint

# Production
npm run start          # runs compiled backend which also serves frontend static files
```

No test framework is configured.

## Architecture

**Monorepo** with npm workspaces: `backend/` and `frontend/`.

### Backend (Fastify + TypeScript)
- **Entry**: `backend/src/server.ts` — registers plugins (CORS, JWT, WebSocket) and route modules
- **Config**: `backend/src/config.ts` — env vars with defaults (PORT=3001, DB_PATH=`data/vibevps.db`)
- **Database**: SQLite via `better-sqlite3`, schema auto-applied from `backend/src/db/schema.sql`, WAL mode. DB file lives at project root `data/vibevps.db`
- **Auth**: JWT (8h expiry) + bcrypt. Guard in `auth/auth.guard.ts`. Default user: `admin` / `admin123!`
- **Hypervisor Adapter Pattern**: `hypervisors/adapters/adapter.interface.ts` defines `HypervisorAdapter`. Currently only `ProxmoxAdapter` implemented. Adapters are cached per hypervisor ID in `hypervisor.service.ts`
- **Proxmox API**: Direct HTTP calls via `undici` to Proxmox REST API (port 8006). Auth via API tokens (`PVEAPIToken=user@realm!tokenid=secret`)
- **VM Creation Flow**: Clone template → apply cloud-init config (hostname, IP, DNS) → add cloud-init drive if missing → enable guest agent → resize disk → start VM
- **Guest Agent Exec**: Uses `input-data` parameter with bash stdin pattern (not `arg-0, arg-1`). This is critical for commands like disk expansion via qemu-guest-agent
- **WebSocket**: `ws/ws.hub.ts` for real-time VM status updates
- **ESM**: Backend uses `"type": "module"` — imports use `.js` extensions

### Frontend (React + Vite + TailwindCSS v4)
- **Routing**: `react-router-dom` v7, SPA with `BrowserRouter`. Routes defined in `App.tsx`
- **State**: Zustand stores in `store/` (`auth.ts`, `vms.ts`)
- **API Client**: `api/client.ts` — singleton `ApiClient` class, handles JWT in localStorage (`vvps_token`), auto-redirects to `/login` on 401
- **UI Components**: Radix UI primitives + custom components in `components/ui/`. Layout in `components/layout/`
- **Pages**: Dashboard, VmList, VmDetail, CreateVm, Hypervisors, Templates, Logs, Settings
- **Vite Proxy**: `/api` → `localhost:3001`, `/ws` → `ws://localhost:3001`
- **Path alias**: `@/` maps to `frontend/src/`
- **Theme**: Dark theme, Cyan/Teal primary (`cyan-500`), Slate backgrounds

### API Routes
All prefixed with `/api`:
- `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`
- `GET|POST /hypervisors`, `PUT|DELETE /hypervisors/:id`, `GET /hypervisors/:id/test`, `GET /hypervisors/:id/status`
- `GET /vms`, `GET /vms/:hypervisorId/:vmId`, `POST /vms/:hypervisorId/:vmId/:action`, `DELETE /vms/:hypervisorId/:vmId`, `POST /vms/create`
- `GET /templates`, `GET /templates/discover/:hypervisorId`, `POST /templates`, `DELETE /templates/:id`

## Key Patterns

- **Hypervisor credentials** are stored in chiaro in SQLite (crittografia AES-256-GCM predisposta ma non implementata)
- **Node name** must match actual Proxmox node (e.g. `dev`, not default `pve`) — auto-detected via test endpoint
- Backend serves the frontend build from `frontend/dist/` in production with SPA fallback
- Input validation uses Zod schemas on route handlers
- **UI language is English** — all UI text, error messages, labels, and API responses MUST be in English. This is a mandatory rule: every new feature, fix, or update MUST use English only. No Italian or other languages in the codebase.

## Update System

VIBEVps uses an external update server for distributing updates **without requiring a license**.

### Versioning Rules (Semantic Versioning)

VIBEVps uses **Semantic Versioning**: `MAJOR.MINOR.PATCH`

| Type | When to Use |
|------|-------------|
| **MAJOR (X.0.0)** | Architectural changes, breaking changes, incompatible modifications, or reinstallation required |
| **MINOR (1.X.0)** | New features, new pages, new APIs, or integrations while maintaining backward compatibility |
| **PATCH (1.1.X)** | Bug fixes, UI improvements, text changes, minor behavioral tweaks with no structural impact |

- **Do NOT skip versions**
- **Do NOT reuse version numbers**
- The manifest changelog must **exactly reflect** the changes introduced in the update

### Regola fondamentale (OBBLIGATORIA)

**Ogni modifica, patch, fix o feature DEVE sempre e solo produrre un pacchetto update** seguendo la procedura sotto. **NON caricare MAI il pacchetto sul server di update** — il deploy è sempre responsabilità dell'utente. Non inviare file via SSH/SCP a nessun server di produzione.

### Creating a new update package

When a new version is ready:

1. Bump version in root `package.json`
2. Run `cd installer && bash build-update.sh "changelog description here"`
3. This generates:
   - `installer/updates/{VERSION}/vibevps.zip` — the update package
   - `installer/updates/manifest.json` — updated manifest with all versions
4. **STOP** — the user will manually upload the zip + manifest to the update server
5. Also update the installer (`installer/vibevps-installer-v{VERSION}/`) with the latest sources and rebuild its zip

### Output structure
```
installer/updates/
├── manifest.json          # Manifest with all versions (upload to update server)
├── 1.0.0/
│   └── vibevps.zip
├── 1.1.0/
│   └── vibevps.zip
└── ...
```

### Key files
- `installer/build-update.sh` — generates update zip + updates manifest
- `backend/src/updates/license.service.ts` — calls `check-free` endpoint (no license needed)
- `backend/src/updates/updates.routes.ts` — handles install with per-version `downloadTokens`

## Workflow Documentazione (OBBLIGATORIO)

### Per ogni nuova implementazione/feature richiesta:
1. **PRIMA di scrivere codice**, creare un documento di specifica in `docs/` con nome: `GG-MM-AA-HH-MM-nome-implementazione.md` (es. `14-03-26-15-30-console-vnc.md`)
2. Il documento deve descrivere: obiettivo, approccio tecnico, file coinvolti, modifiche previste
3. **Attendere l'approvazione esplicita dell'utente** prima di procedere con l'implementazione

### Dopo ogni implementazione, fix o modifica:
1. **Chiedere sempre all'utente se funziona** — non dare per scontato che il codice sia corretto
2. **Se funziona**: aggiornare la documentazione principale `docs/documentazione-tecnica-vibevps.md` e qualsiasi altro doc correlato in `docs/`
3. **Se NON funziona**: procedere con debug e fix, poi chiedere di nuovo conferma. Ripetere finché l'utente non conferma che tutto è OK
4. **La documentazione principale si aggiorna SOLO dopo conferma positiva dell'utente** — mai prima

## Version History

Current application version: **1.3.9**

| Version | Type | Date | Description |
|---------|------|------|-------------|
| **1.3.9** | PATCH | 27 Mar 2026 | Fix hostname and IP not applied on new VMs: delete cloned cloud-init drive and recreate it fresh so Proxmox generates the image with the correct settings instead of using stale template data |
| **1.3.8** | PATCH | 27 Mar 2026 | Fix static IP assignment: force cloud-init drive regeneration after config update; reset template selection when hypervisor changes to prevent stale vmid |
| **1.3.7** | PATCH | 27 Mar 2026 | Fix template real specs: backend reads VM config from Proxmox for accurate cores/RAM/disk (maxdisk=0 for stopped VMs); frontend prefers live Proxmox values over stored defaults |
| **1.3.6** | PATCH | 27 Mar 2026 | Templates: real CPU/RAM/disk specs read from Proxmox; auto-fill form on discover; specs shown in Create VM template cards |
| **1.3.5** | PATCH | 26 Mar 2026 | Templates auto-refresh after adding new template; manual refresh button on Dashboard and VM List pages |
| **1.3.4** | PATCH | 26 Mar 2026 | Fix sequential updates: download all update zips before launching script, fixes chain updates failing |
| **1.3.3** | PATCH | 26 Mar 2026 | Create VM: templates filtered by selected hypervisor, showing only relevant templates |
| **1.3.2** | PATCH | 26 Mar 2026 | Fixed sidebar: stays fixed on the left on desktop, only content area scrolls |
| **1.3.1** | PATCH | 22 Mar 2026 | English Translation: all UI text and API messages translated from Italian to English across frontend (15 files) and backend (9 files) |
| **1.3.0** | MINOR | 22 Mar 2026 | Responsive Design: layout completamente responsive per mobile e tablet con sidebar hamburger menu, card list VM su mobile, modal bottom-sheet, griglie e padding adattivi |
| **1.2.5** | PATCH | 22 Mar 2026 | Fix SSH: inizializzazione terminale xterm.js tramite callback ref per rendering affidabile |
| **1.2.4** | PATCH | 21 Mar 2026 | Auto-installazione qemu-guest-agent via cloud-init vendor-data su nuove VM |
| **1.2.3** | PATCH | 21 Mar 2026 | Fix SSH: risolto terminale vuoto dopo connessione (race condition rendering) |
| **1.2.2** | PATCH | 20 Mar 2026 | Fix SSH: recupero IP con fallback multipli (guest agent, VM detail, cloud-init) |
| **1.2.1** | PATCH | 20 Mar 2026 | Fix: recupero IP della VM via QEMU Guest Agent per connessione SSH |
| **1.2.0** | MINOR | 20 Mar 2026 | Console SSH Web: terminale SSH integrato nella pagina VM con xterm.js, proxy WebSocket dal backend alle VM |
| **1.1.0** | MINOR | 19 Mar 2026 | Hypervisor filter on Dashboard, VM List, and Templates pages. Select specific hypervisor to view its VMs, node status, storage, network traffic. Auto-shown when multiple hypervisors configured. |
| **1.0.0** | MAJOR | 16 Mar 2026 | Initial release: Dashboard VM, Hypervisor management, VM creation from templates, Cloud-init configuration, MAC address uniqueness, Machine-id regeneration, WebSocket real-time updates, Installer, Online update system (free, no license required) |

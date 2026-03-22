# Storage Monitoring in Dashboard

**Data**: 14-03-2026 16:55
**Obiettivo**: Visualizzare gli storage Proxmox in Dashboard con possibilità di scegliere quali mostrare.

## Approccio Tecnico

### 1. Backend - Proxmox Adapter

Aggiungere metodo `listStorages()` all'adapter interface e implementazione Proxmox:
- **API Proxmox**: `GET /nodes/{node}/storage` → restituisce tutti gli storage con uso, tipo, capacità
- **Dati restituiti**: `{ id, type, total, used, available, active, shared, content }`

### 2. Backend - Nuove Route

**Storage**:
- `GET /api/hypervisors/:id/storages` → lista storage dal Proxmox in tempo reale

**Settings** (tabella `settings` già esiste come key-value store):
- `GET /api/settings` → ritorna tutte le impostazioni
- `PUT /api/settings` → salva/aggiorna impostazioni (body: `{ key, value }`)
- Setting chiave: `dashboard_storages` → JSON array di `{ hypervisorId, storageId, enabled }[]`

### 3. Frontend - Pagina Settings

Aggiungere sezione "Dashboard - Storage" nella pagina Settings:
- Per ogni hypervisor, mostra la lista storage disponibili (fetch da API)
- Toggle on/off per ogni storage
- Salvataggio automatico in settings

### 4. Frontend - Dashboard

Nuova sezione sotto i nodi hypervisor:
- Card per ogni storage abilitato nelle settings
- Mostra: nome, tipo, barra uso (stile ResourceBar esistente), spazio usato/totale
- Raggruppati per hypervisor

### 5. WebSocket

Estendere il polling in `ws.hub.ts` per includere anche i dati storage, così la dashboard si aggiorna in tempo reale.

## File Coinvolti

| File | Modifica |
|------|----------|
| `backend/src/hypervisors/adapters/adapter.interface.ts` | Aggiungere `StorageInfo` type e `listStorages()` |
| `backend/src/hypervisors/adapters/proxmox.adapter.ts` | Implementare `listStorages()` |
| `backend/src/hypervisors/hypervisor.routes.ts` | Aggiungere route `/storages` |
| `backend/src/settings/settings.routes.ts` | **Nuovo** - CRUD settings |
| `backend/src/server.ts` | Registrare settings routes |
| `backend/src/ws/ws.hub.ts` | Aggiungere storages al broadcast |
| `frontend/src/api/client.ts` | Aggiungere metodi API per storages e settings |
| `frontend/src/pages/Settings.tsx` | Sezione configurazione storage dashboard |
| `frontend/src/pages/Dashboard.tsx` | Sezione storage cards |
| `frontend/src/hooks/useWebSocket.ts` | Gestire dati storage dal WS |

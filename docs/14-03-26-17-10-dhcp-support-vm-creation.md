# Supporto DHCP nella creazione VM

**Data**: 14-03-2026 17:10
**Obiettivo**: Permettere di scegliere tra IP statico e DHCP nella creazione di una nuova VM.

## Approccio Tecnico

### Proxmox Cloud-Init
Proxmox supporta DHCP nativamente nel parametro `ipconfig0`:
- **IP statico**: `ipconfig0=ip=172.0.10.50/24,gw=172.0.10.1`
- **DHCP**: `ipconfig0=ip=dhcp`

### Modifiche

#### 1. Frontend - `CreateVm.tsx` (Step 2: Rete)
- Aggiungere toggle "DHCP / IP Statico" in cima allo step Rete
- Se DHCP: nascondere i campi IP, Netmask, Gateway (non servono)
- Se Statico: mostrare i campi come ora
- DNS visibile in entrambi i casi (opzionale in DHCP)
- Aggiungere campo `network_mode: 'dhcp' | 'static'` al form state
- Aggiornare la validazione del pulsante "Avanti" (non richiedere IP/gateway se DHCP)
- Aggiornare il riepilogo per mostrare "DHCP" o l'IP statico

#### 2. Backend - `vm.routes.ts`
- Modificare lo schema Zod `createVmSchema` per rendere `ip` e `gateway` opzionali
- Aggiungere campo `network.mode` (`'dhcp' | 'static'`, default `'static'`)

#### 3. Backend - `adapter.interface.ts`
- Aggiungere `mode?: 'dhcp' | 'static'` all'interfaccia `CreateVMConfig.network`

#### 4. Backend - `proxmox.adapter.ts`
- In `cloneFromTemplate()`, se `mode === 'dhcp'` usare `ipconfig0=ip=dhcp`
- Se DHCP, non passare gateway in ipconfig0
- DNS rimane opzionale in entrambi i casi

## File Coinvolti

| File | Modifica |
|------|----------|
| `frontend/src/pages/CreateVm.tsx` | Toggle DHCP/Statico, hide/show campi, validazione, riepilogo |
| `backend/src/vms/vm.routes.ts` | Schema Zod: ip/gateway opzionali, campo mode |
| `backend/src/hypervisors/adapters/adapter.interface.ts` | Campo `mode` nel network |
| `backend/src/hypervisors/adapters/proxmox.adapter.ts` | Logica ipconfig0 per DHCP |

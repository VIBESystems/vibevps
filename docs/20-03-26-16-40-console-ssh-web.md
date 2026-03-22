# Console SSH Web per VM

**Data**: 20 Marzo 2026
**Versione target**: 1.2.0 (MINOR — nuova feature)

## Obiettivo

Aggiungere un pulsante "SSH" nella barra azioni della pagina VmDetail che apra una finestra modale con un terminale SSH web collegato alla VM.

## Approccio Tecnico

### Frontend
- **xterm.js** + **@xterm/addon-fit** per il terminale nel browser
- Pulsante "SSH" nella barra azioni (icona `Terminal` di Lucide) — visibile solo quando la VM è running
- Dialog modale (Radix UI Dialog) contenente il terminale xterm.js
- Prima dell'apertura: form per inserire **username** e **password** SSH della VM
- Connessione WebSocket dedicata al backend per il proxy SSH

### Backend
- **ssh2** (libreria Node.js) per connessione SSH dalla macchina backend alla VM
- Nuovo endpoint WebSocket: `GET /ws/ssh` con parametri query `hypervisorId` e `vmId`
- Flusso:
  1. Il frontend invia credenziali SSH via primo messaggio WebSocket
  2. Il backend recupera l'IP della VM dall'hypervisor
  3. Il backend apre connessione SSH verso la VM usando `ssh2`
  4. Proxy bidirezionale: WebSocket ↔ SSH stream
  5. Supporto resize terminale (messaggi di tipo `resize`)

### Protocollo WebSocket SSH

```
Client → Server: { type: 'auth', username: string, password: string }
Client → Server: { type: 'data', data: string }
Client → Server: { type: 'resize', cols: number, rows: number }
Server → Client: { type: 'data', data: string }
Server → Client: { type: 'status', status: 'connected' | 'error', message?: string }
```

## File Coinvolti

### Nuovi file
- `backend/src/ws/ssh.handler.ts` — handler WebSocket per proxy SSH
- `frontend/src/components/SshTerminal.tsx` — componente terminale SSH

### File modificati
- `frontend/src/pages/VmDetail.tsx` — aggiunta pulsante SSH + dialog
- `backend/src/server.ts` — registrazione route WebSocket SSH
- `frontend/package.json` — dipendenze xterm.js
- `backend/package.json` — dipendenza ssh2

### Dipendenze da installare
- **Frontend**: `@xterm/xterm`, `@xterm/addon-fit`
- **Backend**: `ssh2`, `@types/ssh2` (dev)

## Note
- L'IP della VM viene ottenuto tramite il campo `ip` già presente nei dati VM restituiti dall'adapter Proxmox (tramite QEMU guest agent)
- La connessione SSH avviene dal server backend alla VM, non direttamente dal browser
- Il pulsante SSH è visibile solo se la VM è in stato "running"

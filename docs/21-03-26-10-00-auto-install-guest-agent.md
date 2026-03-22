# Auto-installazione QEMU Guest Agent via Cloud-Init

**Data**: 21 Marzo 2026
**Versione target**: 1.2.4 (PATCH)

## Obiettivo

Installare automaticamente `qemu-guest-agent` su ogni VM creata tramite VIBEVps, usando cloud-init vendor-data. Questo risolve il problema dell'IP non rilevabile per la connessione SSH.

## Approccio Tecnico

### Cloud-Init Vendor Data via Proxmox Snippets

Proxmox supporta `cicustom` per iniettare cloud-init custom. Usiamo il tipo **vendor** (non user) così i parametri standard di Proxmox (ciuser, ipconfig0, sshkeys) restano intatti.

Il vendor-data YAML:
```yaml
#cloud-config
packages:
  - qemu-guest-agent
runcmd:
  - systemctl enable qemu-guest-agent
  - systemctl start qemu-guest-agent
```

### Flusso nel cloneFromTemplate

1. Cercare uno storage che supporti snippets (`content` contiene `snippets`)
2. Caricare il file vendor-data YAML via API Proxmox (`POST /nodes/{node}/storage/{storage}/upload`)
3. Aggiungere `cicustom: vendor={storage}:snippets/{filename}` alla config VM
4. Se nessuno storage supporta snippets → skip silenzioso (non blocca la creazione)

### File coinvolti

- `backend/src/hypervisors/adapters/proxmox.adapter.ts` — aggiunta metodi `findSnippetStorage()` e `uploadSnippet()`, modifica `cloneFromTemplate()`

### Note
- Il file snippet è nominato `vibevps-{vmId}-user.yml` per evitare conflitti
- Vendor-data viene mergiato con user-data da cloud-init, non lo sovrascrive
- Fallback graceful: se snippets non disponibile, la VM viene creata normalmente senza agent pre-installato

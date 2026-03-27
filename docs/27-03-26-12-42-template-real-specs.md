# Template Real Specs — Specifica Implementazione

**Data:** 27 Mar 2026
**Versione target:** 1.3.6 (PATCH)

## Obiettivo

Mostrare le specifiche reali (CPU cores, RAM MB, Disk GB) lette direttamente da Proxmox per ogni template:
1. **Pagina Templates** — sotto ogni card template e nella lista di discover
2. **Crea VM (step 0)** — nei pulsanti di selezione template, pre-popola i campi Resources con i valori reali

## Analisi della situazione attuale

### Dati già disponibili
Il backend restituisce già i dati reali da Proxmox via `discoverTemplates`:
- `cpuCount` → numero core CPU (da `maxcpu` Proxmox)
- `memoryTotal` → RAM in **bytes** (da `maxmem`)
- `diskTotal` → disco in **bytes** (da `maxdisk`)

### Problema attuale
- **Templates.tsx `selectDiscovered`**: copia solo `name` e `vmid`, ignora le specifiche reali → l'utente deve inserire manualmente cores/RAM/disk
- **CreateVm.tsx `selectTemplate`**: per i template "discovered" non usa `cpuCount`/`memoryTotal`/`diskTotal`, quindi rimangono i default (2 core, 2048 MB, 20 GB)
- Le card template nella pagina Create VM non mostrano nessuna specifica

## File coinvolti

| File | Modifica |
|------|---------|
| `frontend/src/pages/Templates.tsx` | `selectDiscovered` auto-popola form con valori reali; lista discover mostra specs |
| `frontend/src/pages/CreateVm.tsx` | `selectTemplate` usa valori reali; card template mostrano specs |

**Nessuna modifica backend necessaria** — i dati sono già restituiti.

## Modifiche previste

### Templates.tsx
1. `selectDiscovered()` — aggiungere auto-popolamento:
   - `default_cores = tmpl.cpuCount`
   - `default_memory_mb = Math.round(tmpl.memoryTotal / 1024 / 1024)`
   - `default_disk_gb = Math.round(tmpl.diskTotal / 1024 / 1024 / 1024)`
2. Lista discover — aggiungere riga specs sotto il nome del template
3. Card template salvati — già mostrano `default_*` (se salvati con valori reali saranno corretti)

### CreateVm.tsx
1. `selectTemplate()` — per template "discovered" usare `cpuCount`, `memoryTotal`, `diskTotal`; per template "saved" usare `default_cores/memory_mb/disk_gb`
2. Card selezione template (step 0) — aggiungere riga con specs (cores · RAM · disk)

## Conversioni
- RAM: `bytes / 1024 / 1024` → MB, arrotondato
- Disk: `bytes / 1024 / 1024 / 1024` → GB, arrotondato
- Cores: già un numero intero

## Comportamento atteso
- Apertura modal "Add Template" → discover → click su template → form si popola automaticamente con core/RAM/disk reali di Proxmox
- Crea VM → step Template → ogni card mostra specs → click → Resources pre-compilati con valori reali

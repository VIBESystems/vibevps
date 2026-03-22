# Filtro per Hypervisor su Dashboard, VM List, Templates, Create VM

## Obiettivo
Aggiungere un selettore/filtro hypervisor nelle pagine principali, in modo che con piu hypervisor collegati l'utente possa visualizzare le risorse di uno specifico hypervisor o di tutti.

## Approccio Tecnico

### 1. Dashboard (`Dashboard.tsx`)
- Aggiungere barra con pulsanti filtro in alto: **"Tutti"** + un pulsante per ogni hypervisor
- Stato `selectedHv: number | null` (null = tutti)
- Quando selezionato un hv specifico:
  - Stats (VM totali, running, stopped) filtrate per quell'hypervisor
  - Node status mostra solo quel nodo
  - Storage mostra solo storage di quell'hypervisor
  - VM recenti filtrate
  - Network traffic solo per quell'hypervisor

### 2. Virtual Machines (`VmList.tsx`)
- Aggiungere filtro hypervisor accanto ai filtri esistenti (search + status)
- Pulsanti: "Tutti" + uno per ogni hypervisor
- La lista VM viene filtrata in base all'hypervisor selezionato

### 3. Templates (`Templates.tsx`)
- Aggiungere filtro hypervisor sopra la griglia dei template
- I template sono gia associati a un hypervisor (`hypervisor_name`), filtrare in base alla selezione

### 4. Create VM (`CreateVm.tsx`)
- Gia presente il selettore hypervisor nello step 0 — nessuna modifica necessaria, funziona gia correttamente

## File Coinvolti
- `frontend/src/pages/Dashboard.tsx` — aggiunta filtro + logica filtraggio
- `frontend/src/pages/VmList.tsx` — aggiunta filtro hypervisor
- `frontend/src/pages/Templates.tsx` — aggiunta filtro hypervisor

## Note
- Lo stile dei pulsanti filtro sara coerente con quelli gia presenti in VmList (status filter)
- Il filtro "Tutti" sara selezionato di default
- CreateVm ha gia il selettore hypervisor nello step Template, non serve modificarlo

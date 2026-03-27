# Auto-refresh Templates + Refresh Button Dashboard/VM List

**Data**: 26 Mar 2026
**Versione target**: 1.3.5 (PATCH)

## Obiettivo

Due miglioramenti UX:

1. **Templates page auto-refresh**: Dopo aver aggiunto un nuovo template, la lista si aggiorna automaticamente mostrando subito il nuovo template. Attualmente `load()` viene chiamato dopo il save ma senza `await` — aggiungo `await` per garantire che i dati siano aggiornati prima che la UI si aggiorni.

2. **Refresh button su Dashboard e Virtual Machines**: Bottone "Refresh" in alto a destra nelle pagine Dashboard e VM List, per ricaricare manualmente i dati on-demand.

## Approccio tecnico

### 1. Templates auto-refresh (Templates.tsx)
- Aggiungere `await` alla chiamata `load()` in `handleSave()` (riga 53)
- Aggiungere un piccolo feedback visivo (loading state) durante il salvataggio

### 2. Refresh button (Dashboard.tsx + VmList.tsx)
- Aggiungere un bottone con icona `RefreshCw` (da lucide-react) nell'header in alto a destra
- Al click: ricarica tutti i dati della pagina
- Animazione di spin sull'icona durante il caricamento
- Stile coerente con il design esistente (ghost/secondary button)

## File coinvolti

| File | Modifica |
|------|----------|
| `frontend/src/pages/Templates.tsx` | Await load() dopo save, loading state |
| `frontend/src/pages/Dashboard.tsx` | Aggiunta refresh button in header |
| `frontend/src/pages/VmList.tsx` | Aggiunta refresh button in header |

## Changelog

```
v1.3.5: Templates auto-refresh after adding new template; manual refresh button on Dashboard and VM List pages
```

# Traduzione completa dell'applicazione in inglese

**Data:** 22 Mar 2026
**Versione target:** 1.3.1 (PATCH — text changes, no structural impact)

## Obiettivo

Tradurre tutto il testo UI dell'applicazione dall'italiano all'inglese. Non viene introdotto un sistema i18n — si sostituiscono direttamente le stringhe hardcoded.

## File coinvolti

### Frontend (15 file)

| File | Stringhe italiane |
|------|-------------------|
| `pages/Login.tsx` | ~3 (Errore di login, Accesso, Accedi) |
| `pages/Dashboard.tsx` | ~20 (Panoramica, VM Totali, Caricamento, Attivita Recente, ecc.) |
| `pages/VmList.tsx` | ~15 (Cerca, Avvia, Riavvia, Ferma, Dettagli, Azioni, ecc.) |
| `pages/VmDetail.tsx` | ~15 (Elimina, Sospendi, Configurazione, Annulla, ecc.) |
| `pages/CreateVm.tsx` | ~35 (Identita, Rete, Risorse, Riepilogo, Indietro, Avanti, ecc.) |
| `pages/Hypervisors.tsx` | ~20 (Aggiungi, Modifica, Salva, Elimina, ecc.) |
| `pages/Templates.tsx` | ~15 (Scopri, Salva, Elimina Template, ecc.) |
| `pages/Settings.tsx` | ~20 (Impostazioni, Cambia Password, Salvato, ecc.) |
| `pages/Logs.tsx` | ~3 (Log Attivita, Storico operazioni) |
| `pages/Updates.tsx` | ~30 (Aggiornamenti, Versione, Installa, Licenza, ecc.) |
| `components/SshTerminal.tsx` | ~6 (Connetti, Annulla, Errore connessione) |
| `components/layout/Sidebar.tsx` | ~9 (menu items: Crea VM, Log Attivita, Impostazioni, ecc.) |
| `api/client.ts` | ~2 (Non autorizzato, Errore API) |

### Backend (9 file)

| File | Stringhe italiane |
|------|-------------------|
| `auth/auth.routes.ts` | 3 (Credenziali non valide, Password attuale non corretta, Password aggiornata) |
| `auth/auth.guard.ts` | 1 (Non autorizzato) |
| `hypervisors/hypervisor.routes.ts` | 6 (Aggiornato, Eliminato, Hypervisor non trovato, Connessione fallita) |
| `hypervisors/hypervisor.service.ts` | 1 (Tipo hypervisor non supportato) |
| `hypervisors/adapters/proxmox.adapter.ts` | 2 (Task fallito, Timeout clone) |
| `vms/vm.routes.ts` | 4 (Hypervisor non trovato, Template non trovato, VM creata) |
| `templates/template.routes.ts` | 2 (Hypervisor non trovato, Eliminato) |
| `settings/settings.routes.ts` | 2 (Impostazione non trovata, Salvato) |
| `ws/ssh.handler.ts` | 5 (Parametri mancanti, IP non disponibile, Autenticazione fallita) |

## Approccio

Sostituzione diretta delle stringhe italiane con equivalenti inglesi in ogni file. Nessuna modifica strutturale, nessun framework i18n.

## Totale stimato: ~230 stringhe da tradurre

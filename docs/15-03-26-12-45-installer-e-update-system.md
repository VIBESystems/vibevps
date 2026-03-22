# Installer e Update System per VIBEVps

**Data**: 15/03/2026
**Obiettivo**: Creare un sistema di installazione automatica e aggiornamento online per VIBEVps, seguendo lo stesso modello di VIBERad.

## Differenze chiave rispetto a VIBERad

| Aspetto | VIBERad | VIBEVps |
|---------|---------|---------|
| Stack | Next.js + Prisma + MySQL | Fastify + SQLite + Vite/React |
| DB | MySQL (richiede installazione) | SQLite (file-based, nessun setup) |
| ORM | Prisma (generate + db push) | better-sqlite3 (schema.sql auto-applicato) |
| Build | `npm run build` (Next.js) | `npm run build` (tsc backend + vite frontend) |
| Workspaces | No | Si (npm workspaces: backend/ + frontend/) |
| Porta app | 3000 (Next.js) | 3001 (Fastify) |
| Dipendenze esterne | MySQL, FreeRADIUS | Nessuna (solo Node.js, PM2, Nginx) |
| Auth | NextAuth | JWT custom |
| Processo PM2 | `npm start` | `node backend/dist/server.js` |

## Struttura installer

```
installer/vibevps-installer-v1.0.0/
├── config/
│   ├── .env.template          # Template variabili d'ambiente
│   └── nginx-vibevps.conf     # Configurazione Nginx
├── scripts/
│   └── update.sh              # Script di aggiornamento
├── backend/                   # Sorgenti backend (copia)
├── frontend/                  # Sorgenti frontend (copia)
├── package.json               # Root package.json
├── package-lock.json          # Lock file
└── install.sh                 # Script di installazione principale
```

## Componenti installati

1. **Node.js 20** - Runtime
2. **PM2** - Process manager
3. **Nginx** - Reverse proxy
4. **VIBEVps** - Applicazione (backend Fastify + frontend React)

**NON serve**: MySQL, FreeRADIUS (VIBEVps usa SQLite embedded)

## Flusso install.sh

1. Verifica root e OS (Ubuntu 24.04)
2. Raccolta info: porta Nginx, JWT secret (auto-generato)
3. Aggiornamento sistema + dipendenze base
4. Installazione Node.js 20 + PM2
5. Installazione Nginx + configurazione reverse proxy
6. Copia file applicazione in `/var/www/vibevps`
7. Creazione `.env` da template
8. `npm install` (workspace)
9. `npm run build` (backend tsc + frontend vite)
10. Creazione directory `data/` per SQLite DB (auto-creato al primo avvio)
11. Avvio con PM2 + salvataggio
12. Riepilogo finale

## Flusso update.sh

Identico a VIBERad:
1. Lock file per evitare esecuzioni multiple
2. Backup dei file correnti
3. Estrazione zip (esclude .env, node_modules, data/)
4. Reinstallazione dipendenze
5. Rebuild applicazione
6. Restart PM2
7. Pulizia backup vecchi

## File coinvolti (da creare)

- `installer/vibevps-installer-v1.0.0/install.sh`
- `installer/vibevps-installer-v1.0.0/config/.env.template`
- `installer/vibevps-installer-v1.0.0/config/nginx-vibevps.conf`
- `installer/vibevps-installer-v1.0.0/scripts/update.sh`

## Note

- Il DB SQLite viene creato automaticamente dal backend al primo avvio (schema.sql)
- L'utente admin di default è `admin` / `admin123!` (creato dal seed nel codice)
- JWT_SECRET deve essere persistente tra i restart (salvato in .env)
- La directory `data/` contiene il DB e NON deve essere sovrascritta negli update

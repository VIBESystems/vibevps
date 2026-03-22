# Sistema Generazione Pacchetti Update VIBEVps

## Obiettivo
Creare un sistema per generare pacchetti di aggiornamento per VIBEVps, identico a VIBERad, ma senza richiedere licenza. Gli update sono sempre disponibili gratuitamente da VIBEVault.

## Approccio Tecnico

### 1. Script `build-update.sh` (locale, per lo sviluppatore)
- Genera uno zip con i sorgenti dell'app (come VIBERad)
- Esclude: `node_modules/`, `.env`, `data/`, `.git/`, `installer/`, `docs/`
- Include: `backend/src/`, `frontend/src/`, `scripts/`, `package.json`, etc.
- Prende la versione da `package.json`
- Output: `installer/vibevps-update-v{version}.zip`

### 2. Modifica `checkForUpdates()` in `license.service.ts`
- Il check deve funzionare SENZA licenza
- Usa solo `server_id` + `current_version` + `product: "VIBEVps"`
- Nuovo endpoint su VIBEVault: `POST /api/updates/check-free` (no license validation)

### 3. Modifica VIBEVault `updateController.js`
- Nuovo endpoint `checkFree` che non richiede licenza
- Legge il manifest di un prodotto e restituisce aggiornamenti disponibili
- Genera download token senza verifica licenza

### 4. Registrazione prodotto su VIBEVault
- Creare cartella `updates/VIBEVps/` con `manifest.json` vuoto
- Upload primo pacchetto v1.0.0

## File Coinvolti
- **Nuovo**: `installer/build-update.sh` — script generazione zip
- **Modifica**: `backend/src/updates/license.service.ts` — checkForUpdates senza licenza
- **Modifica**: VIBEVault `backend/src/controllers/updateController.js` — endpoint free
- **Modifica**: VIBEVault `backend/src/routes/api.js` — registrazione route
- **Nuovo su server**: `updates/VIBEVps/manifest.json`

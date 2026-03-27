# VIBEVps — Manuale di Installazione e Utilizzo

**Versione**: 1.3.1
**Ultima revisione**: 22 Marzo 2026

---

## Indice

1. [Introduzione](#1-introduzione)
2. [Requisiti di Sistema](#2-requisiti-di-sistema)
3. [Installazione](#3-installazione)
   - 3.1 [Preparazione del Server](#31-preparazione-del-server)
   - 3.2 [Installazione Automatica](#32-installazione-automatica)
   - 3.3 [Installazione Manuale](#33-installazione-manuale)
   - 3.4 [Configurazione Ambiente (.env)](#34-configurazione-ambiente-env)
   - 3.5 [Configurazione Nginx](#35-configurazione-nginx)
   - 3.6 [Avvio con PM2](#36-avvio-con-pm2)
4. [Primo Accesso](#4-primo-accesso)
5. [Configurazione Hypervisor Proxmox](#5-configurazione-hypervisor-proxmox)
   - 5.1 [Creazione API Token su Proxmox](#51-creazione-api-token-su-proxmox)
   - 5.2 [Aggiunta Hypervisor in VIBEVps](#52-aggiunta-hypervisor-in-vibevps)
   - 5.3 [Test della Connessione](#53-test-della-connessione)
6. [Dashboard](#6-dashboard)
   - 6.1 [Panoramica Nodi](#61-panoramica-nodi)
   - 6.2 [Statistiche VM](#62-statistiche-vm)
   - 6.3 [Storage e Traffico di Rete](#63-storage-e-traffico-di-rete)
   - 6.4 [Filtro Hypervisor](#64-filtro-hypervisor)
7. [Gestione Macchine Virtuali](#7-gestione-macchine-virtuali)
   - 7.1 [Lista VM](#71-lista-vm)
   - 7.2 [Dettaglio VM](#72-dettaglio-vm)
   - 7.3 [Azioni sulle VM](#73-azioni-sulle-vm)
   - 7.4 [Eliminazione VM](#74-eliminazione-vm)
8. [Creazione Macchine Virtuali](#8-creazione-macchine-virtuali)
   - 8.1 [Prerequisiti: Template Proxmox](#81-prerequisiti-template-proxmox)
   - 8.2 [Wizard di Creazione (5 Step)](#82-wizard-di-creazione-5-step)
   - 8.3 [Configurazione Cloud-Init](#83-configurazione-cloud-init)
   - 8.4 [Cosa Succede Dopo la Creazione](#84-cosa-succede-dopo-la-creazione)
9. [Gestione Template](#9-gestione-template)
   - 9.1 [Scoperta Automatica Template](#91-scoperta-automatica-template)
   - 9.2 [Salvataggio Template con Valori Default](#92-salvataggio-template-con-valori-default)
10. [Console SSH Web](#10-console-ssh-web)
    - 10.1 [Requisiti](#101-requisiti)
    - 10.2 [Connessione](#102-connessione)
    - 10.3 [Risoluzione IP](#103-risoluzione-ip)
11. [Log Attività](#11-log-attività)
12. [Impostazioni](#12-impostazioni)
    - 12.1 [Cambio Password](#121-cambio-password)
    - 12.2 [Visibilità Storage](#122-visibilità-storage)
13. [Sistema di Aggiornamento](#13-sistema-di-aggiornamento)
    - 13.1 [Verifica Aggiornamenti](#131-verifica-aggiornamenti)
    - 13.2 [Installazione Aggiornamenti](#132-installazione-aggiornamenti)
    - 13.3 [Aggiornamenti Sequenziali](#133-aggiornamenti-sequenziali)
    - 13.4 [Backup Automatico](#134-backup-automatico)
14. [Architettura Tecnica](#14-architettura-tecnica)
    - 14.1 [Stack Tecnologico](#141-stack-tecnologico)
    - 14.2 [Struttura del Progetto](#142-struttura-del-progetto)
    - 14.3 [Database SQLite](#143-database-sqlite)
    - 14.4 [API REST](#144-api-rest)
    - 14.5 [WebSocket Real-time](#145-websocket-real-time)
15. [Manutenzione e Troubleshooting](#15-manutenzione-e-troubleshooting)
    - 15.1 [Comandi PM2 Utili](#151-comandi-pm2-utili)
    - 15.2 [Log di Sistema](#152-log-di-sistema)
    - 15.3 [Backup Database](#153-backup-database)
    - 15.4 [Problemi Comuni e Soluzioni](#154-problemi-comuni-e-soluzioni)
16. [Sicurezza](#16-sicurezza)
17. [Sviluppo Locale](#17-sviluppo-locale)

---

## 1. Introduzione

**VIBEVps** è una dashboard web open-source per la gestione di hypervisor Proxmox VE e delle relative macchine virtuali. Permette di:

- Monitorare in tempo reale lo stato dei nodi Proxmox (CPU, RAM, disco, rete)
- Visualizzare e controllare tutte le VM (avvio, arresto, riavvio, sospensione, eliminazione)
- Creare nuove VM da template con configurazione cloud-init automatica (hostname, IP statico/DHCP, DNS)
- Accedere alle VM via terminale SSH direttamente dal browser
- Gestire template, storage e log di tutte le operazioni
- Ricevere aggiornamenti automatici senza necessità di licenza

L'interfaccia è completamente in inglese, responsive (desktop, tablet, mobile), con tema scuro e aggiornamenti in tempo reale via WebSocket.

---

## 2. Requisiti di Sistema

### Server VIBEVps

| Requisito | Minimo | Consigliato |
|-----------|--------|-------------|
| **Sistema Operativo** | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |
| **CPU** | 1 core | 2+ core |
| **RAM** | 512 MB | 1+ GB |
| **Disco** | 1 GB libero | 5+ GB |
| **Rete** | Accesso alla rete degli hypervisor | Stessa VLAN degli hypervisor |

### Software (installato automaticamente)

- **Node.js 20.x** — runtime JavaScript
- **PM2** — process manager per Node.js
- **Nginx** — reverse proxy e web server

### Hypervisor Proxmox

- **Proxmox VE 7.x o 8.x**
- **API Token** creato con permessi adeguati
- **Porta 8006** (HTTPS API) accessibile dal server VIBEVps
- **QEMU Guest Agent** installato sulle VM (consigliato, necessario per SSH e rilevamento IP)

### Browser Supportati

- Chrome/Chromium 90+
- Firefox 90+
- Safari 15+
- Edge 90+

---

## 3. Installazione

### 3.1 Preparazione del Server

Partire da un'installazione pulita di Ubuntu 24.04 LTS. Assicurarsi che il server abbia accesso di rete verso gli hypervisor Proxmox (porta 8006).

```bash
# Aggiornare il sistema
sudo apt update && sudo apt upgrade -y

# Verificare la connettività verso Proxmox
curl -k https://IP_PROXMOX:8006/api2/json/version
```

### 3.2 Installazione Automatica

Il metodo consigliato è utilizzare lo script di installazione automatica incluso nel pacchetto installer.

```bash
# 1. Scaricare e decomprimere il pacchetto installer
unzip vibevps-installer-v1.0.0.zip
cd vibevps-installer-v1.0.0

# 2. Eseguire lo script come root
sudo bash install.sh
```

Lo script eseguirà automaticamente i seguenti passaggi:

1. **Verifica sistema operativo** — conferma Ubuntu 24.04 LTS
2. **Raccolta informazioni** — chiede la porta Nginx (default: 80), rileva l'IP del server, genera le chiavi JWT e di crittografia
3. **Aggiornamento sistema** — `apt update && apt upgrade`
4. **Installazione Node.js 20** — via repository NodeSource
5. **Installazione PM2** — process manager con autostart al boot
6. **Installazione Nginx** — configurazione reverse proxy + WebSocket
7. **Installazione VIBEVps** — copia file, installa dipendenze, build, avvio

Al termine verrà mostrato un riepilogo con:
- URL di accesso (`http://IP_SERVER:PORTA`)
- Credenziali di default (`admin` / `admin123!`)
- Comandi PM2 utili

Il log dell'installazione viene salvato in `/var/log/vibevps-install.log`.

### 3.3 Installazione Manuale

Se si preferisce un'installazione manuale:

```bash
# 1. Installare Node.js 20
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | \
  sudo tee /etc/apt/sources.list.d/nodesource.list
sudo apt update && sudo apt install -y nodejs

# 2. Installare PM2
sudo npm install -g pm2
sudo pm2 startup systemd -u root --hp /root

# 3. Installare Nginx
sudo apt install -y nginx

# 4. Creare la directory dell'applicazione
sudo mkdir -p /var/www/vibevps
sudo mkdir -p /var/www/vibevps/data

# 5. Copiare i file dell'applicazione
sudo cp -r backend frontend scripts package.json package-lock.json /var/www/vibevps/

# 6. Creare il file .env (vedi sezione 3.4)
sudo nano /var/www/vibevps/.env

# 7. Installare dipendenze e compilare
cd /var/www/vibevps
sudo npm install
sudo npm run build

# 8. Impostare i permessi
sudo chown -R www-data:www-data /var/www/vibevps

# 9. Configurare Nginx (vedi sezione 3.5)
# 10. Avviare con PM2 (vedi sezione 3.6)
```

### 3.4 Configurazione Ambiente (.env)

Creare il file `/var/www/vibevps/.env` con il seguente contenuto:

```env
# Server
PORT=3001
HOST=0.0.0.0

# JWT Secret (generare con: openssl rand -base64 32)
JWT_SECRET=LA_TUA_CHIAVE_JWT_SEGRETA

# Database path (SQLite)
DB_PATH=/var/www/vibevps/data/vibevps.db

# CORS Origin (URL di accesso del frontend)
CORS_ORIGIN=http://IP_SERVER:PORTA_NGINX

# Encryption key (generare con: openssl rand -hex 32)
ENCRYPTION_KEY=LA_TUA_CHIAVE_CRITTOGRAFIA
```

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `PORT` | Porta del backend Fastify | `3001` |
| `HOST` | Indirizzo di bind | `0.0.0.0` |
| `JWT_SECRET` | Chiave segreta per firmare i token JWT | Generato casualmente |
| `DB_PATH` | Percorso del database SQLite | `data/vibevps.db` |
| `CORS_ORIGIN` | URL del frontend (per CORS) | `http://localhost:5173` |
| `ENCRYPTION_KEY` | Chiave AES-256-GCM per cifrare le credenziali (predisposta) | Generato casualmente |

> **Importante**: Generare sempre chiavi uniche per `JWT_SECRET` e `ENCRYPTION_KEY` in produzione. Non utilizzare mai i valori di default.

### 3.5 Configurazione Nginx

Creare il file `/etc/nginx/sites-available/vibevps`:

```nginx
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket support
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # WebSocket endpoint
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

Abilitare il sito e riavviare Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/vibevps /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

> **Nota**: Per configurare HTTPS con certificato SSL, aggiungere un blocco `server` sulla porta 443 con le direttive `ssl_certificate` e `ssl_certificate_key`, e un redirect 301 dal blocco porta 80.

### 3.6 Avvio con PM2

Creare il file ecosystem PM2 in `/var/www/vibevps/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: 'vibevps',
    script: 'backend/dist/server.js',
    cwd: '/var/www/vibevps',
    env_file: '.env',
    node_args: '--env-file=.env'
  }]
};
```

Avviare e salvare la configurazione:

```bash
cd /var/www/vibevps
sudo pm2 start ecosystem.config.cjs
sudo pm2 save
```

L'applicazione verrà riavviata automaticamente al boot del server grazie a `pm2 startup`.

---

## 4. Primo Accesso

1. Aprire il browser e navigare all'URL del server: `http://IP_SERVER:PORTA`
2. Effettuare il login con le credenziali di default:
   - **Username**: `admin`
   - **Password**: `admin123!`
3. **Cambiare immediatamente la password** dalla pagina Settings

> **Attenzione**: Le credenziali di default sono le stesse per ogni installazione. Cambiarle al primo accesso è fondamentale per la sicurezza.

La sessione JWT ha una durata di **8 ore**. Dopo la scadenza, sarà necessario effettuare nuovamente il login.

---

## 5. Configurazione Hypervisor Proxmox

### 5.1 Creazione API Token su Proxmox

Prima di aggiungere un hypervisor in VIBEVps, è necessario creare un API Token nell'interfaccia web di Proxmox:

1. Accedere all'interfaccia web di Proxmox (`https://IP_PROXMOX:8006`)
2. Navigare in **Datacenter → Permissions → API Tokens**
3. Cliccare **Add**
4. Configurare:
   - **User**: selezionare un utente (es. `root@pam` o un utente dedicato)
   - **Token ID**: scegliere un nome (es. `vibevps`)
   - **Privilege Separation**: **deselezionare** (il token eredita i permessi dell'utente)
5. Cliccare **Add** e **copiare il secret** mostrato — non sarà più visibile

Il formato dell'API Token sarà:
- **Token ID**: `user@realm!tokenid` (es. `root@pam!vibevps`)
- **Token Secret**: una stringa UUID (es. `aaaaaa-bbb-cccc-dddd-eeeeeeee`)

> **Permessi richiesti**: il token necessita almeno dei permessi per leggere e gestire VM, storage e nodi. Se si usa `root@pam`, tutti i permessi sono già disponibili.

### 5.2 Aggiunta Hypervisor in VIBEVps

1. Navigare alla pagina **Hypervisors** dal menu laterale
2. Cliccare **Add Hypervisor**
3. Compilare il form:

| Campo | Descrizione | Esempio |
|-------|-------------|---------|
| **Name** | Nome identificativo | `Proxmox-Prod-01` |
| **Type** | Tipo di hypervisor | `Proxmox` |
| **Host** | IP o hostname del server Proxmox | `192.168.1.100` |
| **Port** | Porta API (default 8006) | `8006` |
| **API Token ID** | Token ID nel formato `user@realm!tokenid` | `root@pam!vibevps` |
| **API Token Secret** | Il secret copiato in precedenza | `aaaaaa-bbb-cccc-...` |
| **Verify SSL** | Verifica certificato SSL (disabilitare per certificati self-signed) | `No` |

4. Cliccare **Save**

> **Nota**: Il campo **Node** viene rilevato automaticamente durante il test di connessione. Non è necessario inserirlo manualmente.

### 5.3 Test della Connessione

Dopo aver aggiunto l'hypervisor:

1. Cliccare il pulsante **Test** accanto all'hypervisor nella lista
2. Se la connessione riesce, verranno mostrati:
   - Nome del nodo Proxmox
   - Versione di Proxmox VE
   - Hostname del server
3. Il nome del nodo verrà salvato automaticamente

Se il test fallisce, verificare:
- Che l'IP e la porta siano corretti
- Che il firewall permetta le connessioni sulla porta 8006
- Che il token API sia valido e non scaduto
- Che il server VIBEVps abbia raggiungibilità di rete verso Proxmox

---

## 6. Dashboard

La Dashboard è la pagina principale, visibile subito dopo il login. Mostra una panoramica completa dello stato di tutti gli hypervisor e delle VM.

### 6.1 Panoramica Nodi

Per ogni hypervisor connesso viene mostrata una card con:

- **CPU**: percentuale di utilizzo in tempo reale con barra di progresso
- **RAM**: utilizzo corrente / totale con barra di progresso
- **Disco**: spazio utilizzato / totale
- **Uptime**: tempo di attività del nodo

I dati si aggiornano automaticamente ogni **5 secondi** tramite WebSocket.

### 6.2 Statistiche VM

Un riepilogo mostra:
- Numero totale di VM
- VM in esecuzione (running)
- VM ferme (stopped)
- VM in pausa (paused/suspended)

### 6.3 Storage e Traffico di Rete

- **Storage**: elenco degli storage configurati su Proxmox con barre di utilizzo. È possibile nascondere/mostrare specifici storage dalla pagina Settings.
- **Traffico di rete**: velocità di ingresso e uscita calcolata in tempo reale dai dati WebSocket, con riepilogo del traffico totale.

### 6.4 Filtro Hypervisor

Quando sono configurati **più hypervisor**, compare automaticamente un selettore in alto per filtrare la vista su un singolo hypervisor o mostrare tutti.

---

## 7. Gestione Macchine Virtuali

### 7.1 Lista VM

La pagina **Virtual Machines** mostra tutte le VM di tutti gli hypervisor in un'unica vista:

- **Ricerca**: filtro per nome o ID della VM
- **Filtro stato**: mostra solo VM running, stopped, ecc.
- **Filtro hypervisor**: quando ci sono più hypervisor
- **Vista tabella** (desktop): colonne per nome, ID, stato, CPU, RAM, disco, hypervisor
- **Vista card** (mobile): card compatte per ogni VM

Ogni riga/card mostra un badge colorato per lo stato:
- 🟢 **Running** — VM in esecuzione
- 🔴 **Stopped** — VM ferma
- 🟡 **Paused** — VM in pausa
- 🟠 **Suspended** — VM sospesa
- ⚫ **Unknown** — Stato non determinabile

### 7.2 Dettaglio VM

Cliccando su una VM si accede alla pagina di dettaglio che mostra:

- **Informazioni generali**: nome, VMID, stato, hypervisor di appartenenza
- **Risorse**: numero core CPU, RAM allocata, dimensione disco
- **Metriche runtime** (se running): uptime, utilizzo CPU, traffico di rete
- **Pulsanti azione**: avvia, ferma, riavvia, sospendi, elimina
- **Pulsante SSH**: apre il terminale SSH nel browser (vedi sezione 10)

### 7.3 Azioni sulle VM

Le azioni disponibili dipendono dallo stato corrente della VM:

| Azione | Da stato | Risultato |
|--------|----------|-----------|
| **Start** | Stopped, Suspended | Avvia la VM |
| **Stop** | Running, Paused | Arresta la VM (ACPI shutdown) |
| **Restart** | Running | Riavvia la VM |
| **Suspend** | Running | Sospende la VM su RAM |

Le azioni possono essere eseguite sia dalla lista VM (pulsanti inline) che dalla pagina di dettaglio.

Dopo ogni azione, la pagina si aggiorna automaticamente dopo 2 secondi per mostrare il nuovo stato.

### 7.4 Eliminazione VM

L'eliminazione di una VM richiede una conferma esplicita tramite modale:

1. Cliccare il pulsante **Delete** nella pagina di dettaglio
2. Confermare nella finestra di dialogo
3. Se la VM è in esecuzione, verrà prima arrestata automaticamente e poi eliminata
4. L'operazione è **irreversibile**

---

## 8. Creazione Macchine Virtuali

### 8.1 Prerequisiti: Template Proxmox

Per creare VM tramite VIBEVps, è necessario avere almeno un **template VM** configurato su Proxmox:

1. Installare una VM su Proxmox con il sistema operativo desiderato
2. Installare **cloud-init** e **qemu-guest-agent**:
   ```bash
   # Su Ubuntu/Debian
   sudo apt install cloud-init qemu-guest-agent

   # Su CentOS/RHEL
   sudo yum install cloud-init qemu-guest-agent
   ```
3. Configurare il disco cloud-init in Proxmox (Hardware → Add → CloudInit Drive)
4. Convertire la VM in template: tasto destro → **Convert to Template**

### 8.2 Wizard di Creazione (5 Step)

La creazione di una VM avviene tramite un wizard guidato in 5 passaggi, accessibile dalla pagina **Create VM** nel menu laterale.

#### Step 1: Selezione Template

- Selezionare l'hypervisor di destinazione
- Scegliere un template dalla lista dei template salvati
- Oppure scoprire template direttamente dall'hypervisor (pulsante "Discover")

#### Step 2: Identità VM

- **VM Name**: nome della VM (visibile in Proxmox e nella dashboard)
- **Hostname**: hostname che verrà configurato via cloud-init all'interno della VM

#### Step 3: Rete

Due modalità disponibili:

**DHCP** (default):
- L'IP verrà assegnato automaticamente dal server DHCP della rete
- VIBEVps rigenera automaticamente il `machine-id` per ottenere un lease DHCP unico

**IP Statico**:
- **IP Address**: indirizzo IP (es. `192.168.1.50`)
- **Netmask**: in formato CIDR (es. `24` per `/24` ovvero `255.255.255.0`)
- **Gateway**: gateway di rete (es. `192.168.1.1`)
- **DNS Servers**: server DNS separati da virgola (default: `8.8.8.8, 1.1.1.1`)

#### Step 4: Risorse

- **CPU Cores**: numero di core virtuali (default dal template)
- **RAM (MB)**: memoria RAM in megabyte (default dal template)
- **Disk (GB)**: dimensione del disco in gigabyte (default dal template; il disco viene espanso se richiesto un valore maggiore del template)

#### Step 5: Riepilogo

Revisione di tutte le configurazioni prima della conferma. Cliccare **Create** per avviare il processo.

### 8.3 Configurazione Cloud-Init

VIBEVps utilizza **cloud-init** per configurare automaticamente le VM appena create:

- **Hostname**: impostato secondo quanto specificato nello Step 2
- **Rete**: configurazione IP statico o DHCP come specificato nello Step 3
- **DNS**: server DNS configurati
- **Guest Agent**: viene caricato uno snippet vendor-data per l'auto-installazione di `qemu-guest-agent` se non già presente
- **Machine-ID**: rigenerato automaticamente per evitare conflitti DHCP quando si clonano VM

### 8.4 Cosa Succede Dopo la Creazione

Il processo di creazione esegue in sequenza:

1. **Clone** — Clonazione completa (non linked) del template
2. **Cloud-Init Drive** — Aggiunta del drive cloud-init se mancante
3. **Resize Disco** — Espansione del disco se richiesto
4. **MAC Unico** — Generazione di un MAC address univoco (locally-administered)
5. **Configurazione** — Applicazione hostname, IP, DNS, risorse, guest agent
6. **Vendor-Data** — Upload snippet per auto-installazione qemu-guest-agent
7. **Avvio** — Start della VM
8. **Post-Boot** — Attesa guest agent (fino a 120 secondi), poi:
   - Rigenerazione `machine-id` (per lease DHCP unici)
   - Espansione filesystem per utilizzare tutto lo spazio disco

Al termine, la VM comparirà nella lista con stato **Running**.

---

## 9. Gestione Template

La pagina **Templates** permette di salvare e organizzare i template VM per un riutilizzo rapido.

### 9.1 Scoperta Automatica Template

1. Selezionare un hypervisor dal filtro
2. Cliccare **Discover Templates**
3. VIBEVps interroga Proxmox e mostra tutte le VM contrassegnate come template
4. Selezionare i template da importare

### 9.2 Salvataggio Template con Valori Default

Quando si salva un template, è possibile configurare valori default che verranno precompilati nel wizard di creazione VM:

| Campo | Descrizione |
|-------|-------------|
| **Name** | Nome descrittivo (es. "Ubuntu 24.04 Base") |
| **Description** | Descrizione libera del template |
| **Default Cores** | Numero di core CPU predefinito |
| **Default Memory (MB)** | RAM predefinita in MB |
| **Default Disk (GB)** | Dimensione disco predefinita in GB |
| **OS Type** | Tipo di sistema operativo (informativo) |

I template salvati saranno disponibili nello Step 1 del wizard di creazione VM.

---

## 10. Console SSH Web

VIBEVps include un terminale SSH integrato nel browser, basato su **xterm.js** e un proxy WebSocket.

### 10.1 Requisiti

Per utilizzare la console SSH è necessario che la VM:

- Sia in stato **Running**
- Abbia **qemu-guest-agent** attivo (per il rilevamento dell'IP)
- Abbia un **server SSH** in ascolto sulla porta 22
- Abbia credenziali SSH valide (username/password)

### 10.2 Connessione

1. Dalla pagina di dettaglio di una VM running, cliccare il pulsante **SSH**
2. Si apre un modale con il terminale
3. Inserire **username** e **password** SSH della VM
4. Il terminale si connette e mostra la shell remota

Il terminale supporta:
- **Ridimensionamento** automatico alla finestra del browser
- **Copia/incolla** con le scorciatoie standard del terminale
- Tutti i comandi e programmi interattivi (vim, htop, ecc.)

### 10.3 Risoluzione IP

VIBEVps determina l'IP della VM con una catena di fallback:

1. **QEMU Guest Agent** — interroga l'agent per ottenere gli indirizzi delle interfacce di rete (esclude loopback e link-local)
2. **VM Detail** — estrae l'IP dal campo `ipconfig` nella configurazione Proxmox
3. **Cloud-Init Config** — legge l'IP dalla configurazione cloud-init salvata

---

## 11. Log Attività

La pagina **Logs** mostra lo storico di tutte le operazioni eseguite sulle VM:

| Campo | Descrizione |
|-------|-------------|
| **Action** | Tipo di operazione (create, start, stop, restart, delete, suspend) |
| **VM Name** | Nome della VM coinvolta |
| **Hypervisor** | Hypervisor su cui è stata eseguita l'azione |
| **Status** | Esito (success / error) |
| **Details** | Dettagli aggiuntivi (in formato JSON) |
| **Timestamp** | Data e ora dell'operazione |

Le azioni sono codificate con badge colorati:
- **Create** → verde
- **Start** → blu
- **Stop** → rosso
- **Restart** → arancione
- **Delete** → rosso scuro
- **Suspend** → giallo

Vengono mostrati i **100 log più recenti**.

---

## 12. Impostazioni

### 12.1 Cambio Password

Dalla pagina **Settings** è possibile cambiare la password dell'utente admin:

1. Inserire la **password corrente**
2. Inserire la **nuova password**
3. Confermare e cliccare **Change Password**

> **Importante**: cambiare la password di default al primo accesso.

### 12.2 Visibilità Storage

La sezione storage nelle impostazioni permette di controllare quali storage vengono mostrati nella Dashboard:

- Ogni storage rilevato dagli hypervisor ha un toggle on/off
- Gli storage disabilitati non verranno mostrati nella Dashboard
- Questa configurazione è salvata nel database e persiste tra le sessioni

---

## 13. Sistema di Aggiornamento

VIBEVps include un sistema di aggiornamento integrato che **non richiede licenza**.

### 13.1 Verifica Aggiornamenti

1. Navigare alla pagina **Updates** dal menu laterale
2. Cliccare **Check for Updates**
3. Se disponibile, verrà mostrato:
   - **Versione attuale** installata
   - **Nuova versione** disponibile
   - **Data di rilascio**
   - **Changelog** con l'elenco delle modifiche

### 13.2 Installazione Aggiornamenti

1. Dopo aver verificato la disponibilità, cliccare **Install Update**
2. Il sistema scaricherà il pacchetto di aggiornamento
3. Lo script `update.sh` verrà eseguito in background
4. L'applicazione si riavvierà automaticamente
5. Ricaricare la pagina per vedere la nuova versione

> **Nota**: durante l'aggiornamento l'applicazione potrebbe essere temporaneamente non disponibile per qualche secondo durante il riavvio.

### 13.3 Aggiornamenti Sequenziali

Se sono disponibili più versioni intermedie (es. dalla 1.0.0 alla 1.3.0), il sistema applica automaticamente gli aggiornamenti in sequenza, versione per versione. Questo garantisce che eventuali migrazioni del database o modifiche strutturali vengano applicate nell'ordine corretto.

### 13.4 Backup Automatico

Prima di ogni aggiornamento, lo script crea automaticamente un backup completo in `/var/www/vibevps-backups/`:

- Codice backend e frontend
- File `.env`
- Database SQLite
- `package.json`

Vengono mantenuti gli **ultimi 5 backup**; quelli più vecchi vengono rimossi automaticamente.

Per ripristinare un backup in caso di problemi:

```bash
# Arrestare l'applicazione
sudo pm2 stop vibevps

# Ripristinare il backup
sudo cp -r /var/www/vibevps-backups/backup-YYYYMMDD_HHMMSS/* /var/www/vibevps/

# Ricostruire e riavviare
cd /var/www/vibevps
sudo npm install && sudo npm run build
sudo pm2 restart vibevps
```

---

## 14. Architettura Tecnica

### 14.1 Stack Tecnologico

| Componente | Tecnologia |
|------------|-----------|
| **Backend** | Fastify 5 + TypeScript (ESM) |
| **Frontend** | React 19 + Vite + TailwindCSS v4 |
| **Database** | SQLite via better-sqlite3 (WAL mode) |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **Process Manager** | PM2 |
| **Reverse Proxy** | Nginx |
| **Real-time** | WebSocket (ws library) |
| **Terminale SSH** | xterm.js (frontend) + ssh2 (backend) |
| **HTTP Client** | undici (per API Proxmox) |
| **Validazione** | Zod |
| **State Management** | Zustand |
| **Routing** | react-router-dom v7 |
| **UI Components** | Radix UI + componenti custom |

### 14.2 Struttura del Progetto

```
vibevps/
├── backend/
│   └── src/
│       ├── server.ts              # Entry point Fastify
│       ├── config.ts              # Configurazione env vars
│       ├── auth/
│       │   ├── auth.routes.ts     # Login, me, change-password
│       │   └── auth.guard.ts      # Middleware JWT
│       ├── db/
│       │   ├── database.ts        # Init DB, WAL, seed admin
│       │   └── schema.sql         # Schema SQLite
│       ├── hypervisors/
│       │   ├── hypervisor.routes.ts
│       │   ├── hypervisor.service.ts
│       │   └── adapters/
│       │       ├── adapter.interface.ts  # Interfaccia comune
│       │       └── proxmox.adapter.ts    # Implementazione Proxmox
│       ├── vms/
│       │   └── vm.routes.ts       # CRUD + creazione VM
│       ├── templates/
│       │   └── template.routes.ts
│       ├── settings/
│       │   └── settings.routes.ts
│       ├── updates/
│       │   ├── updates.routes.ts
│       │   ├── license.service.ts
│       │   └── update-sequencer.ts
│       └── ws/
│           ├── ws.hub.ts          # Hub WebSocket real-time
│           └── ssh.handler.ts     # Proxy SSH WebSocket
├── frontend/
│   └── src/
│       ├── App.tsx                # Routing principale
│       ├── api/
│       │   └── client.ts          # API client singleton
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── VmList.tsx
│       │   ├── VmDetail.tsx
│       │   ├── CreateVm.tsx
│       │   ├── Hypervisors.tsx
│       │   ├── Templates.tsx
│       │   ├── Logs.tsx
│       │   ├── Settings.tsx
│       │   └── Updates.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Layout.tsx     # Wrapper con sidebar responsive
│       │   │   └── Sidebar.tsx    # Menu navigazione
│       │   └── ui/                # Componenti riutilizzabili
│       ├── store/
│       │   ├── auth.ts            # Store autenticazione (Zustand)
│       │   └── vms.ts             # Store VM (Zustand)
│       └── hooks/
│           └── useWebSocket.ts    # Hook WebSocket real-time
├── installer/
│   ├── build-update.sh            # Script generazione update
│   └── vibevps-installer-v1.0.0/
│       ├── install.sh             # Script installazione
│       ├── config/
│       │   ├── .env.template
│       │   └── nginx-vibevps.conf
│       └── scripts/
│           └── update.sh          # Script aggiornamento
├── data/
│   └── vibevps.db                 # Database SQLite (generato)
├── docs/                          # Documentazione
└── package.json                   # Root workspace
```

### 14.3 Database SQLite

Il database utilizza SQLite in modalità **WAL (Write-Ahead Logging)** per migliorare la concorrenza. Le tabelle principali sono:

| Tabella | Descrizione |
|---------|-------------|
| `users` | Utenti con password hash (bcrypt) |
| `hypervisors` | Configurazioni hypervisor (host, credenziali API) |
| `vm_logs` | Log di tutte le operazioni sulle VM |
| `vm_templates` | Template salvati con valori default |
| `settings` | Configurazioni key-value generiche |
| `license_info` | Informazioni licenza (opzionale) |

Il database viene creato automaticamente al primo avvio con lo schema predefinito e un utente admin di default.

**Percorso di default**: `/var/www/vibevps/data/vibevps.db`

### 14.4 API REST

Tutte le API sono prefissate con `/api` e protette da autenticazione JWT (eccetto `/api/auth/login`).

#### Autenticazione

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login con username/password → JWT |
| GET | `/api/auth/me` | Info utente corrente |
| POST | `/api/auth/change-password` | Cambio password |

#### Hypervisor

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/hypervisors` | Lista hypervisor |
| POST | `/api/hypervisors` | Aggiungi hypervisor |
| PUT | `/api/hypervisors/:id` | Modifica hypervisor |
| DELETE | `/api/hypervisors/:id` | Elimina hypervisor |
| GET | `/api/hypervisors/:id/test` | Test connessione |
| GET | `/api/hypervisors/:id/status` | Stato nodo (CPU, RAM, disco) |
| GET | `/api/hypervisors/:id/storages` | Lista storage con utilizzo |

#### Macchine Virtuali

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/vms` | Lista tutte le VM |
| GET | `/api/vms/:hypervisorId/:vmId` | Dettaglio singola VM |
| POST | `/api/vms/:hypervisorId/:vmId/:action` | Azione VM (start/stop/restart/suspend) |
| DELETE | `/api/vms/:hypervisorId/:vmId` | Elimina VM |
| POST | `/api/vms/create` | Crea VM da template |
| GET | `/api/vms/logs` | Log attività VM |

#### Template

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/templates` | Lista template salvati |
| GET | `/api/templates/discover/:hypervisorId` | Scopri template su hypervisor |
| POST | `/api/templates` | Salva template |
| DELETE | `/api/templates/:id` | Elimina template |

#### Impostazioni

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/settings` | Tutte le impostazioni |
| GET | `/api/settings/:key` | Singola impostazione |
| PUT | `/api/settings/:key` | Crea/aggiorna impostazione |

#### Aggiornamenti e Licenza

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/updates` | Verifica aggiornamenti disponibili |
| POST | `/api/updates/install` | Installa aggiornamento |
| GET | `/api/license` | Info licenza e server |
| POST | `/api/license/activate` | Attiva licenza |
| POST | `/api/license/verify` | Verifica licenza |

### 14.5 WebSocket Real-time

VIBEVps utilizza due endpoint WebSocket:

#### `/ws` — Hub Real-time

Si connette automaticamente all'apertura della Dashboard. Ogni **5 secondi** invia un aggiornamento con:

```json
{
  "type": "update",
  "data": {
    "nodeStatus": { "cpu": 0.15, "memory": {...}, "disk": {...}, "uptime": 86400 },
    "vms": [ { "vmid": 100, "name": "web-01", "status": "running", ... } ],
    "storages": [ { "storage": "local-lvm", "used": 50, "total": 100, ... } ]
  }
}
```

La Dashboard, la lista VM e gli store Zustand ricevono e visualizzano questi dati in tempo reale senza bisogno di refresh.

#### `/ws/ssh` — Proxy SSH

Stabilisce una connessione SSH proxy tra il browser e la VM, permettendo di usare un terminale completo nel browser. I dati del terminale transitano bidirezionalmente attraverso il backend.

---

## 15. Manutenzione e Troubleshooting

### 15.1 Comandi PM2 Utili

```bash
# Stato dell'applicazione
sudo pm2 status

# Log in tempo reale
sudo pm2 logs vibevps

# Riavvio applicazione
sudo pm2 restart vibevps

# Stop applicazione
sudo pm2 stop vibevps

# Monitoraggio risorse (CPU/RAM)
sudo pm2 monit

# Ricaricare dopo modifiche (zero-downtime)
sudo pm2 reload vibevps
```

### 15.2 Log di Sistema

| Log | Percorso |
|-----|----------|
| **Log applicazione** | `~/.pm2/logs/vibevps-out.log` e `vibevps-error.log` |
| **Log installazione** | `/var/log/vibevps-install.log` |
| **Log aggiornamenti** | `/var/log/vibevps-update.log` |
| **Log Nginx** | `/var/log/nginx/access.log` e `error.log` |

### 15.3 Backup Database

Il database SQLite è un singolo file che può essere copiato direttamente:

```bash
# Backup manuale
sudo cp /var/www/vibevps/data/vibevps.db /backup/vibevps-$(date +%Y%m%d).db

# Backup con script cron (giornaliero alle 2:00)
echo "0 2 * * * root cp /var/www/vibevps/data/vibevps.db /backup/vibevps-\$(date +\%Y\%m\%d).db" | \
  sudo tee /etc/cron.d/vibevps-backup
```

> **Nota**: SQLite in modalità WAL potrebbe avere file aggiuntivi (`-wal` e `-shm`). Per un backup consistente, è consigliabile arrestare momentaneamente l'applicazione o utilizzare il comando `.backup` di SQLite.

### 15.4 Problemi Comuni e Soluzioni

#### L'applicazione non si avvia

```bash
# Verificare lo stato PM2
sudo pm2 status

# Controllare i log di errore
sudo pm2 logs vibevps --err --lines 50

# Verificare che la porta 3001 sia libera
sudo ss -tlnp | grep 3001

# Riavviare
sudo pm2 restart vibevps
```

#### Pagina non raggiungibile (502 Bad Gateway)

```bash
# Verificare che Nginx sia attivo
sudo systemctl status nginx

# Verificare la configurazione
sudo nginx -t

# Verificare che il backend sia in ascolto
sudo pm2 status
curl http://127.0.0.1:3001/api/auth/me

# Riavviare tutto
sudo pm2 restart vibevps && sudo systemctl restart nginx
```

#### Hypervisor non raggiungibile

- Verificare la raggiungibilità di rete: `curl -k https://IP_PROXMOX:8006/api2/json/version`
- Controllare il firewall: `sudo ufw status` (sul server VIBEVps) e le regole firewall di Proxmox
- Verificare il token API nella pagina Hypervisors → Edit → controllare Token ID e Secret
- Verificare che il token non sia scaduto nell'interfaccia Proxmox

#### VM creata ma IP non rilevato

- Verificare che `qemu-guest-agent` sia installato e attivo nella VM: `systemctl status qemu-guest-agent`
- Verificare che il dispositivo `virtio-serial` sia presente nella configurazione hardware della VM in Proxmox
- Per VM con DHCP: attendere qualche secondo dopo l'avvio perché l'agent si attivi
- Provare ad avviare manualmente l'agent: `sudo systemctl start qemu-guest-agent`

#### Console SSH non si connette

- Verificare che la VM sia in stato **Running**
- Verificare che il servizio SSH sia attivo nella VM: `systemctl status sshd`
- Verificare le credenziali SSH (username e password corretti)
- Verificare che l'IP della VM sia stato rilevato correttamente (vedi punto precedente)
- Controllare che non ci siano regole firewall nella VM che bloccano la porta 22

#### Database corrotto

```bash
# Arrestare l'applicazione
sudo pm2 stop vibevps

# Provare a riparare
cd /var/www/vibevps/data
sqlite3 vibevps.db "PRAGMA integrity_check;"

# Se corrotto, ripristinare dal backup
sudo cp /var/www/vibevps-backups/backup-ULTIMO/data/vibevps.db /var/www/vibevps/data/

# Riavviare
sudo pm2 restart vibevps
```

---

## 16. Sicurezza

### Raccomandazioni

1. **Cambiare la password di default** immediatamente dopo l'installazione
2. **Generare chiavi univoche** per `JWT_SECRET` e `ENCRYPTION_KEY` nel file `.env`
3. **Configurare HTTPS** con un certificato SSL valido (Let's Encrypt o certificato commerciale) per cifrare il traffico
4. **Limitare l'accesso di rete** al pannello VIBEVps solo agli IP autorizzati tramite firewall
5. **Aggiornare regolarmente** il sistema operativo e VIBEVps

### Dettagli Implementativi

| Aspetto | Implementazione |
|---------|----------------|
| **Autenticazione** | JWT con scadenza 8 ore |
| **Password** | Hash bcrypt (cost factor 10) |
| **Auth Guard** | Middleware su tutte le route protette |
| **Credenziali Hypervisor** | Memorizzate in SQLite (cifratura AES-256-GCM predisposta ma non ancora implementata) |
| **CORS** | Configurabile via variabile d'ambiente |
| **SSL Proxmox** | Verifica opzionale (consigliato disabilitare solo per certificati self-signed) |
| **Token localStorage** | Salvato come `vvps_token`, rimosso automaticamente al logout o alla scadenza |

---

## 17. Sviluppo Locale

Per contribuire allo sviluppo o eseguire VIBEVps in locale:

```bash
# 1. Clonare il repository
git clone https://github.com/user/vibevps.git
cd vibevps

# 2. Installare le dipendenze (npm workspaces)
npm install

# 3. Avviare in modalità sviluppo (backend + frontend)
npm run dev
```

L'applicazione sarà disponibile su:
- **Frontend**: `http://localhost:5173` (Vite dev server con hot reload)
- **Backend**: `http://localhost:3001` (Fastify con tsx watch)

Il proxy Vite reindirizza automaticamente le chiamate `/api` e `/ws` al backend.

### Comandi Disponibili

```bash
npm run dev              # Backend (:3001) + Frontend (:5173) in parallelo
npm run dev:backend      # Solo backend con hot reload
npm run dev:frontend     # Solo frontend con hot reload
npm run build            # Build produzione (frontend + backend)
cd frontend && npm run lint  # Lint del codice frontend
npm run start            # Avvio in modalità produzione
```

### Struttura Workspace

Il progetto utilizza npm workspaces con due package:
- `backend/` — Fastify + TypeScript (ESM, importi con estensione `.js`)
- `frontend/` — React + Vite + TailwindCSS v4

Il path alias `@/` nel frontend mappa a `frontend/src/`.

---

*Manuale generato per VIBEVps v1.3.1 — 22 Marzo 2026*

# Responsive Design Completo — VIBEVps v1.3.0

**Data**: 22 Marzo 2026
**Tipo**: MINOR (nuova feature: layout responsive completo)
**Versione target**: 1.3.0

## Obiettivo

Rendere l'intera webapp VIBEVps completamente responsive e utilizzabile su dispositivi mobili (smartphone e tablet).

## Stato Attuale

- **Sidebar**: sempre visibile a `w-64`, nessun hamburger menu
- **Layout**: sempre 2 colonne (sidebar + main), non collassa su mobile
- **Tabelle** (VmList, Hypervisors, Logs): usano solo scroll orizzontale, non adattate
- **Pagine**: alcune griglie hanno breakpoint (`sm:`, `lg:`) ma il layout base non è mobile-first
- **Modal**: ha `mx-4` ma non è ottimizzato per mobile
- **SSH Terminal**: altezza fissa `h-[450px]`

## Approccio Tecnico

### 1. Layout & Sidebar (componenti principali)

**Sidebar.tsx**:
- Su mobile (`< lg`): sidebar nascosta, mostrare hamburger button nell'header
- Su desktop (`>= lg`): sidebar sempre visibile come ora
- Overlay scuro quando sidebar aperta su mobile
- Transizione slide-in/out animata

**Layout.tsx**:
- Aggiungere header mobile con hamburger + logo + titolo pagina
- Main content: `ml-0` su mobile, `lg:ml-64` su desktop
- Padding ridotto su mobile: `p-4` vs `p-6`

### 2. Pagine

**Dashboard.tsx**:
- Stats: `grid-cols-2` su mobile (2x2), `lg:grid-cols-4` su desktop
- Sezioni inferiori: stack verticale su mobile
- Testo e padding ridotti su mobile

**VmList.tsx**:
- Tabella: su mobile mostrare come card list invece di tabella
- Ogni VM diventa una card con info principali e azioni
- Mantenere tabella su `lg:` e superiori

**VmDetail.tsx**:
- Info grid: `grid-cols-1` su mobile, `sm:grid-cols-2`, `lg:grid-cols-3`
- Pulsanti azioni: wrap su mobile, scroll orizzontale o grid
- Config JSON: scroll orizzontale con `overflow-x-auto`

**CreateVm.tsx**:
- Step indicator: compatto su mobile (solo numeri, no testo)
- Form: full width su mobile
- Padding ridotto

**Hypervisors.tsx**:
- Card grid responsive
- Modal form: full width su mobile
- Tabella status: card layout su mobile

**Templates.tsx**:
- Grid: `grid-cols-1` su mobile, `md:grid-cols-2`, `lg:grid-cols-3`
- Già parzialmente responsive

**Logs.tsx**:
- Lista log: layout compatto su mobile
- Timestamp e dettagli su righe separate

**Settings.tsx**:
- Form: full width su mobile
- Già parzialmente responsive con `max-w-2xl`

**Updates.tsx**:
- Layout: stack verticale su mobile
- Changelog: compatto

**Login.tsx**:
- Card login: full width su mobile con margin
- Già quasi responsive

### 3. Componenti UI

**Modal.tsx**:
- Su mobile: full width con margin minimo, max-height con scroll
- Su desktop: centrato come ora

**Card.tsx**:
- Padding ridotto su mobile

**Button.tsx**:
- OK come è, già responsive

### 4. SSH Terminal
- Altezza adattiva: `h-[300px]` su mobile, `h-[450px]` su desktop
- Full width sempre

## File Coinvolti

1. `frontend/src/components/layout/Layout.tsx`
2. `frontend/src/components/layout/Sidebar.tsx`
3. `frontend/src/components/ui/Modal.tsx`
4. `frontend/src/pages/Dashboard.tsx`
5. `frontend/src/pages/VmList.tsx`
6. `frontend/src/pages/VmDetail.tsx`
7. `frontend/src/pages/CreateVm.tsx`
8. `frontend/src/pages/Hypervisors.tsx`
9. `frontend/src/pages/Templates.tsx`
10. `frontend/src/pages/Logs.tsx`
11. `frontend/src/pages/Settings.tsx`
12. `frontend/src/pages/Updates.tsx`
13. `frontend/src/pages/Login.tsx`
14. `frontend/src/components/SshTerminal.tsx`

## Breakpoint Strategy

| Breakpoint | Larghezza | Comportamento |
|-----------|-----------|---------------|
| Default | < 640px | Mobile: sidebar nascosta, layout single-column, card-based |
| `sm:` | >= 640px | Small tablet: griglie 2 colonne dove utile |
| `md:` | >= 768px | Tablet: griglie intermedie |
| `lg:` | >= 1024px | Desktop: sidebar visibile, layout completo |
| `xl:` | >= 1280px | Wide desktop: griglie espanse |

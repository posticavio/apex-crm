# AGENTS.md — Protocollo di Coordinamento Multi-Agente (Antigravity & Codex)

Questo repository (**Apex Digital CRM**) è condiviso e sviluppato congiuntamente da **Google Antigravity** e **OpenAI Codex**. Ogni agente che opera su questo progetto deve rispettare rigorosamente le regole seguenti.

---

## Regole Operative Obbligatorie

1. **Fonte ufficiale del codice**: GitHub (`https://github.com/posticavio/apex-crm.git`) è la fonte ufficiale condivisa del codice.
2. **Controllo preliminare obbligatorio**: Prima di iniziare qualsiasi lavoro, ogni agente deve verificare:
   - lo stato Git (`git status`);
   - il branch corrente (`git branch --show-current`);
   - gli ultimi commit (`git log -n 5`);
   - le istruzioni e il registro contenuti in questo file `AGENTS.md`.
3. **Identificazione autore**: Ogni agente deve identificare l'autore e l'agente responsabile dell'ultimo commit.
4. **Lettura del passaggio di consegne**: Se l'ultimo commit o l'ultima sessione proviene dall'altro agente, è obbligatorio leggere le informazioni di passaggio nel **Registro di Passaggio tra Agenti** prima di procedere.
5. **Documentazione di fine sessione**: Al termine di ogni sessione di lavoro devono essere documentati nel registro:
   - attività completate;
   - file modificati;
   - test eseguiti;
   - problemi aperti;
   - attività successive consigliate;
   - eventuali modifiche non pubblicate.
6. **Salvaguardia del lavoro altrui**: Non devono mai essere sovrascritte o annullate modifiche dell'altro agente.
7. **Analisi delle divergenze**: Se ci sono divergenze tra codice locale e remoto (`git fetch` / `git status`), devono essere analizzate con attenzione prima di sincronizzare, evitando fusioni automatiche non verificate o reset distruttivi.
8. **Formato dei commit**: Ogni commit deve avere un messaggio chiaro e identificare esplicitamente l'agente responsabile (es. prefisso o trailer `[Antigravity]` / `[Codex]`).
9. **Pubblicazione su GitHub**: Le modifiche completate devono essere pubblicate su GitHub (`git push`) solo dopo aver superato i controlli di sicurezza e i test del progetto.
10. **Verifica obbligatoria**: Nessun agente può considerare completata un'attività senza aver verificato concretamente i risultati (esecuzione della suite di test e controllo dello stato Git).

---

## Comandi di Verifica Standard

Prima di pubblicare modifiche al codice applicativo, eseguire la suite di controllo:

```sh
node --check app.js
node --check company-import.js
node --check quotes.js
node --check activities.js
node --check projects.js
node --check analytics.js
node --check supabase-sync.js
node --check crm-mcp-server.js
node --check crm-pro.js
node crm-check.cjs
node import-check.cjs
node relationship-check.cjs
node sales-check.cjs
node resource-check.cjs
node unscheduled-check.cjs
node quotes-check.cjs
node activities-check.cjs
node enterprise-check.cjs
node cloud-sync-check.cjs
node mcp-server-check.cjs
node crm-pro-check.cjs
```

---

## Registro di Passaggio tra Agenti (Handoff Log)
### Sessione 2026-11-01 (Apex Pro CRM: Scheda 360°, Quick Touchpoint Logger con Smart Follow-Up, Deal Stage Modal con Motivi di Perdita, Deal Rotting Alert, Lead Scoring Hot/Warm/Cold, WhatsApp 1-Click & Dashboard Executive) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `10a5300` (`[Antigravity] docs: update handoff log for multi-device sync and MCP server`) su `main`.
- **Attività completate**:
  - **Analisi Funzionale CRM Professionale**:
    - Risolto il divario tra CRM essenziale e piattaforma di classe enterprise (Attio, Twenty CRM, HubSpot, Pipedrive): superato il paradigma del mero form modale di modifica a favore di un cockpit operativo e orientato alle vendite ad alta velocità.
  - **Scheda Dettaglio Azienda 360° (Company 360° Cockpit & Drawer)** (`crm-pro.js`, `layout.css`, `index.html`):
    - Implementato `openCompany360(companyId, tab)`: schermata executive a pagina intera/drawer a 6 tab (Timeline & Feed, Referenti, Opportunità, Preventivi, Progetti, Anagrafica & Note).
    - **Header 360° con Action Ribbon Esecutivo**: monogramma dinamico, badge di fase e temperatura lead, pulsanti rapidi Chiama, Invia Email, WhatsApp, Registra Interazione, + Trattativa, + Preventivo, + Attività, Modifica Dati.
    - **Stats Ribbon**: 4 KPI in cima (Pipeline Aperta, Canoni Acquisiti MRR, Preventivi Emessi, Follow-up da gestire).
  - **Logger Rapido Interazioni & Touchpoint ("Quick Interaction Logger")**:
    - Modale dedicato `#interaction-dialog` con selezione rapida del canale (Telefonata, WhatsApp, Email, Incontro, Nota).
    - **Esiti Rapidi a 1 Clic**: [Interessato], [Da risentire], [Non risponde], [Fissata demo], [Chiesto preventivo], [Non interessato].
    - **Smart Follow-Up Automatico**: opzione integrata con scorciatoie di scadenza (+1g, +3g, Lunedì, +1sett) che crea istantaneamente l'attività operativa di promemoria nel modulo `activities`.
  - **Gestione Avanzamento Trattative Guidata (Deal Stage Modal)**:
    - Modale guidato `#deal-stage-dialog` per spostare le opportunità tra le 5 fasi della pipeline.
    - **Motivi di Perdita Strutturati (`lossReason`)**: catalogazione obbligatoria per opportunità perse (Prezzo troppo alto, Concorrenza, Progetto rimandato, Ghosting/Nessuna risposta, Mancanza requisiti).
    - **Celebrazione Chiusura Vinta**: congratulazioni, conferma economica e conversione automatica dell'azienda in Cliente.
  - **Alert Inattività & Deal Rotting**:
    - Rilevamento automatico delle opportunità stagnanti (`calcDealRottingDays`): badge visivo `Inattiva da Xgg` (danger se >= 14 giorni, warning se >= 7 giorni) nella Kanban, nella lista e nella scheda 360°.
  - **Lead Scoring & Qualificazione Temperatura (BANT Fit)**:
    - Campo `leadTemp` per contatti Lead e Prospect (Hot, Warm, Cold) con badge visivo atomico, selettore in anagrafica e supporto nel server MCP.
  - **Scorciatoie Rapide Data (Quick Due Date Shortcuts)**:
    - Componente riutilizzabile `renderDateShortcuts` con pulsanti a tocco singolo (`Oggi`, `Domani`, `+3 giorni`, `Lunedì`, `+1 sett.`, `+2 sett.`) integrato in tutti i form di attività, scadenze e follow-up.
  - **Integrazione WhatsApp Web 1-Click**:
    - Helper `makeWhatsAppUrl` con normalizzazione prefisso internazionale italiano e testi precompilati professionali per primo contatto, follow-up e invio preventivo.
  - **Dashboard Commerciale Executive Potenziata**:
    - Metriche di chiusura: **Win Rate %** (Trattative Vinte su Concluse), **Average Deal Size** (Valore medio setup), e contatore trattative a rischio inattività.
    - Widget **Ultime Interazioni Registrate**: feed rapido degli ultimi touchpoint aziendali con click per aprire direttamente la scheda 360°.
  - **Integrazione Command Palette (`⌘K`)**:
    - Azione rapida `⚡ Registra interazione rapida` e apertura istantanea della Scheda 360° per le aziende cercate.
- **File modificati/creati**:
  - `crm-pro.js` (nuovo)
  - `crm-pro-check.cjs` (nuovo)
  - `index.html`
  - `app.js`
  - `activities.js`
  - `crm-mcp-server.js`
  - `layout.css`
  - `AGENTS.md`
- **Test eseguiti**:
  - Eseguita l'intera suite di 9 verifiche sintattiche (`node --check`) e 12 test funzionali con esito `PASS` al 100%.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Esecuzione di `git push` e avvio di `pubblica-vercel.cmd`.

### Sessione 2026-10-30 (Risoluzione Persistenza Multi-Dispositivo con Supabase Real-Time Sync & Server MCP Universale per Antigravity e ChatGPT) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `564a13e` (`[Antigravity] fix(desktop): ensure '+ Crea' dropdown menu is visible and unclipped in desktop header`) su `main`.
- **Attività completate**:
  - **Risoluzione Persistenza Dati e Disponibilità Multi-Dispositivo**:
    - **Diagnosi**: I dati risiedevano esclusivamente nel `localStorage` del singolo browser, impedendo qualsiasi sincronizzazione tra dispositivi (smartphone, tablet, laptop, desktop) e causando la perdita apparente dei dati al cambio dispositivo o alla pulizia della cache.
    - **Modulo `supabase-sync.js`**: Implementata la sincronizzazione automatica bidirezionale, safe-additive (zero perdite dati) e offline-resilient con il cloud Supabase (`https://jjkqiatabmxcwvzswygh.supabase.co`).
    - **Idratazione Istantanea**: All'avvio su qualsiasi dispositivo, carica immediatamente il database cloud, incorporando aziende (`companies`), referenti (`contacts`), storico (`interactions`), preventivi (`quotes`) e lo snapshot completo crittografato dello stato applicativo (`attachments`).
    - **Salvataggio Automatico Cloud**: Ogni modifica tramite `persist(next)` viene salvata in locale (0ms latenza) e accodata via sync debounced verso Supabase, con gestione offline e riconnessione automatica (`visibilitychange`, `online`).
    - **UI Cloud Sync Status**: Aggiunto badge dinamico nell'Header desktop e mobile (`#cloud-sync-status`) con indicatore di stato visivo (🟢 `Cloud attivo`, 🟡 `Sincronizzazione in corso...`, ⚡ `Offline (dati protetti in locale)`), click per forzare il sync immediato, e pannello dedicato nel modale Impostazioni (`#settings-dialog`).
  - **Creazione Server MCP Universale (`crm-mcp-server.js`)**:
    - **Piena Conformità MCP 2024-11-05**: Implementato il protocollo ufficiale JSON-RPC 2.0 via standard input/output (`stdio`) e server HTTP/SSE opzionale (`--port <numero>`).
    - **Zero Dipendenze Esterne**: Realizzato in puro Node.js nativo (funziona immediatamente su qualsiasi sistema operativo senza necessitare di `npm install`).
    - **Compatibilità Totale con Antigravity & ChatGPT**:
      - Registrato direttamente nella configurazione globale di Antigravity: `C:\Users\posti\.gemini\config\mcp_config.json` (server `apex_crm`).
      - Creato file di configurazione pronto all'uso per ChatGPT Desktop: `chatgpt_mcp_config.json`.
      - Redatta guida operativa dettagliata: `MCP-SETUP-GUIDE.md`.
    - **Suite di 15 Strumenti (Tools) Completi**:
      - `crm_summary`, `crm_list_companies`, `crm_get_company`, `crm_create_company`, `crm_update_company`, `crm_list_deals`, `crm_create_deal`, `crm_advance_deal`, `crm_list_activities`, `crm_create_activity`, `crm_complete_activity`, `crm_list_quotes`, `crm_list_projects`, `crm_search`, `crm_sync_status`.
- **File modificati/creati**:
  - `supabase-sync.js` (nuovo)
  - `crm-mcp-server.js` (nuovo)
  - `cloud-sync-check.cjs` (nuovo)
  - `mcp-server-check.cjs` (nuovo)
  - `chatgpt_mcp_config.json` (nuovo)
  - `MCP-SETUP-GUIDE.md` (nuovo)
  - `index.html`
  - `app.js`
  - `layout.css`
  - `AGENTS.md`
  - `C:\Users\posti\.gemini\config\mcp_config.json`
- **Test eseguiti**:
  - Eseguita l'intera suite di 8 verifiche sintattiche (`node --check`) e 11 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`, `cloud-sync-check.cjs`, `mcp-server-check.cjs`) con esito `PASS` al 100%.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Esecuzione di `git push` e `pubblica-vercel.cmd` per promuovere il cloud sync e la nuova release in produzione.


### Sessione 2026-10-30 (Desktop Mode Salvaguardia Menu "+ Crea" Popover Visibile & Unclipped nell'Header) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `f15f45c` (`[Antigravity] feat(desktop): eliminate sidebar scroll completely with compact footer grid and 505px vertical fit`) su `main`.
- **Attività completate**:
  - Risolto il problema del menu di creazione a comparsa nascosto su Desktop (`quando premo crea il menu e nascosto in desktop mode`):
    - **Diagnosi W3C Overflow**: L'applicazione di `overflow-x: hidden !important` sull'Header (`height: 54px;`) e su `.header-quick-actions` causava il clipping verticale di qualsiasi elemento figlio posizionato in assoluto (`.quick-create-menu` con `top: calc(100% + 6px)`), rendendolo invisibile all'utente all'apertura.
    - **Risoluzione Overflow Visibile**: Impostato `header { overflow: visible !important; }` e `.header-quick-actions { overflow: visible !important; }` su desktop (`@media (min-width: 768px)`), mantenendo il contenimento anti-scroll orizzontale a monte tramite `html, body { max-width: 100vw; overflow-x: hidden; }` e dimensionamento flessibile dei componenti interni.
    - **Elevazione z-index**: Elevato `header` a `z-index: 50` e `.quick-create-menu` a `z-index: 1000` per garantire che il menu fluttui sopra intestazioni di tabella fisse e card.
    - **Test di Unità e Integrazione**: Aggiunti in `enterprise-check.cjs` i test per `openQuickCreateDropdown()`, `closeQuickCreateDropdown()`, `toggleQuickCreateDropdown()` e le asserzioni di visibilità CSS.
  - Formalizzata la regola nelle skill globali:
    - `universal-app-layout` (`references/desktop_top10_design_spec.md` Sezione 10.5 e `references/troubleshooting_kb.md` Caso 30).
    - `mobile-first-app-design` (`references/troubleshooting_kb.md` Caso 30).
    - Sincronizzato con il mirror `C:\Users\posti\Downloads\Antigravity\SKILLS_ANTIGRAVITY\`.
- **File modificati**:
  - `layout.css`
  - `enterprise-check.cjs`
  - `app.js`
  - `index.html`
  - `supabase-sync.js`
  - `AGENTS.md`
  - Skill globali: `universal-app-layout` e `mobile-first-app-design` (+ mirror `SKILLS_ANTIGRAVITY`)
- **Test eseguiti**:
  - Eseguita l'intera suite di 7 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
  - Audit di layout e mobile responsive (`audit_layout.py` e `audit_mobile_responsive.py`) superati con 0 anomalie.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Esecuzione di `pubblica-vercel.cmd` per promuovere l'aggiornamento in produzione su Vercel.

### Sessione 2026-10-29 (Sidebar Desktop Zero Scroll Totale, Footer Grid 4 Icone & Riduzione Altezza a 505px) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `d20ac43` (`[Antigravity] feat(desktop): enforce zero horizontal scroll for menus, toolbars, and boards on desktop`) su `main`.
- **Attività completate**:
  - Eliminato radicalmente qualsiasi scorrimento verticale e orizzontale sulla barra laterale (`aside#app-sidebar`):
    - Imposto blocco tassativo dello scroll: `overflow: hidden !important; overflow-y: hidden !important; overflow-x: hidden !important; height: 100dvh; max-height: 100dvh; box-sizing: border-box;`.
    - **Raggruppamento e Consolidamento Footer (`.sidebar-tools-grid`)**: Sostituiti i 5 bottoni alti a tutta larghezza impilati verticalmente con il solo pulsante `⚙ Impostazioni` e una griglia orizzontale compatta a 4 colonne per i comandi ausiliari (`⚡ Playbook`, `↓ Esporta JSON`, `↑ Importa CSV`, `⇄ Ripristina Backup`), riducendo l'altezza del footer da 170px a soli 66px.
    - **Calibrazione Metriche Verticali a 505px**: Ottimizzati padding e altezze di `nav button` (`28px`), `.nav-label` (`9px`), `.workspace-profile` (`38px`) e `.sidebar-top` (`34px`), portando l'altezza complessiva dell'intera sidebar a circa 505px.
    - Garantito il fit completo al 100% senza alcuna barra di scorrimento su schermi con altezze da 600px a 1440px e con display scaling Windows (125%/150%).
  - Aggiornate e sincronizzate le skill globali:
    - `universal-app-layout` (`references/desktop_top10_design_spec.md` Sezione 10.4, `references/troubleshooting_kb.md` Caso 29).
    - Sincronizzato il mirror globale `C:\Users\posti\Downloads\Antigravity\SKILLS_ANTIGRAVITY\universal-app-layout\` e `mobile-first-app-design`.
- **File modificati**:
  - `layout.css`
  - `index.html`
  - `enterprise-check.cjs`
  - `AGENTS.md`
  - Skill globali: `universal-app-layout` e `mobile-first-app-design` (+ mirror `SKILLS_ANTIGRAVITY`)
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
  - Audit di layout e mobile responsive (`audit_layout.py` e `audit_mobile_responsive.py`) superati con 0 anomalie.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Esecuzione di `pubblica-vercel.cmd` per promuovere l'aggiornamento in produzione su Vercel.

### Sessione 2026-10-29 (Desktop Mode Zero Scroll Orizzontale nei Menu, Raggruppamento Popover, Collasso Adattivo & Aggiornamento Skill Desktop) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `fcf7547` (`[Antigravity] feat(desktop): enforce horizontal zero-scroll creation modals on desktop`) su `main`.
- **Attività completate**:
  - Implementata la regola tassativa **Desktop Zero Scroll Orizzontale nei Menu, Navigazione, Toolbar, Filtri e Bacheche**:
    - Divieto assoluto di `overflow-x: auto` e barre di scorrimento orizzontale su menu, header, sidebar, filtri e bacheche (`overflow-x: hidden !important;`).
    - **Pattern 1 — Raggruppamento in Popover / Dropdown ("Raggruppa")**: consolidamento azioni in popover compatti (es. `+ Crea ▾` popover `#quick-create-menu` e `.row-actions` di tabella raggruppate).
    - **Pattern 2 — Collasso Adattivo con Priorità Visiva ("Nascondi")**: su laptop e monitor intermedi (`768px - 1180px`), le etichette testuali secondarie (`.density-label`, `.settings-label`, breadcrumb lungo) collassano in modalità solo-icona (`32×32px` con `title` e `aria-label`) per evitare qualsiasi overflow o scorrimento orizzontale.
    - **Pattern 3 — Wrap Responsivo Multi-Livello ("Inventati qualcos'altro")**: `.toolbar`, `.activity-filters`, `.quote-model-bar` e le barre segmentate utilizzano `flex-wrap: wrap !important; row-gap: 10px; column-gap: 8px;` con ricerca a sinistra, filtri al centro e comandi/esportazioni a destra su due livelli ordinati senza scroll laterale.
    - **Pattern 4 — Bacheche Kanban Fluide Zero-Scroll**: `.board` e `.board.board-3cols` su desktop sono configurate con `grid-template-columns: repeat(3, minmax(0, 1fr)) !important; overflow-x: hidden !important; width: 100%;` per occupare l'intera larghezza dello schermo senza costringere a scorrere in orizzontale con la rotellina.
  - Aggiornate e formalizzate le regole nelle skill globali:
    - `universal-app-layout` (`SKILL.md`, `references/desktop_top10_design_spec.md` Sezione 10, `references/troubleshooting_kb.md` Caso 28).
    - Sincronizzato il mirror globale `C:\Users\posti\Downloads\Antigravity\SKILLS_ANTIGRAVITY\universal-app-layout\`.
    - Sincronizzato `mobile-first-app-design` (`references/troubleshooting_kb.md`).
- **File modificati**:
  - `layout.css`
  - `index.html`
  - `analytics.js`
  - `enterprise-check.cjs`
  - `AGENTS.md`
  - Skill globali: `universal-app-layout` e `mobile-first-app-design` (+ mirror `SKILLS_ANTIGRAVITY`)
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
  - Audit di layout e mobile responsive (`audit_layout.py` e `audit_mobile_responsive.py`) superati con 0 anomalie.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Esecuzione di `pubblica-vercel.cmd` per promuovere l'aggiornamento in produzione su Vercel.

### Sessione 2026-10-29 (Smartphone Zero Scroll Orizzontale Expanding Pill, Anti Death-Scroll Accordion & Icone Moderne) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `b5c2387` (`[Antigravity] feat(ui): implement single-button Day/Night mode switch with distinct active color styling`) su `main`.
- **Attività completate**:
  - Implementato in `layout.css` e `index.html` il pattern tassativo **Zero Scroll Orizzontale su Smartphone (< 768px)**:
    - Navigazione inferiore `#mobile-bottom-nav` e sotto-navigazione `#mobile-subnav`: solo l'elemento ATTIVO mostra icona moderna + etichetta di testo in una capsula/pill espansa (`flex: 1.8; gap: 6px; background: var(--blue-soft)`), mentre tutti gli elementi INATTIVI mostrano SOLO l'icona moderna (`.bnav-label { display: none; }`, `.subnav-label { display: none; }`).
    - Eliminato qualsiasi scorrimento orizzontale (`overflow-x: hidden`), garantendo perfetta leggibilità e compatibilità su schermi stretti (da 320px a 430px) senza troncamenti né barre laterali.
  - Implementato il sistema **Anti Death-Scroll Verticale con Sezioni Collassabili & Accordion ("Nascondi / Fai vedere")**:
    - Definite classi riutilizzabili `.mobile-collapsible-section`, `.mobile-collapsible-summary`, `.mobile-summary-toggle` con badge contatore, icona semantica e trigger esplicito con chevron animato (`⌄` / `›`).
  - Creata la specifica estesa:
    - `references/smartphone_compact_ui_spec.md`
  - Creato l'esempio pronto all'uso:
    - `examples/smartphone_adaptive_shell_example.tsx`
  - Aggiornati i riferimenti in `universal-app-layout` (`SKILL.md`, `references/troubleshooting_kb.md` Casi 26 e 27) e sincronizzati nel mirror `C:\Users\posti\Downloads\Antigravity\SKILLS_ANTIGRAVITY\universal-app-layout\` e in `mobile-first-app-design`.
- **File modificati**:
  - `layout.css`
  - `index.html`
  - `AGENTS.md`
  - Skill globali: `universal-app-layout` e `mobile-first-app-design` (+ mirror `SKILLS_ANTIGRAVITY`)
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
  - Audit di layout e mobile responsive (`audit_layout.py` e `audit_mobile_responsive.py`) superati con 0 anomalie.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Esecuzione di `pubblica-vercel.cmd` per promuovere l'aggiornamento in produzione su Vercel.

### Sessione 2026-10-29 (Toggle Day Mode / Light Mode Tasto Singolo con Cambio Cromatico di Stato) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `19fe47d` (`[Antigravity] feat(ui): replace scattered create buttons with unified '+ Crea' popover on desktop and action sheet on mobile`) su `main`.
- **Attività completate**:
  - Riprogettata l'opzione tema Day Mode / Light Mode: sostituito il ciclo testuale ambiguo con un **singolo pulsante toggle compatto e diretto (`#theme-toggle`)** sia su Desktop sia su Smartphone:
    - Dotato di icona semantica (`☀` Day Mode / `🌙` Night Mode), micro-indicatore luminoso (`.theme-dot`) e stato accessibile `role="switch" aria-pressed="true" / "false"`.
    - **Cambio cromatico visivo di stato (Active Color Switch)**:
      - Quando inattivo (**Day Mode / Light Mode**): superficie pulita, neutra ed elegante con bordo hairline sottile (`var(--surface)` / `var(--line)`) e dot ambrato caldo.
      - Quando attivato (**Night / Dark / AMOLED Mode**): il pulsante stesso **cambia colore di sfondo e bordo in modo evidente** (indaco/blu `#4f46e5`, bordo `#4338ca`, testo chiaro `#ffffff`, dot ciano luminoso `#38bdf8` o nero profondo con bagliore neon in AMOLED), fornendo feedback immediato visibile a colpo d'occhio.
  - Aggiornate e formalizzate le regole e i pattern nelle skill globali:
    - `universal-app-layout` (`SKILL.md`, `references/desktop_top10_design_spec.md`, `references/troubleshooting_kb.md` Caso 25)
    - `mobile-first-app-design` (`SKILL.md`, `references/troubleshooting_kb.md` Caso 25)
- **File modificati**:
  - `index.html`
  - `analytics.js`
  - `layout.css`
  - `AGENTS.md`
  - Skill globali: `universal-app-layout` e `mobile-first-app-design`
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
  - Audit di layout e mobile responsive (`audit_layout.py` e `audit_mobile_responsive.py`) superati con 0 anomalie.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Esecuzione di `pubblica-vercel.cmd` per promuovere l'aggiornamento in produzione su Vercel.

### Sessione 2026-10-29 (Menu Unificato "+ Crea" Popover Desktop e Action Sheet Mobile) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `fcf7547` (`[Antigravity] feat(desktop): enforce horizontal zero-scroll creation modals on desktop`) su `main`.
- **Attività completate**:
  - Rimossa la dispersione orizzontale dei singoli pulsanti di creazione (`+ Attività`, `+ Opportunità`, `+ Preventivo`, `+ Progetto`, `+ Azienda`).
  - Implementato un **unico pulsante primario compatto `+ Crea ▾` (`#quick-create-btn`)** con popover menu ancorato (`#quick-create-menu`) sia su Desktop sia su Tablet:
    - Include icone dedicate semantiche, titoli in evidenza (`Nuova Attività`, `Nuova Opportunità`, `Nuova Azienda`, `Nuovo Preventivo`, `Nuovo Progetto`) e micro-descrizioni.
    - Supporta chiusura al click esterno o con il tasto `ESC`.
  - Implementato su Smartphone l'attivazione tramite il pulsante fluttuante `#mobile-fab` di un comodo **Bottom Action Sheet nativo (`#mobile-create-sheet`)** con grabber e touch target ampi (`min-height: 52px`).
  - Aggiornate e formalizzate le regole e i pattern nelle skill globali:
    - `universal-app-layout` (`SKILL.md` + `references/desktop_top10_design_spec.md`)
    - `mobile-first-app-design` (`references/troubleshooting_kb.md` Caso 24)
- **File modificati**:
  - `index.html`
  - `activities.js`
  - `layout.css`
  - `AGENTS.md`
  - Skill globali: `universal-app-layout` e `mobile-first-app-design`
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
  - Audit di layout e mobile responsive (`audit_layout.py` e `audit_mobile_responsive.py`) superati con 0 anomalie.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Esecuzione di `pubblica-vercel.cmd` per promuovere l'aggiornamento in produzione su Vercel.

### Sessione 2026-10-29 (Desktop Schermate di Creazione Orizzontali Zero-Scroll & Aggiornamento Skill Desktop) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `da5f02a` (`[Antigravity] feat(mobile): apply Play Store Top 20 mobile UX patterns (Extended FAB, M3 pill nav, segmented controls)`) su `main`.
- **Attività completate**:
  - Salvata e formalizzata nelle skill globali (`universal-app-layout/SKILL.md`, `universal-app-layout/references/desktop_top10_design_spec.md`, `universal-app-layout/references/responsive_breakpoints.md`, `mobile-first-app-design/SKILL.md`, `mobile-first-app-design/references/troubleshooting_kb.md` Caso 23, e sincronizzata in `SKILLS_ANTIGRAVITY`) la **regola tassativa per la versione Desktop**:
    - **Divieto assoluto di finestre verticali strette o con scorrimento verticale (`overflow-y: hidden`)** quando si apre una schermata per creare o modificare qualcosa.
    - **Sfruttamento orizzontale panoramico (`width: min(1480px, 96vw)`)** disponendo i campi su **4 colonne orizzontali** (`grid-template-columns: repeat(4, minmax(0, 1fr))`), i campi `.field.full` e `textarea` su `grid-column: span 2` compatti (`height: 36px`), e i blocchi secondari (allegati, conversazioni, righe preventivo, milestone progetto, 3 fasi playbook Lead/Prospect/Cliente) **affiancati in orizzontale** (layout Master-Detail sinistra/destra o a 3 colonne).
  - Applicato il nuovo layout orizzontale privo di scorrimento verticale in `layout.css` a tutte le schermate desktop di creazione/modifica di **Apex Digital CRM** (`#editor`, `#task-editor`, `#project-editor`, `#quote-editor`, `#finance-editor`, `#playbook-editor`).
- **File modificati**:
  - `layout.css`
  - `AGENTS.md`
  - Skill globali: `universal-app-layout` e `mobile-first-app-design` (+ mirror `SKILLS_ANTIGRAVITY`)
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Eventuale esecuzione di `pubblica-vercel.cmd` per aggiornare la build live su Vercel.

### Sessione 2026-10-29 (Benchmark Top 10 App Desktop & Aggiornamento Skill Desktop Mode) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `edd3545` (`[Antigravity] feat(ui): apply Attio/Twenty/Linear CRM design system and Cmd+K command palette`) su `main`.
- **Attività completate**:
  - Analizzato il design system, la disposizione ottica delle icone, la gerarchia dei comandi e l'ergonomia delle **Top 10 Applicazioni Generiche per Desktop** (*Linear, Notion, Attio / Twenty CRM, Slack Desktop, VS Code, Raycast, Figma Desktop, Apple macOS Finder/Mail, Superhuman, Airtable / Stripe Dashboard*).
  - Applicati i pattern Desktop Mode ad **Apex Digital CRM** (`index.html`, `activities.js`, `layout.css`, `enterprise-check.cjs`):
    1. **Bounding Box Ottico `20×20px` (`.nav-icon`) + Contatori Live (`.nav-badge`)**: ogni voce della sidebar desktop è strutturata in 3 zone (indicatore attivo `2.5px` + icona centrata in box `20×20px` + etichetta `.nav-text` allineata verticalmente + badge numerico monospace `[data-nav-count]` a destra, nascosto se `0`).
    2. **Sidebar Collassabile in Navigation Rail (`244px` $\leftrightarrow$ `68px` con `Ctrl+B` / `⌘B`)**: aggiunto pulsante `#sidebar-collapse-btn` (`⇤`/`⇥`), funzione `toggleSidebarCollapse()` persistita in `localStorage` (`uiPrefs.sidebarCollapsed`), comando nella Command Palette e scorciatoia `Ctrl+B` / `⌘B` in stile VS Code / Linear.
    3. **Top Command Bar (`54px`) divisa in 4 Cluster con Divisori Hairline `1px`**: separazione visiva tra Contesto/Breadcrumb, Spotlight Trigger `⌘K`, Cluster Creazione Rapida (`.header-create-cluster`) e Cluster Preferenze/Sistema (`.header-sys-cluster`).
    4. **Scorciatoie Keyboard-First**: supporto per `Ctrl+K` / `⌘K` (Command Palette), `Ctrl+B` / `⌘B` (Toggle Sidebar Rail) e `Alt+1..7` (navigazione immediata tra le 7 viste principali).
  - Aggiornate le skill globali per il **Desktop Mode**:
    - Creato `C:\Users\posti\.gemini\config\skills\universal-app-layout\references\desktop_top10_design_spec.md`.
    - Aggiornati `universal-app-layout/SKILL.md` e `mobile-first-app-design/SKILL.md` (+ `references/troubleshooting_kb.md`).
- **File modificati**:
  - `index.html`
  - `activities.js`
  - `layout.css`
  - `enterprise-check.cjs`
  - `AGENTS.md`
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
  - Eseguiti gli script di audit `audit_layout.py` e `audit_mobile_responsive.py` con `0 anomalie / 0 issues found`.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Eseguire `pubblica-vercel.cmd` se si desidera pubblicare l'aggiornamento live su Vercel.

### Sessione 2026-10-29 (Benchmark Top 20 App Play Store Mobile & Aggiornamento Skill) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `edd3545` (`[Antigravity] feat(ui): apply Attio/Twenty/Linear CRM design system and Cmd+K command palette`) su `main`.
- **Attività completate**:
  - Analizzato il design system, il tema, le forme, le dimensioni e la disposizione spaziale delle **Top 20 applicazioni premium/grossing su Google Play Store** (*Todoist Pro, TickTick Premium, Notion Plus, Linear Mobile, HubSpot CRM, Pipedrive CRM, Salesforce Mobile, 1Money Pro, YNAB, Wallet by BudgetBakers, Trello Premium, Asana, ClickUp, Monday.com, Airtable, Revolut Metal, N26 Smart, Tasker/Solid Explorer, Niagara Launcher Pro, Google Workspace Material 3*).
  - Applicati i pattern mobile Play Store Top 20 ad **Apex Digital CRM** (`index.html`, `activities.js`, `layout.css`):
    1. **Extended Squircle FAB contestuale (`#mobile-fab`)** nella zona pollice inferiore destra (`bottom: calc(74px + env(safe-area-inset-bottom))`, `border-radius: 16px`, `min-height: 50px`), sincronizzato con la vista attiva (`+ Attività`, `+ Azienda`, `+ Lead`, `+ Prospect`, `+ Cliente`, `+ Preventivo`, `+ Progetto`, `+ Obiettivi`, `+ Trattativa`).
    2. **Material Design 3 Active Pill Capsule (`.bnav-icon` `54px × 28px`)** nella Bottom Navigation Bar (`#mobile-bottom-nav`) con barra frosted glass (`backdrop-filter: blur(18px)`).
    3. **Top App Bar Search Pill (`#cmd-trigger-btn`)** su smartphone (`border-radius: 999px; min-height: 40px`) che apre `#command-dialog` come Bottom Sheet.
    4. **Segmented Control incassato (`.view-toggle`)** e **strisce semantiche laterali (`4px solid`)** sulle card per urgenza/stato (`.task-overdue`, `.task-today`, `.project-card`).
  - Aggiornate le skill globali `mobile-first-app-design` (`SKILL.md` + `references/troubleshooting_kb.md` Caso 21) e `universal-app-layout` (`SKILL.md`), sincronizzandole anche nella cartella `SKILLS_ANTIGRAVITY`.
- **File modificati**:
  - `index.html`
  - `activities.js`
  - `layout.css`
  - `activities-check.cjs`
  - `AGENTS.md`
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Eventuale esecuzione di `pubblica-vercel.cmd` per aggiornare la build live su Vercel.

### Sessione 2026-10-29 (Design System Attio × Twenty CRM × Linear & Command Palette) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `c65026f` (`[Antigravity] chore: configure Vercel production deployment and update AGENTS.md handoff log`) su `main`.
- **Attività completate**:
  - Estrapolati i design token, la gerarchia tipografica, le superfici e i pattern architetturali dalle skill GitHub (`ui-ux-pro-max`, `frontend-design`, `universal-app-layout`, `mobile-first-app-design`) e dai migliori CRM moderni (`twentyhq/twenty`, **Attio**, **Linear**).
  - Riprogettato integralmente `layout.css` applicando:
    - **Token & Hairline Borders (Attio / Linear)**: superfici paper-slate (`#f6f7f9` / `#ffffff`), bordi hairline `1px` (`#e4e7ec` / `rgba(255,255,255,0.08)`), micro-ombre con highlight interno (`--shadow-inset`) e raggi geometrici `6px`/`8px`/`10px`.
    - **Tipografia & Numeri Tabulari**: combinazione `Inter` + `Plus Jakarta Sans` + `JetBrains Mono` per badge, codici preventivo, contatori e importi finanziari tabulari (`tabular-nums`).
    - **Sidebar Obsidian & Top Command Bar (Twenty CRM / Linear)**: rail laterale `#0b0d11` con Workspace Switcher card, indicatori attivi e barra superiore con trigger Spotlight `⌕ Cerca / Comandi ⌘K`.
    - **Record Slide-Over Drawer (Attio / Twenty)**: su desktop (`>= 768px`) le modali di scheda (`#editor`, `#task-editor`, `#project-editor`, `#quote-editor`, `#finance-editor`, `#playbook-editor`) scorrono come pannelli laterali destri a tutta altezza (`100dvh`), mentre su smartphone (`< 768px`) si trasformano in Bottom Sheet nativi con pill grabber.
    - **Data Grid Spreadsheet & Kanban**: tabelle ad alta densità con divisori verticali sottili, dot semantici sulle colonne Kanban e card opportunità con box valore monospace.
  - Completato e testato il cablaggio della Command Palette (`#command-dialog`, `#cmd-trigger-btn`, `openCommandPalette`, `runCommandAction`, scorciatoia `Ctrl+K` / `⌘K`) su `index.html`, `activities.js` e `enterprise-check.cjs`.
- **File modificati**:
  - `layout.css`
  - `index.html`
  - `activities.js`
  - `activities-check.cjs`
  - `enterprise-check.cjs`
  - `AGENTS.md`
- **Test eseguiti**:
  - 6 controlli sintattici `node --check` + 9 suite funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) tutti con esito `PASS`.
  - Audit layout e mobile responsiveness (`audit_layout.py` e `audit_mobile_responsive.py`): `0 anomalie / 0 issues found`.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Eventuale esecuzione di `pubblica-vercel.cmd` per aggiornare la build live su Vercel.

### Sessione 2026-10-29 (Deploy Vercel & CI) — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `a5b7893` (`[Antigravity] docs: add AGENTS.md coordination protocol and harden .gitignore`) e `81c3d26` (`test: align smartphone card data-label assertion in activities-check`) su `main`.
- **Attività completate**:
  - Aggiornata la pipeline CI `.github/workflows/test.yml` per includere tutti i nuovi moduli (`quotes.js`, `activities.js`, `projects.js`, `analytics.js`) e le nuove suite di test (`quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`).
  - Integrato il branch `feature/lifecycle-activities-layout` in `main`.
  - Creati `.vercelignore` (che esclude `private-imports/`, `.git/`, `.github/`, `*-check.cjs`, `.env*`, chiavi private) e lo script `pubblica-vercel.cmd` per eseguire i test automatici prima di ogni deploy.
  - Collegato il progetto a Vercel (`posticavio-8553s-projects/apex-crm` connesso a `https://github.com/posticavio/apex-crm`) ed eseguito il deploy in produzione su `https://apex-crm-nu.vercel.app`.
- **File modificati (committati da Antigravity)**:
  - `.github/workflows/test.yml`
  - `.gitignore`
  - `.vercelignore` (nuovo)
  - `pubblica-vercel.cmd` (nuovo)
  - `AGENTS.md`
- **Test eseguiti**:
  - Eseguita l'intera suite di 6 controlli sintattici (`node --check`) e 9 test funzionali (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`) con esito `PASS`.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Completare il cablaggio JavaScript della Command Palette (`#cmd-trigger-btn` / `#command-dialog`) in corso su `index.html` e rieseguire `pubblica-vercel.cmd` + `git push origin main`.
- **Modifiche non pubblicate**:
  - Preservata nel working tree locale la modifica work-in-progress su `index.html` (`#cmd-trigger-btn` e `#command-dialog`) appartenente alla sessione Codex in corso (Regola 6).

### Sessione 2026-10-29 — Agente: Google Antigravity
- **Ultimo commit precedente rilevato**: `81c3d26` (`test: align smartphone card data-label assertion in activities-check`) su `main`, preceduto da `132cb21` e `ef1a6b0` (autore Git: `posticavio`).
- **Attività completate**:
  - Analisi preventiva del repository Git esistente e della cronologia locale (preservati integralmente tutti i commit e i rami).
  - Verifica di sicurezza contro il caricamento di segreti, credenziali o file `.env`.
  - Aggiornamento minimale di `.gitignore` per escludere `.env*`, chiavi private, `node_modules/`, cartelle di build e file temporanei/log, mantenendo `private-imports/`.
  - Creazione di `AGENTS.md` con le 10 regole di coordinamento tra Google Antigravity e OpenAI Codex e il registro di passaggio.
  - Configurazione del remote `origin` (`https://github.com/posticavio/apex-crm.git`), sincronizzazione e pubblicazione su GitHub con configurazione dell'upstream.
- **File modificati (committati da Antigravity)**:
  - `.gitignore`
  - `AGENTS.md` (nuovo)
- **Test eseguiti**:
  - Controllo sintassi (`node --check` su `app.js`, `company-import.js`, `quotes.js`, `activities.js`, `projects.js`, `analytics.js`) ed esecuzione integrale con esito positivo (`PASS`) di `crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `sales-check.cjs`, `resource-check.cjs`, `unscheduled-check.cjs`, `quotes-check.cjs`, `activities-check.cjs`, `enterprise-check.cjs`.
- **Problemi aperti**:
  - Nessuno.
- **Attività successive consigliate**:
  - Completare o integrare l'implementazione della Command Palette (`#command-dialog` / `#cmd-trigger-btn`) se prevista nella sessione Codex in corso.
  - Prima di avviare nuovi sviluppi funzionali, eseguire `git fetch origin` e verificare l'allineamento di `main`.
- **Modifiche non pubblicate**:
  - È stata preservata senza toccarla una modifica work-in-progress locale su `index.html` (`#cmd-trigger-btn` e `#command-dialog`) rilevata nel working tree e appartenente all'altro agente (Codex), in conformità alla Regola 6.

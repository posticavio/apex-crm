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
node crm-check.cjs
node import-check.cjs
node relationship-check.cjs
node sales-check.cjs
node resource-check.cjs
node unscheduled-check.cjs
node quotes-check.cjs
node activities-check.cjs
node enterprise-check.cjs
```

---

## Registro di Passaggio tra Agenti (Handoff Log)

> Mantieni questo registro sintetico, ordinato cronologicamente (sessione più recente in alto) e compatibile sia con Google Antigravity sia con OpenAI Codex.

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

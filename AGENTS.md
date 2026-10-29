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

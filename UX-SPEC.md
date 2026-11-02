# UX-SPEC.md — Specifica UX & Architettura Operativa di Apex CRM

Questo documento definisce l'architettura delle informazioni, i flussi d'uso a 2 minuti, i componenti visivi e i criteri di accettazione per **Apex Digital CRM** (repository `posticavio/apex-crm`), a supporto dell'uso personale ad alta velocità dell'utente e dell'aggiornamento automatico tramite **ChatGPT & Server MCP**.

---

## 1. Obiettivo e Paradigma Operativo (Regola dei 2 Minuti)

- **Chi usa il CRM**: Il founder / titolare di Apex Digital, spesso in mobilità o tra una riunione e l'altra con soli due minuti a disposizione.
- **Canale primario di inserimento dati**: **ChatGPT tramite Server MCP autenticato** e sintesi vocale dettata post-telefonata (es. *«Ho parlato con Parisi, aspettano il preventivo entro venerdì»*). L'utente inserisce e aggiorna da ChatGPT; i form manuali nel CRM servono per correzioni, eccezioni o consultazione immediata.
- **Canale visivo**: All'apertura della Home, l'utente comprende istantaneamente:
  1. Cosa deve fare oggi / cosa è scaduto (attività operative concrete, con motivo ed esito precedente).
  2. Su quali progetti attivi intervenire (obiettivo cliente, situazione attuale e prossimo passo).
  3. Chi deve ricontattare da campagne email o follow-up scaduti.
  4. Chi/cosa stiamo aspettando dal cliente o da terzi.
  5. Eventuali posizioni aperte senza una data definita (**«Prossimo passo da definire»**).
- **Divieto di date arbitrarie**: Se una scadenza non è concordata o non è nota, il CRM mostra esplicitamente **«Da definire»** e la include nella vista da organizzare. Mai assegnare date fasulle.

---

## 2. Navigazione e Gerarchia delle Informazioni

### 2.1 Navigazione Principale Essenziale (4 Voci Cardine)
Sia su Desktop (sidebar) sia su Smartphone (bottom nav), la navigazione principale è focalizzata su 4 macro-aree:
1. **Home (`oggi`)**: Cockpit operativo con attività urgenti, progetti attivi, ricontatti commerciali e viste consultabili rapide (*Cosa è cambiato*, *Aspettiamo risposta*, *Da definire*).
2. **Aziende (`contatti`)**: Anagrafica unificata per tutte le aziende, con filtri rapidi di fase (*Tutte*, *Lead*, *Prospect*, *Clienti*, *Categorie*) ed accesso alla **Scheda Dettaglio 360°**.
3. **Progetti (`projects`)**: Commesse e progetti attivi con obiettivo cliente, situazione, ultimo esito, prossimo passo, milestone e link Drive.
4. **Attività (`activities`)**: Elenco e bacheca di tutte le azioni operative, follow-up, chiamate, meeting e demo.

### 2.2 Percorsi Commerciali e Strumenti Secondari
Le viste secondarie (*Opportunità / Pipeline*, *Preventivi*, *Campagne Email*, *Forecast & KPI*, *Playbook*, *Impostazioni*) sono raggruppate in una sezione dedicata senza affollare la barra di navigazione principale.

---

## 3. Anatomia delle Schede e Componenti Condivisi

### 3.1 Riga Attività Standardizzata (Formato Unificato)
Ogni riga o card di attività rispetta rigorosamente questo ordine informativo:
1. **Azienda e Progetto**: Es. `Martino Parisi S.r.l. · Automazione flussi`
2. **Azione concreta**: Es. `Verificare l'esito della call e inviare proposta`
3. **Motivo e Ultimo Esito**: Es. `Motivo: Demo completata · Ultimo contatto: Andrea ha richiesto preventivo entro venerdì`
4. **Scadenza e Stato Semantico**:
   - `Scaduta` (Rosso chiaro)
   - `Oggi` (Blu primario)
   - `In corso` (Ambra)
   - `Aspettiamo il cliente` (Viola/Indaco)
   - `Suggerimento automatico` (Bordo tratteggiato)
   - `Prossimo passo da definire` (Badge ambra di avviso)
5. **Cluster Azioni Operative a 1 Clic**:
   - **📞 Chiama**: Link diretto `tel:<numero>`. Se il numero manca, mostra il badge neutro `Numero da verificare` (disabilitato). *Cliccare Chiama NON segna l'attività come completata.*
   - **✉️ Prepara sollecito**: Apre il modale di bozza precompilata con destinatario verificato, oggetto contestualizzato e corpo basato sull'ultimo esito. Permette di aprire il client email (o Gmail) e di registrare l'invio solo con comando esplicito.
   - **⚡ Registra esito**: Apre il logger rapido per inserire esito e prossimo passo con date rapide (+1g, +3g, Lunedì, +1sett).
   - **🔍 Scheda 360° / Dettaglio**: Apre il cassetto di contesto senza perdere lo scroll o i filtri dell'elenco.

### 3.2 Scheda Progetto Esecutiva (Project Cockpit)
La scheda progetto è strutturata per rispondere istantaneamente alle 7 domande chiave:
1. **Che cosa vuole ottenere il cliente** (`clientGoal`): Il beneficio economico/operativo desiderato.
2. **Come e quando è nato il progetto** (`origin`): Origine, canale e data kick-off.
3. **Situazione attuale e ultima comunicazione rilevante** (`currentStatusSummary`).
4. **Cosa è stato fatto e con quale esito** (`lastOutcome`).
5. **Attività aperte e prossimo passo** (`nextStep` + `nextDue` oppure `Da definire`).
6. **Cosa aspettiamo dal cliente o da terzi** (`waitingFor`).
7. **Risorse e Documenti**: Link diretti a Google Drive (`driveUrl`), thread email (`emailThreadUrl`) ed eventi di calendario (`calendarUrl`). Mostra lo stato "Non collegato" se il link manca.

---

## 4. Flusso Campagne Email & Suggerimenti di Ricontatto

### 4.1 Logica delle Campagne e Invii
- Il CRM traccia campagne con invii effettivi (le bozze non contano come email inviate).
- Per ciascuna azienda con email inviata e nessuna risposta registrata entro l'intervallo configurato (es. 4 giorni lavorativi), la Home mostra un **suggerimento automatico di ricontatto**:
  > *«Email inviata 4 giorni fa · Nessuna risposta rilevata nell'ultimo controllo · Chiamata suggerita»*
- **Trasparenza controllo posta**: Mostra l'ultimo timestamp di sincronizzazione/controllo della posta. Se il controllo manca o è più vecchio di 24 ore, segnala *«Controllo posta non recente»* senza affermare con certezza che il cliente non abbia risposto.

### 4.2 Precedenza degli Accordi sul Calcolo Automatico
- Qualsiasi accordo esplicito con il cliente (es. *«Sentiamoci tra un mese»*) o decisione dell'utente **prevale immediatamente** sul suggerimento automatico di ricontatto.
- Se il cliente richiede di non essere più ricontattato (*Opt-out*), i ricontatti automatici verso quell'azienda si interrompono all'istante.
- Un evento a calendario passato non certifica che l'incontro sia avvenuto: richiede registrazione esplicita dell'esito.

---

## 5. Aggiornamenti Automatici tramite ChatGPT & Server MCP

### 5.1 Responsabile Unico della Pianificazione (Riconciliazione Quotidiana)
- Per evitare conflitti e routine concorrenti, il processo di riconciliazione quotidiana (`crm_reconcile_daily`) ha un **unico pianificatore documentato**:
  - **ChatGPT Action Scheduler / Automazione MCP** (o trigger manuale dall'interfaccia).
- La riconciliazione esamina nuove comunicazioni, calcola scadenze, aggiorna le campagne e genera il checkpoint senza duplicare record già elaborati (`source_id` univoco).

### 5.2 Percorso Vocale Principale (Audio di Sintesi)
- L'utente detta a ChatGPT (o tramite il pulsante vocale interno 🎙️):
  *«Ho parlato con Parisi, aspettano il preventivo entro venerdì»*
- Il tool MCP `crm_log_voice_touchpoint`:
  1. Identifica l'azienda (`Martino Parisi S.r.l.`), il referente (`Andrea Zanatta` / `Giovanni Parisi`) e l'eventuale progetto.
  2. Risolve date relative (es. "entro venerdì") nel fuso orario `Europe/Rome`.
  3. Registra l'esito nella cronologia.
  4. Aggiorna l'attività correlata o imposta il prossimo passo.
  5. Se vi è ambiguità insolubile (es. due progetti attivi con nome simile), pone una sola domanda mirata per chiarire.
  6. Garantisce idempotenza: ri-eseguire lo stesso input con lo stesso `source_id` non genera doppioni.

---

## 6. Criteri di Accettazione e Verifica (Test Scenarios)

1. **Scenario 1 — Home a colpo d'occhio (Mobile & Desktop)**: Entro 2 minuti l'utente legge le attività scadute/di oggi, i progetti in corso con prossimo passo e le chiamate suggerite.
2. **Scenario 2 — Chiamata immediata**: Cliccando su "Chiama" si avvia `tel:` senza cercare il numero né navigare altrove. Cliccare non altera lo stato dell'attività.
3. **Scenario 3 — Parisi & Progetto**: Aprendo la scheda di Parisi o del relativo progetto, si leggono subito: obiettivo, situazione, ultimo esito e prossimo passo senza scorrere la cronologia.
4. **Scenario 4 — Prepara sollecito**: Un clic apre la bozza contestualizzata con destinatario e oggetto. Tornando indietro, posizione e filtri dell'elenco restano invariati.
5. **Scenario 5 — Inserimento Vocale MCP & Idempotenza**: Il tool `crm_log_voice_touchpoint` gestisce l'input, non duplica su ripetizione ed evidenzia "Prossimo passo da definire" se manca la scadenza.
6. **Scenario 6 — Sincronizzazione Supabase**: I dati salvati persistono tra sessioni e dispositivi senza sovrascritture distruttive.

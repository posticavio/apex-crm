# Confronto requisiti Notion / implementazione

Fonte: [APEX CRM](https://app.notion.com/p/4065ee45e277816ba495c8d8566cd2ad), consultata il 27 ottobre 2026.

La pagina distingue decisioni approvate e checklist implementative ancora da eseguire: una decisione spuntata non prova che il software la supporti.

## Ricognizione

La cartella Desktop contiene HTML, CSS e JavaScript senza dipendenze. Il database è localStorage. Sono presenti aziende, un referente principale, opportunità, follow-up, storico, ricerca, esportazione CSV e backup JSON. I test automatici simulano DOM e localStorage: non equivalgono a una verifica in un browser reale.

Il repository GitHub `posticavio/apex-crm` è accessibile ma vuoto al momento della verifica. È stato conservato un commit locale della versione esistente e aperto il ramo `feature/company-referents`. Nessuna pubblicazione online è stata avviata.

## Copertura per fase

| Fase Notion | Stato osservato |
| --- | --- |
| 1, ambito e interfaccia | Utente unico e interfaccia PC presenti. Il perimetro resta solo Apex, come richiesto nella chat. |
| 2, anagrafiche | Dati aziendali, referenti con ruoli e preferenze, categorie personalizzabili automatiche/manuali e importazione aziende CSV con deduplica presenti. Arricchimento online e relazioni avanzate restano da fare. |
| 3, commerciale | Pipeline e follow-up di base presenti. Offerte con righe, versioni e PDF, fatturati storici, budget, previsioni e assistente AI mancanti. |
| 4, integrazioni | Gmail, Calendar e Drive non sincronizzati. I collegamenti mailto/tel non sono integrazioni. |
| 5, interfaccia | Menu, filtri e viste bacheca/elenco presenti. Widget configurabili, colonne configurabili, viste persistenti, pagina azienda completa e pannello AI mancanti. |
| 6, progetti | Modulo progetti, Gantt, dipendenze e controllo economico mancanti. |
| 7, architettura | Backup JSON manuale presente. Database cloud, account Google, cestino, versioni e backup automatici mancanti. |
| 8, qualità | Test automatici locali presenti. Scheda azienda e referenti verificati anche nel browser su un'origine localhost separata, con soli dati dimostrativi. Non equivale al collaudo di tutti i moduli. |

## Incremento corrente: scheda azienda e referenti multipli

Perimetro: estendere le anagrafiche locali mantenendo compatibili i dati salvati. Non comprende l'intera Fase 2.

Criteri verificabili:

- Conservare i campi già presenti e caricare backup senza i nuovi campi.
- Salvare sede, sito, identificativo fiscale e settore senza richiederli ai vecchi record.
- Aggiungere più referenti, ognuno con nome, ruolo, recapiti, canale preferito e note.
- Rimuovere una riga dalla bozza senza modificare i dati finché non si salva.
- Cercare aziende anche per i dati dei referenti aggiuntivi.
- Esportare e ripristinare i nuovi dati nel backup JSON; includerli nel CSV.
- Registrare le modifiche anagrafiche nello storico e conservare lo stato in caso di errore di salvataggio.

Verifica visiva eseguita: apertura nuova anagrafica, aggiunta di un referente tecnico oltre al principale, salvataggio, ricerca per ruolo IT e riapertura con dati conservati. Screenshot: `apex-crm-referenti.png` nella cartella di lavoro superiore. L'anteprima funziona avviando il server localhost fuori dalla restrizione di rete dell'esecutore; i dati dimostrativi non sono copiati nel CRM sul Desktop.

## Prossime checklist da dettagliare

1. Classificazione manuale/automatica e categorie personalizzabili: incremento implementato e verificato, vedi sotto.
2. Deduplicazione e importazione con anteprima: implementate per anagrafiche e referente principale in CSV, vedi sotto.
3. Separare la fase aziendale Lead/Prospect/Cliente dagli stati dell'opportunità nuovo contatto/trattativa/offerta/vinta/persa.
4. Preventivi con righe, calcoli e versioni; regole fiscali e valuta da definire prima del modulo economico.

Il supporto ad altre attività, previsto in Notion, richiede di riconciliare l'indicazione precedente “solo Apex”. Anche la pipeline classica Notion va aggiunta come stato dell'opportunità, preservando la classificazione aziendale concordata.

## Incremento categorie — verificato

Ramo locale: `feature/company-categories`. Catalogo personalizzabile con regole deterministiche basate su un campo e parole chiave. Categorie multiple; modalità automatica o manuale per singola azienda, inclusa una scelta manuale vuota. Rinominare una categoria mantiene il suo identificativo; disattivarla interrompe soltanto le regole automatiche e conserva le scelte manuali. La classificazione commerciale Lead/Prospect/Cliente resta distinta.

Filtri per categoria e senza categoria, ricerca per nome categoria e CSV aggiornati. Backup JSON comprende catalogo, regole e override; i vecchi backup senza categorie rimangono importabili e ripristinano un catalogo vuoto.

Test: `node --check app.js` e `node crm-check.cjs` superati. Copertura di normalizzazione accenti, nomi duplicati, classificazione automatica, override manuale, rinomina, disattivazione, backup/importazione e fallimento del salvataggio. Verifica browser con dati dimostrativi: creazione regola sul settore, assegnazione automatica a un'azienda esistente e salvataggio della modalità manuale. Screenshot `apex-crm-categorie.png` nella cartella di lavoro superiore.

Non sono inclusi AI, arricchimento online o sincronizzazione con Notion. La Fase 2 nel complesso resta parziale.

## Incremento importazione aziende CSV — verificato

Ramo locale `feature/company-csv-import`. Sono disponibili associazione delle colonne, riconoscimento delle intestazioni comuni, anteprima per riga, scelta fra esclusione/creazione/aggiornamento e controllo dei duplicati. Le corrispondenze per identificativo fiscale, email e nome vengono proposte, senza aggiornamento automatico. Conflitti fra più aziende, identificativi fiscali diversi e possibili duplicati nel file sono bloccati e spiegati. I campi vuoti non cancellano valori esistenti.

La conferma salva l'intera importazione in un'unica scrittura; conserva referenti aggiuntivi, categorie manuali e relazioni. Registra file, riga e data di provenienza, più una nota nello storico. Blocca il salvataggio se stato o archivio cambiano dopo l'anteprima. Supportati UTF-8, virgola/punto e virgola/tab, virgolette e celle su più righe; limiti di 5 MB, 5.000 righe e 100 colonne.

Test `node import-check.cjs` e regressioni `node crm-check.cjs` superati. Verifica browser con dati sintetici: caricamento di quattro righe, una nuova azienda, una corrispondenza selezionata esplicitamente per aggiornamento, un duplicato escluso e una email errata esclusa. Salvataggio concluso con una creazione e un aggiornamento; referente aggiuntivo e categoria manuale preesistenti conservati. Screenshot `apex-crm-import-csv.png` nella cartella di lavoro superiore.

Non importa opportunità, referenti aggiuntivi, categorie o fatturati. Per ripristinare l'archivio completo rimane il backup JSON. Questa funzione non costituisce una sincronizzazione automatica né un arricchimento online.

## Incremento relazioni e conversazioni — test automatici superati

Fonte requisiti rilette: pagina APEX CRM in Notion, Fase 2 (referenti, relazioni e cronologia) e Fase 3 (opportunità collegate ai referenti).

La scheda opportunità permette di scegliere il referente principale o aggiuntivo della relativa azienda. Cambiando azienda la scelta si azzera e le opzioni si aggiornano. Il nome del referente è conservato come snapshot storico quando la persona viene rimossa dall'anagrafica. La pipeline e il CSV opportunità mostrano il collegamento.

Nella scheda azienda è disponibile Registra una conversazione: canale Email, Telefono, Incontro o Nota; data non futura; persona coinvolta e sintesi. Il salvataggio registra un evento nello storico e Annulla non lo registra. La ricerca aziendale include le conversazioni e il CSV contatti le esporta. Il backup JSON conserva tutti i dettagli. Non si tratta di sincronizzazione Gmail o trascrizione automatica.

Verifiche riuscite: `node --check app.js`, `node crm-check.cjs`, `node import-check.cjs`, `node relationship-check.cjs`. I test specifici coprono assegnazioni fra aziende, snapshot storici, canali/date/persone, ricerca, CSV, JSON, salvataggio fallito e protezione dal doppio invio.

Verifica visiva non completata: il browser ha rifiutato l'autorizzazione all'origine localhost dell'anteprima. Nessun altro percorso di controllo del browser è stato tentato. L'incremento non è marcato come completato in Notion.

## Incremento preventivi e proposte commerciali — verificato

Ramo locale: `feature/quote-drafts`.

Requisiti coperti:
- Gestione proposte commerciali strutturate collegate all'anagrafica cliente e facoltativamente all'opportunità di vendita.
- Righe servizio con calcoli monetari esatti in centesimi di euro (quantità decimale, prezzo unitario, percentuale di sconto, imponibile, imposta e totale).
- Modelli di riga predefiniti con un clic (Automazione, Assistente AI, Consulenza).
- Versionamento nativo automatico e non distruttivo: ogni salvataggio genera una nuova versione progressiva conservando integralmente le versioni precedenti per consultazione e ristampa.
- Regole fiscali: aliquota IVA esplicita richiesta per il consolidamento in stato Accettato; IVA facoltativa (da definire) per le bozze in elaborazione.
- Layout di stampa e salvataggio PDF A4 con layout pulito, dati emittente e cliente.
- Protezione di integrità: blocco della cancellazione di aziende o trattative collegate a preventivi.
- Esportazione CSV dedicata e compatibilità bidirezionale nei backup JSON (inclusi vecchi backup senza il modulo).
- Test automatici dedicati: `quotes-check.cjs` e regressioni complete su tutti i test (`crm-check.cjs`, `import-check.cjs`, `relationship-check.cjs`, `resource-check.cjs`, `sales-check.cjs`, `unscheduled-check.cjs`) superati.

## Incremento attività per Lead, Prospect e Clienti e revisione layout — verificato

Ramo locale: `feature/lifecycle-activities-layout`.

Requisiti coperti:
- Modulo completo **Attività** per **Lead, Prospect e Clienti** (`activities.js`), con bacheca Kanban a 3 fasi (*Lead*, *Prospect*, *Cliente*) e vista elenco tabellare.
- **Playbook operativi per fase** (Lead: qualifica e discovery; Prospect: analisi tecnica, demo e proposta; Cliente: onboarding, consegna e check-in/upsell) attivabili con un clic e protetti da duplicazioni.
- Collegamento trasversale di ogni attività ad azienda, referente (con snapshot storico), opportunità e preventivo.
- Completamento attività con registrazione automatica dell'esito nello storico aziendale/opportunità e concatenazione immediata della prossima attività.
- Integrazione diretta in Dashboard (*Oggi*), nelle tabelle *Lead*, *Prospect*, *Clienti* e *Contatti*, nella scheda azienda e nella scheda opportunità.
- **Revisione completa del layout (`layout.css` e `index.html`)**: design system moderno executive con sidebar dark-indigo, header sticky traslucido con azioni rapide globali (`+ Attività`, `+ Azienda`, `+ Opportunità`, `+ Preventivo`), KPI card con cifre tabulari non troncate, bacheche Kanban ad alto contrasto e responsività mobile/desktop senza overflow orizzontale.
- Test automatici: `activities-check.cjs` e tutte le suite di regressione superate.



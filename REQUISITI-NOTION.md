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
| 2, anagrafiche | Base presente. In questo incremento: dati aziendali e più referenti con ruoli e preferenze. Categorie automatiche/manuali, importazioni con deduplica e arricchimento online restano da fare. |
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

1. Classificazione manuale/automatica e categorie personalizzabili.
2. Deduplicazione e importazione con anteprima.
3. Separare la fase aziendale Lead/Prospect/Cliente dagli stati dell'opportunità nuovo contatto/trattativa/offerta/vinta/persa.
4. Preventivi con righe, calcoli e versioni; regole fiscali e valuta da definire prima del modulo economico.

Il supporto ad altre attività, previsto in Notion, richiede di riconciliare l'indicazione precedente “solo Apex”. Anche la pipeline classica Notion va aggiunta come stato dell'opportunità, preservando la classificazione aziendale concordata.

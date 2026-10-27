# Apex Digital CRM

CRM per utente unico, in italiano, con interfaccia ispirata al layout pubblico di Ydea. Aprire `index.html` in Chrome o Edge oppure servire la cartella con un server statico locale.

Funzioni: anagrafiche, referenti multipli, opportunità, follow-up, storico, ricerca, pipeline bacheca/elenco, esportazione CSV e backup JSON.

I dati rimangono nel localStorage del browser e non fanno parte del codice sorgente. Nessuna sincronizzazione cloud, autenticazione o integrazione con account esterni è attiva. Esportare regolarmente un backup JSON.

- [Guida operativa](LEGGIMI.md)
- [Confronto requisiti Notion](REQUISITI-NOTION.md)

## Verifica

Richiede Node.js 24; nessuna dipendenza da installare.

```sh
node --check app.js
node crm-check.cjs
node --check company-import.js
node import-check.cjs
node relationship-check.cjs
```

I test funzionali usano dati sintetici e simulazioni di DOM/localStorage. La scheda azienda e i referenti sono stati verificati anche nel browser, su un'origine localhost separata dai dati dell'utente.

L'importazione aziende CSV offre mappatura, anteprima e controllo duplicati. Le corrispondenze esistenti richiedono una scelta esplicita di aggiornamento; i campi vuoti non cancellano valori già salvati.

Gli aggiornamenti vengono preparati su rami dedicati. La pubblicazione online e l'integrazione in main sono operazioni separate; questo repository non contiene un flusso di distribuzione automatica.

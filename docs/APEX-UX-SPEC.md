# APEX CRM — Specifiche UX operative (13 novembre 2026)

## Obiettivo e vincoli
Ottimizzare l'interfaccia ESISTENTE, non rifare APEX da zero, non rimuovere funzionalità e non cambiare la struttura funzionale senza approvazione. La priorità è rendere le informazioni commerciali immediatamente accessibili, con gerarchia visiva coerente, spazi ridotti e meno passaggi. Queste sono specifiche di prodotto da verificare contro il codice e il deploy, non una diagnosi già confermata di ogni schermata.

## Regole comuni a tutte le pagine principali
- Eliminare grandi blocchi introduttivi con titolo, descrizione e pulsanti che spingono il contenuto operativo in basso.
- Usare un'intestazione/toolbar compatta, idealmente una riga: titolo breve e azioni contestuali.
- Nascondere descrizioni permanenti non operative; eventuali spiegazioni in aiuto contestuale.
- Ricerca rappresentata da icona lente: al clic apre dialog/popup con focus sul campo, ricerca e risultati; evitare barre di ricerca grandi sempre visibili. Prevedere accessibilità da tastiera e su mobile.
- Filtri tramite icona con indicatore visibile quando attivi; pannello/popup contestuale.
- Azioni secondarie tramite icone moderne e tooltip desktop, etichette accessibili e menu overflow mobile; non nascondere azioni frequenti dietro troppi tocchi.
- Tabelle/liste iniziano subito sotto la toolbar, con densità informativa utile, colonne e spazi ottimizzati, evitando card giganti e duplicazioni.
- Responsive: desktop compatto, mobile-first, componenti coerenti, azioni primarie raggiungibili facilmente.
- Densità non significa mostrare tutto: informazioni prioritarie subito, secondarie in sezioni espandibili.

## Home: prima schermata da ottimizzare
- Ridurre drasticamente lo spazio verticale iniziale; mostrare subito il contenuto utile.
- Priorità operative: clienti da contattare, follow-up, offerte aperte e attività urgenti, secondo i dati effettivamente disponibili.
- Toolbar compatta con titolo Home e icone contestuali (ricerca, filtri, notifiche/nuovo solo se pertinenti).
- La tabella/lista delle attività prioritarie deve essere visibile senza attraversare blocchi descrittivi.
- Conservare tutte le funzionalità esistenti; riposizionare, compattare o rendere contestuali gli elementi.

## Flussi da proteggere
- Dalla scheda cliente: chiamare, aprire ultima email, registrare note, gestire offerte e creare follow-up in pochi passaggi.
- Scheda cliente con gerarchia tra anagrafica, contatti, fatturato, offerte, email e attività.
- Integrazioni previste: Gmail per storico e conversazioni, TickTick Business per attività/follow-up, Google Calendar Business per appuntamenti. Non inventare stati di integrazione non verificati.

## Istruzioni per Codex e altri agenti
1. Leggere questo documento prima di modificare UI/UX e rispettare anche AGENTS.md.
2. Ispezionare codice, componenti e deploy reale; distinguere problemi verificati dalle ipotesi.
3. Fare inventario delle schermate e classificare elementi come mantenere, compattare, riposizionare; evitare riscritture generali.
4. Partire dalla Home e definire una toolbar riutilizzabile per le altre pagine.
5. Proporre modifiche incrementali e verificare desktop/mobile, accessibilità, regressioni e test esistenti.
6. Non modificare funzionalità o dati applicativi senza necessità e non cancellare lavoro precedente.
7. Annotare decisioni, file cambiati, test e attività residue nel registro di handoff di AGENTS.md.

## Criteri di accettazione
- Contenuto operativo visibile più in alto rispetto alla versione precedente.
- Ricerca via lente con popup funzionante; filtri riconoscibili e accessibili.
- Nessuna funzione persa; azioni frequenti raggiungibili rapidamente.
- Nessuna duplicazione inutile; layout leggibile su smartphone e desktop.
- Screenshot o confronto prima/dopo e test documentati.

Stato: specifiche concordate nella conversazione; implementazione NON ancora autorizzata né verificata.

# Apex Digital — CRM personale

Apri `index.html` in un browser moderno (Chrome o Edge). Non serve installare dipendenze. La prima apertura parte senza contatti o dati dimostrativi.

## Uso

1. Aggiungi un'azienda in Contatti.
2. Crea una trattativa indicando problema, soluzione, importi, prossima azione e data.
3. Gestisci i richiami da Oggi e cambia fase aprendo le schede in Trattative.
4. Le trattative in fase Cliente alimentano automaticamente Clienti e la somma dei canoni acquisiti.
5. Esporta regolarmente un backup JSON dalla barra laterale. Importa permette di ripristinarlo, sostituendo i dati correnti dopo conferma.

I dati vengono salvati nel localStorage del browser: non sono sincronizzati tra browser o dispositivi e possono essere persi cancellando i dati di navigazione. Per i file aperti direttamente, il salvataggio dipende dal browser e dal percorso: usa sempre lo stesso browser e conserva backup. Non è incluso un server, un database condiviso, un login o un'integrazione con strumenti esterni. I canoni sono valori commerciali acquisiti, non fatture o incassi e non gestiscono cessazioni o rinnovi.

L'interfaccia funziona senza connessione; i font Google, se non disponibili, sono sostituiti dai font di sistema.

## Fasi commerciali

- **Lead:** contatto da qualificare.
- **Prospect:** opportunità qualificata, con bisogno concreto.
- **Cliente:** acquisto acquisito.

La fase dell’azienda deriva dalle sue trattative attive: Cliente ha priorità su Prospect, altrimenti Lead. Un’azienda senza trattative è Lead. Archivia una trattativa per escluderla dalla pipeline; puoi ritrovarla con il filtro Archiviate.

I dati e i backup precedenti sono compatibili: le fasi intermedie diventano Prospect, Vinto diventa Cliente e Perso diventa Prospect archiviato. La fase precedente rimane nello storico.

## Layout

Interfaccia ispirata al layout pubblico di Ydea: menu laterale sfumato, navigazione per aree, tabelle compatte e pipeline con intestazioni colorate. Branding e funzioni rimangono quelli di Apex Digital. Riferimento visivo: https://www.capterra.com.br/software/202364/ydea

Nel menu trovi accessi diretti a Lead e Prospect. Contatti include un filtro per fase. Dalla scheda di un’azienda puoi aprire le opportunità esistenti o aggiungerne una già collegata. Le schede opportunità sono divise in dati, valore commerciale, analisi e attività.

## Follow-up

La dashboard include anche i follow-up dei clienti acquisiti e offre filtri Tutti, Scaduti, Oggi e Futuri. Il segno di spunta apre la registrazione dell’attività: puoi aggiungere l’esito, scegliere la fase e fissare il passo successivo. Per Lead e Prospect attivi, il prossimo passo e la data sono obbligatori. Per chiudere senza richiamo puoi passare a Cliente o archiviare la trattativa. La conferma registra nello storico attività, data prevista ed esito. Nella scheda azienda trovi lo storico aggregato delle sue opportunità.

## Viste ed esportazione

In Opportunità puoi alternare Bacheca ed Elenco e ordinare per titolo, valore iniziale decrescente o prossima scadenza (senza data in fondo). Filtri e ricerca valgono per entrambe le viste. I contatti sono ordinati per azienda. Esporta CSV scarica soltanto i risultati della vista corrente, con separatore punto e virgola e codifica UTF-8 compatibile con Excel. Il CSV è un’esportazione per consultazione: per ripristinare il CRM usa il backup JSON completo. Le preferenze di vista e ordine restano attive durante la sessione della pagina.

## Passaggi commerciali rapidi

Le opportunità in Lead mostrano Qualifica Prospect, quelle in Prospect mostrano Converti in Cliente, sia in bacheca sia in elenco. Il passaggio viene registrato nello storico; importi e prossimo follow-up restano associati alla trattativa. Per tornare a una fase precedente usa la scheda di modifica. Le opportunità archiviate non mostrano il passaggio rapido. Email e telefono sono cliccabili nelle anagrafiche e nella scheda azienda: aprono il programma email o il gestore delle chiamate del dispositivo, senza inviare automaticamente messaggi.

## Anagrafiche e referenti (requisiti Notion, Fase 2)

La scheda azienda include identificativo fiscale, settore, sito e sede. Al referente principale puoi affiancare altri referenti con ruolo, email, telefono, canale preferito e note. Puoi aggiungere o rimuovere righe prima di salvare; Annulla lascia i dati invariati. La ricerca comprende i recapiti e i referenti aggiuntivi. Il backup JSON conserva i nuovi dati e continua ad accettare i backup precedenti. Il CSV comprende i dati aziendali e un riepilogo dei referenti. Le modifiche anagrafiche sono registrate nello storico aziendale. La rimozione di un referente non dispone ancora di cestino: conserva un backup per ripristinarne i dettagli.

## Categorie personalizzabili

Apri Categorie e aggiungi un nome con eventuali parole chiave. Una regola cerca una delle parole o frasi in Settore, Provenienza, Nome azienda oppure Note aziendali, ignorando maiuscole e accenti. È una classificazione deterministica, senza AI o consultazioni online. Le aziende possono appartenere a più categorie.

Nella scheda azienda, Automatica applica le regole correnti; Manuale usa soltanto le categorie selezionate, anche una selezione vuota. Modificando una regola le classificazioni automatiche si ricalcolano; le scelte manuali restano invariate. Disattivare una categoria la esclude dalle regole, ma conserva le assegnazioni manuali esistenti. Le categorie sono separate dalla fase Lead/Prospect/Cliente.

Gli elenchi azienda includono il filtro Categorie e Senza categoria; ricerca e CSV comprendono la classificazione. Il backup JSON include catalogo, regole e scelte manuali. Importare un backup precedente senza catalogo ripristina un catalogo vuoto, insieme ai dati presenti nel backup.

## Importazione aziende CSV

Usa Importa aziende CSV nella barra laterale. Scegli un file UTF-8 (.csv o .tsv), associa le colonne e controlla l’anteprima. Massimo 5 MB, 5.000 righe e 100 colonne. Le intestazioni comuni vengono riconosciute automaticamente; Azienda è obbligatoria.

Il controllo cerca corrispondenze per identificativo fiscale, email o nome normalizzato. Un’azienda già presente è esclusa per impostazione iniziale: puoi scegliere esplicitamente Aggiorna campi non vuoti. Più corrispondenze, identificativi fiscali contrastanti, righe malformate e possibili duplicati nello stesso file vengono esclusi con una spiegazione. Se due aziende usano la stessa email, correggi il file o importa separatamente le righe dopo verifica.

Il salvataggio è unico dopo l’anteprima. Le celle vuote non cancellano campi esistenti. Referenti aggiuntivi, categorie, scelte manuali e opportunità vengono conservati negli aggiornamenti; le nuove aziende usano la classificazione automatica. File, riga e data sono registrati come provenienza dell’importazione e nello storico. Se il salvataggio fallisce, i dati in memoria restano invariati. Se i dati cambiano dopo l’anteprima, il salvataggio viene bloccato.

Il CSV importa dati aziendali e il referente principale: non ripristina referenti aggiuntivi, categorie, opportunità o fasi. Per ripristinare l’intero CRM usa il backup JSON. Prima di aggiornare molte aziende esporta un backup.

## Referenti e conversazioni

Nelle opportunità puoi scegliere il referente principale o uno dei referenti aggiuntivi dell’azienda. Cambiando azienda il selettore si aggiorna. Il nome è conservato come riferimento storico anche se il referente viene successivamente rimosso dall’anagrafica. Il collegamento appare nella pipeline e nel CSV.

Nella scheda azienda espandi Registra una conversazione, scegli canale, data e persona, poi scrivi una sintesi. Solo Salva registra la conversazione; Annulla non modifica lo storico. Le date future sono rifiutate: per pianificare un richiamo usa il prossimo passo dell’opportunità. Le conversazioni sono ricercabili e presenti nel backup JSON e nel CSV contatti. Questa registrazione è manuale e non invia email né sincronizza Gmail.

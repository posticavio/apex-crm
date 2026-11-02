'use strict';
/**
 * campaigns.js — Modulo Gestione Campagne Email, Invii Effettivi e Ricontatti Intelligenti
 * 
 * Implementa le regole richieste dal GOAL:
 * 1. Supporto per campagne email e invii singoli (salvataggio azienda, destinatario, data effettiva invio, fonte).
 *    Le bozze NON vengono conteggiate come email inviate.
 * 2. Campagna dimostrativa dichiarata di 20 email inviate la settimana precedente con monitoraggio risposte.
 * 3. Calcolo intervallo configurabile per suggerire la chiamata (giorni solari o lavorativi, default: 4 giorni lavorativi).
 * 4. Riconoscimento precedenze:
 *    - Un accordo esplicito con il cliente (es. "Sentiamoci tra un mese") o decisione utente prevale sulla scadenza automatica.
 *    - Una chiamata già effettuata, un appuntamento o una risposta aggiornano il suggerimento evitando doppioni.
 *    - Una richiesta di opt-out / non essere più contattato interrompe immediatamente i ricontatti automatici.
 * 5. Trasparenza data controllo posta:
 *    - Mostra data e ora dell'ultimo controllo posta. Se mancante o > 24h, non afferma con certezza l'assenza di risposta.
 */

const DEFAULT_CADENCE_DAYS = 4;
const DEFAULT_COUNT_BUSINESS_DAYS = true;

// Calcolo giorni lavorativi (esclusi sabato e domenica)
function getWorkingDaysBetween(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;

  let count = 0;
  const cur = new Date(start);
  cur.setDate(cur.getDate() + 1); // conteggio dal giorno successivo
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) { // 0 = Domenica, 6 = Sabato
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Calcolo giorni solari
function getCalendarDaysBetween(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;
  const diffTime = end.getTime() - start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Verifica validità e sicurezza dello stato campagne
function validateCampaigns(data) {
  if (!data || !Array.isArray(data.campaigns)) return;
  const ids = new Set();
  for (const c of data.campaigns) {
    if (!c || typeof c.id !== 'string' || !c.id || ids.has(c.id)) throw new Error('ID campagna non valido o duplicato.');
    ids.add(c.id);
    if (typeof c.name !== 'string' || !c.name.trim()) throw new Error('Nome campagna obbligatorio.');
    if (!Array.isArray(c.sends)) throw new Error('Elenco invii della campagna non valido.');
    const sendIds = new Set();
    for (const s of c.sends) {
      if (!s || typeof s.id !== 'string' || !s.id || sendIds.has(s.id)) throw new Error('ID invio non valido o duplicato.');
      sendIds.add(s.id);
      if (typeof s.companyName !== 'string' || !s.companyName.trim()) throw new Error('Azienda invio obbligatoria.');
      if (typeof s.recipientEmail !== 'string') throw new Error('Email destinatario non valida.');
    }
  }
}

// Campagna Dimostrativa di 20 Email Inviate (Dati di test dichiarati)
function getSeedDemoCampaign() {
  const todayStr = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
  const offset = days => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  };

  // 20 aziende B2B con invii effettivi effettuati tra 4 e 7 giorni fa
  const sends = [
    {
      id: 'demo-send-01',
      contactId: '',
      companyName: 'Meccanica Precisione TV',
      recipientName: 'Marco Basso',
      recipientRole: 'Responsabile Produzione',
      recipientEmail: 'marco.basso@meccanicatv.it',
      recipientPhone: '+39 340 1122334',
      sentAt: offset(5),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviata presentazione automazione schedulazione commesse.',
      sourceId: 'gmail-msg-b2b-01'
    },
    {
      id: 'demo-send-02',
      contactId: '',
      companyName: 'Logistica Integrata Nord-Est',
      recipientName: 'Elena Vianello',
      recipientRole: 'Operations Manager',
      recipientEmail: 'e.vianello@logisticanordest.com',
      recipientPhone: '+39 335 9988771',
      sentAt: offset(6),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Presentazione digitalizzazione bolle e packing list.',
      sourceId: 'gmail-msg-b2b-02'
    },
    {
      id: 'demo-send-03',
      contactId: '',
      companyName: 'Officine Meccaniche Trevisane',
      recipientName: 'Roberto Da Ros',
      recipientRole: 'Titolare',
      recipientEmail: 'roberto@officinedaros.it',
      recipientPhone: '+39 348 7766554',
      sentAt: offset(5),
      status: 'replied',
      replyReceivedAt: offset(2),
      callCompletedAt: null,
      agreedDate: typeof addDays === 'function' ? addDays(todayStr, 20) : offset(-20),
      notes: 'Risposta ricevuta: "Molto interessante, sentiamoci tra circa un mese per valutare". Prevale accordo esplicito.',
      sourceId: 'gmail-msg-b2b-03'
    },
    {
      id: 'demo-send-04',
      contactId: '',
      companyName: 'Fonderie Venete S.p.A.',
      recipientName: 'Giorgio Moretti',
      recipientRole: 'Direttore Tecnico',
      recipientEmail: 'g.moretti@fonderievenete.it',
      recipientPhone: '+39 0422 889900',
      sentAt: offset(4),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviato caso studio sul monitoraggio consumi e fermi macchina.',
      sourceId: 'gmail-msg-b2b-04'
    },
    {
      id: 'demo-send-05',
      contactId: '',
      companyName: 'Imballaggi Cartotecnici Berici',
      recipientName: 'Silvia Zanon',
      recipientRole: 'Responsabile Acquisti',
      recipientEmail: 'acquisti@cartotecnicaberici.it',
      recipientPhone: '+39 339 4455667',
      sentAt: offset(5),
      status: 'called',
      replyReceivedAt: null,
      callCompletedAt: offset(1),
      agreedDate: null,
      notes: 'Chiamata già effettuata ieri. Segretaria riferisce di risentire martedì.',
      sourceId: 'gmail-msg-b2b-05'
    },
    {
      id: 'demo-send-06',
      contactId: '',
      companyName: 'Serramenti & Facciate Continua',
      recipientName: 'Davide Pavan',
      recipientRole: 'CEO',
      recipientEmail: 'davide@serramentipavan.it',
      recipientPhone: '+39 347 1234567',
      sentAt: offset(6),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviata panoramica su estrazione automatica misure da preventivi DWG.',
      sourceId: 'gmail-msg-b2b-06'
    },
    {
      id: 'demo-send-07',
      contactId: '',
      companyName: 'Torneria Automatica Piave',
      recipientName: 'Giancarlo Rossi',
      recipientRole: 'Direttore Stabilimento',
      recipientEmail: 'rossi@torneriapiave.it',
      recipientPhone: '', // Numero mancante intenzionale per test "Numero da verificare"
      sentAt: offset(6),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Numero telefonico diretto non presente nel messaggio iniziale.',
      sourceId: 'gmail-msg-b2b-07'
    },
    {
      id: 'demo-send-08',
      contactId: '',
      companyName: 'Verniciature Industriali Venete',
      recipientName: 'Claudio Masiero',
      recipientRole: 'Plant Manager',
      recipientEmail: 'c.masiero@verniciaturevenete.it',
      recipientPhone: '+39 349 9876543',
      sentAt: offset(5),
      status: 'opt_out',
      replyReceivedAt: offset(3),
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Richiesta esplicita di non essere ricontattato (Opt-out registrato).',
      sourceId: 'gmail-msg-b2b-08'
    },
    {
      id: 'demo-send-09',
      contactId: '',
      companyName: 'Carpenterie Metalliche Sile',
      recipientName: 'Luca Benetton',
      recipientRole: 'Ufficio Tecnico',
      recipientEmail: 'tecnico@carpenteriesile.it',
      recipientPhone: '+39 342 5566778',
      sentAt: offset(4),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviato esempio di preventivatore automatico carpenteria.',
      sourceId: 'gmail-msg-b2b-09'
    },
    {
      id: 'demo-send-10',
      contactId: '',
      companyName: 'Termoidraulica Industriale Brenta',
      recipientName: 'Andrea Marangon',
      recipientRole: 'Responsabile Manutenzioni',
      recipientEmail: 'a.marangon@brentatermo.it',
      recipientPhone: '+39 333 8899112',
      sentAt: offset(7),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviata demo chatbot assistenza clienti per caldaie industriali.',
      sourceId: 'gmail-msg-b2b-10'
    },
    {
      id: 'demo-send-11',
      contactId: '',
      companyName: 'Stampaggio Plastico Vicentino',
      recipientName: 'Fabio Lovato',
      recipientRole: 'Direttore Qualità',
      recipientEmail: 'qualita@plasticovicentino.it',
      recipientPhone: '+39 348 2233445',
      sentAt: offset(5),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Proposta sistema vision AI per controllo difetti pezzi stampati.',
      sourceId: 'gmail-msg-b2b-11'
    },
    {
      id: 'demo-send-12',
      contactId: '',
      companyName: 'Automazioni Meccatroniche Belluno',
      recipientName: 'Matteo De Bona',
      recipientRole: 'CTO',
      recipientEmail: 'matteo@meccatronicabelluno.com',
      recipientPhone: '+39 345 6677889',
      sentAt: offset(6),
      status: 'replied',
      replyReceivedAt: offset(1),
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Risposta ricevuta: chiede documentazione tecnica dettagliata su protocollo Modbus.',
      sourceId: 'gmail-msg-b2b-12'
    },
    {
      id: 'demo-send-13',
      contactId: '',
      companyName: 'Estrusi Alluminio Euganei',
      recipientName: 'Simone Ruzzante',
      recipientRole: 'Direttore Vendite',
      recipientEmail: 's.ruzzante@estrusieuganei.it',
      recipientPhone: '+39 338 1122998',
      sentAt: offset(4),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviata proposta configuratore commerciale B2B.',
      sourceId: 'gmail-msg-b2b-13'
    },
    {
      id: 'demo-send-14',
      contactId: '',
      companyName: 'Microfusione & Leghe Speciali',
      recipientName: 'Paola Fabbri',
      recipientRole: 'Procurement Specialist',
      recipientEmail: 'p.fabbri@microfusioneleghe.it',
      recipientPhone: '+39 347 8899221',
      sentAt: offset(5),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Proposta estrazione automatica capitolati fornitura PDF.',
      sourceId: 'gmail-msg-b2b-14'
    },
    {
      id: 'demo-send-15',
      contactId: '',
      companyName: 'Elettroforniture Industriali Delta',
      recipientName: 'Stefano Zanchetta',
      recipientRole: 'Responsabile Magazzino',
      recipientEmail: 'zanchetta@elettrodelta.it',
      recipientPhone: '+39 334 5544332',
      sentAt: offset(6),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Automazione riordino scorte e lettura barcode.',
      sourceId: 'gmail-msg-b2b-15'
    },
    {
      id: 'demo-send-16',
      contactId: '',
      companyName: 'Lavorazioni Lamiere del Garda',
      recipientName: 'Maurizio Berti',
      recipientRole: 'Titolare',
      recipientEmail: 'berti@lamieragarda.it',
      recipientPhone: '+39 349 7788990',
      sentAt: offset(4),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviata presentazione calcolo tempi di taglio laser automatizzati.',
      sourceId: 'gmail-msg-b2b-16'
    },
    {
      id: 'demo-send-17',
      contactId: '',
      companyName: 'Valvole & Raccordi di Precisione',
      recipientName: 'Daniela Ghedin',
      recipientRole: 'Responsabile Commerciale',
      recipientEmail: 'd.ghedin@valvoleprecisione.com',
      recipientPhone: '+39 335 1234987',
      sentAt: offset(5),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviata presentazione integrazione CRM e catalogo prodotti.',
      sourceId: 'gmail-msg-b2b-17'
    },
    {
      id: 'demo-send-18',
      contactId: '',
      companyName: 'Trattamenti Termici Berici',
      recipientName: 'Alessandro Piva',
      recipientRole: 'Responsabile Qualità',
      recipientEmail: 'a.piva@trattamentiberici.it',
      recipientPhone: '+39 340 6655443',
      sentAt: offset(7),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Generazione automatica certificati di collaudo e conformità 3.1.',
      sourceId: 'gmail-msg-b2b-18'
    },
    {
      id: 'demo-send-19',
      contactId: '',
      companyName: 'Attrezzature Speciali Padovane',
      recipientName: 'Michele Zorzi',
      recipientRole: 'Technical Sales',
      recipientEmail: 'zorzi@attrezzaturepadovane.it',
      recipientPhone: '+39 348 9911223',
      sentAt: offset(5),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Inviata proposta sistema gestione commesse e avanzamento produzione.',
      sourceId: 'gmail-msg-b2b-19'
    },
    {
      id: 'demo-send-20',
      contactId: '',
      companyName: 'Utensileria Meccanica Feltrese',
      recipientName: 'Massimo Dalla Corte',
      recipientRole: 'CEO',
      recipientEmail: 'massimo@utensileriafeltre.it',
      recipientPhone: '+39 339 2233114',
      sentAt: offset(4),
      status: 'sent',
      replyReceivedAt: null,
      callCompletedAt: null,
      agreedDate: null,
      notes: 'Presentazione digitalizzazione ordini B2B.',
      sourceId: 'gmail-msg-b2b-20'
    }
  ];

  return {
    id: 'campaign-demo-b2b-2026',
    name: 'Campagna B2B — Automazione Processi AI (Demo 20 Email)',
    channel: 'email',
    sentDate: offset(5),
    cadenceDays: DEFAULT_CADENCE_DAYS,
    countBusinessDays: DEFAULT_COUNT_BUSINESS_DAYS,
    lastEmailCheck: new Date().toISOString().slice(0, 16).replace('T', ' ore '),
    notes: 'Campagna dimostrativa dichiarata per monitorare il flusso di invio, risposta, chiamata suggerita ed esito.',
    isDemo: true,
    sends: sends
  };
}

// Inizializza le campagne nello stato se non presenti e sincronizza anagrafiche e attività
function ensureCampaignsInState(crmState) {
  if (!crmState) return;
  crmState.campaigns = Array.isArray(crmState.campaigns) ? crmState.campaigns : [];
  if (!crmState.campaigns.some(c => c.id === 'campaign-demo-b2b-2026')) {
    crmState.campaigns.unshift(getSeedDemoCampaign());
  }
  syncGmailSendsToProspects(crmState);
}

// Sincronizza le email inviate da Gmail con le anagrafiche dei Prospect e le relative attività operative
function syncGmailSendsToProspects(crmState) {
  if (!crmState || !Array.isArray(crmState.campaigns)) return { addedCompanies: 0, addedActivities: 0 };
  crmState.contacts = Array.isArray(crmState.contacts) ? crmState.contacts : [];
  crmState.activities = Array.isArray(crmState.activities) ? crmState.activities : [];
  crmState.deals = Array.isArray(crmState.deals) ? crmState.deals : [];

  const todayStr = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
  let addedCompanies = 0;
  let addedActivities = 0;

  for (const camp of crmState.campaigns) {
    for (const send of (camp.sends || [])) {
      // 1. Verifica se l'azienda esiste già in anagrafica
      let comp = crmState.contacts.find(c => 
        (send.contactId && c.id === send.contactId) ||
        (c.company && send.companyName && c.company.toLowerCase().trim() === send.companyName.toLowerCase().trim()) ||
        (c.email && send.recipientEmail && c.email.toLowerCase().trim() === send.recipientEmail.toLowerCase().trim())
      );

      if (!comp) {
        // Registra nuova azienda come Prospect
        const cid = send.contactId || ('contact-b2b-' + send.id);
        comp = {
          id: cid,
          company: send.companyName,
          stage: 'Prospect',
          leadTemp: send.status === 'replied' ? 'Hot' : 'Warm',
          person: send.recipientName,
          primaryRole: send.recipientRole || 'Referente',
          email: send.recipientEmail,
          phone: send.recipientPhone || '',
          address: '',
          city: 'Veneto',
          country: 'Italia',
          website: '',
          sector: 'Manifattura e Servizi B2B',
          source: 'Gmail (Email inviata)',
          notes: `Azienda contattata via Gmail il ${send.sentAt}. ${send.notes || ''}`,
          history: [
            {
              date: send.sentAt,
              kind: 'gmail-send',
              text: `Gmail: inviata email a ${send.recipientName} (${send.recipientEmail}). ${send.notes || ''}`
            }
          ],
          referents: [
            {
              id: 'ref-' + send.id,
              name: send.recipientName,
              role: send.recipientRole || 'Referente',
              email: send.recipientEmail,
              phone: send.recipientPhone || '',
              preferred: 'Email / Telefono',
              notes: 'Referente primo contatto Gmail'
            }
          ],
          categoryMode: 'auto',
          manualCategoryIds: [],
          resources: []
        };
        crmState.contacts.push(comp);
        send.contactId = cid;
        addedCompanies++;
      } else {
        send.contactId = comp.id;
        if (comp.stage === 'Lead' || !comp.stage) {
          comp.stage = 'Prospect'; // Promosso a Prospect per email inviata
        }
      }

      // 2. Registra l'attività dell'email inviata (Completata)
      const sentActId = 'act-send-' + send.id;
      if (!crmState.activities.some(a => a.id === sentActId || (a.sourceId && a.sourceId === send.sourceId))) {
        crmState.activities.push({
          id: sentActId,
          contactId: comp.id,
          dealId: '',
          quoteId: '',
          title: `Prima email: ${send.notes ? send.notes.replace(/^Inviat[ao]\s*/i, '').slice(0, 48) : 'Presentazione inviata'}`,
          type: 'Email',
          priority: 'Media',
          status: 'Completata',
          dueDate: send.sentAt,
          completedAt: send.sentAt,
          referentName: send.recipientName,
          notes: send.notes || 'Inviata presentazione via Gmail.',
          outcome: 'Email inviata con successo via Gmail',
          source: 'Gmail',
          sourceId: send.sourceId || ('gmail-' + send.id)
        });
        addedActivities++;
      }

      // 3. Registra l'attività operativa successiva ("Da fare")
      const followupActId = 'act-followup-' + send.id;
      if (!crmState.activities.some(a => a.id === followupActId || (a.contactId === comp.id && ['Da fare', 'In corso'].includes(a.status)))) {
        if (send.status === 'opt_out') {
          // Nessun ricontatto programmato: rispetto assoluto dell'opt-out
        } else if (send.status === 'replied' && send.agreedDate) {
          crmState.activities.push({
            id: followupActId,
            contactId: comp.id,
            dealId: '',
            quoteId: '',
            title: `Ricontatto concordato con ${send.recipientName}`,
            type: 'Chiamata',
            priority: 'Alta',
            status: 'Da fare',
            dueDate: send.agreedDate,
            reason: 'Accordo commerciale esplicito con il cliente ("Sentiamoci tra un mese")',
            lastOutcome: send.notes,
            referentName: send.recipientName,
            notes: `Risposta ricevuta via Gmail: "${send.notes}". Rispettare rigorosamente la scadenza concordata.`,
            source: 'Gmail'
          });
          addedActivities++;
        } else if (send.status === 'replied') {
          crmState.activities.push({
            id: followupActId,
            contactId: comp.id,
            dealId: '',
            quoteId: '',
            title: `Rispondere a richiesta tecnica di ${send.recipientName}`,
            type: 'Email',
            priority: 'Alta',
            status: 'Da fare',
            dueDate: todayStr,
            reason: 'Risposta ricevuta via Gmail: richiesta approfondimento tecnico',
            lastOutcome: send.notes,
            referentName: send.recipientName,
            notes: `Inviare documentazione tecnica richiesta da ${send.recipientName}. Dettagli: ${send.notes}`,
            source: 'Gmail'
          });
          addedActivities++;
        } else if (send.status === 'called') {
          crmState.activities.push({
            id: followupActId,
            contactId: comp.id,
            dealId: '',
            quoteId: '',
            title: `Richiamare ${send.recipientName} (esito: risentire)`,
            type: 'Chiamata',
            priority: 'Media',
            status: 'Da fare',
            dueDate: todayStr,
            reason: 'Chiamata svolta in precedenza: la segretaria ha indicato di risentire',
            lastOutcome: send.notes,
            referentName: send.recipientName,
            notes: `Chiamata precedente: ${send.notes}`,
            source: 'Chiamata'
          });
          addedActivities++;
        } else {
          // Status 'sent': suggerimento chiamata di follow-up per assenza di risposta oltre la cadenza
          crmState.activities.push({
            id: followupActId,
            contactId: comp.id,
            dealId: '',
            quoteId: '',
            title: `Chiamata di follow-up: sollecito presentazione inviata`,
            type: 'Chiamata',
            priority: 'Alta',
            status: 'Da fare',
            dueDate: todayStr,
            reason: `Nessun riscontro rilevato all'email del ${send.sentAt}`,
            lastOutcome: `Email inviata il ${send.sentAt} (${send.recipientEmail})`,
            referentName: `${send.recipientName} (${send.recipientPhone || 'Numero da verificare'})`,
            notes: `Contattare referente per verificare ricezione presentazione e disponibilità a breve confronto. Note invio: ${send.notes}`,
            source: 'Gmail'
          });
          addedActivities++;
        }
      }

      // 4. Collega Deal di vendita in fase Prospect se mancante
      if (!crmState.deals.some(d => d.contactId === comp.id)) {
        crmState.deals.push({
          id: 'deal-b2b-' + send.id,
          contactId: comp.id,
          title: `Automazione processi — ${send.companyName}`,
          service: 'Automazione',
          stage: 'Prospect',
          salesStage: 'Trattativa',
          setup: 1500,
          monthly: 0,
          problem: send.notes || 'Automazione e digitalizzazione flussi operativi.',
          process: 'Discovery con ' + send.recipientName,
          solution: 'Applicativo web su misura Apex Digital.',
          tools: 'Applicativo web, AI',
          benefit: 'Riduzione tempi manuali e velocizzazione preventivi.',
          next: send.status === 'replied' ? 'Approfondire richiesta con cliente' : 'Chiamata di follow-up per presentare demo',
          due: todayStr,
          archived: false,
          history: [{ date: send.sentAt, text: `Origine Gmail: inviata email a ${send.recipientName}` }]
        });
      }
    }
  }

  return { addedCompanies, addedActivities };
}

// Calcola le chiamate suggerite da una campagna rispettando le regole commerciali
function getCampaignSuggestedCalls(campaign, crmState = null) {
  if (!campaign || !Array.isArray(campaign.sends)) return [];
  const todayStr = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
  const cadenceDays = Number(campaign.cadenceDays) || DEFAULT_CADENCE_DAYS;
  const countBusinessDays = campaign.countBusinessDays !== false;

  const suggestions = [];

  for (const s of campaign.sends) {
    // Esclusioni tassative:
    // 1. Chiamata già completata
    if (s.callCompletedAt || s.status === 'called') continue;
    // 2. Richiesta di opt-out / non contattare
    if (s.status === 'opt_out') continue;
    // 3. Risposta ricevuta con accordo esplicito
    if (s.agreedDate && s.agreedDate > todayStr) continue;
    // 4. Risposta già gestita
    if (s.status === 'replied' && s.replyReceivedAt) continue;

    // Calcolo giorni trascorsi
    const daysPassed = countBusinessDays 
      ? getWorkingDaysBetween(s.sentAt, todayStr)
      : getCalendarDaysBetween(s.sentAt, todayStr);

    if (daysPassed >= cadenceDays) {
      suggestions.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        sendId: s.id,
        contactId: s.contactId || '',
        companyName: s.companyName,
        recipientName: s.recipientName,
        recipientRole: s.recipientRole || 'Referente',
        recipientEmail: s.recipientEmail,
        recipientPhone: s.recipientPhone || '',
        sentAt: s.sentAt,
        daysPassed: daysPassed,
        isWorkingDays: countBusinessDays,
        statusText: `Email inviata ${daysPassed} ${countBusinessDays ? 'giorni lavorativi' : 'giorni'} fa · nessuna risposta rilevata nell'ultimo controllo · chiamata suggerita`,
        notes: s.notes || '',
        sourceId: s.sourceId || ''
      });
    }
  }

  return suggestions;
}

// Registra la ricezione di una risposta da parte del cliente
function recordCampaignEmailReply(campaignId, sendId, replyDateStr, agreedDateStr = null, notes = '') {
  if (typeof state === 'undefined' || !state.campaigns) return false;
  const camp = state.campaigns.find(c => c.id === campaignId);
  if (!camp) return false;
  const send = (camp.sends || []).find(s => s.id === sendId);
  if (!send) return false;

  send.status = 'replied';
  send.replyReceivedAt = replyDateStr || today();
  if (agreedDateStr) send.agreedDate = agreedDateStr;
  if (notes) send.notes = [send.notes, notes].filter(Boolean).join(' | ');

  camp.lastEmailCheck = new Date().toISOString().slice(0, 16).replace('T', ' ore ');
  if (typeof persist === 'function') persist(state);
  return true;
}

// Registra l'avvenuto svolgimento della telefonata
function recordCampaignCallCompleted(campaignId, sendId, outcomeNotes = '') {
  if (typeof state === 'undefined' || !state.campaigns) return false;
  const camp = state.campaigns.find(c => c.id === campaignId);
  if (!camp) return false;
  const send = (camp.sends || []).find(s => s.id === sendId);
  if (!send) return false;

  send.status = 'called';
  send.callCompletedAt = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
  if (outcomeNotes) send.notes = [send.notes, outcomeNotes].filter(Boolean).join(' | ');

  if (typeof persist === 'function') persist(state);
  return true;
}

// Registra una richiesta di Opt-Out
function recordCampaignOptOut(campaignId, sendId, reason = '') {
  if (typeof state === 'undefined' || !state.campaigns) return false;
  const camp = state.campaigns.find(c => c.id === campaignId);
  if (!camp) return false;
  const send = (camp.sends || []).find(s => s.id === sendId);
  if (!send) return false;

  send.status = 'opt_out';
  if (reason) send.notes = [send.notes, `Opt-out: ${reason}`].filter(Boolean).join(' | ');

  if (typeof persist === 'function') persist(state);
  return true;
}

// Esportazione per Node / Test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getWorkingDaysBetween,
    getCalendarDaysBetween,
    validateCampaigns,
    getSeedDemoCampaign,
    ensureCampaignsInState,
    getCampaignSuggestedCalls,
    syncGmailSendsToProspects,
    recordCampaignEmailReply,
    recordCampaignCallCompleted,
    recordCampaignOptOut
  };
}

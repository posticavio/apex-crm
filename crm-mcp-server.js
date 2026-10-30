#!/usr/bin/env node
/**
 * Apex Digital CRM — Server MCP Universale (ChatGPT Desktop & Antigravity)
 *
 * Conforme alle specifiche ufficiali Model Context Protocol (MCP 2024-11-05).
 * Funziona con:
 * - Google Antigravity (tramite ~/.gemini/config/mcp_config.json)
 * - OpenAI ChatGPT Desktop / ChatGPT Developer (tramite config.json o stdio)
 * - Claude Desktop / Cursor / Windsurf / Codex
 *
 * Caratteristiche:
 * - 100% Zero dipendenze npm: puro Node.js nativo (fs, readline, https, http, crypto).
 * - Doppio canale: stdio JSON-RPC 2.0 (default) e server HTTP/SSE opzionale (--port 3333).
 * - Connessione diretta bidirezionale con il cloud Supabase del CRM Apex Digital.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');
const http = require('http');

// Configurazione Supabase
const SUPABASE_URL = 'https://jjkqiatabmxcwvzswygh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_W879qBUaoHLOCwPofi-dWg_0J4XY2w0';
const CLOUD_STATE_FILE = 'apex_crm_cloud_state.json';

const SERVER_NAME = 'apex-crm-mcp';
const SERVER_VERSION = '1.0.0';
const PROTOCOL_VERSION = '2024-11-05';

// Helper per richieste HTTPS a Supabase
function supabaseRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    };

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: method,
      headers: headers,
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(rawData ? JSON.parse(rawData) : null);
          } catch {
            resolve(rawData);
          }
        } else {
          reject(new Error(`Supabase HTTP ${res.statusCode}: ${rawData}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout richiesta Supabase'));
    });

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

// Recupera stato completo unificato (Cloud Snapshot + Tabelle Relazionali)
async function getCrmData() {
  try {
    // 1. Recupera snapshot da attachments
    const attachments = await supabaseRequest(`attachments?nome_file=eq.${encodeURIComponent(CLOUD_STATE_FILE)}&order=created_at.desc&limit=1`);
    let snapshot = null;
    if (attachments && attachments.length > 0 && attachments[0].file_url) {
      const url = attachments[0].file_url;
      if (url.startsWith('data:application/json;utf-8,') || url.startsWith('data:application/json;charset=utf-8,')) {
        snapshot = JSON.parse(decodeURIComponent(url.split(',')[1]));
      }
    }

    // 2. Recupera tabelle relazionali per garantire freschezza massima
    const [companies, contacts, interactions, quotes] = await Promise.all([
      supabaseRequest('companies?select=*&order=created_at.asc').catch(() => []),
      supabaseRequest('contacts?select=*').catch(() => []),
      supabaseRequest('interactions?select=*&order=data_interazione.desc').catch(() => []),
      supabaseRequest('quotes?select=*').catch(() => [])
    ]);

    // Combina e restituisce
    const data = snapshot || {
      contacts: [],
      deals: [],
      activities: [],
      quotes: [],
      projects: [],
      categories: [],
      finance: null
    };

    // Assicura che le aziende relazionali siano presenti
    if (Array.isArray(companies)) {
      for (const comp of companies) {
        if (!data.contacts.some(c => c.id === comp.id || (c.company && comp.ragione_sociale && c.company.toLowerCase().trim() === comp.ragione_sociale.toLowerCase().trim()))) {
          data.contacts.push({
            id: comp.id,
            company: comp.ragione_sociale,
            taxId: comp.partita_iva || comp.codice_fiscale || '',
            email: comp.email || '',
            phone: comp.telefono || '',
            address: comp.indirizzo || '',
            city: comp.citta || '',
            website: comp.sito_web || '',
            sector: comp.settore || '',
            notes: comp.note || '',
            stage: (comp.tipo || 'prospect').toLowerCase() === 'cliente' ? 'Cliente' : 'Prospect',
            referents: [],
            interactions: []
          });
        }
      }
    }

    return data;
  } catch (err) {
    console.error('[CRM MCP] Errore lettura dati:', err.message);
    return { contacts: [], deals: [], activities: [], quotes: [], projects: [] };
  }
}

// Salva snapshot aggiornato su Supabase
async function saveCrmSnapshot(state) {
  const firstCompId = state.contacts?.[0]?.id || '3c39207e-1874-42a2-b14f-818806835ff4';
  const cleanSnapshot = {
    contacts: state.contacts || [],
    deals: state.deals || [],
    categories: state.categories || [],
    quotes: state.quotes || [],
    activities: state.activities || [],
    projects: state.projects || [],
    finance: state.finance || null,
    playbooks: state.playbooks || null,
    _updatedAt: new Date().toISOString()
  };

  const jsonStr = JSON.stringify(cleanSnapshot);
  const dataUri = `data:application/json;utf-8,${encodeURIComponent(jsonStr)}`;

  const existing = await supabaseRequest(`attachments?nome_file=eq.${encodeURIComponent(CLOUD_STATE_FILE)}&limit=1`).catch(() => []);
  if (existing && existing.length > 0) {
    await supabaseRequest(`attachments?id=eq.${existing[0].id}`, 'PATCH', {
      file_url: dataUri,
      company_id: firstCompId
    });
  } else {
    await supabaseRequest('attachments', 'POST', {
      company_id: firstCompId,
      nome_file: CLOUD_STATE_FILE,
      categoria: 'altro',
      file_url: dataUri
    });
  }
}

// Definizione di tutti i Tools MCP esposti
const TOOLS = [
  {
    name: 'crm_summary',
    description: 'Fornisce una sintesi esecutiva completa del CRM Apex Digital: valore totale della pipeline aperta (€), canoni mensili acquisiti (MRR), numero aziende per fase (Lead, Prospect, Clienti), attività scadute, in scadenza oggi e prossimi passi commerciali.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'crm_list_companies',
    description: 'Elenca le aziende e le anagrafiche presenti nel CRM, con filtri opzionali per fase commerciale e testo di ricerca.',
    inputSchema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          enum: ['all', 'Lead', 'Prospect', 'Cliente'],
          description: 'Filtra per fase commerciale aziendale. "all" restituisce tutte le fasi.'
        },
        search: {
          type: 'string',
          description: 'Stringa di ricerca testuale (cerca in nome azienda, P.IVA, email, città, note o referenti).'
        },
        limit: {
          type: 'integer',
          description: 'Numero massimo di risultati da restituire (default 50).'
        }
      }
    }
  },
  {
    name: 'crm_get_company',
    description: 'Restituisce la scheda e il dossier completo di un’azienda specifica: dati fiscali (P.IVA, SDI, PEC), sede, tutti i referenti, storico trattative, preventivi, commesse/progetti e registro interazioni.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: {
          type: 'string',
          description: 'ID univoco (UUID) dell’azienda nel CRM.'
        },
        company_name: {
          type: 'string',
          description: 'Nome o ragione sociale dell’azienda (usato se company_id non è specificato).'
        }
      }
    }
  },
  {
    name: 'crm_create_company',
    description: 'Crea una nuova anagrafica aziendale nel CRM Apex Digital, con sincronizzazione cloud immediata sia sulle tabelle relazionali sia sullo snapshot multi-dispositivo.',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Ragione Sociale dell’azienda (obbligatorio).' },
        stage: { type: 'string', enum: ['Lead', 'Prospect', 'Cliente'], description: 'Fase commerciale iniziale (default: Lead).' },
        taxId: { type: 'string', description: 'Partita IVA o Codice Fiscale.' },
        email: { type: 'string', description: 'Email generale o di contatto.' },
        phone: { type: 'string', description: 'Telefono aziendale o centralino.' },
        address: { type: 'string', description: 'Indirizzo della sede (via e numero).' },
        city: { type: 'string', description: 'Città e provincia (es. Treviso (TV)).' },
        website: { type: 'string', description: 'Sito web ufficiale.' },
        sector: { type: 'string', description: 'Settore merceologico o attività.' },
        primaryPerson: { type: 'string', description: 'Nome e cognome del referente principale.' },
        primaryRole: { type: 'string', description: 'Ruolo del referente principale (es. CEO, Resp. Acquisti).' },
        notes: { type: 'string', description: 'Note descrittive, contesto iniziale o fonte del contatto.' }
      },
      required: ['company']
    }
  },
  {
    name: 'crm_update_company',
    description: 'Aggiorna i dati anagrafici, i recapiti, la fase o le note di un’azienda esistente nel CRM.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'ID univoco dell’azienda.' },
        company_name: { type: 'string', description: 'Nome dell’azienda (se non hai l’ID).' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        website: { type: 'string' },
        sector: { type: 'string' },
        notes: { type: 'string' },
        stage: { type: 'string', enum: ['Lead', 'Prospect', 'Cliente'] }
      }
    }
  },
  {
    name: 'crm_list_deals',
    description: 'Elenca le opportunità commerciali (trattative di vendita) con filtri per stato (aperte/chiuse), fase, valore e azienda.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['open', 'won', 'lost', 'all'], description: 'Filtro stato trattativa (default: open).' },
        salesStage: { type: 'string', enum: ['all', 'Nuovo contatto', 'Trattativa', 'Offerta', 'Vinta', 'Persa'] },
        company_id: { type: 'string', description: 'Filtra trattative collegate a una specifica azienda.' }
      }
    }
  },
  {
    name: 'crm_create_deal',
    description: 'Crea una nuova trattativa commerciale collegata a un’azienda, indicando problema, soluzione proposta, valore iniziale, canone mensile e prossimo passo con scadenza.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'ID dell’azienda cliente/prospect (obbligatorio).' },
        title: { type: 'string', description: 'Titolo dell’opportunità (es. Automazione flussi documentali).' },
        service: { type: 'string', enum: ['Automazione', 'Assistente AI', 'Integrazione', 'Consulenza AI', 'Altro'], description: 'Servizio offerto.' },
        salesStage: { type: 'string', enum: ['Nuovo contatto', 'Trattativa', 'Offerta', 'Vinta', 'Persa'], description: 'Fase commerciale.' },
        setup: { type: 'number', description: 'Costo iniziale di sviluppo/setup in € (es. 1500).' },
        monthly: { type: 'number', description: 'Canone mensile ricorrente (MRR) in € (es. 250).' },
        problem: { type: 'string', description: 'Problema del cliente.' },
        solution: { type: 'string', description: 'Soluzione tecnica proposta.' },
        next: { type: 'string', description: 'Prossima azione commerciale da compiere.' },
        due: { type: 'string', description: 'Data di scadenza del prossimo passo (formato YYYY-MM-DD).' }
      },
      required: ['company_id', 'title']
    }
  },
  {
    name: 'crm_advance_deal',
    description: 'Avanza o modifica la fase di una trattativa commerciale (es. da Nuovo contatto a Trattativa o Offerta o Vinta/Persa).',
    inputSchema: {
      type: 'object',
      properties: {
        deal_id: { type: 'string', description: 'ID univoco della trattativa.' },
        target_stage: { type: 'string', enum: ['Nuovo contatto', 'Trattativa', 'Offerta', 'Vinta', 'Persa'], description: 'Nuova fase commerciale desiderata.' },
        next: { type: 'string', description: 'Nuovo prossimo passo commerciale.' },
        due: { type: 'string', description: 'Nuova data per il prossimo passo (YYYY-MM-DD).' },
        note: { type: 'string', description: 'Nota da registrare nello storico della trattativa.' }
      },
      required: ['deal_id', 'target_stage']
    }
  },
  {
    name: 'crm_list_activities',
    description: 'Elenca le attività operative e i follow-up del CRM (chiamate, meeting, email, compiti) con filtro per scadenza (scadute, oggi, future) e fase.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', enum: ['all', 'due', 'today', 'upcoming', 'completed'], description: 'Filtro temporale scadenza (default: all).' },
        type: { type: 'string', enum: ['all', 'chiamata', 'meeting', 'email', 'compito', 'demo'] },
        company_id: { type: 'string', description: 'Filtra attività per una specifica azienda.' }
      }
    }
  },
  {
    name: 'crm_create_activity',
    description: 'Crea una nuova attività operativa (es. Chiamata di follow-up, Meeting di demo, Invio proposta) collegata a un’azienda e facoltativamente a un’opportunità.',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'ID univoco dell’azienda.' },
        title: { type: 'string', description: 'Titolo dell’attività (es. Demo applicativo RDO).' },
        type: { type: 'string', enum: ['chiamata', 'meeting', 'email', 'compito', 'demo'], description: 'Tipo di attività.' },
        dueDate: { type: 'string', description: 'Data prevista di svolgimento (YYYY-MM-DD).' },
        priority: { type: 'string', enum: ['bassa', 'media', 'alta', 'urgente'] },
        notes: { type: 'string', description: 'Dettagli, ordine del giorno o note operative.' }
      },
      required: ['company_id', 'title']
    }
  },
  {
    name: 'crm_complete_activity',
    description: 'Segna un’attività come completata, registra l’esito/verbale nello storico aziendale e pianifica facoltativamente il follow-up successivo.',
    inputSchema: {
      type: 'object',
      properties: {
        activity_id: { type: 'string', description: 'ID univoco dell’attività.' },
        outcome: { type: 'string', description: 'Esito dell’attività o sintesi della conversazione.' },
        nextTitle: { type: 'string', description: 'Titolo del prossimo follow-up da pianificare (opzionale).' },
        nextDueDate: { type: 'string', description: 'Data di scadenza del nuovo follow-up (YYYY-MM-DD).' }
      },
      required: ['activity_id', 'outcome']
    }
  },
  {
    name: 'crm_list_quotes',
    description: 'Elenca i preventivi e le proposte commerciali emesse nel CRM, con importi imponibili, IVA, totali e stato (Bozza, Da approvare, Accettato, Rifiutato).',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'Filtra preventivi di una specifica azienda.' },
        status: { type: 'string', enum: ['all', 'bozza', 'da_approvare', 'accettato', 'rifiutato'] }
      }
    }
  },
  {
    name: 'crm_list_projects',
    description: 'Elenca le commesse/progetti dei clienti, con avanzamento delle milestone, vincoli di dipendenza, budget, costi orari e marginalità economica (€ e %).',
    inputSchema: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'Filtra progetti per azienda.' },
        status: { type: 'string', enum: ['all', 'pianificato', 'in_corso', 'in_revisione', 'completato', 'in_pausa'] }
      }
    }
  },
  {
    name: 'crm_search',
    description: 'Esegue una ricerca rapida universale a tutto testo in tutte le entità del CRM (aziende, persone, trattative, attività, note e preventivi).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Parola chiave da cercare (es. nome cliente, settore, tecnologia, referente).' }
      },
      required: ['query']
    }
  },
  {
    name: 'crm_sync_status',
    description: 'Verifica lo stato di connessione con il cloud Supabase e il conteggio attuale dei record sincronizzati.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

// Esecutore dei Tools
async function executeTool(name, args) {
  const state = await getCrmData();
  const todayStr = new Date().toISOString().slice(0, 10);

  switch (name) {
    case 'crm_summary': {
      const companies = state.contacts || [];
      const deals = state.deals || [];
      const activities = state.activities || [];
      const quotes = state.quotes || [];
      const projects = state.projects || [];

      const openDeals = deals.filter(d => !['Vinta', 'Persa'].includes(d.salesStage) && !d.archived);
      const wonDeals = deals.filter(d => d.salesStage === 'Vinta' || d.stage === 'Cliente');

      const openPipelineValue = openDeals.reduce((sum, d) => sum + (Number(d.setup) || 0), 0);
      const acquiredMrr = wonDeals.reduce((sum, d) => sum + (Number(d.monthly) || 0), 0);

      const overdueActivities = activities.filter(a => a.status !== 'completata' && a.dueDate && a.dueDate < todayStr);
      const todayActivities = activities.filter(a => a.status !== 'completata' && a.dueDate === todayStr);

      const clientsCount = companies.filter(c => c.stage === 'Cliente').length;
      const prospectsCount = companies.filter(c => c.stage === 'Prospect').length;
      const leadsCount = companies.filter(c => c.stage === 'Lead' || !c.stage).length;

      return {
        timestamp: new Date().toISOString(),
        summary: {
          pipelineApertaEuro: openPipelineValue,
          canoniAcquisitiMensiliMrrEuro: acquiredMrr,
          aziendeTotali: companies.length,
          aziendeClienti: clientsCount,
          aziendeProspect: prospectsCount,
          aziendeLead: leadsCount,
          trattativeAperte: openDeals.length,
          attivitaScadute: overdueActivities.length,
          attivitaOggi: todayActivities.length,
          preventiviTotali: quotes.length,
          progettiAttivi: projects.filter(p => p.status === 'in_corso').length
        },
        cloudDatabase: 'Supabase Cloud (https://jjkqiatabmxcwvzswygh.supabase.co)'
      };
    }

    case 'crm_list_companies': {
      let list = state.contacts || [];
      if (args.stage && args.stage !== 'all') {
        list = list.filter(c => (c.stage || 'Lead').toLowerCase() === args.stage.toLowerCase());
      }
      if (args.search) {
        const q = args.search.toLowerCase();
        list = list.filter(c =>
          (c.company || '').toLowerCase().includes(q) ||
          (c.taxId || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.sector || '').toLowerCase().includes(q) ||
          (c.notes || '').toLowerCase().includes(q) ||
          (c.person || '').toLowerCase().includes(q)
        );
      }
      const limit = args.limit || 50;
      return {
        count: list.length,
        companies: list.slice(0, limit).map(c => ({
          id: c.id,
          ragioneSociale: c.company,
          fase: c.stage || 'Lead',
          partitaIva: c.taxId || null,
          referente: c.person || null,
          email: c.email || null,
          telefono: c.phone || null,
          citta: c.city || null,
          settore: c.sector || null,
          referentiSecondari: c.referents?.length || 0,
          trattativeCollegate: (state.deals || []).filter(d => d.contactId === c.id).length
        }))
      };
    }

    case 'crm_get_company': {
      const companies = state.contacts || [];
      const comp = companies.find(c =>
        (args.company_id && c.id === args.company_id) ||
        (args.company_name && c.company.toLowerCase().trim() === args.company_name.toLowerCase().trim())
      );
      if (!comp) {
        throw new Error(`Azienda non trovata con ID "${args.company_id}" o Nome "${args.company_name}".`);
      }

      const cid = comp.id;
      const deals = (state.deals || []).filter(d => d.contactId === cid);
      const activities = (state.activities || []).filter(a => a.companyId === cid);
      const quotes = (state.quotes || []).filter(q => q.companyId === cid || q.contactId === cid);
      const projects = (state.projects || []).filter(p => p.companyId === cid);

      return {
        azienda: comp,
        opportunita: deals,
        attivita: activities,
        preventivi: quotes,
        progetti: projects
      };
    }

    case 'crm_create_company': {
      const cid = crypto.randomUUID();
      const stage = args.stage || 'Lead';
      const newCompany = {
        id: cid,
        company: args.company.trim(),
        stage: stage,
        taxId: args.taxId?.trim() || '',
        person: args.primaryPerson?.trim() || '',
        primaryRole: args.primaryRole?.trim() || '',
        email: args.email?.trim() || '',
        phone: args.phone?.trim() || '',
        preferredChannel: 'Nessuna preferenza',
        address: args.address?.trim() || '',
        city: args.city?.trim() || '',
        country: 'Italia',
        website: args.website?.trim() || '',
        sector: args.sector?.trim() || '',
        source: 'MCP Server (ChatGPT / Antigravity)',
        notes: args.notes?.trim() || '',
        referents: [],
        interactions: [],
        history: [{
          date: todayStr,
          kind: 'mcp-create',
          text: 'Azienda creata tramite MCP Server'
        }],
        categoryMode: 'auto',
        manualCategoryIds: [],
        resources: []
      };

      state.contacts = state.contacts || [];
      state.contacts.push(newCompany);

      // Salva snapshot e invia a tabella relazionale Supabase
      await saveCrmSnapshot(state);

      const compRelational = {
        id: cid,
        ragione_sociale: newCompany.company,
        tipo: stage.toLowerCase() === 'cliente' ? 'cliente' : 'prospect',
        partita_iva: newCompany.taxId || null,
        email: newCompany.email || null,
        telefono: newCompany.phone || null,
        indirizzo: newCompany.address || null,
        citta: newCompany.city || null,
        sito_web: newCompany.website || null,
        settore: newCompany.sector || null,
        note: newCompany.notes || null
      };
      await supabaseRequest('companies', 'POST', compRelational).catch(e => console.warn('[MCP] Errore inserimento relazionale company:', e.message));

      return {
        success: true,
        message: `Azienda "${newCompany.company}" creata con successo nel CRM e sincronizzata con Supabase.`,
        azienda: newCompany
      };
    }

    case 'crm_update_company': {
      const companies = state.contacts || [];
      const comp = companies.find(c =>
        (args.company_id && c.id === args.company_id) ||
        (args.company_name && c.company.toLowerCase().trim() === args.company_name.toLowerCase().trim())
      );
      if (!comp) {
        throw new Error('Azienda non trovata per l’aggiornamento.');
      }

      for (const k of ['email', 'phone', 'address', 'city', 'website', 'sector', 'notes', 'stage']) {
        if (args[k] !== undefined) comp[k] = args[k];
      }
      comp.history = comp.history || [];
      comp.history.push({
        date: todayStr,
        kind: 'mcp-update',
        text: 'Dati anagrafici aggiornati tramite MCP Server'
      });

      await saveCrmSnapshot(state);

      // Aggiorna anche riga Supabase
      const compPatch = {};
      if (args.email !== undefined) compPatch.email = args.email;
      if (args.phone !== undefined) compPatch.telefono = args.phone;
      if (args.address !== undefined) compPatch.indirizzo = args.address;
      if (args.city !== undefined) compPatch.citta = args.city;
      if (args.website !== undefined) compPatch.sito_web = args.website;
      if (args.sector !== undefined) compPatch.settore = args.sector;
      if (args.notes !== undefined) compPatch.note = args.notes;
      if (args.stage !== undefined) compPatch.tipo = args.stage.toLowerCase() === 'cliente' ? 'cliente' : 'prospect';

      if (Object.keys(compPatch).length > 0) {
        await supabaseRequest(`companies?id=eq.${comp.id}`, 'PATCH', compPatch).catch(() => {});
      }

      return {
        success: true,
        message: `Azienda "${comp.company}" aggiornata con successo.`,
        azienda: comp
      };
    }

    case 'crm_list_deals': {
      let deals = state.deals || [];
      if (args.company_id) {
        deals = deals.filter(d => d.contactId === args.company_id);
      }
      if (args.status === 'open') {
        deals = deals.filter(d => !['Vinta', 'Persa'].includes(d.salesStage) && !d.archived);
      } else if (args.status === 'won') {
        deals = deals.filter(d => d.salesStage === 'Vinta' || d.stage === 'Cliente');
      } else if (args.status === 'lost') {
        deals = deals.filter(d => d.salesStage === 'Persa');
      }
      if (args.salesStage && args.salesStage !== 'all') {
        deals = deals.filter(d => d.salesStage === args.salesStage);
      }
      return {
        count: deals.length,
        deals: deals.map(d => {
          const comp = (state.contacts || []).find(c => c.id === d.contactId);
          return {
            id: d.id,
            titolo: d.title,
            azienda: comp ? comp.company : 'Azienda non trovata',
            faseCommerciale: d.salesStage,
            costoIniziale: d.setup,
            canoneMensile: d.monthly,
            prossimoPasso: d.next,
            scadenza: d.due,
            servizio: d.service
          };
        })
      };
    }

    case 'crm_create_deal': {
      const comp = (state.contacts || []).find(c => c.id === args.company_id);
      if (!comp) throw new Error(`Azienda con ID "${args.company_id}" non trovata.`);

      const dealId = crypto.randomUUID();
      const salesStage = args.salesStage || 'Nuovo contatto';
      const stage = salesStage === 'Vinta' ? 'Cliente' : salesStage === 'Nuovo contatto' ? 'Lead' : 'Prospect';

      const newDeal = {
        id: dealId,
        contactId: args.company_id,
        title: args.title.trim(),
        service: args.service || 'Automazione',
        salesStage: salesStage,
        stage: stage,
        setup: Number(args.setup) || 0,
        monthly: Number(args.monthly) || 0,
        problem: args.problem || '',
        process: '',
        solution: args.solution || '',
        tools: '',
        benefit: '',
        next: args.next || '',
        due: args.due || '',
        archived: false,
        history: [{
          date: todayStr,
          kind: 'mcp-create',
          text: `Trattativa creata in fase ${salesStage}`
        }],
        resources: []
      };

      state.deals = state.deals || [];
      state.deals.push(newDeal);

      await saveCrmSnapshot(state);

      return {
        success: true,
        message: `Trattativa "${newDeal.title}" creata per l'azienda "${comp.company}".`,
        deal: newDeal
      };
    }

    case 'crm_advance_deal': {
      const deals = state.deals || [];
      const deal = deals.find(d => d.id === args.deal_id);
      if (!deal) throw new Error(`Trattativa con ID "${args.deal_id}" non trovata.`);

      const prev = deal.salesStage;
      deal.salesStage = args.target_stage;
      deal.stage = args.target_stage === 'Vinta' ? 'Cliente' : args.target_stage === 'Nuovo contatto' ? 'Lead' : 'Prospect';
      if (args.next) deal.next = args.next;
      if (args.due) deal.due = args.due;

      deal.history = deal.history || [];
      deal.history.push({
        date: todayStr,
        kind: 'sales-stage',
        text: `Fase: ${prev} → ${args.target_stage}. ${args.note || ''}`.trim()
      });

      await saveCrmSnapshot(state);

      return {
        success: true,
        message: `Trattativa "${deal.title}" avanzata con successo a "${args.target_stage}".`,
        deal: deal
      };
    }

    case 'crm_list_activities': {
      let activities = state.activities || [];
      if (args.company_id) {
        activities = activities.filter(a => a.companyId === args.company_id);
      }
      if (args.type && args.type !== 'all') {
        activities = activities.filter(a => a.type === args.type);
      }
      if (args.filter === 'due' || args.filter === 'overdue') {
        activities = activities.filter(a => a.status !== 'completata' && a.dueDate && a.dueDate < todayStr);
      } else if (args.filter === 'today') {
        activities = activities.filter(a => a.status !== 'completata' && a.dueDate === todayStr);
      } else if (args.filter === 'upcoming') {
        activities = activities.filter(a => a.status !== 'completata' && a.dueDate && a.dueDate > todayStr);
      } else if (args.filter === 'completed') {
        activities = activities.filter(a => a.status === 'completata');
      }

      return {
        count: activities.length,
        activities: activities.map(a => {
          const comp = (state.contacts || []).find(c => c.id === a.companyId);
          return {
            id: a.id,
            titolo: a.title,
            tipo: a.type,
            stato: a.status,
            scadenza: a.dueDate,
            priorita: a.priority,
            azienda: comp ? comp.company : 'N/D',
            note: a.notes,
            esito: a.outcome
          };
        })
      };
    }

    case 'crm_create_activity': {
      const comp = (state.contacts || []).find(c => c.id === args.company_id);
      if (!comp) throw new Error(`Azienda con ID "${args.company_id}" non trovata.`);

      const actId = crypto.randomUUID();
      const newAct = {
        id: actId,
        companyId: args.company_id,
        title: args.title.trim(),
        type: args.type || 'chiamata',
        status: 'da_fare',
        dueDate: args.dueDate || todayStr,
        priority: args.priority || 'media',
        notes: args.notes || '',
        outcome: ''
      };

      state.activities = state.activities || [];
      state.activities.push(newAct);

      await saveCrmSnapshot(state);

      // Invia anche a Supabase interactions
      await supabaseRequest('interactions', 'POST', {
        id: actId,
        company_id: args.company_id,
        titolo: newAct.title,
        tipo: newAct.type === 'chiamata' ? 'chiamata' : newAct.type === 'meeting' ? 'meeting' : 'email',
        stato: 'pianificata',
        data_interazione: `${newAct.dueDate}T09:00:00Z`,
        note: newAct.notes
      }).catch(() => {});

      return {
        success: true,
        message: `Attività "${newAct.title}" creata per "${comp.company}".`,
        activity: newAct
      };
    }

    case 'crm_complete_activity': {
      const act = (state.activities || []).find(a => a.id === args.activity_id);
      if (!act) throw new Error(`Attività "${args.activity_id}" non trovata.`);

      act.status = 'completata';
      act.outcome = args.outcome;
      act.completedDate = todayStr;

      let nextAct = null;
      if (args.nextTitle) {
        nextAct = {
          id: crypto.randomUUID(),
          companyId: act.companyId,
          title: args.nextTitle,
          type: 'chiamata',
          status: 'da_fare',
          dueDate: args.nextDueDate || todayStr,
          priority: 'media',
          notes: `Follow-up programmato dopo: ${act.title}`
        };
        state.activities.push(nextAct);
      }

      await saveCrmSnapshot(state);

      // Aggiorna anche interazione su Supabase
      await supabaseRequest(`interactions?id=eq.${act.id}`, 'PATCH', {
        stato: 'completata',
        prossimo_passo: args.outcome
      }).catch(() => {});

      return {
        success: true,
        message: `Attività "${act.title}" contrassegnata come completata.`,
        esito: args.outcome,
        prossimaAttivitaPianificata: nextAct
      };
    }

    case 'crm_list_quotes': {
      let quotes = state.quotes || [];
      if (args.company_id) {
        quotes = quotes.filter(q => q.companyId === args.company_id || q.contactId === args.company_id);
      }
      if (args.status && args.status !== 'all') {
        quotes = quotes.filter(q => q.status === args.status);
      }
      return {
        count: quotes.length,
        quotes: quotes.map(q => {
          const comp = (state.contacts || []).find(c => c.id === (q.companyId || q.contactId));
          return {
            id: q.id,
            numero: q.number,
            oggetto: q.subject,
            azienda: comp ? comp.company : 'N/D',
            stato: q.status,
            totaleDocumento: q.totalAmount || (q.items?.reduce((s, it) => s + (it.qty * it.unitPrice), 0)) || 0,
            data: q.date,
            scadenza: q.expiryDate,
            righe: q.items?.length || 0
          };
        })
      };
    }

    case 'crm_list_projects': {
      let projects = state.projects || [];
      if (args.company_id) {
        projects = projects.filter(p => p.companyId === args.company_id);
      }
      if (args.status && args.status !== 'all') {
        projects = projects.filter(p => p.status === args.status);
      }
      return {
        count: projects.length,
        projects: projects.map(p => {
          const comp = (state.contacts || []).find(c => c.id === p.companyId);
          return {
            id: p.id,
            titolo: p.title,
            azienda: comp ? comp.company : 'N/D',
            stato: p.status,
            budgetEuro: p.budget,
            costiEuro: p.costs,
            oreErogate: p.hoursSpent,
            oreStimate: p.hoursEstimated,
            milestones: p.milestones || []
          };
        })
      };
    }

    case 'crm_search': {
      const q = args.query.toLowerCase().trim();
      const compMatches = (state.contacts || []).filter(c =>
        (c.company || '').toLowerCase().includes(q) ||
        (c.person || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q)
      );
      const dealMatches = (state.deals || []).filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.problem || '').toLowerCase().includes(q) ||
        (d.solution || '').toLowerCase().includes(q) ||
        (d.next || '').toLowerCase().includes(q)
      );
      const actMatches = (state.activities || []).filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q) ||
        (a.outcome || '').toLowerCase().includes(q)
      );

      return {
        query: args.query,
        risultatiAziende: compMatches.map(c => ({ id: c.id, nome: c.company, fase: c.stage, email: c.email })),
        risultatiTrattative: dealMatches.map(d => ({ id: d.id, titolo: d.title, fase: d.salesStage, setup: d.setup })),
        risultatiAttivita: actMatches.map(a => ({ id: a.id, titolo: a.title, stato: a.status, scadenza: a.dueDate }))
      };
    }

    case 'crm_sync_status': {
      const companies = await supabaseRequest('companies?select=id').catch(() => []);
      const contacts = await supabaseRequest('contacts?select=id').catch(() => []);
      const interactions = await supabaseRequest('interactions?select=id').catch(() => []);
      return {
        online: true,
        endpoint: SUPABASE_URL,
        stato: 'Connesso e sincronizzato',
        recordNelDatabase: {
          aziende: companies?.length || 0,
          contattiReferenti: contacts?.length || 0,
          interazioni: interactions?.length || 0
        },
        snapshotStatoCloud: 'Attivo e aggiornato'
      };
    }

    default:
      throw new Error(`Tool "${name}" non riconosciuto.`);
  }
}

// Gestione messaggi JSON-RPC 2.0 (per Antigravity, ChatGPT Desktop e Client MCP)
async function handleRpcMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  const { id, method, params } = msg;

  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: {
              tools: { listChanged: false },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false }
            },
            serverInfo: {
              name: SERVER_NAME,
              version: SERVER_VERSION
            }
          }
        };

      case 'notifications/initialized':
        // Notifica senza risposta
        return null;

      case 'ping':
        return { jsonrpc: '2.0', id: id, result: {} };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            tools: TOOLS
          }
        };

      case 'tools/call': {
        const { name, arguments: toolArgs } = params || {};
        try {
          const result = await executeTool(name, toolArgs || {});
          return {
            jsonrpc: '2.0',
            id: id,
            result: {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
                }
              ]
            }
          };
        } catch (toolErr) {
          return {
            jsonrpc: '2.0',
            id: id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `Errore esecuzione ${name}: ${toolErr.message}`
                }
              ],
              isError: true
            }
          };
        }
      }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            resources: [
              {
                uri: 'crm://summary',
                name: 'Executive CRM Summary',
                description: 'Sintesi generale delle metriche e KPI del CRM',
                mimeType: 'application/json'
              },
              {
                uri: 'crm://companies',
                name: 'All Companies',
                description: 'Elenco completo delle anagrafiche aziendali',
                mimeType: 'application/json'
              }
            ]
          }
        };

      case 'resources/read': {
        const uri = params?.uri;
        const state = await getCrmData();
        let content = '';
        if (uri === 'crm://summary') {
          content = JSON.stringify(await executeTool('crm_summary', {}), null, 2);
        } else if (uri === 'crm://companies') {
          content = JSON.stringify(state.contacts || [], null, 2);
        } else {
          throw new Error(`Risorsa non trovata: ${uri}`);
        }
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: content
              }
            ]
          }
        };
      }

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id: id,
          result: {
            prompts: [
              {
                name: 'crm_daily_briefing',
                description: 'Genera il briefing commerciale della giornata con attività scadute, oggi e trattative prioritarie'
              },
              {
                name: 'crm_company_dossier',
                description: 'Prepara un dossier completo su un’azienda target prima di una call o riunione'
              }
            ]
          }
        };

      default:
        if (id !== undefined) {
          return {
            jsonrpc: '2.0',
            id: id,
            error: {
              code: -32601,
              message: `Metodo '${method}' non implementato`
            }
          };
        }
        return null;
    }
  } catch (err) {
    if (id !== undefined) {
      return {
        jsonrpc: '2.0',
        id: id,
        error: {
          code: -32603,
          message: err.message
        }
      };
    }
    return null;
  }
}

// Avvio modalità Stdio (standard Antigravity, Claude, ChatGPT Desktop)
function startStdioServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const msg = JSON.parse(trimmed);
      const response = await handleRpcMessage(msg);
      if (response) {
        process.stdout.write(JSON.stringify(response) + '\n');
      }
    } catch (parseErr) {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Invalid JSON: ' + parseErr.message }
      }) + '\n');
    }
  });

  process.stderr.write(`[${SERVER_NAME}] Server MCP avviato su STDIO (Protocollo ${PROTOCOL_VERSION})\n`);
}

// Avvio modalità HTTP / SSE opzionale (se avviato con flag --port)
function startHttpServer(port = 3333) {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const msg = JSON.parse(body);
          const response = await handleRpcMessage(msg);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: SERVER_NAME, version: SERVER_VERSION }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    process.stderr.write(`[${SERVER_NAME}] Server MCP HTTP avviato su http://localhost:${port}\n`);
  });
}

// Punto di ingresso CLI
if (require.main === module) {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const port = parseInt(process.argv[portArgIndex + 1], 10);
    startHttpServer(port);
  } else {
    startStdioServer();
  }
}

module.exports = {
  handleRpcMessage,
  executeTool,
  TOOLS,
  getCrmData,
  saveCrmSnapshot
};

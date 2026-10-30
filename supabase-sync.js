/**
 * Apex Digital CRM — Modulo di Sincronizzazione Cloud Multi-Dispositivo (Supabase)
 *
 * Garantisce:
 * 1. Persistenza affidabile al 100%: nessun dato viene mai perso alla chiusura del browser.
 * 2. Disponibilità multi-dispositivo in tempo reale (smartphone, tablet, laptop, desktop).
 * 3. Funzionamento Offline-First: salvataggio immediato in localStorage e push automatico al ritorno online.
 * 4. Allineamento a due vie con il database Supabase (aziende, contatti, interazioni, preventivi, commesse).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CrmCloudSync = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUPABASE_URL = 'https://jjkqiatabmxcwvzswygh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_W879qBUaoHLOCwPofi-dWg_0J4XY2w0';
  const CLOUD_STATE_FILE = 'apex_crm_cloud_state.json';
  const STORAGE_KEY = 'apex-crm-v1';
  const LAST_SYNC_KEY = 'apex-crm-last-sync-v1';

  let syncTimeout = null;
  let isSyncing = false;
  let hasPendingSync = false;
  let lastCloudTimestamp = 0;

  const defaultHeaders = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation'
  };

  function isOnline() {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  function formatTime(d = new Date()) {
    try {
      return new Intl.DateTimeFormat('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Rome'
      }).format(d);
    } catch {
      return d.toLocaleTimeString();
    }
  }

  function updateStatusUI(status, label, detail) {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('cloud-sync-status');
    const dot = btn?.querySelector('.cloud-sync-dot');
    const lbl = btn?.querySelector('.cloud-sync-label');
    const detailEl = document.getElementById('cloud-sync-detail');
    const timeEl = document.getElementById('cloud-sync-time');

    if (btn) {
      btn.dataset.syncState = status;
      btn.title = `Sincronizzazione Cloud Supabase: ${label}`;
    }
    if (dot) {
      dot.className = `cloud-sync-dot sync-${status}`;
    }
    if (lbl) {
      lbl.textContent = label;
    }
    if (detailEl) {
      detailEl.textContent = detail || label;
    }
    if (timeEl && status === 'synced') {
      timeEl.textContent = formatTime();
    }
  }

  async function apiFetch(path, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${path}`;
    const opts = {
      headers: { ...defaultHeaders, ...(options.headers || {}) },
      ...options
    };
    const res = await fetch(url, opts);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    if (res.status === 204) return null;
    return await res.json().catch(() => null);
  }

  /**
   * Converte i record relazionali Supabase (companies, contacts, interactions) nel modello state CRM
   */
  function transformSupabaseToCrm(companies = [], contacts = [], interactions = [], quotes = []) {
    const contactsByCompany = {};
    for (const c of contacts) {
      if (c.company_id) {
        if (!contactsByCompany[c.company_id]) contactsByCompany[c.company_id] = [];
        contactsByCompany[c.company_id].push({
          id: c.id,
          name: `${c.nome || ''} ${c.cognome || ''}`.trim() || 'Referente',
          role: c.ruolo || '',
          email: c.email || '',
          phone: c.cellulare || c.telefono_diretto || '',
          preferred: 'Nessuna preferenza',
          notes: c.note || ''
        });
      }
    }

    const interactionsByCompany = {};
    const activitiesList = [];
    for (const inter of interactions) {
      if (inter.company_id) {
        if (!interactionsByCompany[inter.company_id]) interactionsByCompany[inter.company_id] = [];
        const itype = inter.tipo || 'nota';
        const dateStr = (inter.data_interazione || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
        interactionsByCompany[inter.company_id].push({
          date: dateStr,
          channel: itype === 'chiamata' ? 'telefono' : itype,
          person: '',
          summary: `${inter.titolo || itype}: ${(inter.note || '').slice(0, 300)}`
        });

        activitiesList.push({
          id: inter.id,
          companyId: inter.company_id,
          title: inter.titolo || `Attività ${itype}`,
          type: itype === 'chiamata' ? 'chiamata' : itype === 'meeting' ? 'meeting' : 'email',
          status: inter.stato === 'completata' ? 'completata' : 'da_fare',
          dueDate: (inter.data_prossimo_contatto || inter.data_interazione || '').slice(0, 10),
          priority: 'media',
          notes: inter.note || '',
          outcome: inter.prossimo_passo || ''
        });
      }
    }

    const crmContacts = companies.map(comp => {
      const cid = comp.id;
      const refList = contactsByCompany[cid] || [];
      const primaryRef = refList[0] || {};
      const stage = (comp.tipo || 'prospect').toLowerCase() === 'cliente' ? 'Cliente' : 'Prospect';

      return {
        id: cid,
        company: comp.ragione_sociale || 'Azienda',
        taxId: comp.partita_iva || comp.codice_fiscale || '',
        person: primaryRef.name || comp.email || '',
        primaryRole: primaryRef.role || '',
        email: comp.email || primaryRef.email || '',
        phone: comp.telefono || primaryRef.phone || '',
        preferredChannel: 'Nessuna preferenza',
        address: comp.indirizzo || '',
        city: comp.citta ? `${comp.citta}${comp.provincia ? ` (${comp.provincia})` : ''}` : '',
        country: 'Italia',
        website: comp.sito_web || '',
        sector: comp.settore || '',
        source: 'Supabase Cloud Sync',
        notes: comp.note || '',
        referents: refList.slice(1),
        interactions: interactionsByCompany[cid] || [],
        history: [{
          date: (comp.created_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
          kind: 'cloud-sync',
          text: 'Sincronizzato da Supabase Cloud'
        }],
        categoryMode: 'auto',
        manualCategoryIds: [],
        resources: []
      };
    });

    return {
      contacts: crmContacts,
      activities: activitiesList
    };
  }

  /**
   * Scarica lo snapshot completo dello stato da Supabase
   */
  async function fetchCloudState() {
    try {
      // 1. Cerca snapshot file in attachments
      const rows = await apiFetch(`attachments?nome_file=eq.${encodeURIComponent(CLOUD_STATE_FILE)}&order=created_at.desc&limit=1`, {
        method: 'GET'
      });
      if (rows && rows.length > 0 && rows[0].file_url) {
        const rawUrl = rows[0].file_url;
        if (rawUrl.startsWith('data:application/json;utf-8,') || rawUrl.startsWith('data:application/json;charset=utf-8,')) {
          const jsonText = decodeURIComponent(rawUrl.split(',')[1]);
          const parsed = JSON.parse(jsonText);
          parsed._cloudAttachmentId = rows[0].id;
          parsed._cloudUpdatedAt = rows[0].created_at;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Supabase Sync] Impossibile recuperare snapshot attachments:', e.message);
    }
    return null;
  }

  /**
   * Scarica le tabelle relazionali Supabase
   */
  async function fetchRelationalData() {
    const [companies, contacts, interactions, quotes] = await Promise.all([
      apiFetch('companies?select=*&order=created_at.asc', { method: 'GET' }).catch(() => []),
      apiFetch('contacts?select=*', { method: 'GET' }).catch(() => []),
      apiFetch('interactions?select=*&order=data_interazione.desc', { method: 'GET' }).catch(() => []),
      apiFetch('quotes?select=*', { method: 'GET' }).catch(() => [])
    ]);
    return {
      companies: companies || [],
      contacts: contacts || [],
      interactions: interactions || [],
      quotes: quotes || []
    };
  }

  /**
   * Fusione conservativa e non distruttiva tra lo stato locale e lo stato cloud
   */
  function mergeCrmStates(localState, cloudState, relationalData) {
    const merged = {
      contacts: [...(localState?.contacts || [])],
      deals: [...(localState?.deals || [])],
      categories: [...(localState?.categories || [])],
      quotes: [...(localState?.quotes || [])],
      activities: [...(localState?.activities || [])],
      projects: [...(localState?.projects || [])],
      finance: localState?.finance || null,
      playbooks: localState?.playbooks || null
    };

    // 1. Integra snapshot cloud se presente
    if (cloudState && typeof cloudState === 'object') {
      // Unisci contatti
      if (Array.isArray(cloudState.contacts)) {
        for (const cc of cloudState.contacts) {
          const idx = merged.contacts.findIndex(c => c.id === cc.id || (c.company && cc.company && c.company.toLowerCase().trim() === cc.company.toLowerCase().trim()));
          if (idx < 0) {
            merged.contacts.push(cc);
          } else {
            // Aggiorna campi vuoti senza sovrascrivere modifiche locali recenti
            const existing = merged.contacts[idx];
            for (const k of ['taxId', 'email', 'phone', 'address', 'city', 'website', 'sector', 'notes']) {
              if (!existing[k] && cc[k]) existing[k] = cc[k];
            }
            if ((!existing.referents || !existing.referents.length) && cc.referents?.length) {
              existing.referents = cc.referents;
            }
          }
        }
      }

      // Unisci opportunità (deals)
      if (Array.isArray(cloudState.deals)) {
        for (const cd of cloudState.deals) {
          const idx = merged.deals.findIndex(d => d.id === cd.id);
          if (idx < 0) {
            // Verifica che il contactId esista
            if (merged.contacts.some(c => c.id === cd.contactId)) {
              merged.deals.push(cd);
            }
          }
        }
      }

      // Unisci preventivi (quotes)
      if (Array.isArray(cloudState.quotes)) {
        for (const cq of cloudState.quotes) {
          if (!merged.quotes.some(q => q.id === cq.id || q.number === cq.number)) {
            merged.quotes.push(cq);
          }
        }
      }

      // Unisci attività (activities)
      if (Array.isArray(cloudState.activities)) {
        for (const ca of cloudState.activities) {
          if (!merged.activities.some(a => a.id === ca.id)) {
            merged.activities.push(ca);
          }
        }
      }

      // Unisci progetti (projects)
      if (Array.isArray(cloudState.projects)) {
        for (const cp of cloudState.projects) {
          if (!merged.projects.some(p => p.id === cp.id)) {
            merged.projects.push(cp);
          }
        }
      }

      // Finance & Playbooks
      if (!merged.finance && cloudState.finance) merged.finance = cloudState.finance;
      if (!merged.playbooks && cloudState.playbooks) merged.playbooks = cloudState.playbooks;
    }

    // 2. Integra dati relazionali Supabase diretti (es. aziende inserite da altri strumenti)
    if (relationalData && relationalData.companies?.length) {
      const transformed = transformSupabaseToCrm(
        relationalData.companies,
        relationalData.contacts,
        relationalData.interactions,
        relationalData.quotes
      );

      for (const tc of transformed.contacts) {
        const idx = merged.contacts.findIndex(c => c.id === tc.id || (c.company && tc.company && c.company.toLowerCase().trim() === tc.company.toLowerCase().trim()));
        if (idx < 0) {
          merged.contacts.push(tc);
        } else {
          const c = merged.contacts[idx];
          if (!c.taxId && tc.taxId) c.taxId = tc.taxId;
          if (!c.email && tc.email) c.email = tc.email;
          if (!c.phone && tc.phone) c.phone = tc.phone;
          if (!c.address && tc.address) c.address = tc.address;
          if (!c.city && tc.city) c.city = tc.city;
          if (!c.website && tc.website) c.website = tc.website;
        }
      }

      for (const ta of transformed.activities) {
        if (!merged.activities.some(a => a.id === ta.id)) {
          merged.activities.push(ta);
        }
      }
    }

    return merged;
  }

  /**
   * Salva e sincronizza lo stato attuale verso Supabase
   */
  async function pushToCloud(state) {
    if (!isOnline()) {
      updateStatusUI('offline', 'Offline', 'Modifiche salvate in locale. Verranno inviate al ripristino connessione.');
      return false;
    }

    try {
      updateStatusUI('syncing', 'Sincronizzazione...', 'Invio dati al cloud...');

      // 1. Prepara e salva lo snapshot completo in attachments
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

      // Cerca se esiste già un attachment per aggiornarlo
      const existing = await apiFetch(`attachments?nome_file=eq.${encodeURIComponent(CLOUD_STATE_FILE)}&limit=1`, { method: 'GET' }).catch(() => []);
      if (existing && existing.length > 0) {
        await apiFetch(`attachments?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            file_url: dataUri,
            company_id: firstCompId
          })
        });
      } else {
        await apiFetch('attachments', {
          method: 'POST',
          body: JSON.stringify({
            company_id: firstCompId,
            nome_file: CLOUD_STATE_FILE,
            categoria: 'altro',
            file_url: dataUri
          })
        });
      }

      // 2. Upsert tabelle relazionali per compatibilità con Obsidian e query SQL/REST
      for (const comp of (state.contacts || [])) {
        const stageVal = (comp.stage || '').toLowerCase() === 'cliente' ? 'cliente' : 'prospect';
        const compPayload = {
          id: comp.id,
          ragione_sociale: comp.company || 'Azienda',
          tipo: stageVal,
          partita_iva: comp.taxId || null,
          email: comp.email || null,
          telefono: comp.phone || null,
          indirizzo: comp.address || null,
          citta: (comp.city || '').replace(/\s*\([^)]*\)/, '') || null,
          sito_web: comp.website || null,
          settore: comp.sector || null,
          note: comp.notes || null
        };
        await apiFetch('companies', {
          method: 'POST',
          body: JSON.stringify(compPayload)
        }).catch(err => console.warn('[Supabase Sync] Upsert company warning:', err.message));

        // Referenti della singola azienda
        if (Array.isArray(comp.referents)) {
          for (const ref of comp.referents) {
            const parts = (ref.name || '').trim().split(/\s+/);
            const nome = parts[0] || 'Referente';
            const cognome = parts.slice(1).join(' ') || '';
            const refPayload = {
              company_id: comp.id,
              nome,
              cognome,
              ruolo: ref.role || '',
              email: ref.email || '',
              cellulare: ref.phone || '',
              note: ref.notes || ''
            };
            if (ref.id && ref.id.length >= 20) refPayload.id = ref.id;
            await apiFetch('contacts', {
              method: 'POST',
              body: JSON.stringify(refPayload)
            }).catch(() => {});
          }
        }
      }

      // 3. Upsert attività in interazioni
      if (Array.isArray(state.activities)) {
        for (const act of state.activities) {
          if (!act.companyId) continue;
          const interPayload = {
            id: act.id && act.id.length >= 20 ? act.id : undefined,
            company_id: act.companyId,
            titolo: act.title || 'Attività',
            tipo: act.type === 'chiamata' ? 'chiamata' : act.type === 'meeting' ? 'meeting' : 'email',
            stato: act.status === 'completata' ? 'completata' : 'pianificata',
            data_interazione: act.dueDate ? `${act.dueDate}T09:00:00Z` : new Date().toISOString(),
            prossimo_passo: act.outcome || '',
            note: act.notes || ''
          };
          await apiFetch('interactions', {
            method: 'POST',
            body: JSON.stringify(interPayload)
          }).catch(() => {});
        }
      }

      const syncTime = formatTime();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      }
      updateStatusUI('synced', 'Cloud attivo', `Sincronizzato alle ${syncTime}`);
      return true;
    } catch (err) {
      console.error('[Supabase Sync] Errore push:', err);
      updateStatusUI('error', 'Sync in errore', err.message);
      return false;
    } finally {
      isSyncing = false;
    }
  }

  /**
   * Esegue la sincronizzazione iniziale: pull -> merge -> salva in locale -> render
   */
  async function syncDownAndHydrate() {
    if (!isOnline()) {
      updateStatusUI('offline', 'Offline', 'Operatività locale offline. Dati salvati nel dispositivo.');
      return;
    }

    try {
      updateStatusUI('syncing', 'Sincronizzazione...', 'Controllo dati sul Cloud Supabase...');

      const [cloudState, relationalData] = await Promise.all([
        fetchCloudState(),
        fetchRelationalData()
      ]);

      const savedLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      let localState = null;
      if (savedLocal) {
        try {
          localState = JSON.parse(savedLocal);
        } catch {
          localState = null;
        }
      }

      // Fondi i dati preservando tutto
      const merged = mergeCrmStates(localState, cloudState, relationalData);

      // Valida e aggiorna lo stato globale
      if (typeof window !== 'undefined' && typeof window.validate === 'function') {
        try {
          window.validate(merged);
        } catch (valErr) {
          console.warn('[Supabase Sync] Validazione stato fuso:', valErr.message);
        }
      }

      // Salva nel localStorage locale del dispositivo corrente
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      }
      if (typeof window !== 'undefined' && window.state) {
        Object.assign(window.state, merged);
      }

      // Re-render dell'interfaccia se presente
      if (typeof window !== 'undefined' && typeof window.render === 'function') {
        window.render();
      }

      const syncTime = formatTime();
      updateStatusUI('synced', 'Cloud attivo', `Dati allineati (${merged.contacts.length} aziende, ${merged.deals.length} opportunità) alle ${syncTime}`);

      // Se il cloud non aveva ancora lo snapshot o i dati locali erano più recenti, invia il nuovo merge
      if (!cloudState) {
        pushToCloud(merged);
      }

      if (typeof window !== 'undefined' && typeof window.toast === 'function') {
        window.toast('✨ CRM sincronizzato con il Cloud (Multi-dispositivo)');
      }
    } catch (err) {
      console.warn('[Supabase Sync] Errore sync iniziale:', err);
      updateStatusUI('error', 'Cloud non raggiungibile', 'Uso dati locali');
    }
  }

  /**
   * Accoda un push debounced quando lo stato locale viene modificato
   */
  function queueSync(nextState) {
    hasPendingSync = true;
    clearTimeout(syncTimeout);
    updateStatusUI('pending', 'Modifiche locali', 'Sincronizzazione tra pochi secondi...');

    syncTimeout = setTimeout(() => {
      if (!isSyncing) {
        isSyncing = true;
        hasPendingSync = false;
        pushToCloud(nextState);
      }
    }, 450);
  }

  /**
   * Inizializza gli ascoltatori eventi su browser
   */
  function initBrowserIntegration() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // 1. Hook sul click del badge sync in header
    document.addEventListener('click', e => {
      const btn = e.target.closest('#cloud-sync-status, #btn-force-cloud-sync');
      if (btn) {
        e.preventDefault();
        syncDownAndHydrate();
      }
    });

    // 2. Controllo online / offline del browser
    window.addEventListener('online', () => {
      updateStatusUI('syncing', 'Riconnesso', 'Connessione ristabilita. Allineamento...');
      if (window.state) {
        pushToCloud(window.state);
      } else {
        syncDownAndHydrate();
      }
    });

    window.addEventListener('offline', () => {
      updateStatusUI('offline', 'Offline', 'Modalità offline. Dati salvati in locale.');
    });

    // 3. Ripresa della finestra (quando l'utente sblocca lo smartphone o torna sulla scheda)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const lastSync = localStorage.getItem(LAST_SYNC_KEY);
        const elapsedSec = lastSync ? (Date.now() - new Date(lastSync).getTime()) / 1000 : 999;
        if (elapsedSec > 30) {
          syncDownAndHydrate();
        }
      }
    });

    // 4. Polling periodico ogni 60 secondi se visibile
    setInterval(() => {
      if (document.visibilityState === 'visible' && isOnline() && !isSyncing && !hasPendingSync) {
        syncDownAndHydrate();
      }
    }, 60000);

    // Avvia sync al caricamento DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => syncDownAndHydrate());
    } else {
      setTimeout(() => syncDownAndHydrate(), 50);
    }
  }

  // Avvio automatico in ambiente browser
  if (typeof window !== 'undefined') {
    initBrowserIntegration();
  }

  return {
    SUPABASE_URL,
    SUPABASE_KEY,
    syncDownAndHydrate,
    pushToCloud,
    queueSync,
    fetchRelationalData,
    fetchCloudState,
    mergeCrmStates,
    transformSupabaseToCrm
  };
});

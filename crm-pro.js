'use strict';
/**
 * crm-pro.js — Modulo Executive CRM Professionale per Apex Digital
 * 
 * Implementa le funzionalità avanzate che trasformano Apex in un CRM di classe enterprise:
 * 1. Scheda Dettaglio Azienda 360° (Company 360° Cockpit con Timeline unificata, Referenti, Deals, Preventivi, Progetti)
 * 2. Logger Rapido Interazioni & Touchpoint (Call, WhatsApp, Email, Meeting) con follow-up 1-click
 * 3. Gestione Avanzamento Trattative Guidata (Deal Stage Modal, Loss Reasons, Win Celebration)
 * 4. Alert Inattività & Deal Rotting (Stalled deals detection > 14 giorni)
 * 5. Lead Qualification & Scoring B2B (Temperatura Hot 🔥, Warm ☀️, Cold ❄️)
 * 6. Scorciatoie Rapide Data (Quick Due Date Shortcuts: Oggi, Domani, +3gg, Lunedì, +1sett, +2sett)
 * 7. Integrazione WhatsApp Web 1-Click con messaggi professionali preimpostati
 * 8. Dashboard Commerciale Potenziata (Win Rate %, Average Deal Size, Deal Rotting Alerts, Recent Touchpoints Feed)
 */

// --- 1. UTILITY DATE E SCORCIATOIE ---
function getOffsetDate(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(d);
}

function getNextMondayDate() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day === 0 ? 1 : 8 - day);
  d.setDate(d.getDate() + diff);
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(d);
}

function renderDateShortcuts(targetInputSelector) {
  const todayStr = getOffsetDate(0);
  const tomorrowStr = getOffsetDate(1);
  const in3DaysStr = getOffsetDate(3);
  const mondayStr = getNextMondayDate();
  const in1WeekStr = getOffsetDate(7);
  const in2WeeksStr = getOffsetDate(14);

  return `
    <div class="date-shortcuts-bar" role="group" aria-label="Scorciatoie data rapida">
      <span class="date-shortcuts-label">Scadenza rapida:</span>
      <button type="button" class="date-chip" data-set-date="${todayStr}" data-target-input="${targetInputSelector}">Oggi</button>
      <button type="button" class="date-chip" data-set-date="${tomorrowStr}" data-target-input="${targetInputSelector}">Domani</button>
      <button type="button" class="date-chip" data-set-date="${in3DaysStr}" data-target-input="${targetInputSelector}">+3 giorni</button>
      <button type="button" class="date-chip" data-set-date="${mondayStr}" data-target-input="${targetInputSelector}">Lunedì</button>
      <button type="button" class="date-chip" data-set-date="${in1WeekStr}" data-target-input="${targetInputSelector}">+1 sett.</button>
      <button type="button" class="date-chip" data-set-date="${in2WeeksStr}" data-target-input="${targetInputSelector}">+2 sett.</button>
    </div>
  `;
}

// --- 2. DEAL ROTTING (ALERT INATTIVITÀ) ---
function calcDealRottingDays(deal) {
  if (!deal || ['Vinta', 'Persa'].includes(deal.salesStage || deal.stage) || deal.archived) return 0;
  
  // Data di riferimento: ultimo evento nello storico o data scadenza
  const historyDates = (deal.history || []).map(h => h.date).filter(Boolean);
  const lastDateStr = historyDates.sort().reverse()[0] || deal.due || deal.salesClosedOn || today();
  
  try {
    const last = new Date(lastDateStr + 'T12:00:00Z');
    const now = new Date(today() + 'T12:00:00Z');
    const diffMs = now.getTime() - last.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch {
    return 0;
  }
}

function dealRottingBadge(deal) {
  const days = calcDealRottingDays(deal);
  if (days >= 14) {
    return `<span class="rotting-badge danger" title="Nessuna attività registrata da ${days} giorni!">⚠️ Inattiva da ${days}gg</span>`;
  } else if (days >= 7) {
    return `<span class="rotting-badge warning" title="Nessun contatto recente da ${days} giorni">⏳ Ferma da ${days}gg</span>`;
  }
  return '';
}

// --- 3. LEAD QUALIFICATION & TEMPERATURA ---
function leadTempBadge(contact) {
  const temp = contact?.leadTemp || 'warm';
  if (temp === 'hot') {
    return `<span class="temp-badge temp-hot" title="Lead Caldo: decisione a breve o alto interesse">🔥 Caldo</span>`;
  } else if (temp === 'cold') {
    return `<span class="temp-badge temp-cold" title="Lead Freddo: lungo termine o bassa priorità">❄️ Freddo</span>`;
  }
  return `<span class="temp-badge temp-warm" title="Lead Tiepido: interesse medio o valutazione">☀️ Tiepido</span>`;
}

// --- 4. INTEGRAZIONE WHATSAPP E EMAIL 1-CLICK ---
function normalizePhoneForWhatsApp(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/[^\d+]/g, '');
  if (clean.startsWith('+')) clean = clean.slice(1);
  // Se numero italiano senza prefisso (10 cifre che iniziano per 3)
  if (clean.length === 10 && clean.startsWith('3')) {
    clean = '39' + clean;
  }
  return clean;
}

function makeWhatsAppUrl(phone, companyName, personName, templateType = 'intro') {
  const cleanPhone = normalizePhoneForWhatsApp(phone);
  if (!cleanPhone) return '';
  
  let text = '';
  const name = personName ? personName.trim() : 'Gentile Referente';
  if (templateType === 'intro') {
    text = `Buongiorno ${name}, la contatto da Apex Digital in merito ai servizi di intelligenza artificiale e automazione per ${companyName}. Quando avrebbe 5 minuti per un breve confronto?`;
  } else if (templateType === 'followup') {
    text = `Buongiorno ${name}, le scrivo da Apex Digital per sapere se ha avuto modo di valutare la nostra proposta per ${companyName}. Rimango a disposizione per qualsiasi chiarimento.`;
  } else if (templateType === 'quote') {
    text = `Buongiorno ${name}, le confermo di averle inviato il preventivo predisposto per ${companyName}. Le auguro una buona giornata e resto a disposizione.`;
  } else {
    text = `Buongiorno ${name}, la contatto da Apex Digital per ${companyName}.`;
  }
  
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

// --- 5. SCHEDA DETTAGLIO AZIENDA 360° (COMPANY 360° COCKPIT) ---
let current360CompanyId = null;
let current360Tab = 'timeline';

function openCompany360(id, defaultTab = 'timeline') {
  const c = (state.contacts || []).find(x => x.id === id);
  if (!c) {
    if (typeof toast === 'function') toast('Azienda non trovata.');
    return;
  }

  current360CompanyId = id;
  current360Tab = defaultTab;

  const dlg = document.querySelector('#company-360-dialog');
  if (!dlg) return;

  renderCompany360View(c);
  if (!dlg.open) dlg.showModal();
}

function closeCompany360() {
  const dlg = document.querySelector('#company-360-dialog');
  if (dlg && dlg.open) dlg.close();
  current360CompanyId = null;
}

function renderCompany360View(c) {
  const container = document.querySelector('#company-360-content');
  if (!container) return;

  const initials = (c.company || 'AD').slice(0, 2).toUpperCase();
  const stage = contactStage(c.id);
  const deals = (state.deals || []).filter(d => d.contactId === c.id);
  const openDeals = deals.filter(d => !['Vinta', 'Persa'].includes(getSalesStage(d)) && !isArchived(d));
  const wonDeals = deals.filter(d => d.stage === 'Cliente' && !isArchived(d));
  const quotes = (state.quotes || []).filter(q => q.contactId === c.id);
  const projects = (state.projects || []).filter(p => p.contactId === c.id);
  const openTasks = (state.activities || []).filter(a => a.contactId === c.id && isOpenTask(a));

  const totalPipelineSetup = openDeals.reduce((sum, d) => sum + (d.setup || 0), 0);
  const totalWonMonthly = wonDeals.reduce((sum, d) => sum + (d.monthly || 0), 0);
  const totalQuotesAmount = quotes.reduce((sum, q) => {
    const v = latestQuote(q);
    return sum + (v?.totals?.total || 0);
  }, 0) / 100;

  const phone = c.phone || (c.referents && c.referents[0]?.phone) || '';
  const email = c.email || (c.referents && c.referents[0]?.email) || '';
  const person = c.person || (c.referents && c.referents[0]?.name) || '';
  const waUrl = makeWhatsAppUrl(phone, c.company, person, 'intro');

  container.innerHTML = `
    <div class="c360-header">
      <div class="c360-identity">
        <div class="c360-avatar">${esc(initials)}</div>
        <div class="c360-title-block">
          <div class="c360-title-row">
            <h2>${esc(c.company)}</h2>
            <span class="pill ${stage === 'Cliente' ? 'green' : stage === 'Prospect' ? 'amber' : ''}">${esc(stage)}</span>
            ${leadTempBadge(c)}
          </div>
          <div class="c360-meta-row">
            ${c.sector ? `<span>🏢 ${esc(c.sector)}</span>` : ''}
            ${c.city ? `<span>📍 ${esc(c.city)}</span>` : ''}
            ${c.taxId ? `<span>🧾 P.IVA: ${esc(c.taxId)}</span>` : ''}
            ${c.website ? `<span>🌐 <a href="${esc(c.website)}" target="_blank" rel="noopener noreferrer">${esc(c.website.replace(/^https?:\/\//, ''))}</a></span>` : ''}
          </div>
        </div>
      </div>
      <button type="button" class="icon-btn c360-close" id="c360-close-btn" aria-label="Chiudi scheda 360°">×</button>
    </div>

    <!-- Barra Azioni Rapide Esecutive -->
    <div class="c360-actions-bar">
      ${phone ? `<a href="tel:${esc(phone.replace(/[^+\d]/g, ''))}" class="c360-action-btn primary-action">📞 Chiama</a>` : ''}
      ${email ? `<a href="mailto:${esc(email)}?subject=Apex%20Digital%20—%20Aggiornamento" class="c360-action-btn">✉️ Invia Email</a>` : ''}
      ${waUrl ? `<a href="${esc(waUrl)}" target="_blank" rel="noopener noreferrer" class="c360-action-btn whatsapp-action">💬 WhatsApp</a>` : ''}
      <button type="button" class="c360-action-btn highlight-action" data-quick-touchpoint="${esc(c.id)}">⚡ Registra Interazione</button>
      <button type="button" class="c360-action-btn" data-new-contact-task="${esc(c.id)}">+ Nuova Attività</button>
      <button type="button" class="c360-action-btn" data-contact-deal="${esc(c.id)}">+ Nuova Opportunità</button>
      <button type="button" class="c360-action-btn" data-new-contact-quote="${esc(c.id)}">+ Preventivo</button>
      <button type="button" class="c360-action-btn" data-edit-contact="${esc(c.id)}">✏️ Modifica Dati</button>
    </div>

    <!-- Statistiche e KPI Ribbon -->
    <div class="c360-stats-ribbon">
      <div class="c360-stat-card">
        <span class="c360-stat-label">Pipeline Aperta</span>
        <strong>${money(totalPipelineSetup)}</strong>
        <small>${openDeals.length} trattative in corso</small>
      </div>
      <div class="c360-stat-card">
        <span class="c360-stat-label">Canoni Acquisiti (MRR)</span>
        <strong>${money(totalWonMonthly)}</strong>
        <small>${wonDeals.length} canoni attivi</small>
      </div>
      <div class="c360-stat-card">
        <span class="c360-stat-label">Preventivi Emessi</span>
        <strong>${money(totalQuotesAmount)}</strong>
        <small>${quotes.length} proposte generate</small>
      </div>
      <div class="c360-stat-card">
        <span class="c360-stat-label">Follow-up Attivi</span>
        <strong class="${openTasks.length ? 'text-amber' : ''}">${openTasks.length}</strong>
        <small>${openTasks.length ? 'Attività da completare' : 'Nessuna attività pendente'}</small>
      </div>
    </div>

    <!-- Navigazione a Tab -->
    <div class="c360-tabs" role="tablist">
      <button type="button" class="c360-tab ${current360Tab === 'timeline' ? 'active' : ''}" data-c360-tab="timeline">🕒 Timeline & Feed (${(c.history || []).length})</button>
      <button type="button" class="c360-tab ${current360Tab === 'people' ? 'active' : ''}" data-c360-tab="people">👥 Referenti (${companyPeople(c).length})</button>
      <button type="button" class="c360-tab ${current360Tab === 'deals' ? 'active' : ''}" data-c360-tab="deals">▥ Opportunità (${deals.length})</button>
      <button type="button" class="c360-tab ${current360Tab === 'quotes' ? 'active' : ''}" data-c360-tab="quotes">▤ Preventivi (${quotes.length})</button>
      <button type="button" class="c360-tab ${current360Tab === 'projects' ? 'active' : ''}" data-c360-tab="projects">🚀 Progetti (${projects.length})</button>
      <button type="button" class="c360-tab ${current360Tab === 'info' ? 'active' : ''}" data-c360-tab="info">🏢 Anagrafica & Note</button>
    </div>

    <!-- Contenuto Tab Attiva -->
    <div class="c360-tab-body">
      ${render360TabContent(c, current360Tab)}
    </div>
  `;
}

function render360TabContent(c, tab) {
  if (tab === 'people') return render360PeopleTab(c);
  if (tab === 'deals') return render360DealsTab(c);
  if (tab === 'quotes') return render360QuotesTab(c);
  if (tab === 'projects') return render360ProjectsTab(c);
  if (tab === 'info') return render360InfoTab(c);
  return render360TimelineTab(c);
}

function render360TimelineTab(c) {
  // Feed integrato di tutte le interazioni aziendali e delle trattative collegate
  const dealEvents = (state.deals || [])
    .filter(d => d.contactId === c.id)
    .flatMap(d => (d.history || []).map(h => ({ ...h, sourceTitle: d.title, sourceKind: 'deal', dealId: d.id })));
  
  const companyEvents = (c.history || []).map(h => ({ ...h, sourceTitle: 'Anagrafica', sourceKind: 'company' }));
  
  const allEvents = [...companyEvents, ...dealEvents].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return `
    <div class="c360-quick-log-box">
      <h4>⚡ Aggiungi nota o interazione al volo</h4>
      <div class="c360-quick-log-form">
        <select id="c360-quick-channel" aria-label="Canale interazione">
          <option value="Nota">📝 Nota interna</option>
          <option value="Telefonata">📞 Telefonata</option>
          <option value="WhatsApp">💬 WhatsApp</option>
          <option value="Email">✉️ Email</option>
          <option value="Incontro">🤝 Incontro / Video call</option>
        </select>
        <input type="text" id="c360-quick-text" placeholder="Es. Chiamato Marco: molto interessato al bot AI, inviare offerta lunedì..." aria-label="Sintesi interazione">
        <button type="button" class="primary" id="c360-quick-submit" data-company-id="${esc(c.id)}">Registra nel feed</button>
      </div>
    </div>

    <div class="c360-timeline-list">
      ${allEvents.length ? allEvents.map(e => `
        <div class="c360-timeline-item ${e.kind === 'conversation' ? 'item-touchpoint' : ''}">
          <div class="c360-timeline-icon">
            ${e.channel === 'Telefonata' ? '📞' : e.channel === 'WhatsApp' ? '💬' : e.channel === 'Email' ? '✉️' : e.channel === 'Incontro' ? '🤝' : e.kind === 'sales-stage' ? '🔄' : '📝'}
          </div>
          <div class="c360-timeline-content">
            <div class="c360-timeline-head">
              <strong>${esc(e.channel || e.kind || 'Evento')}</strong>
              <small>${date(e.date)} · ${esc(e.sourceTitle || 'Azienda')}</small>
            </div>
            <p class="c360-timeline-text">${esc(e.text)}</p>
          </div>
        </div>
      `).join('') : '<div class="empty-compact">Nessun evento o interazione registrata nello storico.</div>'}
    </div>
  `;
}

function render360PeopleTab(c) {
  const people = companyPeople(c);
  return `
    <div class="c360-section-actions">
      <h4>Referenti & Organigramma (${people.length})</h4>
      <button type="button" class="text-button" data-edit-contact="${esc(c.id)}">+ Modifica / Aggiungi referenti</button>
    </div>
    <div class="c360-cards-grid">
      ${people.length ? people.map(p => {
        const wa = p.email || p.role ? makeWhatsAppUrl(p.phone || c.phone, c.company, p.name, 'intro') : '';
        return `
          <div class="c360-person-card">
            <div class="c360-person-head">
              <div class="c360-person-avatar">${esc((p.name || 'R').slice(0, 2).toUpperCase())}</div>
              <div>
                <strong>${esc(p.name)}</strong>
                <small>${esc(p.role || (p.id === 'primary' ? 'Referente principale' : 'Referente'))}</small>
              </div>
            </div>
            <div class="c360-person-contacts">
              ${p.email ? `<div>✉️ <a href="mailto:${esc(p.email)}">${esc(p.email)}</a></div>` : ''}
              ${p.phone ? `<div>📞 <a href="tel:${esc(p.phone.replace(/[^+\d]/g, ''))}">${esc(p.phone)}</a></div>` : ''}
            </div>
            <div class="c360-person-actions">
              ${p.phone ? `<a href="tel:${esc(p.phone.replace(/[^+\d]/g, ''))}" class="btn-micro">Chiama</a>` : ''}
              ${p.email ? `<a href="mailto:${esc(p.email)}" class="btn-micro">Email</a>` : ''}
              ${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener noreferrer" class="btn-micro btn-wa">WhatsApp</a>` : ''}
            </div>
          </div>
        `;
      }).join('') : '<div class="empty-compact">Nessun referente censito per questa azienda.</div>'}
    </div>
  `;
}

function render360DealsTab(c) {
  const deals = (state.deals || []).filter(d => d.contactId === c.id);
  return `
    <div class="c360-section-actions">
      <h4>Trattative Commerciali (${deals.length})</h4>
      <button type="button" class="primary btn-compact" data-contact-deal="${esc(c.id)}">+ Nuova Trattativa</button>
    </div>
    <div class="c360-deals-list">
      ${deals.length ? deals.map(d => {
        const stage = getSalesStage(d);
        const rotting = dealRottingBadge(d);
        return `
          <div class="c360-deal-row">
            <div class="c360-deal-main">
              <div class="c360-deal-title">
                <strong>${esc(d.title)}</strong>
                <span class="pill ${stage === 'Vinta' ? 'green' : stage === 'Persa' ? 'red' : ''}">${esc(stage)}</span>
                ${rotting}
              </div>
              <small>Servizio: ${esc(d.service || 'Automazione')} · Referente: ${esc(dealPersonLabel(d) || 'Aziendale')}</small>
            </div>
            <div class="c360-deal-values">
              <strong>${money(d.setup)}</strong>
              <small>+ ${money(d.monthly)} / mese</small>
            </div>
            <div class="c360-deal-next">
              <small>Prossimo passo: <strong>${esc(d.next || 'Nessuno')}</strong> ${d.due ? `(${date(d.due)})` : ''}</small>
            </div>
            <div class="c360-deal-actions">
              <button type="button" class="text-button" data-edit-deal="${esc(d.id)}">Apri ↗</button>
              <button type="button" class="text-button" data-change-deal-stage="${esc(d.id)}">Cambia fase ▾</button>
            </div>
          </div>
        `;
      }).join('') : '<div class="empty-compact">Nessuna trattativa commerciale collegata. Crea la prima!</div>'}
    </div>
  `;
}

function render360QuotesTab(c) {
  const quotes = (state.quotes || []).filter(q => q.contactId === c.id);
  return `
    <div class="c360-section-actions">
      <h4>Preventivi e Proposte Commerciali (${quotes.length})</h4>
      <button type="button" class="primary btn-compact" data-new-contact-quote="${esc(c.id)}">+ Nuovo Preventivo</button>
    </div>
    <div class="c360-quotes-list">
      ${quotes.length ? quotes.map(q => {
        const v = latestQuote(q);
        return `
          <div class="c360-quote-row">
            <div>
              <strong>${esc(v.number)} — ${esc(v.title)}</strong>
              <small>Data: ${esc(v.date)} · Versione v${q.versions.length} · Stato: <span class="pill ${v.status === 'Accettato' ? 'green' : v.status === 'Rifiutato' ? 'red' : ''}">${esc(v.status)}</span></small>
            </div>
            <div class="c360-quote-amounts">
              <strong>${money((v.totals?.total || 0) / 100)}</strong>
              <small>Imponibile: ${money((v.totals?.net || 0) / 100)}</small>
            </div>
            <div class="c360-quote-actions">
              <button type="button" class="text-button" data-edit-quote="${esc(q.id)}">Modifica ↗</button>
              <button type="button" class="text-button" data-print-quote="${esc(q.id)}">Stampa PDF 📄</button>
            </div>
          </div>
        `;
      }).join('') : '<div class="empty-compact">Nessun preventivo emesso per questa azienda.</div>'}
    </div>
  `;
}

function render360ProjectsTab(c) {
  const projects = (state.projects || []).filter(p => p.contactId === c.id);
  return `
    <div class="c360-section-actions">
      <h4>Progetti & Commesse Esecutive (${projects.length})</h4>
      <button type="button" class="primary btn-compact" data-new="project">+ Nuovo Progetto</button>
    </div>
    <div class="c360-projects-list">
      ${projects.length ? projects.map(p => {
        const prog = projectProgress(p);
        const margin = projectMarginCents(p) / 100;
        return `
          <div class="c360-project-row">
            <div>
              <strong>${esc(p.name)}</strong>
              <small>Stato: ${esc(p.status)} · Consegna: ${date(p.endDate)} · Ore: ${p.loggedHours}/${p.estimatedHours}h</small>
            </div>
            <div class="c360-prog-wrap">
              <div class="c360-prog-bar"><div class="c360-prog-fill" style="width: ${prog}%"></div></div>
              <small>${prog}%</small>
            </div>
            <div>
              <strong>Margine: ${money(margin)}</strong>
              <small>Budget: ${money((p.budgetCents || 0) / 100)}</small>
            </div>
            <div>
              <button type="button" class="text-button" data-edit-project="${esc(p.id)}">Apri ↗</button>
            </div>
          </div>
        `;
      }).join('') : '<div class="empty-compact">Nessuna commessa o progetto attivo per questa azienda.</div>'}
    </div>
  `;
}

function render360InfoTab(c) {
  const cats = companyCategories(c);
  return `
    <div class="c360-info-grid">
      <div class="c360-info-card">
        <h4>Dati Fiscali e Sede</h4>
        <div class="c360-info-row"><span>Partita IVA / CF:</span> <strong>${esc(c.taxId || 'Non indicata')}</strong></div>
        <div class="c360-info-row"><span>Indirizzo:</span> <strong>${esc(c.address || '—')}</strong></div>
        <div class="c360-info-row"><span>Città e Paese:</span> <strong>${esc(c.city || '—')}, ${esc(c.country || 'Italia')}</strong></div>
        <div class="c360-info-row"><span>Sito Web:</span> <strong>${c.website ? `<a href="${esc(c.website)}" target="_blank">${esc(c.website)}</a>` : '—'}</strong></div>
        <div class="c360-info-row"><span>Provenienza Lead:</span> <strong>${esc(c.source || '—')}</strong></div>
      </div>

      <div class="c360-info-card">
        <h4>Classificazione & Categorie</h4>
        <div class="c360-info-row"><span>Fase Aziendale:</span> <strong>${esc(contactStage(c.id))}</strong></div>
        <div class="c360-info-row"><span>Temperatura Lead:</span> <strong>${leadTempBadge(c)}</strong></div>
        <div class="c360-info-row"><span>Categorie:</span> <div>${cats.length ? cats.map(cat => `<span class="pill">${esc(cat.name)}</span>`).join(' ') : 'Nessuna'}</div></div>
        <div class="c360-info-row"><span>Modalità:</span> <strong>${c.categoryMode === 'manual' ? 'Manuale' : 'Automatica (Regole)'}</strong></div>
      </div>

      <div class="c360-info-card full-width">
        <h4>Note Commerciali & Profilo</h4>
        <p class="c360-notes-text">${esc(c.notes || 'Nessuna nota presente.')}</p>
      </div>

      <div class="c360-info-card full-width">
        <h4>Documenti & Risorse Cloud Collegate</h4>
        <div class="c360-resources-list">
          ${(c.resources || []).length ? c.resources.map(r => `
            <div class="c360-resource-item">
              <span>📄 <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a> (${esc(r.type)})</span>
              <small>${esc(r.notes || '')}</small>
            </div>
          `).join('') : '<small>Nessun documento Google Drive o link cloud collegato.</small>'}
        </div>
      </div>
    </div>
  `;
}

// --- 6. LOGGER RAPIDO INTERAZIONI & TOUCHPOINT ---
function openInteractionLogger(companyId = null, defaults = {}) {
  const dlg = document.querySelector('#interaction-dialog');
  if (!dlg) return;

  const form = document.querySelector('#interaction-form');
  if (!form) return;

  const targetComp = companyId ? (state.contacts || []).find(c => c.id === companyId) : (state.contacts || [])[0];
  const contactsList = state.contacts || [];

  const fieldsBox = document.querySelector('#interaction-fields');
  if (fieldsBox) {
    fieldsBox.innerHTML = `
      <div class="field-grid">
        <label class="field">Azienda *
          <select name="companyId" id="inter-company-select" required>
            ${contactsList.map(c => `<option value="${esc(c.id)}" ${targetComp && targetComp.id === c.id ? 'selected' : ''}>${esc(c.company)}</option>`).join('')}
          </select>
        </label>
        
        <label class="field">Referente coinvolto
          <select name="personId" id="inter-person-select">
            ${personOptions(targetComp?.id || '')}
          </select>
        </label>

        <div class="field full">
          <span>Canale di contatto *</span>
          <div class="channel-selector" role="group" aria-label="Canale interazione">
            <label class="channel-chip"><input type="radio" name="channel" value="Telefonata" checked> 📞 Telefonata</label>
            <label class="channel-chip"><input type="radio" name="channel" value="WhatsApp"> 💬 WhatsApp</label>
            <label class="channel-chip"><input type="radio" name="channel" value="Email"> ✉️ Email</label>
            <label class="channel-chip"><input type="radio" name="channel" value="Incontro"> 🤝 Incontro / Call</label>
            <label class="channel-chip"><input type="radio" name="channel" value="Nota"> 📝 Nota veloce</label>
          </div>
        </div>

        <label class="field">Data interazione
          <input type="date" name="interactionDate" value="${today()}" max="${today()}" required>
        </label>

        <div class="field full">
          <span>Esito rapido a 1 clic</span>
          <div class="outcome-chips-bar" role="group" aria-label="Esito rapido">
            <button type="button" class="outcome-chip" data-outcome="Ha risposto - Molto positivo / Interessato">✅ Interessato</button>
            <button type="button" class="outcome-chip" data-outcome="Ha risposto - Da risentire a breve">⏳ Da risentire</button>
            <button type="button" class="outcome-chip" data-outcome="Non ha risposto / Segreteria telefonica">📞 Non risponde</button>
            <button type="button" class="outcome-chip" data-outcome="Fissata demo / incontro conoscitivo">🤝 Fissata demo</button>
            <button type="button" class="outcome-chip" data-outcome="Richiesto preventivo commerciale">▤ Chiesto preventivo</button>
            <button type="button" class="outcome-chip" data-outcome="Non interessato al momento">❌ Non interessato</button>
          </div>
        </div>

        <label class="field full">Sintesi / Note della conversazione *
          <textarea name="interactionNotes" id="inter-notes" rows="3" required placeholder="Inserisci cosa vi siete detti e le prossime necessità del cliente...">${esc(defaults.notes || '')}</textarea>
        </label>

        <div class="field full highlight-box">
          <label class="field-toggle-row">
            <input type="checkbox" name="autoFollowUp" id="inter-auto-followup" checked>
            <strong>Pianifica automaticamente la prossima azione (Smart Follow-Up)</strong>
          </label>
          <div id="inter-followup-details" class="field-grid" style="margin-top: 8px;">
            <label class="field">Prossima azione
              <input type="text" name="nextAction" id="inter-next-action" value="Richiamo follow-up commerciale" placeholder="Es. Inviare offerta o richiamare">
            </label>
            <label class="field">Scadenza promemoria
              <input type="date" name="nextDate" id="inter-next-date" value="${getOffsetDate(1)}" min="${today()}">
            </label>
            <div class="field full">
              ${renderDateShortcuts('#inter-next-date')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (!dlg.open) dlg.showModal();
}

function saveInteractionFromForm(formData) {
  const companyId = formData.get('companyId');
  const personId = formData.get('personId') || '';
  const channel = formData.get('channel') || 'Nota';
  const dateStr = formData.get('interactionDate') || today();
  const notes = String(formData.get('interactionNotes') || '').trim();
  const autoFollowUp = formData.get('autoFollowUp') === 'on';
  const nextAction = String(formData.get('nextAction') || '').trim();
  const nextDate = formData.get('nextDate') || '';

  if (!companyId || !notes) {
    if (typeof toast === 'function') toast('Compila i campi obbligatori dell’interazione.');
    return false;
  }

  const nextState = structuredClone(state);
  const comp = (nextState.contacts || []).find(c => c.id === companyId);
  if (!comp) return false;

  const person = companyPeople(comp).find(p => p.id === personId);
  const personName = person?.name || '';

  comp.history = comp.history || [];
  comp.history.push({
    date: dateStr,
    kind: 'conversation',
    channel: channel,
    personId: personId,
    personName: personName,
    text: `${channel}${personName ? ' con ' + personName : ''}: ${notes}`
  });

  // Se è stato richiesto il follow-up automatico, crea una nuova attività operativa in activities
  if (autoFollowUp && nextAction && nextDate) {
    nextState.activities = nextState.activities || [];
    const newActivity = {
      id: crypto.randomUUID(),
      contactId: companyId,
      dealId: '',
      quoteId: '',
      personId: personId,
      personName: personName,
      title: nextAction,
      type: channel === 'Telefonata' ? 'Chiamata' : channel === 'Email' ? 'Email' : channel === 'Incontro' ? 'Riunione' : 'Task',
      priority: 'Media',
      status: 'Da fare',
      dueDate: nextDate,
      dueTime: '10:00',
      notes: `Follow-up automatico generato dopo ${channel}: ${notes.slice(0, 80)}...`,
      createdAt: today()
    };
    nextState.activities.push(newActivity);
  }

  try {
    validate(nextState);
  } catch (err) {
    if (typeof toast === 'function') toast('Errore convalida: ' + err.message);
    return false;
  }

  if (persist(nextState)) {
    const dlg = document.querySelector('#interaction-dialog');
    if (dlg && dlg.open) dlg.close();
    
    // Aggiorna la vista corrente o la scheda 360 se aperta
    if (current360CompanyId === companyId) {
      renderCompany360View((state.contacts || []).find(c => c.id === companyId));
    }
    render();
    if (typeof toast === 'function') {
      toast(`Interazione ${channel} registrata con successo${autoFollowUp ? ' (+ promemoria pianificato)' : ''}.`);
    }
    return true;
  }
  return false;
}

// --- 7. MODALE GUIDATO CAMBIO FASE TRATTATIVA (DEAL STAGE MODAL) ---
function openDealStageModal(dealId, targetStage = null) {
  const deal = (state.deals || []).find(d => d.id === dealId);
  if (!deal) return;

  const dlg = document.querySelector('#deal-stage-dialog');
  if (!dlg) return;

  const currentStage = getSalesStage(deal);
  const comp = (state.contacts || []).find(c => c.id === deal.contactId);

  const fieldsBox = document.querySelector('#deal-stage-fields');
  if (fieldsBox) {
    fieldsBox.innerHTML = `
      <input type="hidden" name="dealId" value="${esc(deal.id)}">
      <div class="deal-stage-hero">
        <strong>${esc(deal.title)}</strong>
        <p>${esc(comp?.company || 'Azienda')} · Valore: ${money(deal.setup)} (+ ${money(deal.monthly)}/m)</p>
      </div>

      <div class="field-grid" style="margin-top: 14px;">
        <label class="field full">Nuova fase opportunità *
          <select name="salesStage" id="deal-stage-select" required>
            ${salesStages.map(s => `<option value="${s}" ${(targetStage || currentStage) === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </label>

        <!-- Box se segnata VINTA -->
        <div id="box-stage-vinta" class="stage-celebration-box" style="display: ${targetStage === 'Vinta' || currentStage === 'Vinta' ? 'block' : 'none'};">
          <h4>🏆 Complimenti per la chiusura!</h4>
          <p>L'opportunità verrà segnata come Vinta e l'azienda passerà automaticamente a Cliente.</p>
          <div class="field-grid">
            <label class="field">Valore iniziale confermato (€)
              <input type="number" name="setupConfirmed" value="${deal.setup}" min="0" step="0.01">
            </label>
            <label class="field">Canone mensile confermato (€)
              <input type="number" name="monthlyConfirmed" value="${deal.monthly}" min="0" step="0.01">
            </label>
          </div>
        </div>

        <!-- Box se segnata PERSA -->
        <div id="box-stage-persa" class="stage-loss-box" style="display: ${targetStage === 'Persa' || currentStage === 'Persa' ? 'block' : 'none'};">
          <h4>Analisi della trattativa persa</h4>
          <label class="field full">Motivo principale della perdita *
            <select name="lossReason" id="deal-loss-reason">
              <option value="Prezzo troppo alto / Mancanza budget">Prezzo troppo alto / Mancanza budget</option>
              <option value="Scelto un concorrente">Scelto un concorrente</option>
              <option value="Progetto rimandato al prossimo anno">Progetto rimandato al prossimo anno</option>
              <option value="Nessuna risposta / Ghosting">Nessuna risposta / Ghosting</option>
              <option value="Mancanza requisiti tecnici / tempi">Mancanza requisiti tecnici / tempi</option>
              <option value="Altro">Altro motivo</option>
            </select>
          </label>
          <label class="field full">Note sul motivo di perdita
            <textarea name="lossNotes" rows="2" placeholder="Cosa è mancato? Quale feedback ha dato il cliente?"></textarea>
          </label>
        </div>

        <!-- Box Prossimo Passo (se aperta) -->
        <div id="box-stage-open" style="display: ${['Vinta', 'Persa'].includes(targetStage || currentStage) ? 'none' : 'block'};" class="field full">
          <label class="field full">Prossima azione concordata *
            <input type="text" name="nextStep" id="deal-next-step" value="${esc(deal.next || 'Follow-up offerta')}" required>
          </label>
          <label class="field full">Data del prossimo passo *
            <input type="date" name="nextDue" id="deal-next-due" value="${deal.due || getOffsetDate(3)}" min="${today()}" required>
          </label>
          <div class="field full" style="margin-top: 6px;">
            ${renderDateShortcuts('#deal-next-due')}
          </div>
        </div>
      </div>
    `;
  }

  if (!dlg.open) dlg.showModal();
}

function saveDealStageFromForm(formData) {
  const dealId = formData.get('dealId');
  const targetStage = formData.get('salesStage');
  const deal = (state.deals || []).find(d => d.id === dealId);
  if (!deal) return false;

  const currentStage = getSalesStage(deal);
  const nextState = structuredClone(state);
  const d = nextState.deals.find(x => x.id === dealId);
  if (!d) return false;

  d.salesStage = targetStage;
  d.stage = salesLifecycle(targetStage);

  if (targetStage === 'Vinta') {
    d.setup = Number(formData.get('setupConfirmed') || d.setup);
    d.monthly = Number(formData.get('monthlyConfirmed') || d.monthly);
    d.salesClosedOn = today();
    d.archived = false;
    d.history = d.history || [];
    d.history.push({
      date: today(),
      kind: 'sales-stage',
      text: `Trattativa VINTA! Valore setup: ${money(d.setup)}, Canone: ${money(d.monthly)}/mese.`
    });
  } else if (targetStage === 'Persa') {
    const reason = formData.get('lossReason') || 'Altro';
    const notes = formData.get('lossNotes') || '';
    d.lossReason = reason;
    d.salesClosedOn = today();
    d.archived = true;
    d.history = d.history || [];
    d.history.push({
      date: today(),
      kind: 'sales-stage',
      text: `Trattativa PERSA. Motivo: ${reason}${notes ? ' — ' + notes : ''}.`
    });
  } else {
    const nextStep = String(formData.get('nextStep') || '').trim();
    const nextDue = formData.get('nextDue');
    if (!nextStep || !nextDue) {
      if (typeof toast === 'function') toast('Indica la prossima azione e la data di scadenza.');
      return false;
    }
    d.next = nextStep;
    d.due = nextDue;
    d.history = d.history || [];
    d.history.push({
      date: today(),
      kind: 'sales-stage',
      text: `Fase commerciale aggiornata: ${currentStage} → ${targetStage}. Prossimo passo: ${nextStep} (${date(nextDue)}).`
    });
  }

  try {
    validate(nextState);
  } catch (err) {
    if (typeof toast === 'function') toast('Errore: ' + err.message);
    return false;
  }

  if (persist(nextState)) {
    const dlg = document.querySelector('#deal-stage-dialog');
    if (dlg && dlg.open) dlg.close();

    if (current360CompanyId === d.contactId) {
      renderCompany360View((state.contacts || []).find(c => c.id === d.contactId));
    }
    render();
    if (typeof toast === 'function') {
      toast(targetStage === 'Vinta' ? '🎉 Trattativa segnata come VINTA!' : `Opportunità spostata in ${targetStage}.`);
    }
    return true;
  }
  return false;
}

// --- 8. DASHBOARD EXECUTIVE METRICS & FEED ---
function renderExecutiveMetrics() {
  const allDeals = state.deals || [];
  const wonDeals = allDeals.filter(d => getSalesStage(d) === 'Vinta');
  const lostDeals = allDeals.filter(d => getSalesStage(d) === 'Persa');
  const closedCount = wonDeals.length + lostDeals.length;
  const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : 0;

  const totalSetupWon = wonDeals.reduce((sum, d) => sum + (d.setup || 0), 0);
  const avgDealSize = wonDeals.length > 0 ? Math.round(totalSetupWon / wonDeals.length) : 0;

  // Trattative stagnanti / inattive
  const openDealsList = allDeals.filter(d => !['Vinta', 'Persa'].includes(getSalesStage(d)) && !isArchived(d));
  const rottingDeals = openDealsList.filter(d => calcDealRottingDays(d) >= 14);

  // Ultime interazioni registrate in tutto il CRM
  const allTouchpoints = (state.contacts || []).flatMap(c => {
    return (c.history || [])
      .filter(h => h.kind === 'conversation' || h.channel)
      .map(h => ({ ...h, companyName: c.company, companyId: c.id }));
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);

  return `
    <div class="exec-dashboard-grid">
      <!-- Card Metriche Avanzate -->
      <div class="panel">
        <div class="panel-title">
          <h2>Performance Commerciale</h2>
          <small>Conversioni e valore medio</small>
        </div>
        <div class="exec-kpi-row">
          <div class="exec-kpi-item">
            <span class="stat-label">Win Rate (Chiusure vinte)</span>
            <strong>${winRate}%</strong>
            <small>${wonDeals.length} vinte su ${closedCount} concluse</small>
          </div>
          <div class="exec-kpi-item">
            <span class="stat-label">Average Deal Size (Valore medio)</span>
            <strong>${money(avgDealSize)}</strong>
            <small>Media setup contratti vinti</small>
          </div>
          <div class="exec-kpi-item">
            <span class="stat-label">Trattative a rischio inattività</span>
            <strong class="${rottingDeals.length ? 'text-danger' : ''}">${rottingDeals.length}</strong>
            <small>${rottingDeals.length ? 'Ferme da oltre 14 giorni' : 'Tutte attive con follow-up'}</small>
          </div>
        </div>
      </div>

      <!-- Widget Ultime Interazioni (Touchpoints Feed) -->
      <div class="panel">
        <div class="panel-title">
          <h2>Ultime Interazioni Registrate</h2>
          <button type="button" class="text-button" data-quick-touchpoint="any">+ Registra ⚡</button>
        </div>
        <div class="recent-touchpoints-list">
          ${allTouchpoints.length ? allTouchpoints.map(t => `
            <div class="touchpoint-row" data-open-360="${esc(t.companyId)}">
              <span class="tp-icon">${t.channel === 'Telefonata' ? '📞' : t.channel === 'WhatsApp' ? '💬' : t.channel === 'Email' ? '✉️' : t.channel === 'Incontro' ? '🤝' : '📝'}</span>
              <div class="tp-body">
                <div class="tp-head">
                  <strong>${esc(t.companyName)}</strong>
                  <small>${date(t.date)}</small>
                </div>
                <p class="tp-snippet">${esc(t.text)}</p>
              </div>
            </div>
          `).join('') : '<div class="empty-compact">Nessun tocco commerciale registrato di recente. Usa "+ Registra" per segnare una chiamata o WhatsApp!</div>'}
        </div>
      </div>
    </div>
  `;
}

// --- 9. EVENT LISTENERS E HOOKS GLOBALI ---
document.addEventListener('click', e => {
  const b = e.target.closest('button, [data-open-360]');
  if (!b) return;

  // Apertura Scheda 360°
  if (b.dataset.open360) {
    e.preventDefault();
    openCompany360(b.dataset.open360);
    return;
  }

  // Cambio Tab Scheda 360°
  if (b.dataset.c360Tab) {
    current360Tab = b.dataset.c360Tab;
    document.querySelectorAll('.c360-tab').forEach(t => t.classList.toggle('active', t.dataset.c360Tab === current360Tab));
    const comp = (state.contacts || []).find(c => c.id === current360CompanyId);
    if (comp) {
      const body = document.querySelector('.c360-tab-body');
      if (body) body.innerHTML = render360TabContent(comp, current360Tab);
    }
    return;
  }

  // Chiusura Scheda 360°
  if (b.id === 'c360-close-btn') {
    closeCompany360();
    return;
  }

  // Registrazione rapida nel feed dalla scheda 360°
  if (b.id === 'c360-quick-submit') {
    const compId = b.dataset.companyId;
    const channel = document.querySelector('#c360-quick-channel')?.value || 'Nota';
    const text = document.querySelector('#c360-quick-text')?.value?.trim();
    if (!text) {
      if (typeof toast === 'function') toast('Inserisci il testo dell’interazione.');
      return;
    }
    const nextState = structuredClone(state);
    const comp = (nextState.contacts || []).find(c => c.id === compId);
    if (comp) {
      comp.history = comp.history || [];
      comp.history.push({
        date: today(),
        kind: 'conversation',
        channel: channel,
        text: `${channel}: ${text}`
      });
      if (persist(nextState)) {
        renderCompany360View((state.contacts || []).find(c => c.id === compId));
        if (typeof toast === 'function') toast('Interazione aggiunta al feed.');
      }
    }
    return;
  }

  // Apertura Logger Rapido Touchpoint
  if (b.dataset.quickTouchpoint) {
    const cid = b.dataset.quickTouchpoint === 'any' ? null : b.dataset.quickTouchpoint;
    openInteractionLogger(cid);
    return;
  }

  // Scorciatoie Data Rapida
  if (b.dataset.setDate && b.dataset.targetInput) {
    const input = document.querySelector(b.dataset.targetInput);
    if (input) {
      input.value = b.dataset.setDate;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }

  // Selezione esito rapido nel logger interazioni
  if (b.dataset.outcome) {
    const notesEl = document.querySelector('#inter-notes');
    if (notesEl) {
      const current = notesEl.value.trim();
      notesEl.value = current ? `${current} — ${b.dataset.outcome}` : b.dataset.outcome;
    }
    // Adatta automaticamente il follow-up se non risponde
    if (b.dataset.outcome.includes('Non ha risposto')) {
      const nextAct = document.querySelector('#inter-next-action');
      const nextDate = document.querySelector('#inter-next-date');
      if (nextAct) nextAct.value = 'Riprova chiamata (secondo tentativo)';
      if (nextDate) nextDate.value = getOffsetDate(1);
    }
    return;
  }

  // Apertura Deal Stage Modal
  if (b.dataset.changeDealStage) {
    openDealStageModal(b.dataset.changeDealStage);
    return;
  }

  // Creazione preventivo direttamente collegato all'azienda
  if (b.dataset.newContactQuote) {
    const cid = b.dataset.newContactQuote;
    closeCompany360();
    if (typeof openQuote === 'function') {
      openQuote(null, { contactId: cid });
    }
    return;
  }
});

// Listener per cambio fase dinamico dentro il Deal Stage Modal
document.addEventListener('change', e => {
  if (e.target.id === 'deal-stage-select') {
    const val = e.target.value;
    const vintaBox = document.querySelector('#box-stage-vinta');
    const persaBox = document.querySelector('#box-stage-persa');
    const openBox = document.querySelector('#box-stage-open');
    if (vintaBox) vintaBox.style.display = val === 'Vinta' ? 'block' : 'none';
    if (persaBox) persaBox.style.display = val === 'Persa' ? 'block' : 'none';
    if (openBox) openBox.style.display = ['Vinta', 'Persa'].includes(val) ? 'none' : 'block';
  }

  if (e.target.id === 'inter-company-select') {
    const personSelect = document.querySelector('#inter-person-select');
    if (personSelect) personSelect.innerHTML = personOptions(e.target.value);
  }

  if (e.target.id === 'inter-auto-followup') {
    const details = document.querySelector('#inter-followup-details');
    if (details) details.style.display = e.target.checked ? 'grid' : 'none';
  }
});

// Listener submit form interazioni
document.addEventListener('submit', e => {
  if (e.target.id === 'interaction-form') {
    e.preventDefault();
    saveInteractionFromForm(new FormData(e.target));
    return;
  }
  if (e.target.id === 'deal-stage-form') {
    e.preventDefault();
    saveDealStageFromForm(new FormData(e.target));
    return;
  }
});

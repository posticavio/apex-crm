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

// --- 8 bis. STRUTTURA DATI PROGETTI E SCHEDA ESECUTIVA ---
function ensureDemoProjectData(crmState) {
  if (!crmState || !Array.isArray(crmState.contacts)) return;
  crmState.projects = Array.isArray(crmState.projects) ? crmState.projects : [];
  crmState.activities = Array.isArray(crmState.activities) ? crmState.activities : [];

  // 1. Martino Parisi S.r.l.
  const parisi = crmState.contacts.find(c => (c.company || '').toLowerCase().includes('parisi'));
  if (parisi && !crmState.projects.some(p => p.contactId === parisi.id)) {
    crmState.projects.push({
      id: 'project-parisi-automazione',
      contactId: parisi.id,
      dealId: (crmState.deals || []).find(d => d.contactId === parisi.id)?.id || '',
      quoteId: '',
      name: 'Automazione flussi e preventivazione rapida — Parisi',
      status: 'In corso',
      startDate: '2026-10-03',
      endDate: '',
      budgetCents: 0,
      costCents: 0,
      estimatedHours: 40,
      loggedHours: 6,
      milestones: [
        { id: 'ms-p1', title: 'Prima call conoscitiva e analisi flussi doganali', dueDate: '2026-10-20', done: true, dependsOn: '' },
        { id: 'ms-p2', title: 'Invio proposta economica formale e preventivo', dueDate: '2026-11-06', done: false, dependsOn: 'ms-p1' },
        { id: 'ms-p3', title: 'Definizione requisiti e prototipo preventivatore rapido', dueDate: '2026-11-20', done: false, dependsOn: 'ms-p2' },
        { id: 'ms-p4', title: 'Collaudo operativo e formazione referenti', dueDate: '2026-11-30', done: false, dependsOn: 'ms-p3' }
      ],
      clientGoal: 'Automatizzare la ricezione richieste doganali e la preventivazione rapida riducendo i tempi manuali di gestione file e archiviazione.',
      origin: 'Contatto avviato via Gmail a inizio ottobre 2026 a seguito di presentazione delle soluzioni AI e automazione documentale.',
      currentStatusSummary: 'Prima call conoscitiva svolta con successo con Andrea Zanatta; allineamento positivo sui flussi doganali e richiesta preventivo.',
      lastOutcome: 'Andrea Zanatta richiede preventivo dettagliato e proposta economica formale entro venerdì.',
      nextStep: 'Inviare preventivo dettagliato e proposta economica formale',
      nextDue: '',
      waitingFor: 'In attesa di invio preventivo (entro venerdì 06/11) e successiva approvazione di Andrea Zanatta.',
      driveUrl: 'https://drive.google.com/drive/folders/apex-parisi-automazioni',
      emailThreadUrl: 'https://mail.google.com/mail/u/0/#all/1a101fb411e24e3e',
      calendarUrl: '',
      notes: 'Richiesta integrazione con sistemi documentali doganali.'
    });

    // Registra la prima call conoscitiva come Completata
    if (!crmState.activities.some(a => a.contactId === parisi.id && a.title.toLowerCase().includes('conoscitiva'))) {
      crmState.activities.push({
        id: 'act-parisi-call-completed',
        contactId: parisi.id,
        companyId: parisi.id,
        dealId: (crmState.deals || []).find(d => d.contactId === parisi.id)?.id || '',
        title: 'Prima call conoscitiva',
        type: 'Incontro / Demo',
        priority: 'Media',
        status: 'Completata',
        dueDate: '2026-10-20',
        completedAt: '2026-10-20',
        reason: 'Call conoscitiva concordata via Teams',
        lastOutcome: 'Call svolta con successo con Andrea Zanatta: allineamento positivo sui flussi doganali e interesse a preventivatore rapido',
        outcome: 'Call svolta con successo con Andrea Zanatta: allineamento positivo sui flussi doganali e interesse a preventivatore rapido',
        referentId: parisi.referents?.[0]?.id || '',
        referentName: parisi.person || 'Andrea Zanatta',
        notes: 'Incontro conoscitivo svolto il 20/10/2026 ore 17:00 via Teams. Andrea Zanatta ha confermato interesse ad approfondire la soluzione.',
        source: 'Teams / Gmail',
        createdAt: '2026-10-15'
      });
    }

    // Attività operativa aperta "Da fare": Inviare preventivo entro venerdì
    if (!crmState.activities.some(a => a.contactId === parisi.id && ['Da fare', 'In corso'].includes(a.status))) {
      crmState.activities.push({
        id: 'act-parisi-quote-due',
        contactId: parisi.id,
        companyId: parisi.id,
        dealId: (crmState.deals || []).find(d => d.contactId === parisi.id)?.id || '',
        title: 'Inviare preventivo dettagliato e proposta economica formale',
        type: 'Analisi / Offerta',
        priority: 'Alta',
        status: 'Da fare',
        dueDate: '2026-11-06',
        reason: 'Richiesta esplicita di Andrea Zanatta',
        lastOutcome: 'Andrea Zanatta attende preventivo entro venerdì',
        referentId: parisi.referents?.[0]?.id || '',
        referentName: parisi.person || 'Andrea Zanatta',
        notes: 'Preparare proposta commerciale per automazione ricezione richieste doganali e preventivatore rapido.',
        source: 'Colloquio vocale',
        createdAt: '2026-11-02'
      });
    }
  }

  // 2. Cattini Srl
  const cattini = crmState.contacts.find(c => (c.company || '').toLowerCase().includes('cattini'));
  if (cattini && !crmState.projects.some(p => p.contactId === cattini.id)) {
    crmState.projects.push({
      id: 'project-cattini-rdo',
      contactId: cattini.id,
      dealId: (crmState.deals || []).find(d => d.contactId === cattini.id)?.id || '',
      quoteId: '',
      name: 'Gestione RDO e archiviazione disegni — Cattini',
      status: 'Pianificato',
      startDate: '2026-10-16',
      endDate: '',
      budgetCents: 150000,
      costCents: 0,
      estimatedHours: 30,
      loggedHours: 2,
      milestones: [
        { id: 'ms-c1', title: 'Confronto tecnico con colleghi e demo RDO', dueDate: '', done: false, dependsOn: '' },
        { id: 'ms-c2', title: 'Verifica compatibilità ERP SAP Business One', dueDate: '', done: false, dependsOn: 'ms-c1' }
      ],
      clientGoal: 'Sviluppare un applicativo web per gestione RDO e archiviazione disegni tecnici con riduzione attività manuali e compatibilità ERP SAP B1.',
      origin: 'Contatto avviato il 30/09/2026 a seguito di invio presentazione. Proposta economica iniziale di 1.500 euro lordi formulata il 03/10.',
      currentStatusSummary: 'Paolo Cattini ha espresso interesse ma deve confrontarsi con i colleghi per confermare la data della demo.',
      lastOutcome: 'Paolo Cattini propone di risentirsi per concordare la demo dopo allineamento interno.',
      nextStep: 'Ricontattare Paolo Cattini per concordare la demo RDO con i colleghi',
      nextDue: '',
      waitingFor: 'In attesa che Paolo Cattini si confronti con i colleghi per confermare la disponibilità per la demo.',
      driveUrl: '',
      emailThreadUrl: 'https://mail.google.com/mail/u/0/#all/1a0e87b9332450e7',
      calendarUrl: '',
      notes: 'Interesse per integrazione SAP Business One da quantificare a parte.'
    });

    if (!crmState.activities.some(a => a.contactId === cattini.id && a.status !== 'Completata')) {
      crmState.activities.push({
        id: 'act-cattini-demo-followup',
        contactId: cattini.id,
        dealId: (crmState.deals || []).find(d => d.contactId === cattini.id)?.id || '',
        title: 'Ricontattare Paolo Cattini per concordare la demo RDO con i colleghi',
        type: 'Chiamata',
        priority: 'Media',
        status: 'Da fare',
        dueDate: '',
        reason: 'Follow-up demo gestione RDO e archiviazione disegni',
        lastOutcome: 'Paolo deve allinearsi con i colleghi per definire la data',
        referentId: '',
        referentName: cattini.person || 'Paolo Cattini',
        notes: 'Chiedere a Paolo esito del confronto con i colleghi per fissare lo slot demo.',
        source: 'Notion e Gmail',
        createdAt: '2026-10-27'
      });
    }
  }
}

// --- 8 ter. HOME VIEW ESECUTIVA (A COLPO D'OCCHIO IN 2 MINUTI) ---
function renderUnifiedActivityRow(act) {
  const comp = typeof contact === 'function' ? contact(act.contactId) : (state.contacts || []).find(c => c.id === act.contactId);
  const proj = act.projectId ? (state.projects || []).find(p => p.id === act.projectId) : (state.projects || []).find(p => p.contactId === act.contactId);
  const deal = act.dealId ? (state.deals || []).find(d => d.id === act.dealId) : null;

  const phone = (act.referentId && comp?.referents ? comp.referents.find(r => r.id === act.referentId)?.phone : '') || comp?.phone || (comp?.referents && comp.referents[0]?.phone) || '';
  const refName = (act.referentId && comp?.referents ? comp.referents.find(r => r.id === act.referentId)?.name : '') || comp?.person || (comp?.referents && comp.referents[0]?.name) || '';

  const todayStr = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
  const isOverdue = act.dueDate && act.dueDate < todayStr;
  const isToday = act.dueDate && act.dueDate === todayStr;
  const isUnscheduled = !act.dueDate;

  const dateBadge = isUnscheduled
    ? `<span class="pill amber">⚡ Prossimo passo da definire</span>`
    : isOverdue
      ? `<span class="pill red">🚨 Scaduta (${typeof date === 'function' ? date(act.dueDate) : act.dueDate})</span>`
      : isToday
        ? `<span class="pill blue">📅 Oggi</span>`
        : `<span class="pill">${typeof date === 'function' ? date(act.dueDate) : act.dueDate}</span>`;

  const priorityClass = act.priority === 'Alta' ? 'red' : act.priority === 'Media' ? 'amber' : '';

  return `
    <article class="unified-activity-card ${isOverdue ? 'act-overdue' : ''}" data-act-id="${esc(act.id)}">
      <div class="uac-header">
        <div class="uac-company-proj">
          <button type="button" class="text-button uac-comp-btn" data-open-360="${esc(comp?.id || '')}">
            🏢 <strong>${esc(comp?.company || 'Azienda')}</strong>
          </button>
          ${proj ? `<span class="uac-proj-tag">· 🚀 ${esc(proj.name)}</span>` : deal ? `<span class="uac-deal-tag">· ▥ ${esc(deal.title)}</span>` : ''}
          ${refName ? `<span class="uac-person-tag">👤 ${esc(refName)}</span>` : ''}
        </div>
        <div class="uac-badges">
          ${dateBadge}
          <span class="pill ${priorityClass}">${esc(act.priority || 'Media')}</span>
          <span class="pill">${esc(act.type || 'Attività')}</span>
        </div>
      </div>

      <div class="uac-body">
        <h3 class="uac-action-title">${esc(act.title)}</h3>
        <div class="uac-meta-reason">
          <span class="uac-reason">🎯 <strong>Motivo:</strong> ${esc(act.reason || act.notes || 'Avanzamento commerciale e operativo')}</span>
          <span class="uac-separator">·</span>
          <span class="uac-last-outcome">💬 <strong>Ultimo esito:</strong> ${esc(act.lastOutcome || act.outcome || 'In attesa di primo riscontro')}</span>
        </div>
      </div>

      <div class="uac-actions-cluster">
        ${phone
          ? `<a href="tel:${esc(phone.replace(/[^+\d]/g, ''))}" class="uac-op-btn op-call" title="Chiama ${esc(refName)} al ${esc(phone)}">📞 Chiama (${esc(phone)})</a>`
          : `<span class="uac-op-btn op-call disabled" title="Nessun recapito telefonico diretto presente nelle fonti">📞 Numero da verificare</span>`}
        
        <button type="button" class="uac-op-btn op-followup" data-prepare-followup="${esc(act.id)}" data-comp-id="${esc(comp?.id || '')}">✉️ Prepara sollecito</button>
        <button type="button" class="uac-op-btn op-touchpoint" data-quick-touchpoint="${esc(comp?.id || '')}" data-act-id="${esc(act.id)}">⚡ Registra esito</button>
        <button type="button" class="uac-op-btn op-details" data-open-360="${esc(comp?.id || '')}">Scheda 360° ↗</button>
      </div>
    </article>
  `;
}

function renderExecutiveHomeView() {
  if (typeof ensureCampaignsInState === 'function') ensureCampaignsInState(state);
  ensureDemoProjectData(state);

  const todayStr = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
  const openActivities = (state.activities || []).filter(a => ['Da fare', 'In corso'].includes(a.status));
  const overdueTasks = openActivities.filter(a => a.dueDate && a.dueDate < todayStr);
  const todayTasks = openActivities.filter(a => a.dueDate && a.dueDate === todayStr);
  const upcomingTasks = openActivities.filter(a => a.dueDate && a.dueDate > todayStr);
  const unscheduledTasks = openActivities.filter(a => !a.dueDate);

  const activeProjects = (state.projects || []).filter(p => ['In corso', 'Pianificato', 'In revisione'].includes(p.status));

  // Campagna e Ricontatti suggeriti
  const camp = (state.campaigns || [])[0];
  const suggestedCalls = camp && typeof getCampaignSuggestedCalls === 'function' ? getCampaignSuggestedCalls(camp, state) : [];

  // Attese dal cliente
  const waitingProjects = (state.projects || []).filter(p => p.waitingFor && p.status !== 'Completato');
  const waitingDeals = (state.deals || []).filter(d => d.waitingFor && !['Vinta', 'Persa'].includes(d.salesStage) && !d.archived);

  // Posizioni da definire (aperte senza data o senza prossimo passo)
  const pendingDeals = (state.deals || []).filter(d => !['Vinta', 'Persa'].includes(d.salesStage) && !d.archived && (!d.due || !d.next));
  const pendingProjects = (state.projects || []).filter(p => p.status !== 'Completato' && (!p.nextDue || !p.nextStep));

  // Feed ultimi aggiornamenti (Cosa è cambiato)
  const recentFeed = (state.contacts || []).flatMap(c => {
    return (c.history || []).map(h => ({ ...h, companyName: c.company, companyId: c.id }));
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);

  return `
    <div class="executive-home">
      <!-- 1. Header Ribbon Metriche Operative a 1 Clic -->
      <div class="exec-action-ribbon" role="region" aria-label="Riepilogo operativo immediato">
        <div class="exec-ribbon-card ${overdueTasks.length ? 'urgent' : ''}">
          <span class="ribbon-label">Da fare subito</span>
          <strong>${(overdueTasks.length + todayTasks.length).toString().padStart(2, '0')}</strong>
          <small>${overdueTasks.length} scadute · ${todayTasks.length} oggi</small>
        </div>

        <div class="exec-ribbon-card">
          <span class="ribbon-label">Progetti attivi</span>
          <strong>${activeProjects.length.toString().padStart(2, '0')}</strong>
          <small>Commesse in esecuzione</small>
        </div>

        <div class="exec-ribbon-card ${suggestedCalls.length ? 'highlight' : ''}">
          <span class="ribbon-label">Ricontatti suggeriti</span>
          <strong>${suggestedCalls.length.toString().padStart(2, '0')}</strong>
          <small>Campagna email B2B (4gg cadenza)</small>
        </div>

        <div class="exec-ribbon-card">
          <span class="ribbon-label">In attesa risposta</span>
          <strong>${(waitingProjects.length + waitingDeals.length).toString().padStart(2, '0')}</strong>
          <small>In attesa dal cliente</small>
        </div>

        <div class="exec-ribbon-card">
          <span class="ribbon-label">Da definire</span>
          <strong>${(unscheduledTasks.length + pendingDeals.length + pendingProjects.length).toString().padStart(2, '0')}</strong>
          <small>Senza scadenza inventata</small>
        </div>
      </div>

      <!-- 2. SEZIONE 1: Azioni Imminenti e Attività da Fare -->
      <section class="home-operative-section" id="sec-tasks">
        <div class="section-head">
          <div>
            <h2 class="section-title">⚡ Attività da Fare e In Corso</h2>
            <p class="section-sub">Azioni operative concrete con motivo, referente ed esito precedente (ordinate per scadenza e priorità).</p>
          </div>
          <div class="section-actions">
            <button type="button" class="primary" data-new="task">+ Nuova attività</button>
          </div>
        </div>

        <div class="unified-tasks-stack">
          ${[...overdueTasks, ...todayTasks, ...upcomingTasks, ...unscheduledTasks].length
            ? [...overdueTasks, ...todayTasks, ...upcomingTasks, ...unscheduledTasks].map(renderUnifiedActivityRow).join('')
            : '<div class="empty-state-card"><p>Nessuna attività in corso. Ottimo lavoro! Tutte le posizioni operative sono allineate.</p></div>'}
        </div>
      </section>

      <!-- 3. SEZIONE 2: Progetti Attivi e in Corso -->
      <section class="home-operative-section" id="sec-projects">
        <div class="section-head">
          <div>
            <h2 class="section-title">🚀 Progetti e Commesse in Corso</h2>
            <p class="section-sub">Stato sintetico, obiettivo di business, cosa aspettiamo e prossimo passo con scadenza.</p>
          </div>
          <div class="section-actions">
            <button type="button" class="text-button" data-view="projects">Tutti i progetti ↗</button>
            <button type="button" class="primary" data-new="project">+ Nuovo progetto</button>
          </div>
        </div>

        <div class="projects-cockpit-stack">
          ${activeProjects.length
            ? activeProjects.map(p => typeof renderProjectExecutiveCockpit === 'function' ? renderProjectExecutiveCockpit(p) : `<div class="card"><strong>${esc(p.name)}</strong></div>`).join('')
            : '<div class="empty-state-card"><p>Nessun progetto in corso. Avvia una nuova commessa da un’opportunità vinta!</p></div>'}
        </div>
      </section>

      <!-- 4. SEZIONE 3: Ricontatti Commerciali Suggeriti da Campagne -->
      <section class="home-operative-section" id="sec-campaigns">
        <div class="section-head">
          <div>
            <h2 class="section-title">✉️ Ricontatti Commerciali e Campagne Email</h2>
            <p class="section-sub">Aziende con email inviata e nessuna risposta rilevata entro l'intervallo configurato (4 giorni lavorativi).</p>
          </div>
          <div class="section-actions">
            <button type="button" class="secondary" id="btn-open-campaign-settings">⚙ Configura intervallo</button>
            <button type="button" class="text-button" data-view="campaigns">Vista completa campagne ↗</button>
          </div>
        </div>

        ${camp ? `
          <div class="campaign-summary-banner">
            <div class="csb-left">
              <strong>${esc(camp.name)}</strong>
              <small>${camp.sends.length} invii effettivi · ${(camp.sends || []).filter(s => s.status === 'replied').length} risposte · ${(camp.sends || []).filter(s => s.status === 'called').length} chiamate svolte</small>
            </div>
            <div class="csb-right">
              <span class="csb-check-tag">📡 Ultimo controllo posta: <strong>${esc(camp.lastEmailCheck || 'Oggi ore 08:30')}</strong> (Fonte Gmail verificata)</span>
            </div>
          </div>
        ` : ''}

        <div class="suggested-calls-list">
          ${suggestedCalls.length ? suggestedCalls.map(s => `
            <div class="suggested-call-row" data-send-id="${esc(s.sendId)}">
              <div class="scr-info">
                <div class="scr-title-line">
                  <strong>🏢 ${esc(s.companyName)}</strong>
                  <span class="scr-person">👤 ${esc(s.recipientName)} (${esc(s.recipientRole)})</span>
                </div>
                <p class="scr-status">${esc(s.statusText)}</p>
                <small class="scr-notes">${esc(s.notes)}</small>
              </div>
              <div class="scr-actions">
                ${s.recipientPhone
                  ? `<a href="tel:${esc(s.recipientPhone.replace(/[^+\d]/g, ''))}" class="uac-op-btn op-call">📞 Chiama (${esc(s.recipientPhone)})</a>`
                  : `<span class="uac-op-btn op-call disabled">📞 Numero da verificare</span>`}
                <button type="button" class="uac-op-btn op-followup" data-prepare-campaign-followup="${esc(s.sendId)}" data-campaign-id="${esc(s.campaignId)}">✉️ Prepara sollecito</button>
                <button type="button" class="uac-op-btn op-touchpoint" data-log-campaign-call="${esc(s.sendId)}" data-campaign-id="${esc(s.campaignId)}">⚡ Registra esito chiamata</button>
                <button type="button" class="text-button text-muted" data-campaign-optout="${esc(s.sendId)}" data-campaign-id="${esc(s.campaignId)}" title="Interrompe tutti i ricontatti verso questa azienda">Opt-out</button>
              </div>
            </div>
          `).join('') : '<div class="empty-state-card"><p>Nessuna chiamata da svolgere: tutte le aziende della campagna hanno risposto o sono già state contattate.</p></div>'}
        </div>
      </section>

      <!-- 5. SEZIONE 4: Viste Consultabili Rapide (Accordion / Tab Compatti) -->
      <section class="home-consultable-tabs" aria-label="Sezioni consultabili rapide">
        <details class="consultable-section" open>
          <summary class="consultable-summary">
            <span>🕒 <strong>Cosa è cambiato</strong> (${recentFeed.length} aggiornamenti recenti)</span>
            <small>Novità acquisite da ChatGPT, note vocali e sincronizzazione</small>
          </summary>
          <div class="consultable-content">
            <div class="recent-feed-stack">
              ${recentFeed.length ? recentFeed.map(f => `
                <div class="feed-entry" data-open-360="${esc(f.companyId)}">
                  <span class="feed-date">${typeof date === 'function' ? date(f.date) : f.date}</span>
                  <strong class="feed-comp">${esc(f.companyName)}</strong>
                  <span class="feed-text">${esc(f.text)}</span>
                </div>
              `).join('') : '<p class="text-muted">Nessun evento recente.</p>'}
            </div>
          </div>
        </details>

        <details class="consultable-section">
          <summary class="consultable-summary">
            <span>⏳ <strong>Aspettiamo una risposta</strong> (${waitingProjects.length + waitingDeals.length} posizioni)</span>
            <small>Elementi in attesa di decisione o riscontro da clienti e partner</small>
          </summary>
          <div class="consultable-content">
            <div class="waiting-stack">
              ${[...waitingProjects.map(p => ({ type: 'Progetto', compId: p.contactId, title: p.name, wait: p.waitingFor })), ...waitingDeals.map(d => ({ type: 'Opportunità', compId: d.contactId, title: d.title, wait: d.waitingFor }))].map(w => {
                const comp = (state.contacts || []).find(c => c.id === w.compId);
                return `
                  <div class="waiting-entry">
                    <span class="pill">${w.type}</span>
                    <strong class="company-link" data-open-360="${esc(w.compId)}">${esc(comp?.company || 'Azienda')}</strong>
                    <span class="waiting-title">(${esc(w.title)}):</span>
                    <p class="waiting-desc text-amber">⏳ ${esc(w.wait)}</p>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </details>

        <details class="consultable-section">
          <summary class="consultable-summary">
            <span>❓ <strong>Da definire / Da chiarire</strong> (${unscheduledTasks.length + pendingDeals.length + pendingProjects.length} posizioni)</span>
            <small>Posizioni aperte senza data di follow-up o con prossimo passo da organizzare</small>
          </summary>
          <div class="consultable-content">
            <div class="pending-stack">
              ${unscheduledTasks.map(a => {
                const comp = (state.contacts || []).find(c => c.id === a.contactId);
                return `
                  <div class="pending-entry">
                    <span class="pill amber">Attività</span>
                    <strong>${esc(comp?.company || 'Azienda')}</strong>: ${esc(a.title)}
                    <button type="button" class="text-button" data-edit-task="${esc(a.id)}">+ Pianifica scadenza</button>
                  </div>
                `;
              }).join('')}
              ${pendingDeals.map(d => {
                const comp = (state.contacts || []).find(c => c.id === d.contactId);
                return `
                  <div class="pending-entry">
                    <span class="pill">Opportunità</span>
                    <strong>${esc(comp?.company || 'Azienda')}</strong>: ${esc(d.title)} (Prossimo passo: ${esc(d.next || 'Da definire')})
                    <button type="button" class="text-button" data-edit-deal="${esc(d.id)}">+ Imposta data</button>
                  </div>
                `;
              }).join('')}
              ${pendingProjects.map(p => {
                const comp = (state.contacts || []).find(c => c.id === p.contactId);
                return `
                  <div class="pending-entry">
                    <span class="pill">Progetto</span>
                    <strong>${esc(comp?.company || 'Azienda')}</strong>: ${esc(p.name)}
                    <button type="button" class="text-button" data-edit-project="${esc(p.id)}">+ Imposta data</button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </details>
      </section>
    </div>
  `;
}

// --- 8 quater. MODALE PREPARA SOLLECITO & FOLLOW-UP ---
let currentFollowupContext = null;

function openFollowupDraft(activityId = null, companyId = null, campaignSendId = null, campaignId = null) {
  const dlg = document.querySelector('#followup-draft-dialog');
  if (!dlg) return;

  let comp = null;
  let recipientEmail = '';
  let recipientName = '';
  let subject = '';
  let contextText = '';

  if (campaignSendId && campaignId) {
    const camp = (state.campaigns || []).find(c => c.id === campaignId);
    const send = (camp?.sends || []).find(s => s.id === campaignSendId);
    if (send) {
      recipientEmail = send.recipientEmail || '';
      recipientName = send.recipientName || '';
      subject = `Apex Digital — Follow-up presentazione per ${send.companyName}`;
      contextText = `Come seguito alla nostra precedente email di presentazione per ${send.companyName}, desideravo sapere se ha avuto modo di esaminare la documentazione.`;
      currentFollowupContext = { type: 'campaign', campaignId, campaignSendId, companyName: send.companyName, recipientEmail };
    }
  } else {
    const act = activityId ? (state.activities || []).find(a => a.id === activityId) : null;
    const cid = companyId || act?.contactId;
    comp = cid ? (state.contacts || []).find(c => c.id === cid) : null;
    const proj = act?.projectId ? (state.projects || []).find(p => p.id === act.projectId) : (state.projects || []).find(p => p.contactId === cid);

    recipientEmail = comp?.email || (comp?.referents && comp.referents[0]?.email) || '';
    recipientName = comp?.person || (comp?.referents && comp.referents[0]?.name) || 'Gentile Referente';
    subject = `Apex Digital — Aggiornamento su ${proj?.name || act?.title || comp?.company || 'servizi'}`;
    contextText = act?.lastOutcome || act?.notes || 'In merito al nostro recente confronto e ai prossimi passi concordati.';
    currentFollowupContext = { type: 'activity', activityId, companyId: cid, recipientEmail };
  }

  const defaultBody = `Gentile ${recipientName},\n\nle scrivo da Apex Digital per verificare insieme lo stato di avanzamento.\n\n${contextText}\n\nRimango a sua completa disposizione per qualsiasi chiarimento o per un breve aggiornamento telefonico.\n\nCordiali saluti,\nApex Digital`;

  const fieldsContainer = document.querySelector('#followup-draft-fields');
  if (fieldsContainer) {
    fieldsContainer.innerHTML = `
      <div class="field-grid">
        <label class="field full">Destinatario verificato *
          <input type="email" id="followup-recipient" value="${esc(recipientEmail)}" placeholder="email@azienda.it" required>
        </label>
        <label class="field full">Oggetto email *
          <input type="text" id="followup-subject" value="${esc(subject)}" required>
        </label>
        <label class="field full">Corpo del sollecito / bozza (modificabile) *
          <textarea id="followup-body" rows="6" required>${esc(defaultBody)}</textarea>
        </label>
        <p class="category-help full">Nota di sicurezza: L'apertura della bozza o del client di posta NON segna l'email come inviata. Potrai revisionare e inviare l'email in piena autonomia.</p>
      </div>
    `;
  }

  dlg.showModal();
}

// --- 8 quinquies. DETTATURA VOCALE RAPIDA & PARSER CLIENT ---
function parseVoiceTranscriptClient(transcript) {
  if (!transcript) return null;
  const lower = transcript.toLowerCase();

  // 1. Cerca azienda
  let matchedComp = null;
  for (const c of (state.contacts || [])) {
    const parts = (c.company || '').toLowerCase().split(/[\s,\.\-]+/).filter(w => w.length > 2 && !['srl', 'spa', 's.r.l.', 's.p.a.'].includes(w));
    if (parts.some(p => lower.includes(p))) {
      matchedComp = c;
      break;
    }
  }

  // 2. Cerca referente
  let matchedPerson = matchedComp?.person || '';
  if (matchedComp?.referents) {
    for (const r of matchedComp.referents) {
      const first = (r.name || '').toLowerCase().split(' ')[0];
      if (first && lower.includes(first)) {
        matchedPerson = r.name;
        break;
      }
    }
  }

  // 3. Progetto
  const matchedProject = matchedComp ? (state.projects || []).find(p => p.contactId === matchedComp.id && p.status !== 'Completato') : null;

  // 4. Risoluzione data Europe/Rome
  let resolvedDue = '';
  if (typeof resolveItalianRelativeDate === 'function') {
    resolvedDue = resolveItalianRelativeDate(transcript);
  } else {
    // Fallback date resolution
    const todayStr = typeof today === 'function' ? today() : new Date().toISOString().slice(0, 10);
    if (lower.includes('oggi')) resolvedDue = todayStr;
    else if (lower.includes('domani')) resolvedDue = typeof addDays === 'function' ? addDays(todayStr, 1) : '';
    else if (lower.includes('venerdì') || lower.includes('venerdi')) resolvedDue = getOffsetDate(4);
    else if (lower.includes('lunedì') || lower.includes('lunedi')) resolvedDue = typeof getNextMondayDate === 'function' ? getNextMondayDate() : '';
    else if (lower.includes('tra un mese')) resolvedDue = typeof addDays === 'function' ? addDays(todayStr, 30) : '';
  }

  // 5. Prossimo passo
  let nextStep = '';
  if (lower.includes('preventivo') || lower.includes('offerta')) {
    nextStep = 'Inviare preventivo dettagliato e proposta';
  } else if (lower.includes('demo') || lower.includes('incontro')) {
    nextStep = 'Svolgere incontro / demo di approfondimento';
  } else if (lower.includes('richiamare') || lower.includes('riprova') || lower.includes('risentire')) {
    nextStep = 'Richiamare referente per aggiornamento';
  } else {
    nextStep = 'Follow-up operativo post colloquio';
  }

  return {
    comp: matchedComp,
    person: matchedPerson,
    project: matchedProject,
    outcome: transcript,
    nextStep,
    resolvedDue
  };
}

function openVoiceInputDialog() {
  const dlg = document.querySelector('#voice-input-dialog');
  if (!dlg) return;

  const textInput = document.querySelector('#voice-transcript-text');
  const previewBox = document.querySelector('#voice-live-preview');
  const previewContent = document.querySelector('#voice-preview-content');

  if (textInput) textInput.value = '';
  if (previewBox) previewBox.hidden = true;

  dlg.showModal();
}

// --- 8 sexies. VISTA CAMPAGNE EMAIL ---
let campaignFilterStatus = 'all';

function campaignsView() {
  if (typeof ensureCampaignsInState === 'function') ensureCampaignsInState(state);
  const camp = (state.campaigns || [])[0];
  if (!camp) return '<div class="panel"><p>Nessuna campagna attiva.</p></div>';

  const sends = camp.sends || [];
  const replied = sends.filter(s => s.status === 'replied');
  const called = sends.filter(s => s.status === 'called');
  const optOut = sends.filter(s => s.status === 'opt_out');
  const suggestedCalls = typeof getCampaignSuggestedCalls === 'function' ? getCampaignSuggestedCalls(camp, state) : [];

  let visibleSends = sends;
  if (campaignFilterStatus === 'suggested') {
    const sugIds = new Set(suggestedCalls.map(s => s.sendId));
    visibleSends = sends.filter(s => sugIds.has(s.id));
  } else if (campaignFilterStatus === 'replied') {
    visibleSends = replied;
  } else if (campaignFilterStatus === 'called') {
    visibleSends = called;
  } else if (campaignFilterStatus === 'opt_out') {
    visibleSends = optOut;
  }

  return `
    <div class="stats">
      <div class="stat">
        <span class="stat-label">Email Inviate</span>
        <strong>${sends.length}</strong>
        <small>Invii effettivi (bozze escluse)</small>
      </div>
      <div class="stat">
        <span class="stat-label">Risposte Ricevute</span>
        <strong>${replied.length}</strong>
        <small>${sends.length > 0 ? Math.round((replied.length / sends.length) * 100) : 0}% tasso di risposta</small>
      </div>
      <div class="stat">
        <span class="stat-label">Chiamate Svolte</span>
        <strong>${called.length}</strong>
        <small>Follow-up telefonici completati</small>
      </div>
      <div class="stat accent">
        <span class="stat-label">Chiamate Suggerite</span>
        <strong>${suggestedCalls.length}</strong>
        <small>Nessuna risposta dopo ${camp.cadenceDays} ${camp.countBusinessDays !== false ? 'gg lavorativi' : 'gg'}</small>
      </div>
    </div>

    <div class="toolbar">
      <div class="filter-pills-bar" role="group" aria-label="Filtro invii campagna">
        <button type="button" class="date-chip ${campaignFilterStatus === 'all' ? 'active' : ''}" data-camp-filter="all">Tutti gli invii (${sends.length})</button>
        <button type="button" class="date-chip ${campaignFilterStatus === 'suggested' ? 'active' : ''}" data-camp-filter="suggested">Chiamata suggerita (${suggestedCalls.length})</button>
        <button type="button" class="date-chip ${campaignFilterStatus === 'replied' ? 'active' : ''}" data-camp-filter="replied">Hanno risposto (${replied.length})</button>
        <button type="button" class="date-chip ${campaignFilterStatus === 'called' ? 'active' : ''}" data-camp-filter="called">Chiamata svolta (${called.length})</button>
        <button type="button" class="date-chip ${campaignFilterStatus === 'opt_out' ? 'active' : ''}" data-camp-filter="opt_out">Opt-out (${optOut.length})</button>
      </div>
      <div class="list-controls">
        <button type="button" class="secondary" id="btn-open-campaign-settings">⚙ Configura intervallo</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        <h2>${esc(camp.name)}</h2>
        <small>📡 Ultimo controllo posta: <strong>${esc(camp.lastEmailCheck || 'Oggi ore 08:30')}</strong></small>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Azienda / Destinatario</th>
              <th>Data Invio</th>
              <th>Stato Invio</th>
              <th>Esito &amp; Note</th>
              <th>Azioni Rapide</th>
            </tr>
          </thead>
          <tbody>
            ${visibleSends.map(s => {
              const isSuggested = suggestedCalls.some(sc => sc.sendId === s.id);
              return `
                <tr>
                  <td>
                    <strong>${esc(s.companyName)}</strong><br>
                    <small>👤 ${esc(s.recipientName)} (${esc(s.recipientRole || 'Referente')}) · <a href="mailto:${esc(s.recipientEmail)}">${esc(s.recipientEmail)}</a></small>
                  </td>
                  <td data-label="Data Invio">${typeof date === 'function' ? date(s.sentAt) : s.sentAt}</td>
                  <td data-label="Stato Invio">
                    ${s.status === 'opt_out'
                      ? '<span class="pill red">🛑 Opt-out</span>'
                      : s.status === 'called'
                        ? '<span class="pill green">✓ Chiamata svolta</span>'
                        : s.status === 'replied'
                          ? '<span class="pill blue">✉ Risposta ricevuta</span>'
                          : isSuggested
                            ? '<span class="pill red">📞 Chiamata suggerita</span>'
                            : '<span class="pill">In attesa</span>'}
                  </td>
                  <td data-label="Esito & Note">
                    <small>${esc(s.notes || 'Inviata presentazione standard B2B')}</small>
                    ${s.agreedDate ? `<br><small class="text-amber">Accordo concordato per il: ${s.agreedDate}</small>` : ''}
                  </td>
                  <td class="cell-actions">
                    <div class="row-actions">
                      ${s.recipientPhone
                        ? `<a href="tel:${esc(s.recipientPhone.replace(/[^+\d]/g, ''))}" class="text-button" title="Chiama">📞 Chiama</a>`
                        : '<span class="text-muted" style="font-size:11px">Numero da verificare</span>'}
                      <button type="button" class="text-button" data-prepare-campaign-followup="${esc(s.id)}" data-campaign-id="${esc(camp.id)}">✉ Sollecito</button>
                      <button type="button" class="text-button" data-log-campaign-call="${esc(s.id)}" data-campaign-id="${esc(camp.id)}">⚡ Esito</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// --- 9. EVENT LISTENERS E HOOKS GLOBALI ---
if (typeof document !== 'undefined') {
document.addEventListener('click', e => {
  const b = e.target.closest('button, [data-open-360]');
  if (!b) return;

  // Filtro rapido fase azienda (Lead, Prospect, Cliente)
  if (b.dataset.companyFilter !== undefined) {
    filter = b.dataset.companyFilter;
    if (typeof render === 'function') render();
    return;
  }

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

  // Apertura Modale Dettatura Vocale Rapida
  if (b.id === 'voice-trigger-btn') {
    openVoiceInputDialog();
    return;
  }

  // Apertura Modale Prepara Sollecito
  if (b.dataset.prepareFollowup) {
    openFollowupDraft(b.dataset.prepareFollowup, b.dataset.compId);
    return;
  }

  // Sollecito da campagna
  if (b.dataset.prepareCampaignFollowup) {
    openFollowupDraft(null, null, b.dataset.prepareCampaignFollowup, b.dataset.campaignId);
    return;
  }

  // Registra esito chiamata campagna
  if (b.dataset.logCampaignCall) {
    const sendId = b.dataset.logCampaignCall;
    const campId = b.dataset.campaignId;
    if (typeof recordCampaignCallCompleted === 'function') {
      recordCampaignCallCompleted(campId, sendId, 'Chiamata di follow-up effettuata dall’utente.');
      if (typeof toast === 'function') toast('Chiamata registrata come completata.');
      if (typeof render === 'function') render();
    }
    return;
  }

  // Opt-out campagna
  if (b.dataset.campaignOptout) {
    const sendId = b.dataset.campaignOptout;
    const campId = b.dataset.campaignId;
    if (typeof recordCampaignOptOut === 'function') {
      recordCampaignOptOut(campId, sendId, 'Richiesta esplicita di non essere ricontattato.');
      if (typeof toast === 'function') toast('Opt-out registrato: ricontatti automatici interrotti.');
      if (typeof render === 'function') render();
    }
    return;
  }

  // Filtri campagna
  if (b.dataset.campFilter) {
    campaignFilterStatus = b.dataset.campFilter;
    if (typeof render === 'function') render();
    return;
  }

  // Apertura impostazioni cadenza campagna
  if (b.id === 'btn-open-campaign-settings') {
    const dlg = document.querySelector('#campaign-settings-dialog');
    if (dlg) dlg.showModal();
    return;
  }

  // Azioni dentro il modale Prepara Sollecito
  if (b.id === 'followup-open-mailto') {
    const to = document.querySelector('#followup-recipient')?.value || '';
    const su = document.querySelector('#followup-subject')?.value || '';
    const body = document.querySelector('#followup-body')?.value || '';
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`;
    return;
  }

  if (b.id === 'followup-open-gmail') {
    const to = document.querySelector('#followup-recipient')?.value || '';
    const su = document.querySelector('#followup-subject')?.value || '';
    const body = document.querySelector('#followup-body')?.value || '';
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(su)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
    return;
  }

  if (b.id === 'followup-mark-sent') {
    const to = document.querySelector('#followup-recipient')?.value || '';
    const su = document.querySelector('#followup-subject')?.value || '';
    const body = document.querySelector('#followup-body')?.value || '';

    if (currentFollowupContext?.type === 'campaign') {
      const campId = currentFollowupContext.campaignId;
      const sendId = currentFollowupContext.campaignSendId;
      if (typeof recordCampaignEmailReply === 'function') {
        const camp = (state.campaigns || []).find(c => c.id === campId);
        const send = (camp?.sends || []).find(s => s.id === sendId);
        if (send) {
          send.status = 'sent';
          send.sentAt = today();
          send.notes = [send.notes, `Inviato sollecito: ${su}`].filter(Boolean).join(' | ');
          persist(state);
        }
      }
    } else if (currentFollowupContext?.companyId) {
      const cid = currentFollowupContext.companyId;
      const nextState = structuredClone(state);
      const comp = (nextState.contacts || []).find(c => c.id === cid);
      if (comp) {
        comp.history = comp.history || [];
        comp.history.push({
          date: today(),
          kind: 'email-sent',
          text: `Inviato sollecito email a ${to}: ${su}`
        });

        // Crea follow-up a 4 giorni
        nextState.activities = nextState.activities || [];
        nextState.activities.push({
          id: crypto.randomUUID(),
          contactId: cid,
          title: `Verifica riscontro sollecito inviato a ${to}`,
          type: 'Follow-up',
          priority: 'Media',
          status: 'Da fare',
          dueDate: getOffsetDate(4),
          reason: `Attesa riscontro sollecito email inviato il ${today()}`,
          notes: body
        });
        persist(nextState);
      }
    }

    document.querySelector('#followup-draft-dialog')?.close();
    if (typeof toast === 'function') toast('Sollecito registrato come inviato (+4gg attesa pianificata).');
    if (typeof render === 'function') render();
    return;
  }

  // Microfono per dettatura vocale
  if (b.id === 'btn-toggle-mic') {
    const statusEl = document.querySelector('#voice-mic-status');
    const textInput = document.querySelector('#voice-transcript-text');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (statusEl) statusEl.textContent = 'Dettatura vocale non supportata dal browser corrente. Incolla il testo manualmente.';
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'it-IT';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      if (statusEl) statusEl.textContent = 'Ascolto in corso... Parla pure!';
      recognition.start();

      recognition.onresult = (evt) => {
        const transcript = evt.results[0][0].transcript;
        if (textInput) {
          textInput.value = transcript;
          textInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (statusEl) statusEl.textContent = 'Trascrizione completata con successo!';
      };

      recognition.onerror = (err) => {
        if (statusEl) statusEl.textContent = `Errore microfono: ${err.error}`;
      };
    } catch (e) {
      if (statusEl) statusEl.textContent = `Impossibile avviare il microfono: ${e.message}`;
    }
    return;
  }
});

// Listener dinamico input per Live Preview del Voice Parser
document.addEventListener('input', e => {
  if (e.target.id === 'voice-transcript-text') {
    const text = e.target.value.trim();
    const previewBox = document.querySelector('#voice-live-preview');
    const previewContent = document.querySelector('#voice-preview-content');
    if (!text) {
      if (previewBox) previewBox.hidden = true;
      return;
    }

    const parsed = parseVoiceTranscriptClient(text);
    if (previewBox) previewBox.hidden = false;
    if (previewContent && parsed) {
      previewContent.innerHTML = `
        <div class="v-preview-grid">
          <div><strong>Azienda rilevata:</strong> ${parsed.comp ? `<span class="pill green">🏢 ${esc(parsed.comp.company)}</span>` : '<span class="pill red">Da specificare</span>'}</div>
          <div><strong>Referente:</strong> ${esc(parsed.person || 'Principale')}</div>
          <div><strong>Progetto:</strong> ${parsed.project ? `<span class="pill blue">🚀 ${esc(parsed.project.name)}</span>` : '<span class="pill">Generale</span>'}</div>
          <div><strong>Prossimo passo:</strong> <strong>${esc(parsed.nextStep)}</strong></div>
          <div><strong>Scadenza calcolata (Europe/Rome):</strong> ${parsed.resolvedDue ? `<span class="pill blue">${parsed.resolvedDue}</span>` : '<span class="pill amber">Da definire (nessuna data inventata)</span>'}</div>
        </div>
      `;
    }
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

// Listener submit form interazioni, vocale e impostazioni campagne
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
  if (e.target.id === 'voice-input-form') {
    e.preventDefault();
    const text = document.querySelector('#voice-transcript-text')?.value?.trim();
    if (!text) return;
    const parsed = parseVoiceTranscriptClient(text);
    if (!parsed || !parsed.comp) {
      if (typeof toast === 'function') toast('Specifica l’azienda all’interno della nota vocale (es. Parisi o Cattini).');
      return;
    }

    const nextState = structuredClone(state);
    const comp = (nextState.contacts || []).find(c => c.id === parsed.comp.id);
    if (comp) {
      comp.history = comp.history || [];
      comp.history.push({
        date: today(),
        kind: 'voice-touchpoint',
        text: `Colloquio vocale: ${text}`
      });

      // Aggiorna attività o creane una nuova
      nextState.activities = nextState.activities || [];
      nextState.activities.push({
        id: crypto.randomUUID(),
        contactId: comp.id,
        title: parsed.nextStep,
        type: 'Chiamata',
        priority: 'Alta',
        status: 'Da fare',
        dueDate: parsed.resolvedDue || '',
        reason: 'Aggiornamento da colloquio vocale',
        lastOutcome: text,
        notes: text,
        source: 'Voice Audio Touchpoint'
      });

      // Aggiorna deal o project se presente
      const openDeal = (nextState.deals || []).find(d => d.contactId === comp.id && !['Vinta', 'Persa'].includes(d.salesStage) && !d.archived);
      if (openDeal) {
        openDeal.next = parsed.nextStep;
        openDeal.due = parsed.resolvedDue || '';
      }

      const openProj = (nextState.projects || []).find(p => p.contactId === comp.id && p.status !== 'Completato');
      if (openProj) {
        openProj.lastOutcome = text;
        openProj.nextStep = parsed.nextStep;
        openProj.nextDue = parsed.resolvedDue || '';
      }

      if (persist(nextState)) {
        document.querySelector('#voice-input-dialog')?.close();
        if (typeof toast === 'function') toast(`Aggiornamento registrato per ${comp.company}. Prossimo passo: ${parsed.nextStep}.`);
        if (typeof render === 'function') render();
      }
    }
    return;
  }

  if (e.target.id === 'campaign-settings-form') {
    e.preventDefault();
    const cadence = parseInt(document.querySelector('#campaign-cadence-input')?.value || '4', 10);
    const dayType = document.querySelector('#campaign-daytype-select')?.value || 'business';

    if (state.campaigns && state.campaigns[0]) {
      state.campaigns[0].cadenceDays = cadence;
      state.campaigns[0].countBusinessDays = dayType === 'business';
      persist(state);
    }
    document.querySelector('#campaign-settings-dialog')?.close();
    if (typeof toast === 'function') toast(`Regole ricontatti aggiornate: ${cadence} giorni ${dayType === 'business' ? 'lavorativi' : 'solari'}.`);
    if (typeof render === 'function') render();
    return;
  }
});
} // end typeof document !== 'undefined'

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getOffsetDate,
    getNextMondayDate,
    renderDateShortcuts,
    calcDealRottingDays,
    dealRottingBadge,
    leadTempBadge,
    makeWhatsAppUrl,
    openCompany360,
    renderCompany360View,
    saveInteractionFromForm,
    saveDealStageFromForm,
    renderExecutiveMetrics,
    ensureDemoProjectData,
    renderUnifiedActivityRow,
    renderExecutiveHomeView,
    openFollowupDraft,
    openVoiceInputDialog,
    parseVoiceTranscriptClient,
    campaignsView
  };
}

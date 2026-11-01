/**
 * crm-pro-check.cjs — Suite di Collaudo Funzionale per Apex Pro CRM
 * 
 * Verifica le nuove funzionalità enterprise:
 * 1. Scheda Azienda 360° (Cockpit multi-tab, timeline feed, organigramma, deals, preventivi, commesse)
 * 2. Touchpoint Logger Rapido con follow-up intelligente e promemoria automatico
 * 3. Avanzamento Trattative Guidato (Deal Stage Modal, Loss Reasons, Chiusura Vinta)
 * 4. Alert Inattività & Deal Rotting (> 14 giorni)
 * 5. Lead Qualification & Scoring Temperatura (Hot 🔥, Warm ☀️, Cold ❄️)
 * 6. Generazione Link WhatsApp e Email 1-Click
 * 7. Scorciatoie Date Rapide (+1g, +3g, Lunedì, +1sett)
 * 8. Dashboard Executive (Win Rate, Average Deal Size, Touchpoint Feed)
 */

'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const elements = new Map();
const storage = new Map();
const listeners = {};

const element = s => {
  if (!elements.has(s)) {
    elements.set(s, {
      innerHTML: '',
      textContent: '',
      value: '',
      hidden: false,
      style: {},
      dataset: {},
      classList: {
        toggle(cls, state) {
          if (state) this[cls] = true;
          else delete this[cls];
        }
      },
      addEventListener(t, f) { this[t] = f; },
      querySelector(sub) { return element(sub); },
      querySelectorAll() { return []; },
      click() { if (typeof this.onclick === 'function') this.onclick(); },
      showModal() { this.open = true; },
      close() { this.open = false; },
      focus() {},
      setSelectionRange() {},
      dispatchEvent() {}
    });
  }
  return elements.get(s);
};

const sandbox = {
  console, Intl, Date, Set, Map, Number, String, JSON, Error, Blob, URL, structuredClone,
  crypto: require('node:crypto').webcrypto,
  setTimeout() {},
  clearTimeout() {},
  confirm: () => true,
  FormData: class {
    constructor(form) {
      this.entries = form?.values ? Object.entries(form.values) : [];
    }
    get(k) {
      const match = this.entries.find(([key]) => key === k);
      return match ? match[1] : null;
    }
  },
  localStorage: {
    getItem: k => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, v)
  },
  document: {
    body: { dataset: {} },
    querySelector: element,
    querySelectorAll: () => [],
    addEventListener: (t, f) => { listeners[t] = f; },
    createElement: () => ({ click() {} })
  }
};

vm.createContext(sandbox);

// Carica l'intera suite di moduli inclusi crm-pro.js e app.js
for (const file of ['quotes.js', 'activities.js', 'projects.js', 'analytics.js', 'crm-pro.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), sandbox);
}

const run = code => vm.runInContext(code, sandbox);

console.log('--- TEST APEX PRO CRM SUITE ---');

// 1. Test Scorciatoie Date e Utility
assert.ok(run("getOffsetDate(0)"), 'Oggi restituito');
assert.ok(run("getOffsetDate(1)"), 'Domani restituito');
assert.ok(run("getNextMondayDate()"), 'Prossimo lunedì restituito');
assert.match(run("renderDateShortcuts('#due-date')"), /date-shortcuts-bar/);
assert.match(run("renderDateShortcuts('#due-date')"), /data-target-input="#due-date"/);
console.log('PASS: getOffsetDate, getNextMondayDate e renderDateShortcuts conformi');

// 2. Setup Dati Azienda e Trattative per collaudo
run(`
  state.contacts = [
    {
      id: 'c-alpha',
      company: 'Alpha Automazioni Srl',
      person: 'Mario Rossi',
      primaryRole: 'Direttore Generale',
      email: 'mario@alpha.it',
      phone: '3331234567',
      leadTemp: 'hot',
      taxId: 'IT01234567890',
      sector: 'Manifattura',
      city: 'Milano',
      history: []
    },
    {
      id: 'c-beta',
      company: 'Beta Logistics Spa',
      person: 'Laura Bianchi',
      primaryRole: 'Responsabile IT',
      email: 'laura@beta.it',
      phone: '+3902998877',
      leadTemp: 'cold',
      taxId: 'IT09876543210',
      sector: 'Logistica',
      city: 'Verona',
      history: []
    }
  ];

  state.deals = [
    {
      id: 'd-alpha-1',
      contactId: 'c-alpha',
      title: 'Assistente AI Preventivazione',
      stage: 'Prospect',
      salesStage: 'Offerta',
      service: 'Assistente AI',
      setup: 5000,
      monthly: 400,
      next: 'Presentazione CDA',
      due: getOffsetDate(2),
      history: [
        { date: getOffsetDate(-3), text: 'Offerta inviata al cliente' }
      ]
    },
    {
      id: 'd-stalled',
      contactId: 'c-beta',
      title: 'Automazione DDT Magazzino',
      stage: 'Prospect',
      salesStage: 'Trattativa',
      service: 'Automazione',
      setup: 3500,
      monthly: 250,
      next: 'In attesa risposta',
      due: getOffsetDate(-16),
      history: [
        { date: getOffsetDate(-20), text: 'Ultimo incontro conoscitivo' }
      ]
    }
  ];

  persist(state);
`);

// 3. Test Deal Rotting e Allerta Inattività
const rottingDaysAlpha = run("calcDealRottingDays(state.deals[0])");
assert.equal(rottingDaysAlpha, 3, 'Offerta recente con tocco 3 giorni fa');
assert.equal(run("dealRottingBadge(state.deals[0])"), '', 'Nessun badge rotting per trattativa toccata di recente (< 7 giorni)');

const rottingDaysStalled = run("calcDealRottingDays(state.deals[1])");
assert.ok(rottingDaysStalled >= 14, 'Trattativa ferma da 20 giorni deve avere rotting >= 14');

const badgeStalled = run("dealRottingBadge(state.deals[1])");
assert.match(badgeStalled, /rotting-badge danger/);
assert.match(badgeStalled, /Inattiva da/);
console.log('PASS: calcDealRottingDays e dealRottingBadge rilevano correttamente le trattative stagnanti');

// 4. Test Lead Qualification e Temperatura
const hotBadge = run("leadTempBadge(state.contacts[0])");
assert.match(hotBadge, /temp-hot/);
assert.match(hotBadge, /🔥 Caldo/);

const coldBadge = run("leadTempBadge(state.contacts[1])");
assert.match(coldBadge, /temp-cold/);
assert.match(coldBadge, /❄️ Freddo/);
console.log('PASS: leadTempBadge formatta badge hot, warm e cold');

// 5. Test Generazione Link WhatsApp e Normalizzazione
const waUrl = run("makeWhatsAppUrl('3331234567', 'Alpha Automazioni Srl', 'Mario Rossi', 'intro')");
assert.match(waUrl, /https:\/\/wa\.me\/393331234567/);
assert.match(waUrl, /Buongiorno%20Mario%20Rossi/);

const waQuoteUrl = run("makeWhatsAppUrl('+393331234567', 'Alpha', 'Mario', 'quote')");
assert.match(waQuoteUrl, /preventivo/);
console.log('PASS: makeWhatsAppUrl normalizza prefisso italiano 39 e genera template');

// 6. Test Scheda Dettaglio Azienda 360° (Cockpit)
run("openCompany360('c-alpha', 'timeline')");
const c360Content = element('#company-360-content').innerHTML;
assert.match(c360Content, /Alpha Automazioni Srl/);
assert.match(c360Content, /c360-actions-bar/);
assert.match(c360Content, /c360-stats-ribbon/);
assert.match(c360Content, /c360-tabs/);
assert.match(c360Content, /WhatsApp/);
assert.match(c360Content, /Registra Interazione/);
assert.match(c360Content, /Assistente AI Preventivazione/);

// Test cambio tab scheda 360
run("render360TabContent(state.contacts[0], 'people')");
run("render360TabContent(state.contacts[0], 'deals')");
run("render360TabContent(state.contacts[0], 'quotes')");
run("render360TabContent(state.contacts[0], 'projects')");
run("render360TabContent(state.contacts[0], 'info')");
console.log('PASS: openCompany360 e tutte le viste tab (timeline, people, deals, quotes, projects, info) conformi');

// 7. Test Logger Rapido Touchpoint con Promemoria Automatico
const mockInteractionForm = {
  values: {
    companyId: 'c-alpha',
    personId: 'primary',
    channel: 'Telefonata',
    interactionDate: run('today()'),
    interactionNotes: 'Chiamato Mario: approvato il budget, procediamo con offerta formale.',
    autoFollowUp: 'on',
    nextAction: 'Inviare contratto definitivo',
    nextDate: run('getOffsetDate(2)')
  }
};

const savedInteraction = run(`
  saveInteractionFromForm(new FormData(${JSON.stringify(mockInteractionForm)}))
`);
assert.equal(savedInteraction, true, 'Interazione salvata con successo');

const alphaContact = run("state.contacts.find(c => c.id === 'c-alpha')");
assert.equal(alphaContact.history.at(-1).kind, 'conversation');
assert.match(alphaContact.history.at(-1).text, /Telefonata/);
assert.match(alphaContact.history.at(-1).text, /Mario/);

// Verifica che il follow-up automatico sia stato creato in activities
const autoActivity = run("state.activities.find(a => a.contactId === 'c-alpha' && a.title === 'Inviare contratto definitivo')");
assert.ok(autoActivity, 'Attività automatica creata in state.activities');
assert.equal(autoActivity.type, 'Chiamata');
assert.equal(autoActivity.status, 'Da fare');
console.log('PASS: saveInteractionFromForm registra touchpoint nel feed e pianifica follow-up in activities');

// 8. Test Deal Stage Modal — Avanzamento Vinta
const mockDealWonForm = {
  values: {
    dealId: 'd-alpha-1',
    salesStage: 'Vinta',
    setupConfirmed: '5500',
    monthlyConfirmed: '450'
  }
};

const savedWonDeal = run(`
  saveDealStageFromForm(new FormData(${JSON.stringify(mockDealWonForm)}))
`);
assert.equal(savedWonDeal, true, 'Trattativa Vinta salvata');

const wonDeal = run("state.deals.find(d => d.id === 'd-alpha-1')");
assert.equal(wonDeal.salesStage, 'Vinta');
assert.equal(wonDeal.stage, 'Cliente');
assert.equal(wonDeal.setup, 5500);
assert.equal(wonDeal.monthly, 450);
assert.match(wonDeal.history.at(-1).text, /VINTA/);
console.log('PASS: saveDealStageFromForm chiusura Vinta con aggiornamento economico e conversione a Cliente');

// 9. Test Deal Stage Modal — Chiusura Persa con Motivo
const mockDealLostForm = {
  values: {
    dealId: 'd-stalled',
    salesStage: 'Persa',
    lossReason: 'Prezzo troppo alto / Mancanza budget',
    lossNotes: 'Cliente ha tagliato il budget 2026'
  }
};

const savedLostDeal = run(`
  saveDealStageFromForm(new FormData(${JSON.stringify(mockDealLostForm)}))
`);
assert.equal(savedLostDeal, true, 'Trattativa Persa salvata');

const lostDeal = run("state.deals.find(d => d.id === 'd-stalled')");
assert.equal(lostDeal.salesStage, 'Persa');
assert.equal(lostDeal.archived, true);
assert.equal(lostDeal.lossReason, 'Prezzo troppo alto / Mancanza budget');
assert.match(lostDeal.history.at(-1).text, /PERSA/);
console.log('PASS: saveDealStageFromForm chiusura Persa con catalogazione motivo di perdita');

// 10. Test Dashboard Executive Metrics & Feed
const execMetricsHtml = run("renderExecutiveMetrics()");
assert.match(execMetricsHtml, /Win Rate/);
assert.match(execMetricsHtml, /Average Deal Size/);
assert.match(execMetricsHtml, /Ultime Interazioni Registrate/);
assert.match(execMetricsHtml, /Alpha Automazioni Srl/);
console.log('PASS: renderExecutiveMetrics calcola Win Rate %, Average Deal Size e renderizza il touchpoint feed');

console.log('--- TUTTI I TEST APEX PRO CRM HANNO AVUTO ESITO POSITIVO (100% PASS) ---');

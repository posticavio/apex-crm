const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const elements = new Map();
const storage = new Map();
const downloads = [];

const makeClassList = () => {
  const set = new Set();
  return {
    add: (...cls) => cls.forEach(c => set.add(c)),
    remove: (...cls) => cls.forEach(c => set.delete(c)),
    toggle: (c, force) => {
      if (force === undefined) {
        if (set.has(c)) { set.delete(c); return false; }
        set.add(c); return true;
      }
      if (force) set.add(c); else set.delete(c);
      return Boolean(force);
    },
    contains: c => set.has(c)
  };
};

const element = s => {
  if (!elements.has(s)) {
    elements.set(s, {
      innerHTML: '',
      textContent: '',
      value: '',
      checked: false,
      hidden: false,
      open: false,
      dataset: {},
      style: {},
      classList: makeClassList(),
      attributes: new Map(),
      setAttribute(k, v) { this.attributes.set(k, String(v)); },
      getAttribute(k) { return this.attributes.get(k) || null; },
      addEventListener(t, f) { this['on' + t] = f; },
      click() { if (typeof this.onclick === 'function') this.onclick({ stopPropagation() {} }); },
      showModal() { this.open = true; },
      close() { this.open = false; },
      reset() { this.value = ''; }
    });
  }
  return elements.get(s);
};

// Pre-create mobile bottom nav & subnav items to test syncMobileShell
const bottomNavButtons = ['today', 'activities', 'contacts', 'pipeline', 'quotes'].map(v => {
  const b = element(`bottom-nav-${v}`);
  b.dataset.view = v;
  return b;
});
const subnavButtons = ['contacts', 'leads', 'prospects', 'clients', 'categories'].map(v => {
  const b = element(`subnav-${v}`);
  b.dataset.view = v;
  return b;
});
const themeButtons = ['light', 'dark', 'amoled'].map(t => {
  const b = element(`theme-btn-${t}`);
  b.dataset.themeChoice = t;
  return b;
});

const docElement = { dataset: {}, style: {}, classList: makeClassList() };
const docBody = { dataset: {}, style: {}, classList: makeClassList(), append() {} };

const sandbox = {
  console,
  Intl,
  Date,
  Set,
  Map,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Math,
  RegExp,
  JSON,
  Error,
  Blob,
  URL: {
    createObjectURL: blob => {
      downloads.push(blob);
      return 'blob:mock';
    },
    revokeObjectURL() {}
  },
  structuredClone,
  crypto: require('node:crypto').webcrypto,
  navigator: { vibrate() {} },
  setTimeout() {},
  clearTimeout() {},
  confirm: () => true,
  FormData: class {
    constructor(form) {
      return Object.entries(form.values || {});
    }
  },
  localStorage: {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v))
  },
  document: {
    documentElement: docElement,
    body: docBody,
    querySelector: element,
    querySelectorAll: sel => {
      if (sel === '#mobile-bottom-nav [data-view]') return bottomNavButtons;
      if (sel === '#mobile-subnav [data-view]') return subnavButtons;
      if (sel === '[data-theme-choice]') return themeButtons;
      return [];
    },
    addEventListener() {},
    createElement: tag => {
      const el = element(`created-${tag}-${ downloads.length }`);
      el.remove = () => {};
      return el;
    }
  }
};

vm.createContext(sandbox);
for (const file of ['quotes.js', 'activities.js', 'app.js', 'company-import.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), sandbox, { filename: file });
}
const run = code => vm.runInContext(code, sandbox);

// 1. Verifica formattazione valuta italiana obbligatoria con separatore migliaia (es. 1.200 € e 1.850,00 €)
assert.match(run("money(1200)"), /1\.200\s*€/, 'money(1200) deve includere il punto delle migliaia');
assert.match(run("quoteMoney(185000)"), /1\.850,00\s*€/, 'quoteMoney(185000) deve includere il punto delle migliaia e i decimali');

// 2. Setup archivio di test con Lead, Prospect e Cliente
run(`
  state.contacts = [
    { id: 'c-lead', company: 'Officina Alfa Srl', category: 'Meccanica', city: 'Treviso', people: [{ name: 'Mario Rossi', role: 'Titolare', phone: '0422111', email: 'm.rossi@alfa.it' }], history: [] },
    { id: 'c-pros', company: 'Beta Automazioni Spa', category: 'Automazione', city: 'Padova', people: [{ name: 'Laura Bianchi', role: 'Buyer', phone: '049222', email: 'l.bianchi@beta.it' }], history: [] },
    { id: 'c-cli',  company: 'Gamma Logistica Srl', category: 'Logistica', city: 'Venezia', people: [], history: [] }
  ];
  state.deals = [
    { id: 'd-lead', contactId: 'c-lead', title: 'Sito vetrina + CRM', stage: 'Lead', salesStage: 'Qualifica', setup: 1500, monthly: 100, next: 'Qualifica', due: '2026-10-20', history: [] },
    { id: 'd-pros', contactId: 'c-pros', title: 'Agente AI Customer Care', stage: 'Prospect', salesStage: 'Offerta', setup: 4500, monthly: 350, next: 'Follow-up offerta', due: '2026-10-25', history: [] },
    { id: 'd-cli',  contactId: 'c-cli',  title: 'Automazione ERP', stage: 'Cliente', salesStage: 'Chiuso vinto', setup: 6000, monthly: 500, next: 'Check mensile', due: '2026-10-30', history: [] }
  ];
  state.quotes = [];
  state.activities = [];
  persist(state);
  render();
`);

// 3. Creazione attività per Lead, Prospect e Cliente + Follow-up automatico
run("openTaskEditor({ stage: 'Lead', contactId: 'c-lead', dealId: 'd-lead' })");
assert.equal(element('#task-modal-title').textContent, 'Nuova attività');

const leadTaskSaved = run(`saveTask({ values: {
  title: 'Qualifica telefonica iniziale Lead',
  stage: 'Lead',
  type: 'Chiamata',
  status: 'Da fare',
  priority: 'Alta',
  dueDate: '2026-10-21',
  dueTime: '10:30',
  contactId: 'c-lead',
  personName: 'Mario Rossi',
  dealId: 'd-lead',
  quoteId: '',
  outcome: '',
  notes: 'Verificare budget e decisore',
  createFollowup: 'on',
  followupTitle: 'Invio presentazione sintetica post-call',
  followupDays: '3',
  followupType: 'Email'
}})`);
assert.equal(leadTaskSaved, true, 'Salvataggio attività Lead + follow-up deve riuscire');
assert.equal(run('state.activities.length'), 2, 'Deve aver creato l’attività principale + il follow-up automatico');
assert.equal(run('state.activities[0].stage'), 'Lead');
assert.equal(run('state.activities[0].personName'), 'Mario Rossi');
assert.equal(run('state.activities[1].title'), 'Invio presentazione sintetica post-call');
assert.equal(run('state.activities[1].dueDate'), '2026-10-24');

// Creazione attività Prospect e Cliente
assert.equal(run(`saveTask({ values: {
  title: 'Demo tecnica piattaforma AI',
  stage: 'Prospect',
  type: 'Demo / Call',
  status: 'In corso',
  priority: 'Alta',
  dueDate: '2026-10-25',
  dueTime: '15:00',
  contactId: 'c-pros',
  personName: 'Laura Bianchi',
  dealId: 'd-pros',
  quoteId: '',
  outcome: 'Interesse elevato sul modulo preventivi',
  notes: 'Preparare ROI'
}})`), true);

assert.equal(run(`saveTask({ values: {
  title: 'Review trimestrale soddisfazione e upsell',
  stage: 'Cliente',
  type: 'QBR / Upsell',
  status: 'Da fare',
  priority: 'Media',
  dueDate: '2026-10-29',
  dueTime: '11:00',
  contactId: 'c-cli',
  personName: '',
  dealId: 'd-cli',
  quoteId: '',
  outcome: '',
  notes: 'Proporre modulo aggiuntivo'
}})`), true);

assert.equal(run('state.activities.length'), 4);

// 4. Completamento rapido attività
const firstTaskId = run('state.activities[0].id');
run(`completeTaskQuick('${firstTaskId}')`);
assert.equal(run(`state.activities.find(a => a.id === '${firstTaskId}').status`), 'Completata');
assert.ok(run(`state.activities.find(a => a.id === '${firstTaskId}').completedAt`));

// 5. Generazione Playbook per Lead, Prospect e Cliente (senza duplicati al secondo click)
const beforePlaybookCount = run('state.activities.length');
run("applyPlaybook('Prospect', 'c-pros', 'd-pros')");
const afterPlaybookCount = run('state.activities.length');
assert.equal(afterPlaybookCount, beforePlaybookCount + 3, 'Il playbook Prospect deve generare i 3 step operativi');
run("applyPlaybook('Prospect', 'c-pros', 'd-pros')");
assert.equal(run('state.activities.length'), afterPlaybookCount, 'Riapplicare lo stesso playbook non deve duplicare le attività aperte');

// 6. Rendering Vista Attività (Kanban e Tabella con data-label per smartphone)
run("view = 'activities'; setActivityStage('All'); setActivityViewMode('board');");
assert.match(element('#content').innerHTML, /Qualifica telefonica iniziale Lead/);
assert.match(element('#content').innerHTML, /Demo tecnica piattaforma AI/);
assert.match(element('#content').innerHTML, /Review trimestrale soddisfazione e upsell/);

run("setActivityViewMode('list');");
assert.match(element('#content').innerHTML, /data-label="Fase \/ Stato"/, 'La tabella attività deve avere data-label per le card smartphone');
assert.match(element('#content').innerHTML, /data-label="Azienda \/ Opportunità"/);
assert.match(element('#content').innerHTML, /class="cell-actions"/);

// Verifica data-label anche su Aziende, Pipeline Lista e Categorie
run("view = 'contacts'; render();");
assert.match(element('#content').innerHTML, /data-label="Referenti"/);
assert.match(element('#content').innerHTML, /data-label="Relazione CRM"/);
run("view = 'categories'; render();");
assert.match(element('#content').innerHTML, /data-label="Valore mensile"/);

// 7. Protezione integrità referenziale su eliminazione azienda o opportunità con attività collegate
run("openEditor('contact', 'c-pros')");
element('#delete').click();
assert.equal(run("Boolean(state.contacts.find(c => c.id === 'c-pros'))"), true, 'Non deve eliminare un’azienda con attività o opportunità collegate');
assert.match(element('#form-error').textContent, /attività|opportunità/i);

// 8. Export CSV Attività e Backup/Restore JSON
run("exportCsv('activities')");
assert.ok(downloads.length > 0, 'Export CSV attività deve generare un file scaricabile');

const backupSnapshot = run('JSON.stringify(state)');
const parsedBackup = JSON.parse(backupSnapshot);
assert.equal(Array.isArray(parsedBackup.activities), true);
assert.equal(parsedBackup.activities.length, afterPlaybookCount);

// 9. Verifica Mobile Shell: Bottom Nav, Subnav contestuale, Hamburger Drawer e Temi (Light / Dark / AMOLED)
run("view = 'leads'; render();");
assert.equal(element('#mobile-subnav').hidden, false, 'La subnav mobile deve essere visibile nella vista Lead');
assert.equal(bottomNavButtons.find(b => b.dataset.view === 'contacts').classList.contains('active'), true, 'Il tab Aziende nella bottom nav deve risultare attivo quando siamo in Lead');
assert.equal(subnavButtons.find(b => b.dataset.view === 'leads').classList.contains('active'), true, 'La pill Lead nella subnav mobile deve risultare attiva');

run("view = 'activities'; render();");
assert.equal(element('#mobile-subnav').hidden, true, 'La subnav mobile deve nascondersi nella vista Attività');
assert.equal(bottomNavButtons.find(b => b.dataset.view === 'activities').classList.contains('active'), true);

// Test apertura/chiusura Hamburger Drawer
element('#mobile-menu-btn').click();
assert.equal(docBody.classList.contains('drawer-open'), true, 'Il click su hamburger deve aprire il drawer mobile');
element('#drawer-close').click();
assert.equal(docBody.classList.contains('drawer-open'), false, 'Il click su chiudi deve chiudere il drawer mobile');

// Test Impostazioni e Cambio Tema (Light / Dark / AMOLED)
element('#open-settings').click();
assert.equal(element('#settings-dialog').open, true, 'Il bottone Impostazioni deve aprire la modale #settings-dialog');
themeButtons.find(b => b.dataset.themeChoice === 'amoled').click();
assert.equal(docElement.dataset.theme, 'amoled', 'La selezione del tema AMOLED deve impostare data-theme="amoled" su <html>');
assert.equal(JSON.parse(storage.get('apex-crm-prefs-v1')).theme, 'amoled', 'La preferenza tema deve essere salvata in localStorage');

console.log('activities-check.cjs: OK');

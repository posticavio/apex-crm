/**
 * Test di verifica per la sincronizzazione cloud multi-dispositivo Supabase
 */
const assert = require('assert');
const sync = require('./supabase-sync.js');

console.log('--- TEST SINCRONIZZAZIONE CLOUD SUPABASE ---');

// 1. Test transformSupabaseToCrm
const mockCompanies = [
  {
    id: 'comp-1',
    ragione_sociale: 'Azienda Test Alpha Srl',
    tipo: 'prospect',
    partita_iva: '12345678901',
    email: 'alpha@test.com',
    telefono: '02123456',
    indirizzo: 'Via Roma 10',
    citta: 'Milano',
    provincia: 'MI',
    sito_web: 'https://alpha.test',
    settore: 'Automazione',
    note: 'Nota azienda'
  }
];

const mockContacts = [
  {
    id: 'ct-1',
    company_id: 'comp-1',
    nome: 'Mario',
    cognome: 'Rossi',
    ruolo: 'Direttore Generale',
    email: 'mario@alpha.test',
    cellulare: '+39 333 1234567',
    note: 'Referente principale'
  },
  {
    id: 'ct-2',
    company_id: 'comp-1',
    nome: 'Luigi',
    cognome: 'Bianchi',
    ruolo: 'CTO',
    email: 'luigi@alpha.test',
    cellulare: '+39 333 7654321',
    note: 'Referente tecnico'
  }
];

const mockInteractions = [
  {
    id: 'int-1',
    company_id: 'comp-1',
    tipo: 'chiamata',
    stato: 'completata',
    titolo: 'Primo contatto telefonico',
    data_interazione: '2026-10-25T10:00:00Z',
    prossimo_passo: 'Inviare proposta tecnica',
    note: 'Cliente molto interessato a soluzione AI'
  }
];

const transformed = sync.transformSupabaseToCrm(mockCompanies, mockContacts, mockInteractions, []);
assert.strictEqual(transformed.contacts.length, 1, 'Dovrebbe generare 1 azienda');
const c1 = transformed.contacts[0];
assert.strictEqual(c1.company, 'Azienda Test Alpha Srl');
assert.strictEqual(c1.taxId, '12345678901');
assert.strictEqual(c1.person, 'Mario Rossi');
assert.strictEqual(c1.primaryRole, 'Direttore Generale');
assert.strictEqual(c1.referents.length, 1, 'Il secondo contatto deve essere nei referenti secondari');
assert.strictEqual(c1.referents[0].name, 'Luigi Bianchi');
assert.strictEqual(transformed.activities.length, 1, 'Dovrebbe creare 1 attività da interazioni');
assert.strictEqual(transformed.activities[0].title, 'Primo contatto telefonico');
assert.strictEqual(transformed.activities[0].status, 'completata');
console.log('PASS: transformSupabaseToCrm');

// 2. Test mergeCrmStates con localState vuoto (nuovo dispositivo/smartphone)
const mergedFreshDevice = sync.mergeCrmStates(null, null, {
  companies: mockCompanies,
  contacts: mockContacts,
  interactions: mockInteractions
});
assert.strictEqual(mergedFreshDevice.contacts.length, 1, 'Nuovo dispositivo idratato con successo');
assert.strictEqual(mergedFreshDevice.activities.length, 1);
console.log('PASS: mergeCrmStates (fresh device hydration)');

// 3. Test mergeCrmStates con dati locali + cloud (safe additive, zero data loss)
const localState = {
  contacts: [
    {
      id: 'local-comp-1',
      company: 'Azienda Locale Solo Browser',
      taxId: '98765432100',
      deals: []
    }
  ],
  deals: [
    {
      id: 'deal-1',
      contactId: 'local-comp-1',
      title: 'Trattativa locale',
      stage: 'Prospect',
      setup: 1500,
      monthly: 200
    }
  ]
};

const cloudSnapshot = {
  contacts: [
    {
      id: 'cloud-comp-2',
      company: 'Azienda da Laptop Ufficio',
      taxId: '55555555555'
    }
  ],
  deals: [
    {
      id: 'deal-2',
      contactId: 'cloud-comp-2',
      title: 'Trattativa cloud',
      stage: 'Cliente',
      setup: 3000,
      monthly: 500
    }
  ]
};

const mergedBoth = sync.mergeCrmStates(localState, cloudSnapshot, {
  companies: mockCompanies,
  contacts: mockContacts,
  interactions: mockInteractions
});

assert.strictEqual(mergedBoth.contacts.length, 3, 'Deve unire contatti locali, snapshot cloud e tabelle relazionali senza duplicati');
assert.strictEqual(mergedBoth.deals.length, 2, 'Deve preservare tutte le trattative locali e remote');
assert(mergedBoth.contacts.some(c => c.company === 'Azienda Locale Solo Browser'));
assert(mergedBoth.contacts.some(c => c.company === 'Azienda da Laptop Ufficio'));
assert(mergedBoth.contacts.some(c => c.company === 'Azienda Test Alpha Srl'));
console.log('PASS: mergeCrmStates (safe additive multi-device merge)');

console.log('ALL CLOUD SYNC TESTS PASSED SUCCESSFULLY!');

const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),storage=new Map();
const element=s=>{if(!elements.has(s))elements.set(s,{innerHTML:'',textContent:'',style:{},classList:{toggle(){}},addEventListener(t,f){this[t]=f},click(){if(typeof this.onclick==='function')this.onclick();},showModal(){this.open=true},close(){this.open=false}});return elements.get(s);};
const sandbox={
  console,Intl,Date,Set,Map,Number,String,JSON,Error,Blob,URL,structuredClone,
  crypto:require('node:crypto').webcrypto,
  setTimeout(){},clearTimeout(){},confirm:()=>true,
  FormData:class{constructor(form){return Object.entries(form.values)}},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  document:{querySelector:element,querySelectorAll:()=>[],addEventListener(){}}
};
vm.createContext(sandbox);
// Load quotes.js then app.js as in index.html
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'quotes.js'),'utf8'),sandbox);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'app.js'),'utf8'),sandbox);
const run=code=>vm.runInContext(code,sandbox);

// 1. Calculations & quoteDecimal
assert.equal(run("quoteDecimal('10')"), 10);
assert.equal(run("quoteDecimal('10,5')"), 10.5);
assert.equal(run("quoteDecimal('0')"), 0);
assert.throws(()=>run("quoteDecimal('-5')"));
assert.throws(()=>run("quoteDecimal('abc')"));
assert.throws(()=>run("quoteDecimal('1.000,50')")); // thousands separators rejected

// quoteTotals with integer cents
const sampleLines = [{description:'Servizio AI',quantity:2,unitCents:10000,discount:10}]; // 2 * 100€ = 200€, -10% = 180€
const calc1 = run("quoteTotals("+JSON.stringify(sampleLines)+", 22)");
assert.equal(calc1.gross, 20000);
assert.equal(calc1.discount, 2000);
assert.equal(calc1.net, 18000);
assert.equal(calc1.tax, 3960);
assert.equal(calc1.total, 21960);
assert.equal(calc1.lines[0].totalCents, 18000);

// Null VAT (bozza)
const calcDraft = run("quoteTotals("+JSON.stringify(sampleLines)+", null)");
assert.equal(calcDraft.tax, null);
assert.equal(calcDraft.total, 18000);

// Validation rules in quoteTotals
assert.throws(()=>run("quoteTotals([], 22)"), /almeno una riga/);
assert.throws(()=>run("quoteTotals([{description:'',quantity:1,unitCents:100,discount:0}], 22)"));
assert.throws(()=>run("quoteTotals([{description:'Test',quantity:0,unitCents:100,discount:0}], 22)"));
assert.throws(()=>run("quoteTotals([{description:'Test',quantity:1,unitCents:-5,discount:0}], 22)"));
assert.throws(()=>run("quoteTotals([{description:'Test',quantity:1,unitCents:100,discount:105}], 22)"));
assert.throws(()=>run("quoteTotals([{description:'Test',quantity:1,unitCents:100,discount:0}], -1)"));

// 2. Setup initial state
run("state.contacts=[{id:'c1',company:'Apex Tech',address:'Via Roma 1',city:'Treviso',country:'Italia',taxId:'IT12345678901',history:[]}];state.deals=[{id:'d1',contactId:'c1',title:'Trattativa AI',stage:'Prospect',salesStage:'Trattativa',setup:2000,monthly:200,next:'Offerta',due:'2026-10-30',history:[]}];state.quotes=[];persist(state)");

// nextQuoteNumber test
assert.match(run("nextQuoteNumber()"), /^APX-\d{4}-001$/);

// 3. Save Quote (Version 1 creation)
run("openQuote()");
assert.equal(element('#quote-title').textContent, 'Nuovo preventivo');

const quoteFormV1 = {
  number: 'APX-2026-001',
  title: 'Consulenza e automazione processi',
  contactId: 'c1',
  dealId: 'd1',
  status: 'Bozza',
  validUntil: '2026-11-30',
  vat: '', // null VAT
  issuer: 'Apex Digital di Cavio',
  notes: 'Condizioni standard 30gg',
  line_0_description: 'Analisi iniziale processo',
  line_0_quantity: '1',
  line_0_price: '500,00',
  line_0_discount: '0',
  line_1_description: 'Sviluppo automazione AI',
  line_1_quantity: '10',
  line_1_price: '150.00',
  line_1_discount: '10' // 1500 - 150 = 1350€
};

const submitQuote = vals => {
  const form = { values: vals };
  return run("saveQuote({values:"+JSON.stringify(vals)+"})");
};

// Test save Quote V1
assert.ok(run("saveQuote({values: "+JSON.stringify(quoteFormV1)+"})"));
assert.equal(run("state.quotes.length"), 1);
const savedQ = run("state.quotes[0]");
assert.equal(savedQ.contactId, 'c1');
assert.equal(savedQ.dealId, 'd1');
assert.equal(savedQ.versions.length, 1);
assert.equal(savedQ.versions[0].number, 'APX-2026-001');
assert.equal(savedQ.versions[0].totals.gross, 200000); // 500 + 1500 = 2000€
assert.equal(savedQ.versions[0].totals.discount, 15000); // 150€
assert.equal(savedQ.versions[0].totals.net, 185000); // 1850€
assert.equal(savedQ.versions[0].totals.tax, null);
assert.equal(savedQ.versions[0].totals.total, 185000);

// 4. Status 'Accettato' requires VAT
run("openQuote(state.quotes[0].id)");
const quoteFormAccettatoNoVat = {
  ...quoteFormV1,
  status: 'Accettato',
  vat: ''
};
assert.equal(run("saveQuote({values: "+JSON.stringify(quoteFormAccettatoNoVat)+"})"), false);
assert.match(element('#quote-error').textContent, /esplicitamente l’IVA/);

// Now accept with VAT 22%
const quoteFormAccettatoVat = {
  ...quoteFormV1,
  status: 'Accettato',
  vat: '22'
};
assert.ok(run("saveQuote({values: "+JSON.stringify(quoteFormAccettatoVat)+"})"));
assert.equal(run("state.quotes[0].versions.length"), 2, "A new version must be appended");
assert.equal(run("state.quotes[0].versions[1].status"), 'Accettato');
assert.equal(run("state.quotes[0].versions[1].totals.tax"), 40700); // 1850 * 0.22 = 407€
assert.equal(run("state.quotes[0].versions[1].totals.total"), 225700); // 2257€
// Version 1 is still Bozza with null VAT
assert.equal(run("state.quotes[0].versions[0].status"), 'Bozza');
assert.equal(run("state.quotes[0].versions[0].totals.tax"), null);

// 5. Stale session protection
run("quoteSession = {id: state.quotes[0].id, versions: 1, rowSeq: 2}"); // thinks it is on v1
assert.equal(run("saveQuote({values: "+JSON.stringify(quoteFormAccettatoVat)+"})"), false);
assert.match(element('#quote-error').textContent, /Preventivo cambiato/);

// 6. Number reuse conflict
run("openQuote()"); // new quote
const quoteConflict = {
  ...quoteFormV1,
  number: 'APX-2026-001' // already used by first quote
};
assert.equal(run("saveQuote({values: "+JSON.stringify(quoteConflict)+"})"), false);
assert.match(element('#quote-error').textContent, /Numero già utilizzato/);

// 7. Duplication (copyQuote)
run("openQuote(state.quotes[0].id, true)"); // copy=true
assert.equal(element('#quote-title').textContent, 'Duplica preventivo');
const copyForm = {
  ...quoteFormV1,
  number: 'APX-2026-002',
  status: 'Bozza'
};
assert.ok(run("saveQuote({values: "+JSON.stringify(copyForm)+"})"));
assert.equal(run("state.quotes.length"), 2);
assert.equal(run("state.quotes[1].versions[0].number"), 'APX-2026-002');
assert.equal(run("state.quotes[1].versions.length"), 1);

// 8. Delete protection
run("editing = {type:'contact', id:'c1'}");
element('#delete').click();
assert.equal(element('#toast').textContent, 'Questa scheda ha preventivi collegati e non può essere eliminata.');
assert.equal(run("state.contacts.length"), 1, "Contact must NOT be deleted");

run("editing = {type:'deal', id:'d1'}");
element('#delete').click();
assert.equal(element('#toast').textContent, 'Questa scheda ha preventivi collegati e non può essere eliminata.');
assert.equal(run("state.deals.length"), 1, "Deal must NOT be deleted");

// 9. Views, search, rendering
run("setView('quotes')");
assert.match(element('#content').innerHTML, /APX-2026-001/);
assert.match(element('#content').innerHTML, /APX-2026-002/);

const quotesCsv = run("buildCsv()");
assert.match(quotesCsv, /APX-2026-001/);
assert.match(quotesCsv, /"Numero";"Titolo";"Azienda"/);

run("setView('quotes')");
run("search='Processi'; render()");
assert.equal(element('#content').innerHTML.includes('APX-2026-001'), true);

run("search='NonEsiste'; render()");
assert.equal(element('#content').innerHTML.includes('Nessun preventivo'), true);

// 10. Print HTML generation
const printHtml = run("quotePrintHtml(state.quotes[0], 0)");
assert.match(printHtml, /Apex Digital di Cavio/);
assert.match(printHtml, /APX-2026-001/);
assert.match(printHtml, /Via Roma 1/);
assert.match(printHtml, /IT12345678901/);
assert.match(printHtml, /Bozza: IVA da definire/);

const printHtmlV2 = run("quotePrintHtml(state.quotes[0], 1)");
assert.match(printHtmlV2, /Versione 2/);
assert.match(printHtmlV2, /Accettato/);
assert.doesNotMatch(printHtmlV2, /Bozza: IVA da definire/);

// 11. JSON backup and restore round-trip
const exportedJson = run("JSON.stringify({version:1,...state})");
assert.match(exportedJson, /APX-2026-001/);
assert.match(exportedJson, /APX-2026-002/);

// Wipe state and restore
run("state = {contacts:[], deals:[], categories:[], quotes:[]}");
const parsed = run("migrate(JSON.parse("+JSON.stringify(exportedJson)+"))");
run("validate("+JSON.stringify(parsed)+")");
run("state = "+JSON.stringify(parsed));
assert.equal(run("state.quotes.length"), 2);
assert.equal(run("state.quotes[0].versions.length"), 2);

// Legacy restore without quotes field
const legacyJson = JSON.stringify({version:1,contacts:[{id:'c9',company:'Old Co'}],deals:[]});
const legacyParsed = run("migrate(JSON.parse("+JSON.stringify(legacyJson)+"))");
run("validate("+JSON.stringify(legacyParsed)+")");
run("state = " + JSON.stringify({contacts:legacyParsed.contacts, deals:legacyParsed.deals, categories:[], quotes:legacyParsed.quotes||[]}));
assert.equal(run("state.quotes.length"), 0);

// 12. Storage failure atomicity
run("state = "+JSON.stringify(parsed));
const stateSnap = run("JSON.stringify(state)");
sandbox.localStorage.setItem=()=>{throw Error('quota')};
run("openQuote()");
assert.equal(run("saveQuote({values: "+JSON.stringify({...quoteFormV1, number:'APX-2026-999'})+"})"), false);
assert.equal(run("JSON.stringify(state)"), stateSnap, "Memory state must remain untouched if persist fails");

console.log('PASS: quote lines calculation, null vs explicit VAT, sequential numbering, versioning on save, stale session protection, duplicate number protection, duplication, delete protection for companies and deals, print HTML rendering, JSON backup round-trip, legacy compatibility, and atomic storage failure handling.');

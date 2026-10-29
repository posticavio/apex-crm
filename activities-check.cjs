const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),storage=new Map(),listeners={};
const element=s=>{
 if(!elements.has(s)){
  elements.set(s,{
   innerHTML:'',textContent:'',value:'',hidden:false,style:{},dataset:{},
   classList:{toggle(){}},
   addEventListener(t,f){this[t]=f},
   querySelector:()=>({value:''}),
   click(){if(typeof this.onclick==='function')this.onclick();},
   showModal(){this.open=true},
   close(){this.open=false},
   focus(){},
   setSelectionRange(){}
  });
 }
 return elements.get(s);
};
const sandbox={
 console,Intl,Date,Set,Map,Number,String,JSON,Error,Blob,URL,structuredClone,
 crypto:require('node:crypto').webcrypto,
 setTimeout(){},clearTimeout(){},confirm:()=>true,
 FormData:class{constructor(form){return Object.entries(form.values||{})}},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 document:{querySelector:element,querySelectorAll:()=>[],addEventListener:(t,f)=>listeners[t]=f,createElement:()=>({click(){}})}
};
vm.createContext(sandbox);
for(const file of ['quotes.js','activities.js','app.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),sandbox);
}
const run=code=>vm.runInContext(code,sandbox);

// 1. Setup 3 companies: Lead, Prospect, Cliente
run(`
 state.contacts=[
  {id:'c-lead',company:'Alfa Lead Srl',person:'Luca Verdi',email:'luca@alfalead.it',referents:[{id:'r-lead',name:'Marco IT',role:'IT'}],history:[]},
  {id:'c-prospect',company:'Beta Prospect Spa',person:'Sara Neri',email:'sara@betaprospect.it',referents:[],history:[]},
  {id:'c-client',company:'Gamma Cliente Srl',person:'Paolo Bianchi',email:'paolo@gammacliente.it',referents:[],history:[]}
 ];
 state.deals=[
  {id:'d-prospect',contactId:'c-prospect',title:'Automazione RDO Beta',stage:'Prospect',salesStage:'Trattativa',setup:3500,monthly:250,next:'Demo tecnica',due:'2026-11-05',history:[]},
  {id:'d-client',contactId:'c-client',title:'Assistente AI Gamma',stage:'Cliente',salesStage:'Vinta',setup:5000,monthly:400,next:'Check-in',due:'2026-11-10',history:[]}
 ];
 state.quotes=[
  {id:'q-prospect',contactId:'c-prospect',dealId:'d-prospect',versions:[{number:'APX-2026-001',title:'Offerta Beta',date:today(),currency:'EUR',status:'Bozza',issuer:'Apex Digital',customer:{name:'Beta Prospect Spa',address:'Via Milano 1',taxId:'IT111'},validUntil:'',vat:22,lines:[{description:'Setup',quantity:1,unitCents:350000,discount:0}],totals:quoteTotals([{description:'Setup',quantity:1,unitCents:350000,discount:0}],22),notes:''}]}
 ];
 state.activities=[];
 persist(state);
`);

assert.equal(run("contactStage('c-lead')"),'Lead');
assert.equal(run("contactStage('c-prospect')"),'Prospect');
assert.equal(run("contactStage('c-client')"),'Cliente');

// 2. Apply Playbooks for Lead, Prospect, and Cliente
assert.equal(run("applyPlaybook('c-lead')"),3,'Lead playbook creates 3 tasks');
assert.equal(run("applyPlaybook('c-lead')"),0,'Duplicate Lead playbook is skipped');
assert.equal(run("applyPlaybook('c-prospect')"),3,'Prospect playbook creates 3 tasks');
assert.equal(run("applyPlaybook('c-client')"),3,'Client playbook creates 3 tasks');
assert.equal(run("state.activities.length"),9);
assert.match(run("contact('c-lead').history.at(-1).text"),/Playbook Lead attivato/);
assert.match(run("contact('c-prospect').history.at(-1).text"),/Playbook Prospect attivato/);
assert.match(run("contact('c-client').history.at(-1).text"),/Playbook Cliente attivato/);

// 3. Create custom activity linked to referent, deal, and quote
run("openTaskEditor(null,{contactId:'c-prospect'})");
const customTaskForm={
 contactId:'c-prospect',
 referentId:'primary',
 dealId:'d-prospect',
 quoteId:'q-prospect',
 title:'Revisione tecnica preventivo APX-2026-001',
 type:'Incontro / Demo',
 priority:'Alta',
 status:'Da fare',
 dueDate:'2000-01-15', // overdue
 dueTime:'14:30',
 notes:'Portare caso studio logistica',
 outcome:''
};
assert.equal(run("saveTask({values:"+JSON.stringify(customTaskForm)+"})"),true);
assert.equal(run("state.activities.length"),10);
const createdTask=run("state.activities.at(-1)");
assert.equal(createdTask.referentName,'Sara Neri');
assert.equal(createdTask.dealId,'d-prospect');
assert.equal(createdTask.quoteId,'q-prospect');
assert.match(run("state.deals.find(d=>d.id==='d-prospect').history.at(-1).text"),/Revisione tecnica preventivo/);

// 4. Reject mismatched company/deal/quote/referent or invalid time/date
run("openTaskEditor(null,{contactId:'c-lead'})");
assert.equal(run("saveTask({values:"+JSON.stringify({...customTaskForm,contactId:'c-lead',dealId:'d-prospect'})+"})"),false);
assert.match(element('#task-error').textContent,/opportunità selezionata non appartiene/);

run("openTaskEditor(null,{contactId:'c-lead'})");
assert.equal(run("saveTask({values:"+JSON.stringify({...customTaskForm,contactId:'c-lead',dealId:'',quoteId:'q-prospect'})+"})"),false);
assert.match(element('#task-error').textContent,/preventivo selezionato non appartiene/);

run("openTaskEditor(null,{contactId:'c-lead'})");
assert.equal(run("saveTask({values:"+JSON.stringify({...customTaskForm,contactId:'c-lead',dealId:'',quoteId:'',dueTime:'25:99'})+"})"),false);
assert.match(element('#task-error').textContent,/orario valido/);

// 5. Historical referent snapshot preservation
run("openTaskEditor(null,{contactId:'c-lead'})");
assert.equal(run("saveTask({values:"+JSON.stringify({
 contactId:'c-lead',
 referentId:'r-lead',
 dealId:'',
 quoteId:'',
 title:'Call con IT Manager',
 type:'Chiamata',
 priority:'Alta',
 status:'Da fare',
 dueDate:run('today()'),
 dueTime:'10:00',
 notes:'',
 outcome:''
})+"})"),true);
const itTaskId=run("state.activities.at(-1).id");
run("state.contacts[0].referents=[];persist(state)");
assert.equal(run(`taskPersonLabel(state.activities.find(a=>a.id==='${itTaskId}'))`),'Marco IT');

// 6. Complete task + chain follow-up task in one atomic save
run(`completeTaskQuick('${itTaskId}')`);
assert.equal(run(`saveTask({values:{
 contactId:'c-lead',
 referentId:'r-lead',
 dealId:'',
 quoteId:'',
 title:'Call con IT Manager',
 type:'Chiamata',
 priority:'Alta',
 status:'Completata',
 dueDate:today(),
 dueTime:'10:00',
 notes:'',
 outcome:'Interesse confermato per gestione ordini AI',
 nextTaskTitle:'Inviare sintesi tecnica a Marco IT',
 nextTaskType:'Email',
 nextTaskPriority:'Alta',
 nextTaskDue:'2099-05-10'
}})`),true);

const completedTask=run(`state.activities.find(a=>a.id==='${itTaskId}')`);
assert.equal(completedTask.status,'Completata');
assert.equal(completedTask.completedAt,run('today()'));
assert.match(run("contact('c-lead').history.at(-2).text"),/Interesse confermato per gestione ordini AI/);
const chainedTask=run("state.activities.at(-1)");
assert.equal(chainedTask.title,'Inviare sintesi tecnica a Marco IT');
assert.equal(chainedTask.status,'Da fare');
assert.equal(chainedTask.dueDate,'2099-05-10');

// 7. Filtering and views in activitiesView
run("setView('activities')");
assert.match(element('#content').innerHTML,/Attività Lead aperte/);
assert.match(element('#content').innerHTML,/Attività Prospect aperte/);
assert.match(element('#content').innerHTML,/Attività Clienti aperte/);

run("activityStageFilter='Cliente';render()");
assert.ok(run("visibleActivities().every(a=>taskLifecycleStage(a)==='Cliente')"));

run("activityStageFilter='';activityStatusFilter='overdue';render()");
assert.equal(run("visibleActivities().length"),1);
assert.equal(run("visibleActivities()[0].title"),'Revisione tecnica preventivo APX-2026-001');

run("activityStatusFilter='completed';render()");
assert.equal(run("visibleActivities().length"),1);
assert.equal(run("visibleActivities()[0].id"),itTaskId);

run("activityStatusFilter='open';activityLayout='list';render()");
assert.match(element('#content').innerHTML,/<table>/);

// 8. CSV export for activities and contacts
const actCsv=run("buildCsv()");
assert.match(actCsv,/"Titolo";"Tipo";"Azienda";"Fase azienda"/);
assert.match(actCsv,/Inviare sintesi tecnica a Marco IT/);

run("setView('lead')");
assert.match(element('#content').innerHTML,/Alfa Lead Srl/);
assert.match(element('#content').innerHTML,/Playbook/);
const leadCsv=run("buildCsv()");
assert.match(leadCsv,/Inviare sintesi tecnica a Marco IT/);

// Search contact by activity title
run("setView('contatti');search='sintesi tecnica';render()");
assert.equal(run("visibleContacts().length"),1);
assert.equal(run("visibleContacts()[0].id"),'c-lead');
run("search='';render()");

// 9. Contact and Deal modal sections + Dashboard integration
run("openEditor('contact','c-lead')");
assert.match(element('#fields').innerHTML,/Attività Lead/);
assert.match(element('#fields').innerHTML,/Inviare sintesi tecnica a Marco IT/);

run("openEditor('deal','d-prospect')");
assert.match(element('#fields').innerHTML,/Attività operative dell’opportunità/);
assert.match(element('#fields').innerHTML,/Revisione tecnica preventivo APX-2026-001/);

run("setView('oggi')");
assert.match(element('#content').innerHTML,/Attività per Lead, Prospect e Clienti/);

// 10. Delete protection and deleteTask
run("editing={type:'contact',id:'c-client'}");
element('#delete').click();
assert.equal(element('#toast').textContent,'Questa scheda ha attività collegate e non può essere eliminata.');
assert.equal(run("state.contacts.length"),3);

const countBeforeDelete=run("state.activities.length");
assert.equal(run(`deleteTask('${chainedTask.id}')`),true);
assert.equal(run("state.activities.length"),countBeforeDelete-1);

// 11. JSON backup round-trip and storage failure atomicity
const fullBackup=run("JSON.stringify({version:1,...state})");
const parsedBackup=run("migrate(JSON.parse("+JSON.stringify(fullBackup)+"))");
run("validate("+JSON.stringify(parsedBackup)+")");

const snapBeforeQuota=run("JSON.stringify(state)");
sandbox.localStorage.setItem=()=>{throw Error('quota')};
run("openTaskEditor(null,{contactId:'c-lead'})");
assert.equal(run("saveTask({values:"+JSON.stringify({...customTaskForm,contactId:'c-lead',dealId:'',quoteId:'',title:'Non salvata'})+"})"),false);
assert.equal(run("JSON.stringify(state)"),snapBeforeQuota,'State must remain untouched on storage failure');

// 12. Mobile-First Smartphone Shell, Responsive Table data-label & Italian Currency Grouping
assert.match(run("money(1200)"),/1\.200\s*€/,'Italian currency must include thousands separator dot');
assert.match(run("quoteMoney(185000)"),/1\.850,00\s*€/,'Quote currency must include thousands separator dot and decimals');

run("setView('activities');activityLayout='list';render()");
assert.match(element('#content').innerHTML,/data-label="Azienda & Fase"/,'Activities table must include data-label for smartphone cards');
assert.match(element('#content').innerHTML,/class="cell-actions"/,'Activities table must include cell-actions for smartphone cards');
assert.equal(element('#mobile-subnav').hidden,true,'Mobile subnav hidden on activities view');

run("setView('lead');render()");
assert.equal(element('#mobile-subnav').hidden,false,'Mobile subnav visible on lead/anagrafiche views');
assert.match(element('#content').innerHTML,/data-label="Referente e contatti"/,'Contacts table must include data-label for smartphone cards');

run("openSettingsDialog()");
assert.equal(element('#settings-dialog').open,true,'Settings modal opens on mobile/desktop trigger');
assert.match(element('#settings-archive-summary').innerHTML,/Attività aperte/);

console.log('PASS: lifecycle activities for Lead, Prospect and Clienti, stage playbooks, referent/deal/quote linking, historical snapshots, completion with follow-up chaining, stage/status filters, board/list views, mobile-first smartphone shell & responsive cards, CSV/JSON portability, delete protection, and atomic storage failure handling.');



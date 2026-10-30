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
 document:{body:{dataset:{}},querySelector:element,querySelectorAll:()=>[],addEventListener:(t,f)=>listeners[t]=f,createElement:()=>({click(){}})}
};
vm.createContext(sandbox);
for(const file of ['quotes.js','activities.js','projects.js','analytics.js','app.js']){
 vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),sandbox);
}
const run=code=>vm.runInContext(code,sandbox);

// 1. Setup test companies and deals
run(`
 state.contacts=[
  {id:'c1',company:'Delta Tech Srl',person:'Elena Rossi',email:'elena@deltatech.it',history:[]},
  {id:'c2',company:'Omega AI Spa',person:'Marco Blu',email:'marco@omega.it',history:[]}
 ];
 state.deals=[
  {id:'d1',contactId:'c1',title:'Portale AI Clienti',stage:'Cliente',salesStage:'Vinta',service:'Assistente AI',setup:6000,monthly:500,next:'Check-in',due:'2026-11-15',history:[]},
  {id:'d2',contactId:'c2',title:'Automazione Fatture',stage:'Prospect',salesStage:'Offerta',service:'Automazione',setup:4000,monthly:300,next:'Follow-up offerta',due:'2026-11-10',history:[]}
 ];
 persist(state);
`);

// 2. Test Projects, Milestones & Dependencies
run("openProjectEditor(null,{contactId:'c1',dealId:'d1'})");
const projForm={
 name:'Commessa Portale AI Clienti',
 contactId:'c1',
 dealId:'d1',
 quoteId:'',
 status:'In corso',
 startDate:'2026-10-28',
 endDate:'2026-11-30',
 budgetEur:'6000,00',
 costEur:'1800,00',
 estimatedHours:'40',
 loggedHours:'12',
 notes:'Ambiente produzione pronto',
 ms_0_id:'m1',
 ms_0_title:'Analisi e Kick-off',
 ms_0_due:'2026-11-02',
 ms_0_dep:'',
 ms_0_done:'on',
 ms_1_id:'m2',
 ms_1_title:'Sviluppo e Integrazione',
 ms_1_due:'2026-11-15',
 ms_1_dep:'m1',
 ms_2_id:'m3',
 ms_2_title:'Collaudo Finale Go-Live',
 ms_2_due:'2026-11-30',
 ms_2_dep:'m2'
};
assert.equal(run("saveProject({values:"+JSON.stringify(projForm)+"})"),true);
assert.equal(run("state.projects.length"),1);
const p1=run("state.projects[0]");
assert.equal(p1.budgetCents,600000);
assert.equal(p1.costCents,180000);
assert.equal(run("projectMarginCents(state.projects[0])"),420000);
assert.equal(run("projectProgress(state.projects[0])"),33);

// Dependency enforcement: cannot complete m3 before m2!
assert.equal(run(`toggleMilestone('${p1.id}','m3')`),false,'Blocked by uncompleted dependency m2');
assert.match(element('#toast').textContent,/Completa prima la milestone preliminare/);

// Cannot reopen m1 while m2 is not done? m2 is not done yet, so m1 can be toggled; let's complete m2 then m3:
assert.equal(run(`toggleMilestone('${p1.id}','m2')`),true);
assert.equal(run("projectProgress(state.projects[0])"),67);
// Now cannot reopen m1 while m2 is done!
assert.equal(run(`toggleMilestone('${p1.id}','m1')`),false,'Cannot reopen prerequisite while dependent is done');
// Complete m3 -> project auto-completes to 'Completato'!
assert.equal(run(`toggleMilestone('${p1.id}','m3')`),true);
assert.equal(run("projectProgress(state.projects[0])"),100);
assert.equal(run("state.projects[0].status"),'Completato');

// Project views & CSV
run("setView('projects')");
assert.match(element('#content').innerHTML,/Commessa Portale AI Clienti/);
run("projectLayout='gantt';render()");
assert.match(element('#content').innerHTML,/<table>/);
assert.match(run("buildCsv()"),/Commessa Portale AI Clienti/);

// Delete protection for deal/contact linked to project
run("editing={type:'deal',id:'d1'}");
element('#delete').click();
assert.equal(element('#toast').textContent,'Questa scheda ha progetti collegati e non può essere eliminata.');
assert.equal(run("state.deals.length"),2);

// 3. Test Finance, Budget, Forecast & Historical Revenues
const fInitial=run("calculateForecast()");
assert.equal(fInitial.wonSetup,6000);
assert.equal(fInitial.currentMrr,500);
assert.equal(fInitial.openGrossSetup,4000);
assert.equal(fInitial.weightedSetup,3000); // Offerta default weight 75% of 4000 = 3000

// Customize Finance targets and weights
assert.equal(run(`saveFinanceConfig({values:{
 annualTarget:'100000',
 mrrTarget:'2000',
 monthlyBudget:'600',
 weight_0:'10',
 weight_1:'30',
 weight_2:'80',
 weight_3:'100',
 weight_4:'0'
}})`),true);
const fUpdated=run("calculateForecast()");
assert.equal(fUpdated.fin.annualTarget,100000);
assert.equal(fUpdated.weightedSetup,3200); // 80% of 4000 = 3200

// Add historical revenue
assert.equal(run(`addHistoricalRevenue({values:{
 revContactId:'c1',
 revPeriod:'2026-09',
 revDescription:'Consulenza preliminare Q3',
 revAmount:'2500'
}})`),true);
assert.equal(run("calculateForecast().historicalTotal"),2500);
assert.equal(run("calculateForecast().acquiredTotal"),8500); // 6000 won + 2500 historical

run("setView('analytics')");
assert.match(element('#content').innerHTML,/Consulenza preliminare Q3/);
assert.match(run("buildCsv()"),/"Fase";"Opportunità";"Probabilità %"/);

// 4. Test Playbook Customization (Lead, Prospect, Cliente)
assert.equal(run(`savePlaybooks({values:{
 pb_Lead_0_title:'Audit veloce sito e processi Lead',
 pb_Lead_0_type:'Analisi / Offerta',
 pb_Lead_0_priority:'Alta',
 pb_Lead_0_offset:'0',
 pb_Lead_0_notes:'Controllo rapido pre-chiamata',
 pb_Prospect_0_title:'Workshop tecnico AI Prospect',
 pb_Prospect_0_type:'Incontro / Demo',
 pb_Prospect_0_priority:'Alta',
 pb_Prospect_0_offset:'2',
 pb_Prospect_0_notes:'Demo live',
 pb_Cliente_0_title:'Onboarding VIP Cliente',
 pb_Cliente_0_type:'Onboarding / Consegna',
 pb_Cliente_0_priority:'Alta',
 pb_Cliente_0_offset:'1',
 pb_Cliente_0_notes:'Setup dedicato'
}})`),true);

assert.equal(run("getPlaybooks().Prospect.length"),1);
assert.equal(run("getPlaybooks().Prospect[0].title"),'Workshop tecnico AI Prospect');
assert.equal(run("applyPlaybook('c2')"),1);
assert.equal(run("state.activities.at(-1).title"),'Workshop tecnico AI Prospect');

// Reset playbooks to default
assert.equal(run("resetPlaybooks()"),true);
assert.equal(run("getPlaybooks().Prospect.length"),3);

// 5. Test Theme (Light -> Dark -> AMOLED -> Light) & Density
assert.equal(run("cycleTheme()"),'dark');
assert.equal(sandbox.document.body.dataset.theme,'dark');
assert.equal(run("cycleTheme()"),'amoled');
assert.equal(sandbox.document.body.dataset.theme,'amoled');
assert.equal(run("cycleTheme()"),'light');
assert.equal(sandbox.document.body.dataset.theme,'light');

assert.equal(run("toggleDensity()"),'compact');
assert.equal(sandbox.document.body.dataset.density,'compact');
assert.equal(run("toggleDensity()"),'comfortable');

// 6. Command Palette (Cmd+K / Ctrl+K) Search, Actions & Desktop Collapsible Rail (Ctrl+B)
assert.equal(run("openCommandPalette('Delta')"),true);
assert.equal(element('#command-dialog').open,true);
assert.match(element('#command-results').innerHTML,/Delta Tech Srl/);
assert.equal(run("runCommandAction('view:trattative')"),true);
assert.equal(run("view"),'trattative');

assert.equal(run("toggleSidebarCollapse()"),true);
assert.equal(sandbox.document.body.dataset.sidebar,'collapsed');
assert.equal(run("runCommandAction('toggle-sidebar')"),true);
assert.equal(sandbox.document.body.dataset.sidebar,'expanded');

// 7. Full JSON Backup & Restore Validation
const backup=run("JSON.stringify({version:1,...state})");
const restored=run("migrate(JSON.parse("+JSON.stringify(backup)+"))");
run("validate("+JSON.stringify(restored)+")");

// 8. Desktop Zero Horizontal Scroll Enforced & Quick-Create Dropdown Visibility
const layoutCss = fs.readFileSync(path.join(__dirname, 'layout.css'), 'utf8');
assert.match(layoutCss, /Desktop Mode Zero Horizontal Scroll Rule/);
assert.match(layoutCss, /header\s*\{[^}]*overflow:\s*visible\s*!important/);
assert.match(layoutCss, /\.header-quick-actions\s*\{[^}]*overflow:\s*visible\s*!important/);
assert.match(layoutCss, /\.quick-create-menu\s*\{[^}]*z-index:\s*1000/);
assert.match(layoutCss, /\.toolbar\s*\{[^}]*overflow-x:\s*hidden\s*!important/);
assert.match(layoutCss, /\.activity-filters\s*\{[^}]*overflow-x:\s*hidden\s*!important/);
assert.match(layoutCss, /\.board[^{]*\{[^}]*overflow-x:\s*hidden\s*!important/);
assert.match(layoutCss, /aside#app-sidebar\s*\{[^}]*overflow-y:\s*hidden\s*!important/);
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert.match(indexHtml, /class="sidebar-tools-grid"/);
assert.match(indexHtml, /id="density-toggle"[\s\S]*?class="density-label"/);
assert.match(indexHtml, /id="header-settings-btn"[\s\S]*?class="settings-label"/);

// Quick-create menu toggle test
run("openQuickCreateDropdown()");
assert.equal(element('#quick-create-menu').hidden, false);
run("closeQuickCreateDropdown()");
assert.equal(element('#quick-create-menu').hidden, true);
run("toggleQuickCreateDropdown()");
assert.equal(element('#quick-create-menu').hidden, false);
run("toggleQuickCreateDropdown()");
assert.equal(element('#quick-create-menu').hidden, true);

console.log('PASS: projects with milestones and dependency guards, economic margin and hours tracking, revenue targets, budget and weighted forecast, historical revenues, customizable stage playbooks, command palette Cmd+K, quick-create visible dropdown, desktop zero horizontal scroll menus, dark/AMOLED themes and compact density, CSV/JSON portability.');


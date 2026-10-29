'use strict';
const UI_KEY='apex-crm-ui-v1';
const defaultFinance={
 annualTarget:60000,
 mrrTarget:3000,
 monthlyBudget:800,
 weights:{'Nuovo contatto':15,'Trattativa':40,'Offerta':75,'Vinta':100,'Persa':0},
 revenues:[]
};
const defaultUiSettings={theme:'light',density:'comfortable'};
let playbookSession=null;

function getFinance(){
 const f=state.finance||{};
 return {
  annualTarget:Number.isFinite(f.annualTarget)&&f.annualTarget>=0?f.annualTarget:defaultFinance.annualTarget,
  mrrTarget:Number.isFinite(f.mrrTarget)&&f.mrrTarget>=0?f.mrrTarget:defaultFinance.mrrTarget,
  monthlyBudget:Number.isFinite(f.monthlyBudget)&&f.monthlyBudget>=0?f.monthlyBudget:defaultFinance.monthlyBudget,
  weights:{...defaultFinance.weights,...(f.weights||{})},
  revenues:Array.isArray(f.revenues)?f.revenues:[]
 };
}

function validateFinance(data){
 if(data.finance==null)return;
 const f=data.finance;
 if(typeof f!=='object'||Array.isArray(f))throw Error('Dati finanziari non validi');
 for(const k of ['annualTarget','mrrTarget','monthlyBudget'])if(f[k]!=null&&(!Number.isFinite(f[k])||f[k]<0))throw Error('Target finanziario non valido');
 if(f.weights!=null){
  if(typeof f.weights!=='object'||Array.isArray(f.weights))throw Error('Pesi forecast non validi');
  for(const [stage,w] of Object.entries(f.weights)){
   if(!salesStages.includes(stage)||!Number.isFinite(w)||w<0||w>100)throw Error('Peso probabilità non valido');
  }
 }
 if(f.revenues!=null){
  if(!Array.isArray(f.revenues))throw Error('Storico fatturati non valido');
  const ids=new Set();
  for(const r of f.revenues){
   if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id))throw Error('Voce fatturato non valida');
   ids.add(r.id);
   if(typeof r.contactId!=='string'||!data.contacts.some(c=>c.id===r.contactId))throw Error('Azienda fatturato non valida');
   if(typeof r.period!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.period))throw Error('Periodo fatturato non valido (USA YYYY-MM)');
   if(typeof r.description!=='string'||!r.description.trim())throw Error('Descrizione fatturato obbligatoria');
   if(!Number.isFinite(r.amount)||r.amount<0)throw Error('Importo fatturato non valido');
  }
 }
}

function calculateForecast(){
 const fin=getFinance();
 const active=state.deals.filter(d=>!isArchived(d));
 const wonDeals=active.filter(d=>getSalesStage(d)==='Vinta');
 const wonSetup=wonDeals.reduce((n,d)=>n+d.setup,0);
 const currentMrr=wonDeals.reduce((n,d)=>n+d.monthly,0);
 const historicalTotal=fin.revenues.reduce((n,r)=>n+r.amount,0);
 const acquiredTotal=wonSetup+historicalTotal;

 let weightedSetup=0,weightedMrr=0,openGrossSetup=0;
 const byStage=salesStages.map(stage=>{
  const list=active.filter(d=>getSalesStage(d)===stage);
  const weight=Number(fin.weights[stage]??defaultFinance.weights[stage]);
  const gross=list.reduce((n,d)=>n+d.setup,0);
  const mrr=list.reduce((n,d)=>n+d.monthly,0);
  const weighted=Math.round(gross*(weight/100));
  const weightedMonthly=Math.round(mrr*(weight/100));
  if(!['Vinta','Persa'].includes(stage)){
   openGrossSetup+=gross;
   weightedSetup+=weighted;
   weightedMrr+=weightedMonthly;
  }
  return {stage,count:list.length,weight,gross,weighted,mrr,weightedMonthly};
 });

 const services=['Automazione','Assistente AI','Integrazione','Consulenza AI','Altro'].map(service=>{
  const list=active.filter(d=>(d.service||'Altro')===service&&getSalesStage(d)!=='Persa');
  return {
   service,
   count:list.length,
   setup:list.reduce((n,d)=>n+d.setup,0),
   monthly:list.reduce((n,d)=>n+d.monthly,0)
  };
 });

 const targetProgress=fin.annualTarget>0?Math.min(100,Math.round(((acquiredTotal+weightedSetup)/fin.annualTarget)*100)):100;
 const mrrProgress=fin.mrrTarget>0?Math.min(100,Math.round((currentMrr/fin.mrrTarget)*100)):100;
 return {fin,wonSetup,currentMrr,historicalTotal,acquiredTotal,openGrossSetup,weightedSetup,weightedMrr,projectedAnnual:acquiredTotal+weightedSetup+(currentMrr*12),targetProgress,mrrProgress,byStage,services};
}

function analyticsView(){
 const f=calculateForecast();
 return `
  <div class="stats">
   <div class="stat">
    <span class="stat-label">Fatturato Acquisito + Storico</span>
    <strong>${money(f.acquiredTotal)}</strong>
    <small>Obiettivo annuo: ${money(f.fin.annualTarget)} (${f.targetProgress}% coperto col forecast)</small>
   </div>
   <div class="stat">
    <span class="stat-label">Forecast Ponderato Pipeline</span>
    <strong>${money(f.weightedSetup)}</strong>
    <small>Su ${money(f.openGrossSetup)} di pipeline lorda aperta</small>
   </div>
   <div class="stat accent">
    <span class="stat-label">Canoni Ricorrenti (MRR)</span>
    <strong>${money(f.currentMrr)}</strong>
    <small>Target MRR: ${money(f.fin.mrrTarget)} (${f.mrrProgress}%) · +${money(f.weightedMrr)}/m atteso</small>
   </div>
   <div class="stat">
    <span class="stat-label">Budget Costi Mensili</span>
    <strong>${money(f.fin.monthlyBudget)}</strong>
    <small>Saldo netto ricorrente: ${money(f.currentMrr-f.fin.monthlyBudget)} / mese</small>
   </div>
  </div>
  <div class="toolbar">
   <div>
    <strong>Pianificazione Economica, Budget e Previsioni (Forecast)</strong>
    <small style="display:block;color:var(--muted)">Ponderazione probabilistica delle opportunità per fase e storico incassi</small>
   </div>
   <div class="list-controls">
    <button type="button" id="open-finance-config" class="primary">⚙ Configura Obiettivi, Budget &amp; Pesi</button>
    <button type="button" id="export-csv">↓ Esporta Report CSV</button>
   </div>
  </div>
  <div class="dashboard">
   <div class="dashboard-col">
    <div class="panel">
     <div class="panel-title">
      <h2>Funnel &amp; Forecast Ponderato per Fase</h2>
      <small>Valore lordo × Probabilità di chiusura (%)</small>
     </div>
     <div class="table-wrap">
      <table>
       <thead><tr><th>Fase opportunità</th><th>N°</th><th>Probabilità</th><th>Valore Lordo</th><th>Forecast Ponderato</th><th>Canone Ponderato</th></tr></thead>
       <tbody>
        ${f.byStage.map(row=>`<tr>
         <td><strong>${esc(row.stage)}</strong></td>
         <td data-label="N° Opportunità">${row.count}</td>
         <td data-label="Probabilità"><span class="pill ${row.weight===100?'green':row.weight===0?'red':''}">${row.weight}%</span></td>
         <td data-label="Valore Lordo" class="money-atomic">${money(row.gross)}</td>
         <td data-label="Forecast Ponderato" class="money-atomic"><strong>${money(row.weighted)}</strong></td>
         <td data-label="Canone Ponderato" class="money-atomic">${money(row.weightedMonthly)} / mese</td>
        </tr>`).join('')}
       </tbody>
      </table>
     </div>
    </div>
    <div class="panel">
     <div class="panel-title">
      <h2>Storico Fatturati &amp; Incassi Registrati <span class="pill">${f.fin.revenues.length}</span></h2>
      <button type="button" class="text-button" id="toggle-revenue-form">+ Registra fatturato storico</button>
     </div>
     <form id="revenue-inline-form" class="inline-revenue-form hidden">
      <div class="field-grid">
       <label class="field">Azienda *
        <select name="revContactId" required>
         ${state.contacts.map(c=>`<option value="${esc(c.id)}">${esc(c.company)}</option>`).join('')}
        </select>
       </label>
       ${field('revPeriod','Mese (YYYY-MM) *',today().slice(0,7))}
       ${field('revDescription','Descrizione / Fattura *','Canone o progetto erogato','text',true)}
       ${field('revAmount','Importo (€) *','1000','number')}
      </div>
      <div class="form-actions" style="margin-top:12px;padding-top:12px">
       <button type="submit" class="primary">Aggiungi a storico fatturati</button>
      </div>
     </form>
     ${f.fin.revenues.length?`<div class="table-wrap"><table>
      <thead><tr><th>Periodo</th><th>Azienda</th><th>Descrizione</th><th>Importo</th><th></th></tr></thead>
      <tbody>${f.fin.revenues.slice().sort((a,b)=>b.period.localeCompare(a.period)).map(r=>`<tr>
       <td><span class="pill">${esc(r.period)}</span></td>
       <td data-label="Azienda"><strong>${esc(contact(r.contactId)?.company||'—')}</strong></td>
       <td data-label="Descrizione">${esc(r.description)}</td>
       <td data-label="Importo" class="money-atomic"><strong>${money(r.amount)}</strong></td>
       <td class="cell-actions"><div class="row-actions"><button type="button" class="text-button" data-delete-revenue="${esc(r.id)}">Rimuovi</button></div></td>
      </tr>`).join('')}</tbody>
     </table></div>`:'<p class="related-empty">Nessun fatturato storico aggiuntivo registrato. Usa "+ Registra fatturato storico" per inserire incassi pregressi.</p>'}
    </div>
   </div>
   <div class="dashboard-col">
    <div class="panel">
     <div class="panel-title">
      <h2>Avanzamento Obiettivi</h2>
     </div>
     <div style="padding:18px 20px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
       <span>Copertura Target Annuo (Acquisito + Forecast)</span>
       <strong>${f.targetProgress}%</strong>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${f.targetProgress}%"></div></div>
      <small style="display:block;color:var(--muted);margin:6px 0 18px">${money(f.acquiredTotal+f.weightedSetup)} su ${money(f.fin.annualTarget)}</small>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
       <span>Copertura Target Canoni Mensili (MRR)</span>
       <strong>${f.mrrProgress}%</strong>
      </div>
      <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${f.mrrProgress}%"></div></div>
      <small style="display:block;color:var(--muted);margin-top:6px">${money(f.currentMrr)} / mese su ${money(f.fin.mrrTarget)} / mese</small>
     </div>
    </div>
    <div class="panel">
     <div class="panel-title">
      <h2>Ripartizione per Linea di Servizio AI</h2>
     </div>
     ${f.services.map(s=>`<div class="mini-row">
      <span><strong>${esc(s.service)}</strong> <small>(${s.count} opp.)</small></span>
      <strong>${money(s.setup)} <small>+ ${money(s.monthly)}/m</small></strong>
     </div>`).join('')}
    </div>
   </div>
  </div>`;
}

function openFinanceEditor(){
 const f=getFinance();
 $('#finance-error').hidden=true;
 $('#finance-fields').innerHTML=`
  <div class="field-grid">
   <h3 class="form-section">Obiettivi e Budget Operativo</h3>
   ${field('annualTarget','Obiettivo Fatturato Annuo (€)',f.annualTarget,'number')}
   ${field('mrrTarget','Obiettivo Canoni Ricorrenti MRR (€ / mese)',f.mrrTarget,'number')}
   ${field('monthlyBudget','Budget Costi Operativi Mensili (€ / mese)',f.monthlyBudget,'number')}
   <h3 class="form-section">Pesi di Probabilità Forecast per Fase (%)</h3>
   ${salesStages.map((s,i)=>field('weight_'+i,`Probabilità "${s}" (%)`,f.weights[s]??defaultFinance.weights[s],'number')).join('')}
  </div>`;
 if(!$('#finance-editor').open)$('#finance-editor').showModal();
}

function saveFinanceConfig(formOrValues){
 try{
  const raw=formOrValues instanceof FormData?Object.fromEntries(formOrValues):formOrValues?.values?formOrValues.values:Object.fromEntries(new FormData(formOrValues));
  const annualTarget=quoteDecimal(raw.annualTarget??'0');
  const mrrTarget=quoteDecimal(raw.mrrTarget??'0');
  const monthlyBudget=quoteDecimal(raw.monthlyBudget??'0');
  const weights={};
  salesStages.forEach((s,i)=>{
   const w=quoteDecimal(raw['weight_'+i]??defaultFinance.weights[s]);
   if(w<0||w>100)throw Error(`La probabilità per ${s} deve essere compresa tra 0 e 100%.`);
   weights[s]=w;
  });
  const next=structuredClone(state);
  next.finance={...getFinance(),annualTarget,mrrTarget,monthlyBudget,weights};
  validate(next);
  if(!persist(next))return false;
  if($('#finance-editor').open)$('#finance-editor').close();
  render();
  toast('Obiettivi, budget e pesi forecast aggiornati.');
  return true;
 }catch(error){
  $('#finance-error').textContent=error.message;
  $('#finance-error').hidden=false;
  return false;
 }
}

function addHistoricalRevenue(formOrValues){
 try{
  if(!state.contacts.length){toast('Aggiungi prima un’azienda.');return false;}
  const raw=formOrValues instanceof FormData?Object.fromEntries(formOrValues):formOrValues?.values?formOrValues.values:Object.fromEntries(new FormData(formOrValues));
  const contactId=String(raw.revContactId||'').trim();
  const period=String(raw.revPeriod||'').trim();
  const description=String(raw.revDescription||'').trim();
  const amount=quoteDecimal(raw.revAmount??'0');
  if(!contact(contactId))throw Error('Seleziona un’azienda valida.');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw Error('Usa il formato YYYY-MM per il periodo.');
  if(!description||amount<=0)throw Error('Indica descrizione e un importo positivo.');
  const next=structuredClone(state);
  next.finance=getFinance();
  next.finance.revenues.push({id:crypto.randomUUID(),contactId,period,description,amount});
  validate(next);
  if(!persist(next))return false;
  render();
  toast('Fatturato storico registrato.');
  return true;
 }catch(error){
  toast(error.message);
  return false;
 }
}

function deleteHistoricalRevenue(id){
 const next=structuredClone(state);
 next.finance=getFinance();
 next.finance.revenues=next.finance.revenues.filter(r=>r.id!==id);
 try{validate(next);}catch{return false;}
 if(!persist(next))return false;
 render();
 toast('Voce di fatturato rimossa.');
 return true;
}

// Playbook Customization (Lead, Prospect, Cliente)
function getPlaybooks(){
 if(state.playbooks&&typeof state.playbooks==='object'){
  return {
   Lead:Array.isArray(state.playbooks.Lead)&&state.playbooks.Lead.length?state.playbooks.Lead:activityPlaybooks.Lead,
   Prospect:Array.isArray(state.playbooks.Prospect)&&state.playbooks.Prospect.length?state.playbooks.Prospect:activityPlaybooks.Prospect,
   Cliente:Array.isArray(state.playbooks.Cliente)&&state.playbooks.Cliente.length?state.playbooks.Cliente:activityPlaybooks.Cliente
  };
 }
 return activityPlaybooks;
}

function validatePlaybooks(data){
 if(data.playbooks==null)return;
 if(typeof data.playbooks!=='object'||Array.isArray(data.playbooks))throw Error('Playbook non validi');
 for(const stage of stages){
  if(data.playbooks[stage]==null)continue;
  if(!Array.isArray(data.playbooks[stage])||!data.playbooks[stage].length)throw Error('Ogni playbook deve avere almeno un passo');
  for(const step of data.playbooks[stage]){
   if(!step||typeof step.title!=='string'||!step.title.trim()||!activityTypes.includes(step.type)||!activityPriorities.includes(step.priority)||!Number.isFinite(step.offsetDays)||step.offsetDays<0||(step.notes!=null&&typeof step.notes!=='string'))throw Error('Passo playbook non valido');
  }
 }
}

function playbookStepRow(stage,idx,step={title:'',type:'Chiamata',priority:'Media',offsetDays:1,notes:''}){
 return `<fieldset class="quote-line pb-step-row" data-pb-stage="${esc(stage)}">
  <legend>${esc(stage)} · Passo #${idx+1}</legend>
  <div class="quote-line-grid">
   ${field(`pb_${stage}_${idx}_title`,'Titolo attività *',step.title,'text',true)}
   <label class="field">Tipo
    <select name="pb_${stage}_${idx}_type">${activityTypes.map(t=>`<option ${step.type===t?'selected':''}>${t}</option>`).join('')}</select>
   </label>
   <label class="field">Priorità
    <select name="pb_${stage}_${idx}_priority">${activityPriorities.map(p=>`<option ${step.priority===p?'selected':''}>${p}</option>`).join('')}</select>
   </label>
   ${field(`pb_${stage}_${idx}_offset`,'Giorni da attivazione (+gg)',step.offsetDays,'number')}
   ${field(`pb_${stage}_${idx}_notes`,'Istruzioni operative',step.notes,'text',true)}
  </div>
  <button type="button" class="text-button remove-referent" data-remove-pb-step="true">Rimuovi passo</button>
 </fieldset>`;
}

function openPlaybookEditor(){
 const pb=getPlaybooks();
 playbookSession={seq:{Lead:pb.Lead.length,Prospect:pb.Prospect.length,Cliente:pb.Cliente.length}};
 $('#playbook-error').hidden=true;
 $('#playbook-fields').innerHTML=stages.map(s=>`
  <div class="playbook-stage-block">
   <div class="panel-title" style="padding:10px 0;border-bottom:2px solid var(--line);margin-bottom:10px">
    <h3>Playbook ${esc(s)}</h3>
    <button type="button" class="secondary-add" data-add-pb-step="${esc(s)}">+ Aggiungi passo ${esc(s)}</button>
   </div>
   <div id="pb-rows-${esc(s)}">${pb[s].map((step,i)=>playbookStepRow(s,i,step)).join('')}</div>
  </div>`).join('');
 if(!$('#playbook-editor').open)$('#playbook-editor').showModal();
}

function savePlaybooks(formOrValues){
 try{
  const raw=formOrValues instanceof FormData?Object.fromEntries(formOrValues):formOrValues?.values?formOrValues.values:Object.fromEntries(new FormData(formOrValues));
  const custom={Lead:[],Prospect:[],Cliente:[]};
  const grouped={Lead:new Map(),Prospect:new Map(),Cliente:new Map()};
  for(const [k,v] of Object.entries(raw)){
   const m=/^pb_(Lead|Prospect|Cliente)_(\d+)_(title|type|priority|offset|notes)$/.exec(k);
   if(m){
    const map=grouped[m[1]];
    if(!map.has(m[2]))map.set(m[2],{});
    map.get(m[2])[m[3]]=String(v).trim();
   }
  }
  for(const s of stages){
   custom[s]=[...grouped[s].values()].filter(x=>x.title).map(x=>({
    title:x.title,
    type:x.type||'Chiamata',
    priority:x.priority||'Media',
    offsetDays:Math.round(quoteDecimal(x.offset??'0')),
    notes:x.notes||''
   }));
   if(!custom[s].length)throw Error(`Il Playbook ${s} deve contenere almeno un’attività.`);
  }
  const next=structuredClone(state);
  next.playbooks=custom;
  validate(next);
  if(!persist(next))return false;
  if($('#playbook-editor').open)$('#playbook-editor').close();
  playbookSession=null;
  render();
  toast('Playbook personalizzati salvati per Lead, Prospect e Clienti.');
  return true;
 }catch(error){
  $('#playbook-error').textContent=error.message;
  $('#playbook-error').hidden=false;
  return false;
 }
}

function resetPlaybooks(){
 const next=structuredClone(state);
 delete next.playbooks;
 if(!persist(next))return false;
 if($('#playbook-editor').open)$('#playbook-editor').close();
 playbookSession=null;
 render();
 toast('Playbook ripristinati ai modelli predefiniti Apex Digital.');
 return true;
}

// Theme (Light / Dark / AMOLED) & Density (Comfortable / Compact)
function getUiSettings(){
 try{
  const saved=JSON.parse(localStorage.getItem(UI_KEY)||'{}');
  return {
   theme:['light','dark','amoled'].includes(saved.theme)?saved.theme:(state.uiSettings?.theme||'light'),
   density:['comfortable','compact'].includes(saved.density)?saved.density:(state.uiSettings?.density||'comfortable')
  };
 }catch{
  return {...defaultUiSettings};
 }
}

function applyUiSettings(settings=getUiSettings()){
 const theme=['light','dark','amoled'].includes(settings.theme)?settings.theme:'light';
 const density=['comfortable','compact'].includes(settings.density)?settings.density:'comfortable';
 if(typeof document!=='undefined'&&document.body&&document.body.dataset){
  document.body.dataset.theme=theme;
  document.body.dataset.density=density;
 }
 try{localStorage.setItem(UI_KEY,JSON.stringify({theme,density}));}catch{}
 const themeBtn=document.querySelector('#theme-toggle');
 if(themeBtn)themeBtn.textContent=theme==='light'?'🌙 Scuro':theme==='dark'?'● AMOLED':'☀ Chiaro';
 const densityBtn=document.querySelector('#density-toggle');
 if(densityBtn)densityBtn.textContent=density==='compact'?'↕ Confortevole':'⚡ Compatta';
 return {theme,density};
}

function cycleTheme(){
 const cur=getUiSettings();
 const nextTheme=cur.theme==='light'?'dark':cur.theme==='dark'?'amoled':'light';
 const applied=applyUiSettings({...cur,theme:nextTheme});
 toast(`Tema attivo: ${applied.theme==='light'?'Chiaro Executive':applied.theme==='dark'?'Scuro Slate':'Nero Assoluto AMOLED'}.`);
 return applied.theme;
}

function toggleDensity(){
 const cur=getUiSettings();
 const nextDensity=cur.density==='comfortable'?'compact':'comfortable';
 const applied=applyUiSettings({...cur,density:nextDensity});
 toast(`Densità interfaccia: ${applied.density==='compact'?'Compatta':'Confortevole'}.`);
 return applied.density;
}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.id==='open-finance-config'){openFinanceEditor();return;}
 if(b.id==='toggle-revenue-form'){$('#revenue-inline-form')?.classList.toggle('hidden');return;}
 if(b.dataset.deleteRevenue){deleteHistoricalRevenue(b.dataset.deleteRevenue);return;}
 if(b.id==='open-playbook-editor'||b.dataset.openPlaybooks){openPlaybookEditor();return;}
 if(b.dataset.addPbStep&&playbookSession){
  const s=b.dataset.addPbStep;
  $(`#pb-rows-${s}`)?.insertAdjacentHTML('beforeend',playbookStepRow(s,playbookSession.seq[s]++));
  return;
 }
 if(b.dataset.removePbStep){b.closest('.pb-step-row')?.remove();return;}
 if(b.id==='playbook-reset'){resetPlaybooks();return;}
 if(b.id==='theme-toggle'){cycleTheme();return;}
 if(b.id==='density-toggle'){toggleDensity();return;}
});

document.addEventListener('submit',e=>{
 if(e.target.id==='revenue-inline-form'){e.preventDefault();addHistoricalRevenue(e.target);}
 if(e.target.id==='finance-form'){e.preventDefault();saveFinanceConfig(e.target);}
 if(e.target.id==='playbook-form'){e.preventDefault();savePlaybooks(e.target);}
});

if(document.querySelector('#finance-cancel')){
 document.querySelector('#finance-cancel').onclick=()=>$('#finance-editor').close();
}
if(document.querySelector('#finance-close')){
 document.querySelector('#finance-close').onclick=()=>$('#finance-editor').close();
}
if(document.querySelector('#playbook-cancel')){
 document.querySelector('#playbook-cancel').onclick=()=>{$('#playbook-editor').close();playbookSession=null;};
}
if(document.querySelector('#playbook-close')){
 document.querySelector('#playbook-close').onclick=()=>{$('#playbook-editor').close();playbookSession=null;};
}

applyUiSettings();


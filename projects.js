'use strict';
let projectSession=null,projectStatusFilter='',projectLayout='board',projectSort='due';
const projectStatuses=['Pianificato','In corso','In revisione','Completato','In pausa'];
const defaultProjectMilestones=[
 {title:'Kick-off e analisi tecnica requisiti',offsetDays:2},
 {title:'Sviluppo prototipo e integrazione flussi',offsetDays:10},
 {title:'Collaudo operativo (UAT) con il cliente',offsetDays:18},
 {title:'Rilascio in produzione e formazione referenti',offsetDays:25}
];

function projectProgress(p){
 const ms=p?.milestones||[];
 if(!ms.length)return p?.status==='Completato'?100:0;
 const done=ms.filter(m=>m.done===true).length;
 return Math.round((done/ms.length)*100);
}
function projectMarginCents(p){
 return (Number(p?.budgetCents)||0)-(Number(p?.costCents)||0);
}
function projectStatusPill(s){
 return s==='Completato'?'green':s==='In corso'?'':s==='In revisione'?'amber':s==='In pausa'?'red':'';
}

function validateProjects(data){
 if(data.projects==null)return;
 if(!Array.isArray(data.projects))throw Error('Progetti non validi');
 const ids=new Set();
 for(const p of data.projects){
  if(!p||typeof p.id!=='string'||!p.id||ids.has(p.id))throw Error('Identificativo progetto non valido');
  ids.add(p.id);
  if(typeof p.contactId!=='string'||!data.contacts.some(c=>c.id===p.contactId))throw Error('Azienda progetto non valida');
  if(typeof p.name!=='string'||!p.name.trim())throw Error('Nome progetto obbligatorio');
  if(!projectStatuses.includes(p.status))throw Error('Stato progetto non valido');
  if(!Number.isSafeInteger(p.budgetCents)||p.budgetCents<0)throw Error('Budget progetto non valido');
  if(!Number.isSafeInteger(p.costCents)||p.costCents<0)throw Error('Costo progetto non valido');
  if(!Number.isFinite(p.estimatedHours)||p.estimatedHours<0||!Number.isFinite(p.loggedHours)||p.loggedHours<0)throw Error('Ore progetto non valide');
  if(p.startDate&&!validDate(p.startDate))throw Error('Data inizio progetto non valida');
  if(p.endDate&&!validDate(p.endDate))throw Error('Data consegna progetto non valida');
  if(p.dealId&&!data.deals.some(d=>d.id===p.dealId&&d.contactId===p.contactId))throw Error('Opportunità progetto incoerente');
  if(p.quoteId&&!(data.quotes||[]).some(q=>q.id===p.quoteId&&q.contactId===p.contactId))throw Error('Preventivo progetto incoerente');
  if(p.notes!=null&&typeof p.notes!=='string')throw Error('Note progetto non valide');
  if(!Array.isArray(p.milestones))throw Error('Milestone progetto non valide');
  const mids=new Set();
  for(const m of p.milestones){
   if(!m||typeof m.id!=='string'||!m.id||mids.has(m.id)||typeof m.title!=='string'||!m.title.trim()||typeof m.done!=='boolean')throw Error('Milestone non valida');
   if(m.dueDate&&!validDate(m.dueDate))throw Error('Data milestone non valida');
   if(m.dependsOn&&typeof m.dependsOn!=='string')throw Error('Dipendenza milestone non valida');
   mids.add(m.id);
  }
  for(const m of p.milestones){
   if(m.dependsOn&&(m.dependsOn===m.id||!mids.has(m.dependsOn)))throw Error('Dipendenza milestone inesistente o circolare');
   if(m.done&&m.dependsOn){
    const prereq=p.milestones.find(x=>x.id===m.dependsOn);
    if(prereq&&!prereq.done)throw Error(`La milestone "${m.title}" richiede prima il completamento di "${prereq.title}".`);
   }
  }
 }
}

function milestoneRowHtml(idx,m={id:'',title:'',dueDate:'',done:false,dependsOn:''},allMilestones=[]){
 const id=m.id||crypto.randomUUID();
 const depOptions=allMilestones.filter(x=>x.id&&x.id!==id).map(x=>`<option value="${esc(x.id)}" ${m.dependsOn===x.id?'selected':''}>${esc(x.title)}</option>`).join('');
 return `<fieldset class="quote-line milestone-row">
  <legend>Milestone #${idx+1}</legend>
  <input type="hidden" name="ms_${idx}_id" value="${esc(id)}">
  <div class="quote-line-grid">
   ${field('ms_'+idx+'_title','Titolo milestone *',m.title,'text',true)}
   ${field('ms_'+idx+'_due','Scadenza',m.dueDate,'date')}
   <label class="field">Dipende da
    <select name="ms_${idx}_dep">
     <option value="">Nessuna dipendenza</option>
     ${depOptions}
    </select>
   </label>
   <label class="field"><span style="margin-top:22px;display:inline-flex;align-items:center;gap:6px"><input type="checkbox" style="width:auto" name="ms_${idx}_done" ${m.done?'checked':''}> Completata</span></label>
  </div>
  <button type="button" class="text-button remove-referent" data-remove-milestone="true">Rimuovi milestone</button>
 </fieldset>`;
}

function openProjectEditor(id=null,overrides={}){
 if(!state.contacts.length){toast('Aggiungi prima un’azienda.');openEditor('contact');return;}
 const existing=(state.projects||[]).find(x=>x.id===id);
 const defaultContactId=existing?.contactId||overrides.contactId||state.contacts.find(c=>contactStage(c.id)==='Cliente')?.id||state.contacts[0].id;
 const linkedDeal=overrides.dealId?state.deals.find(d=>d.id===overrides.dealId):null;
 const item=existing||{
  contactId:defaultContactId,
  dealId:overrides.dealId||'',
  quoteId:overrides.quoteId||'',
  name:overrides.name||(linkedDeal?`Consegna: ${linkedDeal.title}`:''),
  status:overrides.status||'In corso',
  startDate:overrides.startDate||today(),
  endDate:overrides.endDate||(typeof addDays==='function'?addDays(today(),25):today()),
  budgetCents:overrides.budgetCents??(linkedDeal?Math.round(linkedDeal.setup*100):0),
  costCents:overrides.costCents??0,
  estimatedHours:overrides.estimatedHours??20,
  loggedHours:overrides.loggedHours??0,
  milestones:overrides.milestones||defaultProjectMilestones.map((m,i,arr)=>{
   const mid='ms-init-'+(i+1);
   return {id:mid,title:m.title,dueDate:typeof addDays==='function'?addDays(today(),m.offsetDays):today(),done:false,dependsOn:i>0?'ms-init-'+i:''};
  }),
  notes:overrides.notes||''
 };
 projectSession={id:existing?.id||null,snap:existing?JSON.stringify(existing):null,msSeq:item.milestones.length};
 $('#project-title').textContent=existing?'Modifica progetto':'Nuovo progetto / commessa';
 $('#project-error').hidden=true;
 $('#project-delete').classList.toggle('hidden',!existing);
 $('#project-fields').innerHTML=`
  <div class="field-grid">
   <h3 class="form-section">Anagrafica e collegamento commessa</h3>
   ${field('name','Nome progetto / commessa *',item.name,'text',true)}
   <label class="field">Azienda cliente *
    <select name="contactId" id="project-company" required>
     ${state.contacts.map(c=>`<option value="${esc(c.id)}" ${item.contactId===c.id?'selected':''}>${esc(c.company)} (${contactStage(c.id)})</option>`).join('')}
    </select>
   </label>
   <label class="field">Stato progetto
    <select name="status">${projectStatuses.map(s=>`<option ${item.status===s?'selected':''}>${s}</option>`).join('')}</select>
   </label>
   <label class="field">Opportunità collegata
    <select name="dealId" id="project-deal">${quoteDealOptions(item.contactId,item.dealId||'')}</select>
   </label>
   <label class="field">Preventivo collegato
    <select name="quoteId" id="project-quote">${typeof taskQuoteOptions==='function'?taskQuoteOptions(item.contactId,item.quoteId||''):'<option value="">Nessun preventivo</option>'}</select>
   </label>
   ${field('startDate','Data avvio',item.startDate,'date')}
   ${field('endDate','Data consegna prevista',item.endDate,'date')}
   <h3 class="form-section">Controllo economico e ore</h3>
   ${field('budgetEur','Budget ricavo commessa (€)',(item.budgetCents/100).toFixed(2),'number')}
   ${field('costEur','Costo operativo / fornitura (€)',(item.costCents/100).toFixed(2),'number')}
   ${field('estimatedHours','Ore stimate',item.estimatedHours,'number')}
   ${field('loggedHours','Ore effettive erogate',item.loggedHours,'number')}
   ${area('notes','Note di progetto, ambienti e consegne',item.notes)}
  </div>
  <h3 class="form-section" style="margin:18px 0 10px">Milestone, scadenze e dipendenze</h3>
  <div id="project-milestones">${item.milestones.map((m,i)=>milestoneRowHtml(i,m,item.milestones)).join('')}</div>
  <button type="button" id="add-project-milestone" class="secondary-add">+ Aggiungi milestone</button>`;
 if(!$('#project-editor').open)$('#project-editor').showModal();
}

function saveProject(formOrValues){
 if(!projectSession)return false;
 try{
  const raw=formOrValues instanceof FormData?Object.fromEntries(formOrValues):formOrValues?.values?formOrValues.values:Object.fromEntries(new FormData(formOrValues));
  const data={};
  for(const [k,v] of Object.entries(raw))data[k]=typeof v==='string'?v.trim():v;
  const old=projectSession.id?(state.projects||[]).find(p=>p.id===projectSession.id):null;
  if(projectSession.id&&(!old||JSON.stringify(old)!==projectSession.snap))throw Error('Progetto modificato in un’altra sessione: riapri la scheda.');
  const c=contact(data.contactId);
  if(!c||!data.name)throw Error('Indica azienda e nome del progetto.');
  if(!projectStatuses.includes(data.status))throw Error('Stato progetto non valido.');
  if(data.startDate&&!validDate(data.startDate))throw Error('Data di avvio non valida.');
  if(data.endDate&&!validDate(data.endDate))throw Error('Data di consegna non valida.');
  if(data.startDate&&data.endDate&&data.endDate<data.startDate)throw Error('La data di consegna non può precedere la data di avvio.');
  if(data.dealId&&!state.deals.some(d=>d.id===data.dealId&&d.contactId===c.id))throw Error('L’opportunità deve appartenere all’azienda selezionata.');
  if(data.quoteId&&!(state.quotes||[]).some(q=>q.id===data.quoteId&&q.contactId===c.id))throw Error('Il preventivo deve appartenere all’azienda selezionata.');

  const budgetCents=Math.round(quoteDecimal(data.budgetEur??'0')*100);
  const costCents=Math.round(quoteDecimal(data.costEur??'0')*100);
  const estimatedHours=quoteDecimal(data.estimatedHours??'0');
  const loggedHours=quoteDecimal(data.loggedHours??'0');

  const msMap=new Map();
  for(const [k,v] of Object.entries(data)){
   const m=/^ms_(\d+)_(id|title|due|dep|done)$/.exec(k);
   if(m){if(!msMap.has(m[1]))msMap.set(m[1],{});msMap.get(m[1])[m[2]]=v;}
  }
  const milestones=[...msMap.values()].filter(m=>m.title||m.due).map(m=>({
   id:m.id||crypto.randomUUID(),
   title:String(m.title||'').trim(),
   dueDate:String(m.due||'').trim(),
   dependsOn:String(m.dep||'').trim(),
   done:m.done==='on'||m.done===true
  }));
  for(const m of milestones){if(!m.title)throw Error('Ogni milestone richiede un titolo.');}

  const next=structuredClone(state);
  next.projects=next.projects||[];
  const record={
   id:old?.id||crypto.randomUUID(),
   contactId:c.id,
   dealId:data.dealId||'',
   quoteId:data.quoteId||'',
   name:data.name,
   status:data.status,
   startDate:data.startDate||'',
   endDate:data.endDate||'',
   budgetCents,
   costCents,
   estimatedHours,
   loggedHours,
   milestones,
   notes:data.notes||''
  };
  const idx=next.projects.findIndex(x=>x.id===record.id);
  if(idx<0)next.projects.push(record);else next.projects[idx]=record;

  const targetContact=next.contacts.find(x=>x.id===c.id);
  targetContact.history=targetContact.history||[];
  targetContact.history.push({
   date:today(),
   kind:'project',
   text:old?`Progetto aggiornato: ${record.name} (${record.status} · ${projectProgress(record)}%).`:`Progetto avviato: ${record.name} (${record.status}).`
  });

  validate(next);
  if(!persist(next))return false;
  $('#project-editor').close();
  projectSession=null;
  if($('#editor').open&&editing?.id)openEditor(editing.type,editing.id);
  render();
  toast('Progetto salvato.');
  return true;
 }catch(error){
  $('#project-error').textContent=error.message;
  $('#project-error').hidden=false;
  return false;
 }
}

function toggleMilestone(projectId,milestoneId){
 const p=(state.projects||[]).find(x=>x.id===projectId);
 if(!p)return false;
 const next=structuredClone(state);
 const target=next.projects.find(x=>x.id===projectId);
 const ms=target.milestones.find(m=>m.id===milestoneId);
 if(!ms)return false;
 const nextDone=!ms.done;
 if(nextDone&&ms.dependsOn){
  const prereq=target.milestones.find(m=>m.id===ms.dependsOn);
  if(prereq&&!prereq.done){toast(`Completa prima la milestone preliminare: "${prereq.title}".`);return false;}
 }
 if(!nextDone){
  const dependentDone=target.milestones.find(m=>m.dependsOn===ms.id&&m.done);
  if(dependentDone){toast(`Non puoi riaprire "${ms.title}" mentre "${dependentDone.title}" risulta completata.`);return false;}
 }
 ms.done=nextDone;
 if(target.milestones.length&&target.milestones.every(m=>m.done))target.status='Completato';
 const c=next.contacts.find(x=>x.id===target.contactId);
 if(c){c.history=c.history||[];c.history.push({date:today(),kind:'project',text:`Milestone ${ms.done?'completata':'riaperta'} in ${target.name}: ${ms.title}.`});}
 try{validate(next);}catch(e){toast(e.message);return false;}
 if(!persist(next))return false;
 render();
 toast(`Milestone "${ms.title}" ${ms.done?'completata':'riaperta'}.`);
 return true;
}

function deleteProject(id=projectSession?.id){
 const existing=(state.projects||[]).find(p=>p.id===id);
 if(!existing)return false;
 if(!confirm('Eliminare questo progetto? L’operazione non può essere annullata.'))return false;
 const next=structuredClone(state);
 next.projects=(next.projects||[]).filter(p=>p.id!==id);
 try{validate(next);}catch{return false;}
 if(!persist(next))return false;
 if($('#project-editor').open)$('#project-editor').close();
 projectSession=null;
 render();
 toast('Progetto eliminato.');
 return true;
}

function visibleProjects(){
 return (state.projects||[]).filter(p=>{
  if(projectStatusFilter&&p.status!==projectStatusFilter)return false;
  const c=contact(p.contactId);
  return matches(p.name,p.status,p.notes,c?.company,...(p.milestones||[]).map(m=>m.title));
 }).sort((a,b)=>{
  if(projectSort==='budget')return b.budgetCents-a.budgetCents;
  if(projectSort==='progress')return projectProgress(b)-projectProgress(a);
  if(projectSort==='name')return a.name.localeCompare(b.name,'it',{sensitivity:'base'});
  return (a.endDate||'9999').localeCompare(b.endDate||'9999');
 });
}

function projectsView(){
 const all=state.projects||[],rows=visibleProjects();
 const active=all.filter(p=>['Pianificato','In corso','In revisione'].includes(p.status));
 const totalBudget=all.reduce((n,p)=>n+p.budgetCents,0);
 const totalMargin=all.reduce((n,p)=>n+projectMarginCents(p),0);
 const totalHours=all.reduce((n,p)=>n+p.loggedHours,0);
 const estHours=all.reduce((n,p)=>n+p.estimatedHours,0);
 return `
  <div class="stats">
   <div class="stat">
    <span class="stat-label">Progetti attivi</span>
    <strong>${active.length.toString().padStart(2,'0')}</strong>
    <small>${all.filter(p=>p.status==='Completato').length} completati su ${all.length} totali</small>
   </div>
   <div class="stat">
    <span class="stat-label">Valore commesse</span>
    <strong>${quoteMoney(totalBudget)}</strong>
    <small>Budget complessivo progetti</small>
   </div>
   <div class="stat accent">
    <span class="stat-label">Margine operativo</span>
    <strong>${quoteMoney(totalMargin)}</strong>
    <small>${totalBudget>0?Math.round((totalMargin/totalBudget)*100):0}% margine su budget</small>
   </div>
   <div class="stat">
    <span class="stat-label">Ore erogate / stimate</span>
    <strong>${totalHours} / ${estHours} h</strong>
    <small>Controllo avanzamento operativo</small>
   </div>
  </div>
  <div class="toolbar">
   <input id="search" aria-label="Cerca progetto" placeholder="Cerca progetto, cliente o milestone…" value="${esc(search)}">
   <select id="project-status-filter" aria-label="Filtra stato progetto">
    <option value="">Tutti gli stati</option>
    ${projectStatuses.map(s=>`<option ${projectStatusFilter===s?'selected':''}>${s}</option>`).join('')}
   </select>
   <div class="list-controls">
    <span class="result-count">${rows.length} progetti</span>
    <label class="sort-label">Ordina per
     <select id="project-sort" aria-label="Ordina progetti">
      <option value="due" ${projectSort==='due'?'selected':''}>Consegna prevista</option>
      <option value="budget" ${projectSort==='budget'?'selected':''}>Budget maggiore</option>
      <option value="progress" ${projectSort==='progress'?'selected':''}>Avanzamento %</option>
      <option value="name" ${projectSort==='name'?'selected':''}>Nome A–Z</option>
     </select>
    </label>
    <div class="view-toggle" role="group" aria-label="Vista progetti">
     <button type="button" data-project-layout="board" aria-pressed="${projectLayout==='board'}" class="${projectLayout==='board'?'selected':''}">▥ Bacheca</button>
     <button type="button" data-project-layout="gantt" aria-pressed="${projectLayout==='gantt'}" class="${projectLayout==='gantt'?'selected':''}">▤ Cronoprogramma &amp; Costi</button>
    </div>
    <button type="button" id="export-csv" ${!rows.length?'disabled':''}>↓ Esporta CSV</button>
   </div>
  </div>
  ${projectLayout==='board'?projectsBoard(rows):projectsGanttTable(rows)}`;
}

function projectsBoard(rows){
 const cols=projectStatusFilter?[projectStatusFilter]:projectStatuses;
 return `<div class="board">
  ${cols.map((s,idx)=>{
   const items=rows.filter(p=>p.status===s);
   return `<section class="column stage-${idx%5}">
    <div class="column-heading">
     <h3>${s}<span>${items.length}</span></h3>
     <div class="column-value">${quoteMoney(items.reduce((n,p)=>n+p.budgetCents,0))}<small>valore commesse</small></div>
    </div>
    <div class="column-body">
     ${items.map(p=>{
      const prog=projectProgress(p),c=contact(p.contactId),margin=projectMarginCents(p);
      return `<div class="deal-container project-card">
       <div class="deal">
        <div class="task-card-badges">
         <span class="pill ${projectStatusPill(p.status)}">${esc(p.status)}</span>
         <span class="pill">${prog}% completato</span>
        </div>
        <strong>${esc(p.name)}</strong>
        <p><button type="button" class="text-button" data-edit-contact="${esc(p.contactId)}">${esc(c?.company||'Cliente')}</button></p>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${prog}%"></div></div>
        <div class="amount">${quoteMoney(p.budgetCents)} <small>· Margine ${quoteMoney(margin)}</small></div>
        <small>⏱ Ore: ${p.loggedHours} / ${p.estimatedHours} h · Consegna: ${p.endDate?date(p.endDate):'Da definire'}</small>
        <div class="milestone-mini-list">
         ${(p.milestones||[]).map(m=>`<button type="button" class="milestone-chip ${m.done?'done':''}" data-toggle-ms="${esc(m.id)}" data-ms-project="${esc(p.id)}" title="${m.dependsOn?'Con dipendenza':''}">
          <span>${m.done?'✓':'○'}</span> ${esc(m.title)}
         </button>`).join('')}
        </div>
       </div>
       <button type="button" class="phase-action" data-edit-project="${esc(p.id)}">Apri commessa &amp; milestone ↗</button>
      </div>`;
     }).join('')}
     ${!items.length?'<div class="empty">Nessun progetto in questa colonna</div>':''}
    </div>
   </section>`;
  }).join('')}
 </div>`;
}

function projectsGanttTable(rows){
 return `<div class="panel">${rows.length?`<div class="table-wrap"><table>
  <thead><tr><th>Progetto / Cliente</th><th>Stato &amp; Avanzamento</th><th>Cronoprogramma &amp; Milestone</th><th>Budget / Costi / Margine</th><th>Ore</th><th></th></tr></thead>
  <tbody>${rows.map(p=>{
   const c=contact(p.contactId),prog=projectProgress(p),margin=projectMarginCents(p);
   return `<tr>
    <td><strong>${esc(p.name)}</strong><small>${esc(c?.company||'—')}</small></td>
    <td data-label="Stato & Avanzamento"><span class="pill ${projectStatusPill(p.status)}">${esc(p.status)}</span><div class="progress-bar-wrap" style="margin-top:8px"><div class="progress-bar-fill" style="width:${prog}%"></div></div><small>${prog}% completato</small></td>
    <td data-label="Cronoprogramma & Milestone"><small>${p.startDate?date(p.startDate):'—'} → ${p.endDate?date(p.endDate):'—'}</small>
     <div class="milestone-mini-list">${(p.milestones||[]).map(m=>`<button type="button" class="milestone-chip ${m.done?'done':''}" data-toggle-ms="${esc(m.id)}" data-ms-project="${esc(p.id)}">${m.done?'✓':'○'} ${esc(m.title)}${m.dueDate?' ('+date(m.dueDate)+')':''}</button>`).join('')}</div>
    </td>
    <td data-label="Budget / Costi / Margine"><strong class="money-atomic">${quoteMoney(p.budgetCents)}</strong><small>Costo: ${quoteMoney(p.costCents)} · Margine: ${quoteMoney(margin)}</small></td>
    <td data-label="Ore">${p.loggedHours} / ${p.estimatedHours} h</td>
    <td class="cell-actions"><div class="row-actions"><button type="button" class="text-button" data-edit-project="${esc(p.id)}">Modifica ↗</button></div></td>
   </tr>`;
  }).join('')}</tbody>
 </table></div>`:empty('Nessun progetto attivo','Avvia una commessa per monitorare consegne, milestone, dipendenze e marginalità dei clienti.','+ Nuovo progetto','project')}</div>`;
}

function contactProjectsSection(contactId){
 const list=(state.projects||[]).filter(p=>p.contactId===contactId);
 return `<section class="related-deals">
  <div class="panel-title">
   <h2>Progetti e consegne <span class="pill">${list.length}</span></h2>
   <button type="button" class="text-button" data-new-contact-project="${esc(contactId)}">+ Nuovo progetto</button>
  </div>
  ${list.length?list.map(p=>`<div class="related-row">
   <button type="button" class="text-button" data-edit-project="${esc(p.id)}"><strong>${esc(p.name)}</strong> <small>(${projectProgress(p)}% · ${p.loggedHours}/${p.estimatedHours}h)</small></button>
   <span class="pill ${projectStatusPill(p.status)}">${esc(p.status)}</span>
   <strong>${quoteMoney(p.budgetCents)}</strong>
  </div>`).join(''):'<p class="related-empty">Nessun progetto attivo per questa azienda.</p>'}
 </section>`;
}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.new==='project'){openProjectEditor();return;}
 if(b.dataset.editProject){openProjectEditor(b.dataset.editProject);return;}
 if(b.dataset.newContactProject){openProjectEditor(null,{contactId:b.dataset.newContactProject});return;}
 if(b.dataset.projectLayout){projectLayout=b.dataset.projectLayout;render();return;}
 if(b.dataset.toggleMs){toggleMilestone(b.dataset.msProject,b.dataset.toggleMs);return;}
 if(b.id==='add-project-milestone'&&projectSession){
  $('#project-milestones').insertAdjacentHTML('beforeend',milestoneRowHtml(projectSession.msSeq++));
  return;
 }
 if(b.dataset.removeMilestone){b.closest('.milestone-row')?.remove();return;}
});

document.addEventListener('change',e=>{
 if(e.target.id==='project-company'){
  const cid=e.target.value;
  if($('#project-deal'))$('#project-deal').innerHTML=quoteDealOptions(cid);
  if($('#project-quote')&&typeof taskQuoteOptions==='function')$('#project-quote').innerHTML=taskQuoteOptions(cid);
 }
 if(e.target.id==='project-status-filter'){projectStatusFilter=e.target.value;render();}
 if(e.target.id==='project-sort'){projectSort=e.target.value;render();}
});

if(document.querySelector('#project-form')){
 document.querySelector('#project-form').addEventListener('submit',e=>{e.preventDefault();saveProject(e.target);});
}
if(document.querySelector('#project-cancel')){
 document.querySelector('#project-cancel').onclick=()=>{$('#project-editor').close();projectSession=null;};
}
if(document.querySelector('#project-close')){
 document.querySelector('#project-close').onclick=()=>{$('#project-editor').close();projectSession=null;};
}
if(document.querySelector('#project-delete')){
 document.querySelector('#project-delete').onclick=()=>deleteProject();
}
if(document.querySelector('#project-editor')){
 document.querySelector('#project-editor').addEventListener('cancel',()=>{projectSession=null;});
}


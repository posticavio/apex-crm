'use strict';
let taskSession=null,activityStageFilter='',activityStatusFilter='open',activityTypeFilter='',activityPriorityFilter='',activityLayout='board',activitySort='due',calendarCursor='',weekCursor='';
const activityTypes=['Chiamata','Email','Incontro / Demo','Follow-up','Analisi / Offerta','Onboarding / Consegna','Customer Care / Check-in','Altro'];
const activityPriorities=['Alta','Media','Bassa'];
const activityStatuses=['Da fare','In corso','Completata','Annullata'];
const activityCalendars=['Principale (Apex Digital)','Commerciale & Demo','Consegne & Progetti','Personale'];
function taskProjectOptions(contactId,selectedId=''){
 const all=state.projects||[];
 const companyProjects=all.filter(p=>p.contactId===contactId);
 const otherProjects=all.filter(p=>p.contactId!==contactId);
 return `<option value="">Nessun progetto collegato</option>${companyProjects.map(p=>`<option value="${esc(p.id)}" ${selectedId===p.id?'selected':''}>🚀 ${esc(p.name)}</option>`).join('')}${otherProjects.length?`<optgroup label="Altri progetti">${otherProjects.map(p=>`<option value="${esc(p.id)}" ${selectedId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</optgroup>`:''}`;
}
const activityPlaybooks={
 Lead:[
  {title:'Profilazione azienda e analisi preliminare',type:'Analisi / Offerta',priority:'Media',offsetDays:0,notes:'Verificare settore, processi operativi e referente decisionale.'},
  {title:'Primo contatto di qualifica (Email / Telefono)',type:'Chiamata',priority:'Alta',offsetDays:1,notes:'Presentare Apex Digital e verificare apertura a un confronto esplorativo.'},
  {title:'Discovery call esigenze di automazione e AI',type:'Incontro / Demo',priority:'Alta',offsetDays:3,notes:'Individuare il problema principale, gli strumenti attuali e il beneficio atteso.'}
 ],
 Prospect:[
  {title:'Mappatura tecnica del processo e stima ROI',type:'Analisi / Offerta',priority:'Alta',offsetDays:1,notes:'Raccogliere volumi, tempi attuali e requisiti di integrazione.'},
  {title:'Demo personalizzata soluzione AI / Automazione',type:'Incontro / Demo',priority:'Alta',offsetDays:3,notes:'Mostrare il flusso operativo applicato al caso concreto del prospect.'},
  {title:'Invio e revisione proposta commerciale',type:'Follow-up',priority:'Alta',offsetDays:5,notes:'Discutere preventivo, fasi di rilascio e condizioni economiche.'}
 ],
 Cliente:[
  {title:'Kick-off operativo e raccolta accessi tecnici',type:'Onboarding / Consegna',priority:'Alta',offsetDays:1,notes:'Allineare team, ambienti e cronoprogramma di attivazione.'},
  {title:'Consegna soluzione, collaudo e formazione team',type:'Onboarding / Consegna',priority:'Alta',offsetDays:7,notes:'Validare il flusso in produzione e formare i referenti.'},
  {title:'Check-in periodico risultati e nuove opportunità (Upsell)',type:'Customer Care / Check-in',priority:'Media',offsetDays:30,notes:'Misurare il beneficio ottenuto, verificare il canone e proporre estensioni.'}
 ]
};

function addDays(dateStr,days){
 const base=validDate(dateStr)?new Date(dateStr+'T12:00:00Z'):new Date(today()+'T12:00:00Z');
 base.setUTCDate(base.getUTCDate()+Number(days||0));
 return base.toISOString().slice(0,10);
}
function validTime(value){
 if(!value)return true;
 return typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function isOpenTask(a){return a&&['Da fare','In corso'].includes(a.status);}
function taskLifecycleStage(a){
 const c=contact(a?.contactId);
 return c?contactStage(c.id):(stages.includes(a?.lifecycleStage)?a.lifecycleStage:'Lead');
}
function taskPersonLabel(a){
 if(!a)return '';
 return companyPeople(contact(a.contactId)).find(p=>p.id===a.referentId)?.name||a.referentName||'';
}
function priorityRank(p){return p==='Alta'?0:p==='Media'?1:2;}
function priorityPillClass(p){return p==='Alta'?'red':p==='Media'?'amber':'';}
function statusPillClass(s){return s==='Completata'?'green':s==='Annullata'?'red':s==='In corso'?'amber':'';}

function companyTasks(contactId){
 return (state.activities||[]).filter(a=>a.contactId===contactId).sort((a,b)=>{
  if(isOpenTask(a)!==isOpenTask(b))return isOpenTask(a)?-1:1;
  return (a.dueDate||'9999').localeCompare(b.dueDate||'9999')||priorityRank(a.priority)-priorityRank(b.priority)||a.title.localeCompare(b.title,'it',{sensitivity:'base'});
 });
}
function openCompanyTasks(contactId){return companyTasks(contactId).filter(isOpenTask);}
function dealTasks(dealId){return (state.activities||[]).filter(a=>a.dealId===dealId);}

function validateActivities(data){
 if(data.activities==null)return;
 if(!Array.isArray(data.activities))throw Error('Attività non valide');
 const ids=new Set();
 for(const a of data.activities){
  if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id))throw Error('Identificativo attività non valido');
  ids.add(a.id);
  if(typeof a.contactId!=='string'||!data.contacts.some(c=>c.id===a.contactId))throw Error('Azienda attività non valida');
  if(typeof a.title!=='string'||!a.title.trim())throw Error('Titolo attività obbligatorio');
  if(!activityTypes.includes(a.type))throw Error('Tipo attività non valido');
  if(!activityPriorities.includes(a.priority))throw Error('Priorità attività non valida');
  if(!activityStatuses.includes(a.status))throw Error('Stato attività non valido');
  if(a.dueDate&&!validDate(a.dueDate))throw Error('Data attività non valida');
  if(a.dueTime&&!validTime(a.dueTime))throw Error('Orario attività non valido');
  if(a.dealId&&!data.deals.some(d=>d.id===a.dealId&&d.contactId===a.contactId))throw Error('Opportunità attività incoerente');
  if(a.quoteId&&!(data.quotes||[]).some(q=>q.id===a.quoteId&&q.contactId===a.contactId))throw Error('Preventivo attività incoerente');
  for(const k of ['referentId','referentName','notes','outcome','createdAt','completedAt','lifecycleStage','reason','lastOutcome','lastContactDate','source','sourceId','waitingFor','projectId'])if(a[k]!=null&&typeof a[k]!=='string')throw Error('Campo attività non valido');
  if(a.createdAt&&!validDate(a.createdAt))throw Error('Data creazione attività non valida');
  if(a.completedAt&&!validDate(a.completedAt))throw Error('Data completamento attività non valida');
 }
}

function taskQuoteOptions(companyId,value=''){
 const list=(state.quotes||[]).filter(q=>q.contactId===companyId);
 return '<option value="">Nessun preventivo</option>'+list.map(q=>{const v=latestQuote(q);return `<option value="${esc(q.id)}" ${value===q.id?'selected':''}>${esc(v.number)} · ${esc(v.title)}</option>`;}).join('');
}

function openTaskEditor(id=null,overrides={}){
 if(!state.contacts.length){toast('Aggiungi prima un’azienda per pianificare un’attività.');openEditor('contact');return;}
 const existing=(state.activities||[]).find(x=>x.id===id);
 const defaultContactId=existing?.contactId||overrides.contactId||(view==='lead'?visibleContacts(false)[0]?.id:view==='prospect'?visibleContacts(false)[0]?.id:view==='clienti'?visibleContacts(true)[0]?.id:state.contacts[0].id)||state.contacts[0].id;
 const item=existing||{
  contactId:defaultContactId,
  dealId:overrides.dealId||'',
  quoteId:overrides.quoteId||'',
  projectId:overrides.projectId||'',
  referentId:overrides.referentId||'',
  referentName:overrides.referentName||'',
  personName:overrides.personName||'',
  calendar:overrides.calendar||'Principale (Apex Digital)',
  calendarUrl:overrides.calendarUrl||'',
  title:overrides.title||'',
  type:overrides.type||(contactStage(defaultContactId)==='Cliente'?'Customer Care / Check-in':contactStage(defaultContactId)==='Prospect'?'Incontro / Demo':'Chiamata'),
  priority:overrides.priority||'Media',
  status:overrides.status||'Da fare',
  dueDate:overrides.dueDate??today(),
  dueTime:overrides.dueTime||'',
  notes:overrides.notes||'',
  outcome:overrides.outcome||''
 };
 const stage=contactStage(item.contactId);
 taskSession={id:existing?.id||null,updatedSnap:existing?JSON.stringify(existing):null};
 $('#task-title').textContent=existing?(overrides.status==='Completata'?'Completa attività':'Modifica attività / evento'):`Nuova attività / evento · ${stage}`;
 $('#task-error').hidden=true;
 $('#task-delete').classList.toggle('hidden',!existing);
 const templates=(typeof getPlaybooks==='function'?getPlaybooks():activityPlaybooks)[stage]||activityPlaybooks.Lead;
 $('#task-fields').innerHTML=`
  <div class="task-playbook-Quickbar">
   <div>
    <span class="pill ${stage==='Cliente'?'green':stage==='Prospect'?'amber':''}">Fase azienda: ${esc(stage)}</span>
    <small>Scegli un modello rapido per ${esc(stage)} oppure compila liberamente</small>
   </div>
   <div class="task-template-controls">
    <select id="task-template-select" aria-label="Modello attività per fase">
     <option value="">— Modelli rapidi per ${esc(stage)} —</option>
     ${templates.map((t,i)=>`<option value="${i}">${esc(t.title)} (${esc(t.type)})</option>`).join('')}
    </select>
    <button type="button" id="apply-task-template" class="secondary-add">Applica modello</button>
    <button type="button" data-open-playbooks="true" class="text-button">⚙ Personalizza</button>
   </div>
  </div>
  <div class="field-grid">
   <h3 class="form-section">Destinatario, persona e progetto</h3>
   <label class="field">Azienda (Lead / Prospect / Cliente) *
    <select name="contactId" id="task-company" required>
     ${state.contacts.map(c=>`<option value="${esc(c.id)}" ${item.contactId===c.id?'selected':''}>${esc(c.company)} (${contactStage(c.id)})</option>`).join('')}
    </select>
   </label>
   <label class="field">Persona / Referente
    <select name="referentId" id="task-referent">${personOptions(item.contactId,item.referentId||'',item.referentName||'')}</select>
   </label>
   <label class="field">Nome persona (se non in elenco)
    <input name="personName" type="text" value="${esc(item.personName||'')}" placeholder="Es. Ing. Marco Rossi">
   </label>
   <label class="field">Progetto collegato
    <select name="projectId" id="task-project">${taskProjectOptions(item.contactId,item.projectId||'')}</select>
   </label>
   <label class="field">Opportunità collegata
    <select name="dealId" id="task-deal">${quoteDealOptions(item.contactId,item.dealId||'')}</select>
   </label>
   <label class="field">Preventivo collegato
    <select name="quoteId" id="task-quote">${taskQuoteOptions(item.contactId,item.quoteId||'')}</select>
   </label>
   <h3 class="form-section">Dettagli operativi &amp; Calendario</h3>
   ${field('title','Titolo attività / evento *',item.title,'text',true)}
   <label class="field">Tipo di attività
    <select name="type" id="task-type">${activityTypes.map(t=>`<option ${item.type===t?'selected':''}>${t}</option>`).join('')}</select>
   </label>
   <label class="field">Calendario
    <select name="calendar" id="task-calendar">${activityCalendars.map(cal=>`<option value="${esc(cal)}" ${(item.calendar||'Principale (Apex Digital)')===cal?'selected':''}>📅 ${esc(cal)}</option>`).join('')}</select>
   </label>
   <label class="field">Priorità
    <select name="priority" id="task-priority">${activityPriorities.map(p=>`<option ${item.priority===p?'selected':''}>${p}</option>`).join('')}</select>
   </label>
   <label class="field">Stato
    <select name="status" id="task-status">${activityStatuses.map(s=>`<option ${item.status===s?'selected':''}>${s}</option>`).join('')}</select>
   </label>
   <div class="field-pair">
    ${field('dueDate','Data scadenza',item.dueDate,'date')}
    ${field('dueTime','Ora (opzionale)',item.dueTime,'time')}
   </div>
   ${typeof renderDateShortcuts==='function'?renderDateShortcuts('input[name="dueDate"]'):''}
   ${field('calendarUrl','Link evento / Video call (opzionale)',item.calendarUrl,'url',true)}
   ${area('notes','Note e scaletta operativa',item.notes)}
   <h3 class="form-section">Esito e concatenazione prossimo passo</h3>
   ${area('outcome','Esito / Risultato (registrato nello storico aziendale)',item.outcome)}
   <details class="next-task-chain" ${overrides.status==='Completata'?'open':''}>
    <summary>+ Pianifica subito l’attività successiva (concatenazione follow-up)</summary>
    <div class="field-grid">
     ${field('nextTaskTitle','Titolo prossima attività','','text',true)}
     <label class="field">Tipo prossima attività
      <select name="nextTaskType">${activityTypes.map(t=>`<option ${t==='Follow-up'?'selected':''}>${t}</option>`).join('')}</select>
     </label>
     <label class="field">Priorità
      <select name="nextTaskPriority">${activityPriorities.map(p=>`<option ${p==='Media'?'selected':''}>${p}</option>`).join('')}</select>
     </label>
     ${field('nextTaskDue','Data prossima attività','','date')}
    </div>
   </details>
  </div>`;
 if(!$('#task-editor').open)$('#task-editor').showModal();
}

function saveTask(formOrValues){
 if(!taskSession)return false;
 try{
  const raw=formOrValues instanceof FormData?Object.fromEntries(formOrValues):formOrValues?.values?formOrValues.values:Object.fromEntries(new FormData(formOrValues));
  const data={};
  for(const [k,v] of Object.entries(raw))data[k]=typeof v==='string'?v.trim():v;
  const old=taskSession.id?(state.activities||[]).find(a=>a.id===taskSession.id):null;
  if(taskSession.id&&(!old||JSON.stringify(old)!==taskSession.updatedSnap))throw Error('Attività modificata in un’altra scheda: riapri la finestra.');
  const c=contact(data.contactId);
  if(!c)throw Error('Seleziona un’azienda valida.');
  if(!data.title)throw Error('Indica il titolo dell’attività.');
  if(!activityTypes.includes(data.type))throw Error('Seleziona un tipo di attività valido.');
  if(!activityPriorities.includes(data.priority))throw Error('Seleziona una priorità valida.');
  if(!activityStatuses.includes(data.status))throw Error('Seleziona uno stato valido.');
  if(data.dueDate&&!validDate(data.dueDate))throw Error('Indica una data di scadenza valida.');
  if(data.dueTime&&!validTime(data.dueTime))throw Error('Indica un orario valido nel formato HH:MM.');
  if(data.dealId&&!state.deals.some(d=>d.id===data.dealId&&d.contactId===c.id))throw Error('L’opportunità selezionata non appartiene a questa azienda.');
  if(data.quoteId&&!(state.quotes||[]).some(q=>q.id===data.quoteId&&q.contactId===c.id))throw Error('Il preventivo selezionato non appartiene a questa azienda.');
  if(data.projectId&&!(state.projects||[]).some(p=>p.id===data.projectId))throw Error('Il progetto selezionato non esiste.');
  const person=companyPeople(c).find(p=>p.id===data.referentId);
  if(data.referentId&&!person&&!(old?.contactId===c.id&&old?.referentId===data.referentId))throw Error('Il referente selezionato non appartiene a questa azienda.');
  const referentName=person?.name||data.personName||(data.referentId?old?.referentName||'Referente storico':'');
  const nextTitle=data.nextTaskTitle||'',nextDue=data.nextTaskDue||'',nextType=data.nextTaskType||'Follow-up',nextPriority=data.nextTaskPriority||'Media';
  if(nextDue&&!validDate(nextDue))throw Error('Data della prossima attività concatenata non valida.');
  if(nextDue&&!nextTitle)throw Error('Indica il titolo della prossima attività concatenata.');

  const next=structuredClone(state);
  next.activities=next.activities||[];
  const stage=contactStage(c.id);
  const completedAt=data.status==='Completata'?(old?.status==='Completata'&&old?.completedAt?old.completedAt:today()):'';
  const record={
   id:old?.id||crypto.randomUUID(),
   contactId:c.id,
   dealId:data.dealId||'',
   quoteId:data.quoteId||'',
   projectId:data.projectId||'',
   referentId:data.referentId||'',
   referentName,
   personName:data.personName||'',
   calendar:data.calendar||'Principale (Apex Digital)',
   calendarUrl:data.calendarUrl||'',
   title:data.title,
   type:data.type,
   priority:data.priority,
   status:data.status,
   dueDate:data.dueDate||'',
   dueTime:data.dueTime||'',
   notes:data.notes||'',
   outcome:data.outcome||'',
   lifecycleStage:stage,
   createdAt:old?.createdAt||today(),
   completedAt
  };
  const idx=next.activities.findIndex(x=>x.id===record.id);
  if(idx<0)next.activities.push(record);else next.activities[idx]=record;

  const targetContact=next.contacts.find(x=>x.id===c.id);
  targetContact.history=targetContact.history||[];
  const targetDeal=record.dealId?next.deals.find(d=>d.id===record.dealId):null;
  if(!old){
   const msg=`Attività pianificata (${stage} · ${record.type}): ${record.title}${record.dueDate?' per il '+record.dueDate:''}.`;
   targetContact.history.push({date:today(),kind:'lifecycle-activity',text:msg});
   if(targetDeal){targetDeal.history=targetDeal.history||[];targetDeal.history.push({date:today(),kind:'lifecycle-activity',text:msg});}
  }else if(old.status!==record.status||old.outcome!==record.outcome){
   const msg=record.status==='Completata'
    ?`Attività completata (${stage} · ${record.type}): ${record.title}${record.outcome?'\nEsito: '+record.outcome:''}`
    :`Stato attività "${record.title}": ${old.status} → ${record.status}${record.outcome?'\nNote: '+record.outcome:''}.`;
   targetContact.history.push({date:today(),kind:'lifecycle-activity',text:msg});
   if(targetDeal){targetDeal.history=targetDeal.history||[];targetDeal.history.push({date:today(),kind:'lifecycle-activity',text:msg});}
  }

  if(nextTitle){
   const chained={
    id:crypto.randomUUID(),
    contactId:c.id,
    dealId:record.dealId,
    quoteId:record.quoteId,
    referentId:record.referentId,
    referentName:record.referentName,
    title:nextTitle,
    type:activityTypes.includes(nextType)?nextType:'Follow-up',
    priority:activityPriorities.includes(nextPriority)?nextPriority:'Media',
    status:'Da fare',
    dueDate:nextDue,
    dueTime:'',
    notes:'',
    outcome:'',
    lifecycleStage:stage,
    createdAt:today(),
    completedAt:''
   };
   next.activities.push(chained);
   targetContact.history.push({date:today(),kind:'lifecycle-activity',text:`Attività successiva concatenata (${stage}): ${chained.title}${chained.dueDate?' per il '+chained.dueDate:''}.`});
  }

  validate(next);
  if(!persist(next))return false;
  $('#task-editor').close();
  taskSession=null;
  if($('#editor').open&&editing?.id)openEditor(editing.type,editing.id);
  render();
  toast(record.status==='Completata'?'Attività completata e registrata nello storico.':'Attività salvata.');
  return true;
 }catch(error){
  $('#task-error').textContent=error.message;
  $('#task-error').hidden=false;
  return false;
 }
}

function completeTaskQuick(id,outcome=''){
 const existing=(state.activities||[]).find(a=>a.id===id);
 if(!existing)return false;
 if(existing.status==='Completata')return false;
 openTaskEditor(id,{...existing,status:'Completata',outcome:outcome||existing.outcome});
 return true;
}

function deleteTask(id=taskSession?.id){
 const existing=(state.activities||[]).find(a=>a.id===id);
 if(!existing)return false;
 if(!confirm('Eliminare questa attività? L’operazione non può essere annullata.'))return false;
 const next=structuredClone(state);
 next.activities=(next.activities||[]).filter(a=>a.id!==id);
 const c=next.contacts.find(x=>x.id===existing.contactId);
 if(c){c.history=c.history||[];c.history.push({date:today(),kind:'lifecycle-activity',text:`Attività rimossa: ${existing.title}.`});}
 try{validate(next);}catch{return false;}
 if(!persist(next))return false;
 if($('#task-editor').open)$('#task-editor').close();
 taskSession=null;
 if($('#editor').open&&editing?.id)openEditor(editing.type,editing.id);
 render();
 toast('Attività eliminata.');
 return true;
}

function applyPlaybook(contactId,customStage=null){
 const c=contact(contactId);
 if(!c){toast('Azienda non trovata.');return 0;}
 const stage=stages.includes(customStage)?customStage:contactStage(c.id);
 const activePb=typeof getPlaybooks==='function'?getPlaybooks():activityPlaybooks;
 const steps=activePb[stage]||activityPlaybooks.Lead;
 const existingOpen=new Set(openCompanyTasks(c.id).map(a=>a.title.toLocaleLowerCase('it')));
 const toCreate=steps.filter(s=>!existingOpen.has(s.title.toLocaleLowerCase('it')));
 if(!toCreate.length){toast(`Tutte le attività del playbook ${stage} sono già attive per ${c.company}.`);return 0;}
 const next=structuredClone(state);
 next.activities=next.activities||[];
 const primaryPerson=c.person?'primary':'';
 const primaryName=c.person||'';
 for(const step of toCreate){
  next.activities.push({
   id:crypto.randomUUID(),
   contactId:c.id,
   dealId:'',
   quoteId:'',
   referentId:primaryPerson,
   referentName:primaryName,
   title:step.title,
   type:step.type,
   priority:step.priority,
   status:'Da fare',
   dueDate:addDays(today(),step.offsetDays),
   dueTime:'',
   notes:step.notes,
   outcome:'',
   lifecycleStage:stage,
   createdAt:today(),
   completedAt:''
  });
 }
 const targetContact=next.contacts.find(x=>x.id===c.id);
 targetContact.history=targetContact.history||[];
 targetContact.history.push({date:today(),kind:'playbook',text:`Playbook ${stage} attivato: ${toCreate.length} attività operative create.`});
 try{validate(next);}catch(e){toast('Impossibile applicare il playbook: '+e.message);return 0;}
 if(!persist(next))return 0;
 if($('#editor').open&&editing?.type==='contact'&&editing?.id===c.id)openEditor('contact',c.id);
 render();
 toast(`Playbook ${stage} attivato per ${c.company} (${toCreate.length} attività).`);
 return toCreate.length;
}

function visibleActivities(){
 const day=today();
 const statusCond={
  open:a=>isOpenTask(a),
  overdue:a=>isOpenTask(a)&&Boolean(a.dueDate)&&a.dueDate<day,
  today:a=>isOpenTask(a)&&a.dueDate===day,
  future:a=>isOpenTask(a)&&Boolean(a.dueDate)&&a.dueDate>day,
  unscheduled:a=>isOpenTask(a)&&!a.dueDate,
  completed:a=>a.status==='Completata',
  all:()=>true
 }[activityStatusFilter]||(()=>true);

 return (state.activities||[]).filter(a=>{
  const c=contact(a.contactId);
  const stage=taskLifecycleStage(a);
  if(activityStageFilter&&stage!==activityStageFilter)return false;
  if(!statusCond(a))return false;
  if(activityTypeFilter&&a.type!==activityTypeFilter)return false;
  if(activityPriorityFilter&&a.priority!==activityPriorityFilter)return false;
  const dealTitle=a.dealId?state.deals.find(d=>d.id===a.dealId)?.title:'';
  const quoteNum=a.quoteId?latestQuote((state.quotes||[]).find(q=>q.id===a.quoteId)||{versions:[{}]})?.number:'';
  return matches(a.title,a.type,a.priority,a.status,a.notes,a.outcome,c?.company,taskPersonLabel(a),dealTitle,quoteNum,stage);
 }).sort((a,b)=>{
  if(activitySort==='priority')return priorityRank(a.priority)-priorityRank(b.priority)||(a.dueDate||'9999').localeCompare(b.dueDate||'9999');
  if(activitySort==='company')return (contact(a.contactId)?.company||'').localeCompare(contact(b.contactId)?.company||'','it',{sensitivity:'base'});
  if(activitySort==='title')return a.title.localeCompare(b.title,'it',{sensitivity:'base'});
  return (a.dueDate||'9999').localeCompare(b.dueDate||'9999')||priorityRank(a.priority)-priorityRank(b.priority);
 });
}

function renderTaskCard(a){
 const day=today(),c=contact(a.contactId),stage=taskLifecycleStage(a),person=taskPersonLabel(a);
 const deal=a.dealId?state.deals.find(d=>d.id===a.dealId):null;
 const quote=a.quoteId?(state.quotes||[]).find(q=>q.id===a.quoteId):null;
 const isOverdue=isOpenTask(a)&&a.dueDate&&a.dueDate<day;
 const isToday=isOpenTask(a)&&a.dueDate===day;
 return `<div class="deal-container task-card ${isOverdue?'task-overdue':isToday?'task-today':''}">
  <div class="deal task-card-body">
   <div class="task-card-badges">
    <span class="pill ${priorityPillClass(a.priority)}">Priorità ${esc(a.priority)}</span>
    <span class="pill">${esc(a.type)}</span>
    <span class="pill ${statusPillClass(a.status)}">${esc(a.status)}</span>
   </div>
   <strong>${esc(a.title)}</strong>
   <p class="task-company-line"><button type="button" class="text-button" data-edit-contact="${esc(a.contactId)}">${esc(c?.company||'Azienda')}</button> · <span class="stage-tag">${esc(stage)}</span></p>
   ${person?`<small>👤 Referente: ${esc(person)}</small>`:''}
   ${deal?`<small>💼 Opportunità: <button type="button" class="text-button" data-edit-deal="${esc(deal.id)}">${esc(deal.title)}</button></small>`:''}
   ${quote?`<small>📄 Preventivo: ${esc(latestQuote(quote).number)}</small>`:''}
   ${a.notes?`<small class="task-notes-preview">${esc(a.notes)}</small>`:''}
   ${a.outcome?`<small class="task-outcome-preview">Esito: ${esc(a.outcome)}</small>`:''}
   <div class="task-due-row">
    <span class="pill ${isOverdue?'red':isToday?'amber':''}">${a.dueDate?date(a.dueDate)+(a.dueTime?' · '+esc(a.dueTime):''):'Senza scadenza'}</span>
   </div>
  </div>
  <div class="task-card-actions">
   ${isOpenTask(a)?`<button type="button" class="phase-action task-complete-btn" data-complete-task="${esc(a.id)}">✓ Completa attività</button>`:''}
   <button type="button" class="phase-action" data-edit-task="${esc(a.id)}">Modifica scheda ↗</button>
  </div>
 </div>`;
}

function activitiesView(){
 const all=state.activities||[],open=all.filter(isOpenTask),day=today();
 const openByStage=s=>open.filter(a=>taskLifecycleStage(a)===s);
 const overdueCount=open.filter(a=>a.dueDate&&a.dueDate<day).length;
 const todayCount=open.filter(a=>a.dueDate===day).length;
 const rows=visibleActivities();
 const statusTabs=[
  ['open','Aperte',open.length],
  ['overdue','Scadute',overdueCount],
  ['today','Oggi',todayCount],
  ['future','Future',open.filter(a=>a.dueDate&&a.dueDate>day).length],
  ['unscheduled','Senza data',open.filter(a=>!a.dueDate).length],
  ['completed','Completate',all.filter(a=>a.status==='Completata').length],
  ['all','Tutte',all.length]
 ];
 const filtersHtml=`<div class="stage-segment-bar" role="group" aria-label="Filtra attività per fase aziendale">
    <button type="button" data-activity-stage="" class="${activityStageFilter===''?'selected':''}">Tutte le fasi <span>${open.length}</span></button>
    ${stages.map(s=>`<button type="button" data-activity-stage="${s}" class="${activityStageFilter===s?'selected':''}">${s} <span>${openByStage(s).length}</span></button>`).join('')}
   </div>
   <div class="activity-filters" role="group" aria-label="Filtra stato attività">
    ${statusTabs.map(([k,label,cnt])=>`<button type="button" data-activity-status="${k}" class="${activityStatusFilter===k?'selected':''}">${label}<span>${cnt}</span></button>`).join('')}
   </div>
   <select id="activity-type-filter" aria-label="Filtra tipo attività">
    <option value="">Tutti i tipi</option>
    ${activityTypes.map(t=>`<option ${activityTypeFilter===t?'selected':''}>${t}</option>`).join('')}
   </select>
   <select id="activity-priority-filter" aria-label="Filtra priorità">
    <option value="">Tutte le priorità</option>
    ${activityPriorities.map(p=>`<option ${activityPriorityFilter===p?'selected':''}>${p}</option>`).join('')}
   </select>`;
 const sortHtml=`<label class="sort-label">Ordina per
    <select id="activity-sort" aria-label="Ordina attività">
     <option value="due" ${activitySort==='due'?'selected':''}>Prossima scadenza</option>
     <option value="priority" ${activitySort==='priority'?'selected':''}>Priorità alta → bassa</option>
     <option value="company" ${activitySort==='company'?'selected':''}>Azienda A–Z</option>
     <option value="title" ${activitySort==='title'?'selected':''}>Titolo A–Z</option>
    </select>
   </label>`;
 const viewHtml=`<div class="view-toggle" role="group" aria-label="Vista attività">
    <button type="button" data-activity-layout="board" aria-pressed="${activityLayout==='board'}" class="${activityLayout==='board'?'selected':''}">▥ Bacheca Fasi</button>
    <button type="button" data-activity-layout="list" aria-pressed="${activityLayout==='list'}" class="${activityLayout==='list'?'selected':''}">☷ Elenco</button>
   </div>`;
 const extraButtonsHtml=`<button type="button" id="open-playbook-editor" class="toolbar-icon-btn" data-open-playbooks="true" title="Configura Playbook" aria-label="Configura Playbook">⚙</button>`;
 const parts=[];
 if(search)parts.push(`"${search}"`);
 if(activityStageFilter)parts.push(activityStageFilter);
 if(activityStatusFilter&&activityStatusFilter!=='open')parts.push(activityStatusFilter);
 if(activityTypeFilter)parts.push(activityTypeFilter);
 if(activityPriorityFilter)parts.push(activityPriorityFilter);
 const bar=typeof iconToolbar==='function'?iconToolbar({
  countText:`${rows.length} attività`,
  activeSummary:parts.join(' · '),
  searchPlaceholder:'Cerca attività, azienda, referente…',
  searchValue:search,
  filtersHtml,
  hasActiveFilters:Boolean(activityStageFilter||activityTypeFilter||activityPriorityFilter||(activityStatusFilter&&activityStatusFilter!=='open')),
  viewHtml,
  sortHtml,
  hasActiveSort:activitySort!=='due',
  extraButtonsHtml,
  exportDisabled:!rows.length
 }):`<div class="toolbar"><input id="search" aria-label="Cerca attività" value="${esc(search)}">${filtersHtml}${sortHtml}${viewHtml}${extraButtonsHtml}<button type="button" id="export-csv" ${!rows.length?'disabled':''}>↓ Esporta CSV</button></div>`;
 return `
  <div class="stats">
   <div class="stat">
    <span class="stat-label">Attività Lead aperte</span>
    <strong>${openByStage('Lead').length.toString().padStart(2,'0')}</strong>
    <small>Qualifica, primo contatto e discovery</small>
   </div>
   <div class="stat">
    <span class="stat-label">Attività Prospect aperte</span>
    <strong>${openByStage('Prospect').length.toString().padStart(2,'0')}</strong>
    <small>Analisi, demo AI e negoziazione</small>
   </div>
   <div class="stat accent">
    <span class="stat-label">Attività Clienti aperte</span>
    <strong>${openByStage('Cliente').length.toString().padStart(2,'0')}</strong>
    <small>Onboarding, consegna e check-in</small>
   </div>
   <div class="stat">
    <span class="stat-label">In scadenza / Arretrate</span>
    <strong>${(overdueCount+todayCount).toString().padStart(2,'0')}</strong>
    <small>${overdueCount} scadute · ${todayCount} previste oggi</small>
   </div>
  </div>
  <div class="activities-control-header">
   <div class="stage-segment-bar" role="group" aria-label="Filtra attività per fase aziendale">
    <button type="button" data-activity-stage="" class="${activityStageFilter===''?'selected':''}">Tutte le fasi <span>${open.length}</span></button>
    ${stages.map(s=>`<button type="button" data-activity-stage="${s}" class="${activityStageFilter===s?'selected':''}">${s} <span>${openByStage(s).length}</span></button>`).join('')}
   </div>
   <div class="activity-status-strip">
    <div class="activity-filters" role="group" aria-label="Filtra stato attività">
     ${statusTabs.map(([k,label,cnt])=>`<button type="button" data-activity-status="${k}" class="${activityStatusFilter===k?'selected':''}">${label}<span>${cnt}</span></button>`).join('')}
    </div>
   </div>
  </div>
  <div class="toolbar">
   <input id="search" aria-label="Cerca attività" placeholder="Cerca attività, azienda, referente, opportunità…" value="${esc(search)}">
   <select id="activity-type-filter" aria-label="Filtra tipo attività">
    <option value="">Tutti i tipi</option>
    ${activityTypes.map(t=>`<option ${activityTypeFilter===t?'selected':''}>${t}</option>`).join('')}
   </select>
   <select id="activity-priority-filter" aria-label="Filtra priorità">
    <option value="">Tutte le priorità</option>
    ${activityPriorities.map(p=>`<option ${activityPriorityFilter===p?'selected':''}>${p}</option>`).join('')}
   </select>
   <div class="list-controls">
    <span class="result-count">${rows.length} attività</span>
    <label class="sort-label">Ordina per
     <select id="activity-sort" aria-label="Ordina attività">
      <option value="due" ${activitySort==='due'?'selected':''}>Prossima scadenza</option>
      <option value="priority" ${activitySort==='priority'?'selected':''}>Priorità alta → bassa</option>
      <option value="company" ${activitySort==='company'?'selected':''}>Azienda A–Z</option>
      <option value="title" ${activitySort==='title'?'selected':''}>Titolo A–Z</option>
     </select>
    </label>
    <div class="view-toggle" role="group" aria-label="Vista attività">
     <button type="button" data-activity-layout="board" aria-pressed="${activityLayout==='board'}" class="${activityLayout==='board'?'selected':''}">▥ Bacheca Fasi</button>
     <button type="button" data-activity-layout="list" aria-pressed="${activityLayout==='list'}" class="${activityLayout==='list'?'selected':''}">☷ Elenco</button>
     <button type="button" data-activity-layout="month" aria-pressed="${activityLayout==='month'}" class="${activityLayout==='month'?'selected':''}">📅 Mese</button>
     <button type="button" data-activity-layout="week" aria-pressed="${activityLayout==='week'}" class="${activityLayout==='week'?'selected':''}">📆 Settimana</button>
    </div>
    <button type="button" id="open-playbook-editor" data-open-playbooks="true">⚙ Configura Playbook</button>
    <button type="button" id="export-csv" ${!rows.length?'disabled':''}>↓ Esporta CSV</button>
   </div>
  </div>
  ${activityLayout==='board'?activitiesBoard(rows):activityLayout==='month'?activitiesMonthCalendar(rows):activityLayout==='week'?activitiesWeekCalendar(rows):activitiesTemporalList(rows)}`;
}

function activitiesTemporalList(rows){
 if(!rows.length)return activitiesTable(rows);
 const day=today(),tom=addDays(day,1),endWeek=addDays(day,7);
 const groups=[
  {id:'overdue',label:'🚨 Scadute',items:rows.filter(a=>isOpenTask(a)&&a.dueDate&&a.dueDate<day)},
  {id:'today',label:'📅 Oggi',items:rows.filter(a=>a.dueDate===day)},
  {id:'tomorrow',label:'🌅 Domani',items:rows.filter(a=>a.dueDate===tom)},
  {id:'week',label:'📆 Questa settimana',items:rows.filter(a=>a.dueDate&&a.dueDate>tom&&a.dueDate<=endWeek)},
  {id:'later',label:'⏳ Prossimamente',items:rows.filter(a=>a.dueDate&&a.dueDate>endWeek)},
  {id:'unscheduled',label:'📋 Da definire',items:rows.filter(a=>!a.dueDate)}
 ].filter(g=>g.items.length);
 if(!groups.length)return activitiesTable(rows);
 return `<div class="temporal-groups">${groups.map(g=>`
  <section class="temporal-group">
   <div class="temporal-group-header">
    <h3>${g.label}</h3>
    <span class="pill">${g.items.length}</span>
   </div>
   ${activitiesTable(g.items)}
  </section>`).join('')}</div>`;
}

function activitiesMonthCalendar(rows){
 const todayStr=today();
 const baseYM=(calendarCursor&&/^\d{4}-\d{2}$/.test(calendarCursor))?calendarCursor:todayStr.slice(0,7);
 const [yr,mo]=baseYM.split('-').map(Number);
 const firstOfMonth=new Date(Date.UTC(yr,mo-1,1,12,0,0));
 const monthName=new Intl.DateTimeFormat('it-IT',{month:'long',year:'numeric',timeZone:'UTC'}).format(firstOfMonth);
 const startDow=(firstOfMonth.getUTCDay()+6)%7; // 0=Mon..6=Sun
 const daysInMonth=new Date(Date.UTC(yr,mo,0,12,0,0)).getUTCDate();
 const totalCells=Math.ceil((startDow+daysInMonth)/7)*7;
 const cells=[];
 for(let i=0;i<totalCells;i++){
  const d=new Date(Date.UTC(yr,mo-1,1-startDow+i,12,0,0));
  const iso=d.toISOString().slice(0,10);
  const inMonth=d.getUTCMonth()===(mo-1);
  const dayEvents=rows.filter(a=>a.dueDate===iso).sort((a,b)=>(a.dueTime||'99:99').localeCompare(b.dueTime||'99:99'));
  cells.push({iso,dayNum:d.getUTCDate(),inMonth,dayEvents});
 }
 return `<div class="cal-month-wrap">
  <div class="cal-header">
   <h3 class="cal-title">${esc(monthName.charAt(0).toUpperCase()+monthName.slice(1))}</h3>
   <div class="cal-nav">
    <button type="button" class="secondary" data-cal-nav="prev-month" aria-label="Mese precedente">‹ Prec</button>
    <button type="button" class="secondary" data-cal-nav="today-month">Oggi</button>
    <button type="button" class="secondary" data-cal-nav="next-month" aria-label="Mese successivo">Succ ›</button>
   </div>
  </div>
  <div class="cal-weekdays"><span>Lun</span><span>Mar</span><span>Mer</span><span>Gio</span><span>Ven</span><span>Sab</span><span>Dom</span></div>
  <div class="cal-month-grid">
   ${cells.map(cell=>`
    <div class="cal-day-cell ${cell.inMonth?'':'is-outside'} ${cell.iso===todayStr?'is-today':''}" data-cal-date="${cell.iso}">
     <div class="cal-day-top">
      <span class="cal-day-num">${cell.dayNum}</span>
      <button type="button" class="cal-day-add" data-cal-add="${cell.iso}" title="Nuova attività il ${cell.iso}" aria-label="Nuova attività il ${cell.iso}">+</button>
     </div>
     <div class="cal-day-events">
      ${cell.dayEvents.slice(0,3).map(a=>{
       const comp=contact(a.contactId);
       const isDone=a.status==='Completata';
       const isOver=isOpenTask(a)&&a.dueDate<todayStr;
       const chipCls=isDone?'cal-chip-done':isOver?'cal-chip-overdue':a.priority==='Alta'?'cal-chip-high':'';
       const label=`${a.dueTime?a.dueTime+' ':''}${a.title}${comp?' · '+comp.company:''}`;
       return `<button type="button" class="cal-event-chip ${chipCls}" data-edit-task="${esc(a.id)}" title="${esc(label)}">${a.dueTime?`<span class="cal-chip-time">${esc(a.dueTime)}</span>`:''}<span class="cal-chip-title">${esc(a.title)}</span></button>`;
      }).join('')}
      ${cell.dayEvents.length>3?`<span class="cal-more-badge">+${cell.dayEvents.length-3} altri</span>`:''}
     </div>
    </div>`).join('')}
  </div>
 </div>`;
}

function activitiesWeekCalendar(rows){
 const todayStr=today();
 const anchorStr=(weekCursor&&validDate(weekCursor))?weekCursor:todayStr;
 const anchor=new Date(anchorStr+'T12:00:00Z');
 const dow=(anchor.getUTCDay()+6)%7;
 const monday=new Date(anchor.getTime()-dow*86400000);
 const weekDays=Array.from({length:7},(_,i)=>{
  const d=new Date(monday.getTime()+i*86400000);
  const iso=d.toISOString().slice(0,10);
  const label=new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(d);
  const dayEvents=rows.filter(a=>a.dueDate===iso).sort((a,b)=>(a.dueTime||'99:99').localeCompare(b.dueTime||'99:99'));
  return {iso,label,dayEvents};
 });
 return `<div class="cal-month-wrap">
  <div class="cal-header">
   <h3 class="cal-title">Settimana ${esc(weekDays[0].label)} – ${esc(weekDays[6].label)}</h3>
   <div class="cal-nav">
    <button type="button" class="secondary" data-cal-nav="prev-week" aria-label="Settimana precedente">‹ Prec</button>
    <button type="button" class="secondary" data-cal-nav="today-week">Questa settimana</button>
    <button type="button" class="secondary" data-cal-nav="next-week" aria-label="Settimana successiva">Succ ›</button>
   </div>
  </div>
  <div class="cal-week-grid">
   ${weekDays.map(wd=>`
    <div class="cal-week-col ${wd.iso===todayStr?'is-today':''}">
     <div class="cal-week-col-head">
      <strong>${esc(wd.label)}</strong>
      <button type="button" class="cal-day-add" data-cal-add="${wd.iso}" title="Nuova attività il ${wd.iso}" aria-label="Nuova attività il ${wd.iso}">+</button>
     </div>
     <div class="cal-week-col-body">
      ${wd.dayEvents.length?wd.dayEvents.map(a=>{
       const comp=contact(a.contactId);
       const proj=a.projectId?(state.projects||[]).find(p=>p.id===a.projectId):null;
       const isDone=a.status==='Completata';
       const isOver=isOpenTask(a)&&a.dueDate<todayStr;
       const chipCls=isDone?'cal-chip-done':isOver?'cal-chip-overdue':a.priority==='Alta'?'cal-chip-high':'';
       return `<button type="button" class="cal-event-chip cal-week-chip ${chipCls}" data-edit-task="${esc(a.id)}">
        <span class="cal-chip-title">${a.dueTime?esc(a.dueTime)+' · ':''}${esc(a.title)}</span>
        <small>${esc(comp?.company||'Azienda')}${proj?' · 🚀 '+esc(proj.name):''}</small>
       </button>`;
      }).join(''):'<span class="cal-week-empty">Nessun evento</span>'}
     </div>
    </div>`).join('')}
  </div>
 </div>`;
}

function activitiesBoard(rows){
 const visibleStages=activityStageFilter?[activityStageFilter]:stages;
 return `<div class="board board-3cols">
  ${visibleStages.map((s,idx)=>{
   const items=rows.filter(a=>taskLifecycleStage(a)===s);
   const overdue=items.filter(a=>isOpenTask(a)&&a.dueDate&&a.dueDate<today()).length;
   const desc=s==='Lead'?'Qualifica & Primo contatto':s==='Prospect'?'Analisi, Demo & Proposta':'Onboarding & Customer Care';
   return `<section class="column stage-${idx===0?0:idx===1?1:3}">
    <div class="column-heading">
     <h3>${s}<span>${items.length}</span></h3>
     <div class="column-value">${desc}<small>${overdue?overdue+' scadute da gestire':'Tutte in linea'}</small></div>
    </div>
    <div class="column-body">
     ${items.map(renderTaskCard).join('')}
     ${!items.length?`<div class="empty">Nessuna attività per ${esc(s)} in questa vista.</div>`:''}
    </div>
   </section>`;
  }).join('')}
 </div>`;
}

function activitiesTable(rows){
 return `<div class="panel">${rows.length?`<div class="table-wrap"><table>
  <thead><tr><th>Attività / Tipo</th><th>Azienda & Fase</th><th>Referente & Collegamenti</th><th>Priorità</th><th>Scadenza</th><th>Stato</th><th></th></tr></thead>
  <tbody>${rows.map(a=>{
   const c=contact(a.contactId),stage=taskLifecycleStage(a),person=taskPersonLabel(a);
   const deal=a.dealId?state.deals.find(d=>d.id===a.dealId):null;
   const quote=a.quoteId?(state.quotes||[]).find(q=>q.id===a.quoteId):null;
   return `<tr>
    <td><strong>${esc(a.title)}</strong><small>${esc(a.type)}${a.notes?' · '+esc(a.notes):''}</small>${a.outcome?`<small class="task-outcome-preview">Esito: ${esc(a.outcome)}</small>`:''}</td>
    <td data-label="Azienda & Fase"><div><button type="button" class="text-button" data-edit-contact="${esc(a.contactId)}"><strong>${esc(c?.company||'—')}</strong></button><small><span class="pill ${stage==='Cliente'?'green':stage==='Prospect'?'amber':''}">${esc(stage)}</span></small></div></td>
    <td data-label="Referente & Collegamenti"><div>${esc(person||'Azienda')}${deal?`<small>Opp.: ${esc(deal.title)}</small>`:''}${quote?`<small>Prev.: ${esc(latestQuote(quote).number)}</small>`:''}</div></td>
    <td data-label="Priorità"><span class="pill ${priorityPillClass(a.priority)}">${esc(a.priority)}</span></td>
    <td data-label="Scadenza">${a.dueDate?`<span class="${isOpenTask(a)&&a.dueDate<today()?'overdue-date':''}">${date(a.dueDate)}${a.dueTime?' '+esc(a.dueTime):''}</span>`:'Senza data'}</td>
    <td data-label="Stato"><span class="pill ${statusPillClass(a.status)}">${esc(a.status)}</span></td>
    <td class="cell-actions"><div class="row-actions">
     ${isOpenTask(a)?`<button type="button" class="phase-action" data-complete-task="${esc(a.id)}">✓ Completa</button>`:''}
     <button type="button" class="text-button" data-edit-task="${esc(a.id)}">Apri scheda ↗</button>
    </div></td>
   </tr>`;
  }).join('')}</tbody>
 </table></div>`:empty('Nessuna attività trovata','Pianifica un’attività per un Lead, Prospect o Cliente oppure attiva un Playbook automatico.','+ Nuova attività','task')}</div>`;
}

function contactActivitiesSection(contactId){
 const c=contact(contactId);if(!c)return '';
 const stage=contactStage(contactId),tasks=companyTasks(contactId);
 return `<section class="related-deals">
  <div class="panel-title">
   <h2>Attività ${esc(stage)} <span class="pill">${tasks.length}</span></h2>
   <div class="inline-actions">
    <button type="button" class="text-button" data-apply-playbook="${esc(contactId)}">⚡ Attiva Playbook ${esc(stage)}</button>
    <button type="button" class="text-button" data-new-contact-task="${esc(contactId)}">+ Nuova attività</button>
   </div>
  </div>
  ${tasks.length?tasks.map(a=>`<div class="related-row">
   ${isOpenTask(a)?`<button type="button" class="check" data-complete-task="${esc(a.id)}" title="Completa attività">✓</button>`:`<span class="pill ${statusPillClass(a.status)}">${esc(a.status)}</span>`}
   <button type="button" class="text-button" data-edit-task="${esc(a.id)}"><strong>${esc(a.title)}</strong> <small>(${esc(a.type)} · Priorità ${esc(a.priority)})</small></button>
   <span class="pill ${isOpenTask(a)&&a.dueDate&&a.dueDate<today()?'red':''}">${a.dueDate?date(a.dueDate):'Senza data'}</span>
  </div>`).join(''):`<p class="related-empty">Nessuna attività registrata per questa azienda (${esc(stage)}). Usa "+ Nuova attività" o "⚡ Attiva Playbook ${esc(stage)}".</p>`}
 </section>`;
}

function dealActivitiesSection(dealId,contactId){
 if(!dealId)return '';
 const tasks=dealTasks(dealId);
 return `<section class="related-deals">
  <div class="panel-title">
   <h2>Attività operative dell’opportunità <span class="pill">${tasks.length}</span></h2>
   <button type="button" class="text-button" data-new-deal-task="${esc(dealId)}" data-task-contact="${esc(contactId)}">+ Nuova attività opportunità</button>
  </div>
  ${tasks.length?tasks.map(a=>`<div class="related-row">
   ${isOpenTask(a)?`<button type="button" class="check" data-complete-task="${esc(a.id)}" title="Completa attività">✓</button>`:`<span class="pill ${statusPillClass(a.status)}">${esc(a.status)}</span>`}
   <button type="button" class="text-button" data-edit-task="${esc(a.id)}">${esc(a.title)} <small>(${esc(a.type)})</small></button>
   <span class="pill">${a.dueDate?date(a.dueDate):'Senza data'}</span>
  </div>`).join(''):'<p class="related-empty">Nessuna attività specifica collegata a questa opportunità.</p>'}
 </section>`;
}

function dashboardLifecyclePanel(){
 const open=(state.activities||[]).filter(isOpenTask).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')||priorityRank(a.priority)-priorityRank(b.priority));
 const byStage=s=>open.filter(a=>taskLifecycleStage(a)===s).length;
 return `<div class="panel dashboard-lifecycle-panel">
  <div class="panel-title">
   <h2>Attività per Lead, Prospect e Clienti <span class="pill">${open.length}</span></h2>
   <div class="inline-actions">
    <button type="button" class="text-button" data-new="task">+ Nuova attività</button>
    <button type="button" class="text-button" data-view="activities">Apri tutte ↗</button>
   </div>
  </div>
  <div class="lifecycle-mini-counters">
   <button type="button" class="lifecycle-chip" data-jump-stage="Lead"><span>Lead</span><strong>${byStage('Lead')}</strong></button>
   <button type="button" class="lifecycle-chip" data-jump-stage="Prospect"><span>Prospect</span><strong>${byStage('Prospect')}</strong></button>
   <button type="button" class="lifecycle-chip" data-jump-stage="Cliente"><span>Clienti</span><strong>${byStage('Cliente')}</strong></button>
  </div>
  ${open.length?open.slice(0,6).map(a=>{
   const c=contact(a.contactId),stage=taskLifecycleStage(a),day=today();
   return `<div class="activity">
    <button type="button" class="check" data-complete-task="${esc(a.id)}" title="Completa attività">✓</button>
    <div class="details">
     <strong>${esc(a.title)}</strong>
     <p>${esc(c?.company||'Azienda')} · <span class="pill ${stage==='Cliente'?'green':stage==='Prospect'?'amber':''}">${esc(stage)}</span> · ${esc(a.type)}</p>
    </div>
    <div class="activity-actions">
     <span class="pill ${a.dueDate&&a.dueDate<day?'red':''}">${a.dueDate?date(a.dueDate):'Senza data'}</span>
     <button type="button" class="text-button" data-edit-task="${esc(a.id)}">Dettagli ↗</button>
    </div>
   </div>`;
  }).join(''):'<div class="empty-compact">Nessuna attività aziendale aperta. Pianifica azioni per Lead, Prospect o Clienti oppure attiva un Playbook dalle anagrafiche.</div>'}
 </div>`;
}

function activitiesSummary(c){
 return companyTasks(c.id).map(a=>`${a.status}: ${a.title} (${a.type}${a.dueDate?' · '+a.dueDate:''})`).join('\n');
}

document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.new==='task'){openTaskEditor();return;}
 if(b.dataset.editTask){openTaskEditor(b.dataset.editTask);return;}
 if(b.dataset.completeTask){completeTaskQuick(b.dataset.completeTask);return;}
 if(b.dataset.newContactTask){openTaskEditor(null,{contactId:b.dataset.newContactTask});return;}
 if(b.dataset.newDealTask){openTaskEditor(null,{contactId:b.dataset.taskContact,dealId:b.dataset.newDealTask});return;}
 if(b.dataset.applyPlaybook){applyPlaybook(b.dataset.applyPlaybook,b.dataset.playbookStage||'');return;}
 if(b.dataset.activityStage!==undefined){activityStageFilter=b.dataset.activityStage;render();return;}
 if(b.dataset.activityStatus){activityStatusFilter=b.dataset.activityStatus;render();return;}
 if(b.dataset.activityLayout){activityLayout=b.dataset.activityLayout;render();return;}
 if(b.dataset.calAdd){openTaskEditor(null,{dueDate:b.dataset.calAdd});return;}
 if(b.dataset.calNav){
  const nav=b.dataset.calNav;
  const todayStr=today();
  if(nav==='today-month'){calendarCursor=todayStr.slice(0,7);render();return;}
  if(nav==='prev-month'||nav==='next-month'){
   const baseYM=(calendarCursor&&/^\d{4}-\d{2}$/.test(calendarCursor))?calendarCursor:todayStr.slice(0,7);
   const [yr,mo]=baseYM.split('-').map(Number);
   const d=new Date(Date.UTC(yr,mo-1+(nav==='next-month'?1:-1),1,12,0,0));
   calendarCursor=d.toISOString().slice(0,7);
   render();return;
  }
  if(nav==='today-week'){weekCursor=todayStr;render();return;}
  if(nav==='prev-week'||nav==='next-week'){
   const base=(weekCursor&&validDate(weekCursor))?weekCursor:todayStr;
   weekCursor=addDays(base,nav==='next-week'?7:-7);
   render();return;
  }
 }
 if(b.dataset.jumpStage){activityStageFilter=b.dataset.jumpStage;setView('activities');activityStageFilter=b.dataset.jumpStage;render();return;}
 if(b.id==='apply-task-template'&&taskSession){
  const idx=Number($('#task-template-select')?.value);
  const companyId=$('#task-company')?.value||state.contacts[0]?.id;
  const stage=contactStage(companyId);
  const activePb=typeof getPlaybooks==='function'?getPlaybooks():activityPlaybooks;
  const step=(activePb[stage]||activityPlaybooks.Lead)[idx];
  if(step){
   const f=$('#task-form');
   if(f.querySelector('[name="title"]'))f.querySelector('[name="title"]').value=step.title;
   if(f.querySelector('[name="type"]'))f.querySelector('[name="type"]').value=step.type;
   if(f.querySelector('[name="priority"]'))f.querySelector('[name="priority"]').value=step.priority;
   if(f.querySelector('[name="dueDate"]'))f.querySelector('[name="dueDate"]').value=addDays(today(),step.offsetDays);
   if(f.querySelector('[name="notes"]'))f.querySelector('[name="notes"]').value=step.notes;
  }
  return;
 }
});

document.addEventListener('change',e=>{
 if(e.target.id==='task-company'){
  const cid=e.target.value;
  if($('#task-referent'))$('#task-referent').innerHTML=personOptions(cid);
  if($('#task-project'))$('#task-project').innerHTML=taskProjectOptions(cid);
  if($('#task-deal'))$('#task-deal').innerHTML=quoteDealOptions(cid);
  if($('#task-quote'))$('#task-quote').innerHTML=taskQuoteOptions(cid);
 }
 if(e.target.id==='activity-type-filter'){activityTypeFilter=e.target.value;render();}
 if(e.target.id==='activity-priority-filter'){activityPriorityFilter=e.target.value;render();}
 if(e.target.id==='activity-sort'){activitySort=e.target.value;render();}
});

if(document.querySelector('#task-form')){
 document.querySelector('#task-form').addEventListener('submit',e=>{e.preventDefault();saveTask(e.target);});
}
if(document.querySelector('#task-cancel')){
 document.querySelector('#task-cancel').onclick=()=>{$('#task-editor').close();taskSession=null;};
}
if(document.querySelector('#task-close')){
 document.querySelector('#task-close').onclick=()=>{$('#task-editor').close();taskSession=null;};
}
if(document.querySelector('#task-delete')){
 document.querySelector('#task-delete').onclick=()=>deleteTask();
}
if(document.querySelector('#task-editor')){
 document.querySelector('#task-editor').addEventListener('cancel',()=>{taskSession=null;});
}

const PREFS_KEY='apex-crm-prefs-v1';
let uiPrefs={theme:'light',haptics:true,sidebarCollapsed:false};
try{
 const savedPrefs=localStorage.getItem(PREFS_KEY);
 if(savedPrefs){
  const p=JSON.parse(savedPrefs);
  if(p&&typeof p==='object'){
   if(['light','dark','amoled'].includes(p.theme))uiPrefs.theme=p.theme;
   if(typeof p.haptics==='boolean')uiPrefs.haptics=p.haptics;
   if(typeof p.sidebarCollapsed==='boolean')uiPrefs.sidebarCollapsed=p.sidebarCollapsed;
  }
 }
}catch{}

function applyUiPrefs(){
 const t=uiPrefs.theme||'light';
 const collapsed=Boolean(uiPrefs.sidebarCollapsed);
 if(typeof document!=='undefined'){
  if(document.documentElement?.setAttribute)document.documentElement.setAttribute('data-theme',t);
  if(document.documentElement?.dataset)document.documentElement.dataset.theme=t;
  if(document.body?.dataset){
   document.body.dataset.theme=t;
   document.body.dataset.sidebar=collapsed?'collapsed':'expanded';
  }
  if(document.body?.classList?.toggle)document.body.classList.toggle('sidebar-collapsed',collapsed);
  const collapseBtn=document.querySelector('#sidebar-collapse-btn');
  if(collapseBtn){
   collapseBtn.textContent=collapsed?'⇥':'⇤';
   if(collapseBtn.setAttribute)collapseBtn.setAttribute('aria-expanded',collapsed?'false':'true');
  }
  if(typeof applyUiSettings==='function'&&typeof getUiSettings==='function'){
   try{applyUiSettings({...getUiSettings(),theme:t});}catch{}
  }
 }
 if(typeof document!=='undefined'&&document.querySelectorAll){
  document.querySelectorAll('[data-set-theme]').forEach(b=>{
   if(b.classList)b.classList.toggle('selected',b.dataset.setTheme===t);
  });
 }
 const hapticsEl=typeof document!=='undefined'?document.querySelector('#pref-haptics'):null;
 if(hapticsEl)hapticsEl.checked=uiPrefs.haptics!==false;
}
function saveUiPrefs(){
 try{localStorage.setItem(PREFS_KEY,JSON.stringify(uiPrefs));}catch{}
 applyUiPrefs();
}
function toggleSidebarCollapse(){
 uiPrefs.sidebarCollapsed=!uiPrefs.sidebarCollapsed;
 saveUiPrefs();
 return uiPrefs.sidebarCollapsed;
}
function hapticTap(ms=10){
 try{if(uiPrefs.haptics!==false&&typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')navigator.vibrate([ms]);}catch{}
}

function setMobileDrawer(open){
 if(typeof document==='undefined'||!document.body?.classList)return;
 document.body.classList.toggle('drawer-open',Boolean(open));
 const backdrop=document.querySelector('#drawer-backdrop');
 if(backdrop)backdrop.hidden=!open;
 const btn=document.querySelector('#mobile-menu-btn');
 if(btn&&btn.setAttribute)btn.setAttribute('aria-expanded',open?'true':'false');
}

function syncMobileShell(){
 if(typeof document==='undefined')return;
 const isAnagrafiche=['contatti','lead','prospect','clienti','categories'].includes(view);
 const subnav=document.querySelector('#mobile-subnav');
 if(subnav)subnav.hidden=!isAnagrafiche;
 const fabLabel=document.querySelector('#mobile-fab-label');
 if(fabLabel){
  const fabMap={activities:'Attività',contatti:'Azienda',lead:'Lead',prospect:'Prospect',clienti:'Cliente',categories:'Categoria',quotes:'Preventivo',projects:'Progetto',analytics:'Obiettivi'};
  fabLabel.textContent=fabMap[view]||'Trattativa';
 }
 closeQuickCreateDropdown();
 closeMobileCreateSheet();
 try { document.querySelector('#mobile-more-sheet')?.close(); } catch(_) {}
 if(document.querySelectorAll){
  const isMoreView=['trattative','campaigns','quotes','analytics'].includes(view);
  const moreBtn=document.querySelector('#mobile-nav-more');
  if(moreBtn&&moreBtn.classList)moreBtn.classList.toggle('active',isMoreView);
  document.querySelectorAll('#mobile-bottom-nav [data-view]').forEach(b=>{
   const active=b.dataset.view===view||(b.dataset.view==='contatti'&&isAnagrafiche);
   if(b.classList)b.classList.toggle('active',active);
  });
  document.querySelectorAll('#mobile-subnav [data-view]').forEach(b=>{
   if(b.classList)b.classList.toggle('active',b.dataset.view===view);
  });
  const contacts=state.contacts||[];
  const deals=state.deals||[];
  const tasks=(state.activities||[]).filter(isOpenTask);
  const dueFollowups=deals.filter(d=>!isArchived(d)&&getSalesStage(d)!=='Persa'&&d.due&&d.due<=today()).length;
  const dueTasks=tasks.filter(a=>a.dueDate&&a.dueDate<=today()).length;
  const counts={
   oggi:dueFollowups+dueTasks,
   activities:tasks.length,
   projects:(state.projects||[]).filter(p=>p.status!=='Completato').length,
   contatti:contacts.length,
   lead:contacts.filter(c=>contactStage(c.id)==='Lead').length,
   prospect:contacts.filter(c=>contactStage(c.id)==='Prospect').length,
   clienti:contacts.filter(c=>contactStage(c.id)==='Cliente').length,
   categories:(state.categories||[]).length,
   trattative:typeof openDeals==='function'?openDeals().length:0,
   quotes:(state.quotes||[]).length
  };
  document.querySelectorAll('[data-nav-count]').forEach(el=>{
   const key=el.dataset?.navCount;
   const val=Number(counts[key]||0);
   el.textContent=val>0?String(val):'';
   el.hidden=val<=0;
  });
 }
 setMobileDrawer(false);
}

function openQuickCreateDropdown(){
 const menu=document.querySelector('#quick-create-menu');
 const btn=document.querySelector('#quick-create-btn');
 if(!menu||!btn)return;
 menu.hidden=false;
 if(typeof btn.setAttribute==='function')btn.setAttribute('aria-expanded','true');
}

function closeQuickCreateDropdown(){
 const menu=document.querySelector('#quick-create-menu');
 const btn=document.querySelector('#quick-create-btn');
 if(menu)menu.hidden=true;
 if(btn&&typeof btn.setAttribute==='function')btn.setAttribute('aria-expanded','false');
}

function toggleQuickCreateDropdown(){
 const menu=document.querySelector('#quick-create-menu');
 if(!menu)return;
 if(menu.hidden)openQuickCreateDropdown();
 else closeQuickCreateDropdown();
}

function openMobileCreateSheet(){
 const dlg=document.querySelector('#mobile-create-sheet');
 if(!dlg)return;
 closeQuickCreateDropdown();
 setMobileDrawer(false);
 if(!dlg.open&&typeof dlg.showModal==='function')dlg.showModal();
 const fab=document.querySelector('#mobile-fab');
 if(fab&&typeof fab.setAttribute==='function')fab.setAttribute('aria-expanded','true');
}

function closeMobileCreateSheet(){
 const dlg=document.querySelector('#mobile-create-sheet');
 if(dlg?.open&&typeof dlg.close==='function')dlg.close();
 const fab=document.querySelector('#mobile-fab');
 if(fab&&typeof fab.setAttribute==='function')fab.setAttribute('aria-expanded','false');
}

function openSettingsDialog(){
 const dlg=document.querySelector('#settings-dialog');
 if(!dlg)return;
 applyUiPrefs();
 const sum=document.querySelector('#settings-archive-summary');
 if(sum){
  const openTasks=(state.activities||[]).filter(isOpenTask).length;
  sum.innerHTML=`
   <div class="settings-stat"><span>Aziende</span><strong>${state.contacts.length}</strong></div>
   <div class="settings-stat"><span>Opportunità</span><strong>${state.deals.length}</strong></div>
   <div class="settings-stat"><span>Attività aperte</span><strong>${openTasks}</strong></div>
   <div class="settings-stat"><span>Preventivi</span><strong>${(state.quotes||[]).length}</strong></div>`;
 }
 setMobileDrawer(false);
 if(!dlg.open&&typeof dlg.showModal==='function')dlg.showModal();
}

// Command Palette (Ctrl+K / Cmd+K) inspired by Linear & Attio
let commandQuery='';
function buildCommandItems(q=''){
 const term=String(q||'').trim().toLocaleLowerCase('it');
 const matchText=(...parts)=>!term||parts.filter(Boolean).join(' ').toLocaleLowerCase('it').includes(term);
 const actions=[
  {group:'Azioni rapide',icon:'⚡',label:'Registra interazione rapida',meta:'Chiamata, WhatsApp, email o incontro',cmd:'quick-touchpoint'},{group:'Azioni rapide',icon:'＋',label:'Nuova trattativa / opportunità',meta:'Crea opportunità commerciale',cmd:'new-deal'},
  {group:'Azioni rapide',icon:'🏢',label:'Nuova azienda / contatto',meta:'Aggiungi anagrafica e referenti',cmd:'new-contact'},
  {group:'Azioni rapide',icon:'☑',label:'Nuova attività operativa',meta:'Pianifica chiamata, demo o follow-up',cmd:'new-task'},
  {group:'Azioni rapide',icon:'▤',label:'Nuovo preventivo',meta:'Crea proposta commerciale con versioni',cmd:'new-quote'},
  {group:'Azioni rapide',icon:'🚀',label:'Nuovo progetto / commessa',meta:'Avvia commessa con milestone',cmd:'new-project'},
  {group:'Azioni rapide',icon:'↕',label:'Cambia densità (Confortevole / Compatta)',meta:'Ottimizza densità tabelle',cmd:'toggle-density'},
  {group:'Azioni rapide',icon:'⇤',label:'Comprimi / Espandi barra laterale (Ctrl+B)',meta:'Passa da Sidebar estesa a Navigation Rail compatta',cmd:'toggle-sidebar'},
  {group:'Azioni rapide',icon:'↓',label:'Esporta backup JSON completo',meta:'Salva copia locale',cmd:'export-json'},
  {group:'Navigazione',icon:'◷',label:'Vai a Oggi (Dashboard)',meta:'Prossime azioni e KPI',cmd:'view:oggi'},
  {group:'Navigazione',icon:'☑',label:'Vai a Attività',meta:'Bacheca Lead, Prospect e Clienti',cmd:'view:activities'},
  {group:'Navigazione',icon:'🚀',label:'Vai a Progetti & Consegne',meta:'Milestone, budget e ore',cmd:'view:projects'},
  {group:'Navigazione',icon:'◎',label:'Vai a Contatti & Anagrafiche',meta:'Tutte le aziende',cmd:'view:contatti'},
  {group:'Navigazione',icon:'▥',label:'Vai a Opportunità (Pipeline)',meta:'Bacheca 5 fasi ed elenco',cmd:'view:trattative'},
  {group:'Navigazione',icon:'▤',label:'Vai a Preventivi',meta:'Proposte commerciali e stampa PDF',cmd:'view:quotes'},
  {group:'Navigazione',icon:'📈',label:'Vai a Forecast & KPI',meta:'Target, pesi e storico fatturati',cmd:'view:analytics'},
  {group:'Navigazione',icon:'⚙',label:'Apri Impostazioni',meta:'Strumenti, feedback aptico e archivio',cmd:'open-settings'}
 ].filter(item=>matchText(item.label,item.meta,item.group));

 const companyItems=(state.contacts||[]).filter(c=>matchText(
  c.company,c.person,c.email,c.phone,c.sector,c.city,c.notes,c.taxId,c.source,
  ...(c.referents||[]).flatMap(r=>[r.name,r.role,r.email,r.phone]),
  ...(c.history||[]).map(h=>h.text)
 )).slice(0,6).map(c=>({
  group:'Aziende',
  icon:'🏢',
  label:c.company,
  meta:`${contactStage(c.id)}${c.person?' · '+c.person:''}${c.phone?' · '+c.phone:''}`,
  cmd:`c360:${c.id}`
 }));

 const dealItems=(state.deals||[]).filter(d=>!isArchived(d)&&matchText(
  d.title,contact(d.contactId)?.company,d.service,getSalesStage(d),
  d.problem,d.process,d.solution,d.benefit,d.next,d.notes,
  ...(d.history||[]).map(h=>h.text)
 )).slice(0,6).map(d=>({
  group:'Opportunità',
  icon:'💼',
  label:d.title,
  meta:`${contact(d.contactId)?.company||'Azienda'} · ${getSalesStage(d)} · ${money(d.setup)}`,
  cmd:`deal:${d.id}`
 }));

 const taskItems=(state.activities||[]).filter(a=>isOpenTask(a)&&matchText(
  a.title,contact(a.contactId)?.company,a.type,a.notes,a.reason,a.outcome,a.lastOutcome,a.referentName,a.personName,a.calendar
 )).slice(0,5).map(a=>({
  group:'Attività aperte',
  icon:'☑',
  label:a.title,
  meta:`${contact(a.contactId)?.company||'Azienda'} · ${a.type}${a.dueDate?' · '+date(a.dueDate):''}`,
  cmd:`task:${a.id}`
 }));

 return [...companyItems,...dealItems,...taskItems,...actions];
}

function renderCommandPalette(q=commandQuery){
 commandQuery=String(q??'');
 const box=typeof document!=='undefined'?document.querySelector('#command-results'):null;
 if(!box)return '';
 const items=buildCommandItems(commandQuery);
 if(!items.length){
  box.innerHTML='<div class="empty-compact">Nessun comando o scheda trovata per questa ricerca.</div>';
  return box.innerHTML;
 }
 const groups=new Map();
 for(const item of items){
  if(!groups.has(item.group))groups.set(item.group,[]);
  groups.get(item.group).push(item);
 }
 box.innerHTML=[...groups.entries()].map(([g,list])=>`
  <div class="command-group">
   <div class="command-group-label">${esc(g)}</div>
   ${list.map(item=>`<button type="button" class="command-item" data-run-cmd="${esc(item.cmd)}">
    <span class="command-item-icon">${esc(item.icon)}</span>
    <span class="command-item-main"><strong>${esc(item.label)}</strong><small>${esc(item.meta)}</small></span>
    <span class="command-item-enter">↵</span>
   </button>`).join('')}
  </div>`).join('');
 return box.innerHTML;
}

function openCommandPalette(initialQuery=''){
 const dlg=typeof document!=='undefined'?document.querySelector('#command-dialog'):null;
 if(!dlg)return false;
 commandQuery=String(initialQuery||'');
 const inp=document.querySelector('#command-input');
 if(inp)inp.value=commandQuery;
 renderCommandPalette(commandQuery);
 setMobileDrawer(false);
 if(!dlg.open&&typeof dlg.showModal==='function')dlg.showModal();
 if(inp&&typeof inp.focus==='function')inp.focus();
 return true;
}

function runCommandAction(cmd){
 const dlg=typeof document!=='undefined'?document.querySelector('#command-dialog'):null;
 if(dlg?.open&&typeof dlg.close==='function')dlg.close();
 if(!cmd)return false;
 if(cmd==='quick-touchpoint'){if(typeof openInteractionLogger==='function')openInteractionLogger();return true;}if(cmd.startsWith('c360:')){if(typeof openCompany360==='function')openCompany360(cmd.slice(5));return true;}if(cmd==='new-deal'){openEditor('deal');return true;}
 if(cmd==='new-contact'){openEditor('contact');return true;}
 if(cmd==='new-task'){openTaskEditor();return true;}
 if(cmd==='new-quote'){openQuote();return true;}
 if(cmd==='new-project'){if(typeof openProjectEditor==='function')openProjectEditor();return true;}
 if(cmd==='cycle-theme'){if(typeof cycleTheme==='function')cycleTheme();return true;}
 if(cmd==='toggle-density'){if(typeof toggleDensity==='function')toggleDensity();return true;}
 if(cmd==='toggle-sidebar'){toggleSidebarCollapse();return true;}
 if(cmd==='export-json'){document.querySelector('#export')?.click();return true;}
 if(cmd==='open-settings'){openSettingsDialog();return true;}
 if(cmd.startsWith('view:')){setView(cmd.slice(5));return true;}
 if(cmd.startsWith('contact:')){openEditor('contact',cmd.slice(8));return true;}
 if(cmd.startsWith('deal:')){openEditor('deal',cmd.slice(5));return true;}
 if(cmd.startsWith('task:')){openTaskEditor(cmd.slice(5));return true;}
 return false;
}

applyUiPrefs();

document.addEventListener('click',e=>{
 const b=e.target.closest('button');
 const createDrop=e.target.closest('#quick-create-dropdown');
 if(!createDrop)closeQuickCreateDropdown();
 if(e.target.id==='drawer-backdrop'){setMobileDrawer(false);return;}
 if(!b)return;
 if(b.id==='quick-create-btn'){toggleQuickCreateDropdown();hapticTap(6);return;}
 if(b.dataset.new){closeQuickCreateDropdown();closeMobileCreateSheet();}
 if(b.id==='mobile-menu-btn'){
  const isOpen=document.body?.classList?.contains('drawer-open');
  setMobileDrawer(!isOpen);
  hapticTap(8);
  return;
 }
 if(b.id==='drawer-close'){setMobileDrawer(false);return;}
 if(b.id==='sidebar-collapse-btn'){toggleSidebarCollapse();return;}
 if(b.id==='mobile-fab'){hapticTap(12);openMobileCreateSheet();return;}
 if(b.id==='mobile-create-close'){closeMobileCreateSheet();return;}
 if(b.id==='mobile-nav-more'){
  hapticTap(8);
  const moreSheet=document.querySelector('#mobile-more-sheet');
  if(moreSheet&&typeof moreSheet.showModal==='function')moreSheet.showModal();
  return;
 }
 if(b.id==='mobile-more-close'){
  document.querySelector('#mobile-more-sheet')?.close();
  return;
 }
 if(b.id==='mobile-more-settings-btn'){
  document.querySelector('#mobile-more-sheet')?.close();
  openSettingsDialog();
  return;
 }
 if(b.id==='open-settings'||b.id==='header-settings-btn'){openSettingsDialog();return;}
 if(b.id==='cmd-trigger-btn'){openCommandPalette();return;}
 if(b.id==='command-close'){document.querySelector('#command-dialog')?.close();return;}
 if(b.dataset.runCmd){runCommandAction(b.dataset.runCmd);return;}
 if(b.id==='settings-close'||b.id==='settings-done'){document.querySelector('#settings-dialog')?.close();return;}
 if(b.id==='quote-close'){document.querySelector('#quote-editor')?.close();quoteSession=null;return;}
 if(b.id==='csv-close'){document.querySelector('#csv-dialog')?.close();if(typeof csvSession!=='undefined')csvSession=null;return;}
 if(b.dataset.setTheme){
  uiPrefs.theme=b.dataset.setTheme;
  saveUiPrefs();
  hapticTap(10);
  return;
 }
 if(b.id==='settings-export-json'){document.querySelector('#settings-dialog')?.close();document.querySelector('#export')?.click();return;}
 if(b.id==='settings-import-csv'){document.querySelector('#settings-dialog')?.close();document.querySelector('#import-companies')?.click();return;}
 if(b.id==='settings-import-json'){document.querySelector('#settings-dialog')?.close();document.querySelector('#import')?.click();return;}
 if(b.dataset.view||b.dataset.complete||b.dataset.completeTask){hapticTap(10);}
});

document.addEventListener('change',e=>{
 if(e.target.id==='pref-haptics'){
  uiPrefs.haptics=Boolean(e.target.checked);
  saveUiPrefs();
 }
});

document.addEventListener('input',e=>{
 if(e.target.id==='command-input'){
  renderCommandPalette(e.target.value);
 }
});

document.addEventListener('keydown',e=>{
 const key=String(e.key||'').toLowerCase();
 if((e.ctrlKey||e.metaKey)&&key==='k'){
  e.preventDefault?.();
  openCommandPalette();
 }else if((e.ctrlKey||e.metaKey)&&key==='b'){
  e.preventDefault?.();
  toggleSidebarCollapse();
 }else if(key==='escape'){
  closeQuickCreateDropdown();
 }else if(e.altKey&&!e.ctrlKey&&!e.metaKey){
  const altViews={'1':'oggi','2':'activities','3':'projects','4':'contatti','5':'trattative','6':'quotes','7':'analytics'};
  if(altViews[key]){
   e.preventDefault?.();
   setView(altViews[key]);
  }
 }else if(e.key==='Enter'&&e.target?.id==='command-input'){
  const first=document.querySelector?.('#command-results [data-run-cmd]');
  if(first?.dataset?.runCmd){
   e.preventDefault?.();
   runCommandAction(first.dataset.runCmd);
  }
 }
});

if(typeof window!=='undefined'&&typeof document.addEventListener==='function'){
 let touchStartX=0,touchStartY=0,touchDialog=null;
 document.addEventListener('touchstart',e=>{
  const t=e.touches?.[0];if(!t)return;
  touchStartX=t.clientX;touchStartY=t.clientY;
  const heading=e.target.closest?.('.modal-heading');
  touchDialog=heading?heading.closest('dialog'):null;
 },{passive:true});
 document.addEventListener('touchend',e=>{
  const t=e.changedTouches?.[0];if(!t)return;
  const dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;
  if(touchDialog&&dy>75&&Math.abs(dy)>Math.abs(dx)*1.4){
   touchDialog.close();
   if(touchDialog.id==='task-editor')taskSession=null;
   if(touchDialog.id==='quote-editor')quoteSession=null;
   touchDialog=null;
   return;
  }
  touchDialog=null;
  if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.5){
   const drawerOpen=document.body?.classList?.contains('drawer-open');
   if(!drawerOpen&&touchStartX<32&&dx>65){
    setMobileDrawer(true);
    hapticTap(8);
   }else if(drawerOpen&&dx<-65){
    setMobileDrawer(false);
   }
  }
 },{passive:true});
}

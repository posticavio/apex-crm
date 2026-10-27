'use strict';
const KEY='apex-crm-v1';
const stages=['Lead','Prospect','Cliente'];
function migrate(data){
 if(!data||!Array.isArray(data.deals))return data;
 for(const d of data.deals){
  if(!d||typeof d!=='object')continue;
  const previous=d.stage;
  if(['Primo contatto','Analisi esigenze','Demo / Proposta','Negoziazione'].includes(previous))d.stage='Prospect';
  if(previous==='Vinto')d.stage='Cliente';
  if(previous==='Perso'){d.stage='Prospect';d.archived=true;}
  if(d.stage!==previous){d.history=Array.isArray(d.history)?d.history:[];d.history.push({date:today(),text:'Fase precedente: '+previous});}
 }
 return data;
}
const isArchived=d=>d.archived===true;
const contactStage=id=>state.deals.some(d=>d.contactId===id&&d.stage==='Cliente'&&!isArchived(d))?'Cliente':state.deals.some(d=>d.contactId===id&&d.stage==='Prospect'&&!isArchived(d))?'Prospect':'Lead';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(new Date());
const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0);
const date=v=>v?new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short'}).format(new Date(v+'T12:00:00')):'Senza data';
let state={contacts:[],deals:[]},view='oggi',editing=null,search='',filter='',taskFilter='all',pipelineLayout='board',sortOrder='name';
let loadError=false;
try{const saved=localStorage.getItem(KEY);if(saved){const parsed=migrate(JSON.parse(saved));validate(parsed);state=parsed;}}catch(e){loadError=true;}
function validate(data){
 if(!data||!Array.isArray(data.contacts)||!Array.isArray(data.deals))throw Error('Formato non valido');
 const ids=new Set();
 for(const c of data.contacts){if(!c||typeof c.id!=='string'||typeof c.company!=='string'||!c.company.trim()||ids.has(c.id))throw Error('Contatto non valido');ids.add(c.id);for(const k of ['person','email','phone','source','notes'])if(c[k]!=null&&typeof c[k]!=='string')throw Error('Campo non valido');}
 const dids=new Set();
 for(const d of data.deals){if(!d||typeof d.id!=='string'||dids.has(d.id)||!ids.has(d.contactId)||typeof d.title!=='string'||!d.title.trim()||!stages.includes(d.stage)||!Number.isFinite(d.setup)||d.setup<0||!Number.isFinite(d.monthly)||d.monthly<0)throw Error('Trattativa non valida');dids.add(d.id);for(const k of ['problem','process','solution','tools','benefit','next','due','service'])if(d[k]!=null&&typeof d[k]!=='string')throw Error('Campo non valido');if(d.due&&!validDate(d.due))throw Error('Data non valida');if(d.history!=null&&(!Array.isArray(d.history)||d.history.some(h=>!h||typeof h.text!=='string'||typeof h.date!=='string')))throw Error('Storico non valido');}
}
function persist(next){if(loadError){toast('Importa un backup valido o ripristina i dati prima di salvare.');return false;}try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}catch(e){toast('Salvataggio non riuscito: controlla spazio e permessi del browser.');return false;}}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4200);}
const contact=id=>state.contacts.find(c=>c.id===id);
const openDeals=()=>state.deals.filter(d=>d.stage!=='Cliente'&&!isArchived(d));
const matches=(...parts)=>parts.join(' ').toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it'));
function empty(title,desc,action='',type='deal'){return `<div class="empty"><div class="empty-symbol">↗</div><h3>${title}</h3><p>${desc}</p>${action?`<button class="primary" data-new="${type}">${action}</button>`:''}</div>`;}
function setView(v){view=v;search='';filter='';render();}
function render(){
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 const meta={oggi:['Dashboard','Dashboard','Attività commerciali e prossimi passi di Apex Digital.'],contatti:['Contatti','Anagrafiche','Aziende e referenti · Lead, Prospect e Clienti.'],trattative:['Opportunità','Opportunità','Pipeline commerciale · Lead → Prospect → Cliente.'],lead:['Lead','Lead','Contatti da qualificare e prime relazioni commerciali.'],prospect:['Prospect','Prospect','Aziende con opportunità commerciali concrete.'],clienti:['Clienti','Clienti','Servizi acquisiti e canoni mensili.']}[view];
 $('#crumb').textContent=meta[0];$('#page-title').textContent=meta[1];$('#subtitle').textContent=meta[2];$('#date-label').textContent=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Rome'}).format(new Date());$('#new').textContent=['contatti','lead','prospect'].includes(view)?'+ Nuovo contatto':'+ Nuova trattativa';
 $('#content').innerHTML=(loadError?'<p class="notice">Impossibile leggere i dati salvati. Sono stati conservati senza sovrascriverli. Importa un backup valido per ripartire.</p>':'')+(view==='oggi'?dashboard():view==='trattative'?pipeline():contactsView(view==='clienti'));
}
function dashboard(){const active=openDeals(),won=state.deals.filter(d=>d.stage==='Cliente'&&!isArchived(d)),tasks=state.deals.filter(d=>!isArchived(d)&&d.next&&d.due).sort((a,b)=>a.due.localeCompare(b.due)),due=tasks.filter(d=>d.due<=today());
 return `<div class="stats"><div class="stat"><span class="stat-label">Pipeline aperta</span><strong>${money(active.reduce((n,d)=>n+d.setup,0))}</strong><small>${active.length} trattative · costi iniziali</small></div><div class="stat"><span class="stat-label">Follow-up da gestire</span><strong>${due.length.toString().padStart(2,'0')}</strong><small>In scadenza oggi o arretrati</small></div><div class="stat"><span class="stat-label">Clienti acquisiti</span><strong>${new Set(won.map(d=>d.contactId)).size.toString().padStart(2,'0')}</strong><small>Aziende nella fase Cliente</small></div><div class="stat accent"><span class="stat-label">Canoni acquisiti / mese</span><strong>${money(won.reduce((n,d)=>n+d.monthly,0))}</strong><small>Somma dei canoni dei clienti</small></div></div><div class="dashboard"><div class="panel"><div class="panel-title"><h2>Le tue prossime azioni <span class="pill">${tasks.length}</span></h2><small>In ordine di scadenza</small></div>${activityList(tasks)}</div><div><div class="panel"><div class="panel-title"><h2>La tua pipeline</h2><button class="text-button" data-view="trattative">Apri bacheca ↗</button></div>${stages.map(s=>`<div class="mini-row"><span>${s}</span><strong>${state.deals.filter(d=>d.stage===s&&!isArchived(d)).length}</strong></div>`).join('')}</div><div class="guide"><span class="guide-icon">✧</span><div><h3>Parti dal problema, poi dalla tecnologia.</h3><p>Annota il processo da migliorare e il beneficio atteso. La proposta AI viene dopo.</p></div></div></div></div>`;
}
function toolbar(client=false){const contactFilters=client&&view==='contatti'?`<select id="contact-filter" aria-label="Filtra tipo contatto"><option value="">Tutti i contatti</option>${stages.map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}</select>`:'';return `<div class="toolbar"><input id="search" aria-label="Cerca" placeholder="Cerca azienda, referente o esigenza…" value="${esc(search)}">${contactFilters}${!client?`<select id="stage-filter" aria-label="Filtra fase"><option value="">Tutte le fasi</option><option value="archived" ${filter==='archived'?'selected':''}>Archiviate</option>${stages.map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}</select>`:''}${listControls(client)}</div>`;}
function pipeline(){if(pipelineLayout==='list')return pipelineTable();return toolbar()+`<div class="board">${stages.filter(s=>!filter||filter==='archived'||s===filter).map(s=>{const ds=visibleDeals().filter(d=>d.stage===s);return `<section class="column stage-${stages.indexOf(s)}"><div class="column-heading"><h3>${s}<span>${ds.length}</span></h3><div class="column-value">${money(ds.reduce((total,d)=>total+d.setup,0))}<small>valore iniziale</small></div></div><div class="column-body">${ds.map(d=>`<div class="deal-container"><button class="deal" data-edit-deal="${esc(d.id)}"><span class="pill ${s==='Cliente'?'green':''}">${esc(d.service||'Servizio AI')}</span><strong>${esc(d.title)}</strong><p>${esc(contact(d.contactId)?.company)}</p><div class="amount">${money(d.setup)} <small>+ ${money(d.monthly)} / mese</small></div><small>${esc(d.next||'Nessuna prossima azione')}</small>${d.due?`<small>${date(d.due)}</small>`:''}</button>${phaseAction(d)}</div>`).join('')}${!ds.length?'<div class="empty">Nessuna trattativa</div>':''}</div></section>`;}).join('')}</div>`;}
function contactsView(clients){const rows=visibleContacts(clients);return toolbar(true)+`<div class="panel">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Azienda / Referente</th><th>Fase</th><th>${clients?'Servizi acquisiti':'Contatto'}</th><th>${clients?'Valore iniziale':'Provenienza'}</th><th>${clients?'Canone / mese':'Trattative'}</th><th></th></tr></thead><tbody>${rows.map(c=>{const deals=state.deals.filter(d=>d.contactId===c.id),won=deals.filter(d=>d.stage==='Cliente'&&!isArchived(d));return `<tr><td><strong>${esc(c.company)}</strong><small>${esc(c.person||'Referente da aggiungere')}</small></td><td><span class="pill ${contactStage(c.id)==='Cliente'?'green':''}">${contactStage(c.id)}</span></td><td>${clients?won.map(d=>`<button class="text-button" data-edit-deal="${esc(d.id)}">${esc(d.title)}</button>`).join('<br>'):`${emailLink(c.email)}<small>${phoneLink(c.phone)}</small>`}</td><td>${clients?money(won.reduce((n,d)=>n+d.setup,0)):esc(c.source||'—')}</td><td>${clients?money(won.reduce((n,d)=>n+d.monthly,0)):deals.length}</td><td><button class="text-button" data-edit-contact="${esc(c.id)}">Apri scheda ↗</button></td></tr>`;}).join('')}</tbody></table></div>`:empty(search?'Nessun risultato':clients?'I tuoi prossimi clienti partono da qui.':'Il tuo network Apex, tutto qui.',search?'Prova con un altro termine.':clients?'Le aziende appariranno qui quando una trattativa passerà a Cliente.':'Aggiungi la prima azienda e il suo referente.',search?'':clients?'Nuova trattativa':'Aggiungi un contatto',clients?'deal':'contact')}</div>`;}
function relatedDeals(id){const deals=state.deals.filter(d=>d.contactId===id);return `<section class="related-deals"><div class="panel-title"><h2>Opportunità collegate <span class="pill">${deals.length}</span></h2><button type="button" class="text-button" data-contact-deal="${esc(id)}">+ Nuova opportunità</button></div>${deals.length?deals.map(d=>`<div class="related-row"><button type="button" class="text-button" data-edit-deal="${esc(d.id)}">${esc(d.title)}</button><span class="pill">${esc(d.stage)}${isArchived(d)?' · Archiviata':''}</span><strong>${money(d.setup)}</strong></div>`).join(''):'<p class="related-empty">Nessuna opportunità collegata a questa azienda.</p>'}</section>`;}
function field(name,label,value='',type='text',full=false){return `<label class="field ${full?'full':''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${['company','title'].includes(name)?'required':''} ${type==='number'?'min="0" step="0.01"':''}></label>`;}
function area(name,label,value=''){return `<label class="field full">${label}<textarea name="${name}">${esc(value)}</textarea></label>`;}
function openEditor(type,id=null,overrides={}){const item=(type==='contact'?state.contacts:state.deals).find(x=>x.id===id)||overrides;editing={type,id};$('#editor-title').textContent=(id?'Modifica ':'Nuova ')+(type==='contact'?'scheda contatto':'trattativa');$('#delete').classList.toggle('hidden',!id);
 if(type==='contact'){$('#fields').innerHTML=`${id?contactShortcuts(item):''}<div class="field-grid"><h3 class="form-section">Anagrafica azienda</h3>${field('company','Azienda *',item.company)}${field('person','Referente',item.person)}${field('email','Email',item.email,'email')}${field('phone','Telefono',item.phone,'tel')}${field('source','Provenienza del lead',item.source,'text',true)}${area('notes','Note sull’azienda e sul referente',item.notes)}</div>${id?relatedDeals(id)+contactHistory(id):''}`;}
 else{if(!state.contacts.length){toast('Aggiungi prima l’azienda: poi potrai creare la trattativa.');openEditor('contact');return;}
 $('#fields').innerHTML=`<div class="field-grid"><h3 class="form-section">Dati dell’opportunità</h3><label class="field">Azienda *<select name="contactId" required>${state.contacts.map(c=>`<option value="${esc(c.id)}" ${item.contactId===c.id?'selected':''}>${esc(c.company)}</option>`).join('')}</select></label>${field('title','Titolo opportunità *',item.title)}<label class="field">Fase<select name="stage">${stages.map(s=>`<option ${item.stage===s?'selected':''}>${s}</option>`).join('')}</select></label><label class="field">Servizio<select name="service">${['Automazione','Assistente AI','Integrazione','Consulenza AI','Altro'].map(s=>`<option ${item.service===s?'selected':''}>${s}</option>`).join('')}</select></label><h3 class="form-section">Valore commerciale</h3>${field('setup','Costo iniziale (€)',item.setup??0,'number')}${field('monthly','Canone mensile (€)',item.monthly??0,'number')}<h3 class="form-section">Analisi e soluzione</h3>${area('problem','Problema del cliente',item.problem)}${area('process','Processo attuale',item.process)}${area('solution','Soluzione proposta',item.solution)}${field('tools','Strumenti del cliente',item.tools)}${field('benefit','Beneficio atteso',item.benefit)}<h3 class="form-section">Attività e storico</h3>${field('next','Prossima azione',item.next)}${field('due','Data del prossimo passo',item.due,'date')}${area('note','Aggiungi una nota allo storico')}<label class="field full"><span><input style="width:auto" type="checkbox" name="archived" ${item.archived?'checked':''}> Archiviata · escludi da pipeline e riepiloghi</span></label>${(item.history||[]).length?`<div class="field full">Storico<div class="history">${[...item.history].reverse().map(h=>`${esc(h.date)} · ${esc(h.text)}`).join('\n')}</div></div>`:''}</div>`;
 }
 if(!$('#editor').open)$('#editor').showModal();
}
$('#record-form').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));if(editing?.type==='activity'){submitActivity(data);return;}const next=structuredClone(state),arr=editing.type==='contact'?next.contacts:next.deals,index=arr.findIndex(x=>x.id===editing.id),old=arr[index];
 for(const key in data)if(typeof data[key]==='string')data[key]=data[key].trim();
 if(editing.type==='deal'){data.archived=data.archived==='on';if(data.stage!=='Cliente'&&!data.archived&&(!data.next||!data.due)){toast('Per una trattativa aperta, indica prossima azione e data.');return;}data.setup=Number(data.setup);data.monthly=Number(data.monthly);data.history=old?.history||[];if(data.note)data.history.push({date:today(),text:data.note});delete data.note;}
 const record={...old,...data,id:editing.id||crypto.randomUUID()};if(index<0)arr.push(record);else arr[index]=record;
 try{validate(next);}catch{toast('Controlla i campi obbligatori e gli importi.');return;}
 if(persist(next)){$('#editor').close();render();toast('Salvato nel browser.');}
});
$('#home').onclick=e=>{e.preventDefault();setView('oggi');};
$('#new').onclick=()=>openEditor(['contatti','lead','prospect'].includes(view)?'contact':'deal');$('#close').onclick=$('#cancel').onclick=()=>$('#editor').close();
$('#delete').onclick=()=>{const {type,id}=editing;if(type==='contact'&&state.deals.some(d=>d.contactId===id)){toast('Elimina prima le trattative collegate a questo contatto.');return;}if(!confirm('Eliminare questa scheda? L’operazione non può essere annullata.'))return;const next=structuredClone(state),key=type==='contact'?'contacts':'deals';next[key]=next[key].filter(x=>x.id!==id);if(persist(next)){$('#editor').close();render();toast('Scheda eliminata.');}};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.advanceDeal){advanceDeal(b.dataset.advanceDeal,b.dataset.targetStage);return;}if(b.dataset.contactDeal){if(confirm('Aprire una nuova opportunità? Le modifiche non salvate alla scheda saranno scartate.'))openEditor('deal',null,{contactId:b.dataset.contactDeal});return;}if(b.dataset.pipelineLayout){pipelineLayout=b.dataset.pipelineLayout;render();}if(b.id==='export-csv')exportCsv();if(b.dataset.view)setView(b.dataset.view);if(b.dataset.new)openEditor(b.dataset.new);if(b.dataset.editDeal&&(!$('#editor').open||editing?.type!=='contact'||confirm('Aprire l’opportunità? Le modifiche non salvate alla scheda saranno scartate.')))openEditor('deal',b.dataset.editDeal);if(b.dataset.editContact)openEditor('contact',b.dataset.editContact);if(b.dataset.taskFilter){taskFilter=b.dataset.taskFilter;render();}if(b.dataset.complete)openActivity(b.dataset.complete);});
document.addEventListener('input',e=>{if(e.target.id==='search'){const cursor=e.target.selectionStart;search=e.target.value;render();$('#search').focus();$('#search').setSelectionRange(cursor,cursor);}});
document.addEventListener('change',e=>{if(e.target.id==='sort-order'){sortOrder=e.target.value;render();}if(['stage-filter','contact-filter'].includes(e.target.id)){filter=e.target.value;render();}});
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,...state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`apex-crm-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup esportato.');};
$('#import').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=migrate(JSON.parse(await file.text()));validate(parsed);if(!confirm(`Importare ${parsed.contacts.length} contatti e ${parsed.deals.length} trattative? I dati attuali saranno sostituiti. Esporta prima un backup se vuoi conservarli.`))return;const next={contacts:parsed.contacts,deals:parsed.deals};const wasError=loadError;loadError=false;if(persist(next)){render();toast('Backup importato.');}else loadError=wasError;}catch{toast('File non valido: usa un backup JSON del CRM Apex.');}finally{e.target.value='';}};
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+'T12:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
}
function activityList(tasks){
 const day=today(),conditions={all:()=>true,overdue:d=>d.due<day,today:d=>d.due===day,future:d=>d.due>day};
 const selected=tasks.filter(conditions[taskFilter]||conditions.all);
 const filters=[['all','Tutti'],['overdue','Scaduti'],['today','Oggi'],['future','Futuri']];
 return `<div class="activity-filters" role="group" aria-label="Filtra follow-up">${filters.map(([key,label])=>`<button data-task-filter="${key}" aria-pressed="${taskFilter===key}" class="${taskFilter===key?'selected':''}">${label}<span>${tasks.filter(conditions[key]).length}</span></button>`).join('')}</div>${selected.length?selected.map(d=>`<div class="activity"><button class="check" data-complete="${esc(d.id)}" title="Completa attività" aria-label="Completa ${esc(d.next)}">✓</button><div class="details"><strong>${esc(d.next)}</strong><p>${esc(contact(d.contactId)?.company)} · ${esc(d.title)}</p></div><div class="activity-actions"><span class="pill ${d.due<day?'red':''}">${date(d.due)}</span><button class="text-button" data-edit-deal="${esc(d.id)}">Apri opportunità ↗</button></div></div>`).join(''):tasks.length?empty('Nessuna attività in questa vista','Scegli un altro filtro per vedere gli altri follow-up.'):empty('Fai spazio alla prossima opportunità','Aggiungi una trattativa e scegli quando ricontattare il cliente.','Crea la prima trattativa')}`;
}
function openActivity(id){
 const d=state.deals.find(x=>x.id===id);
 if(!d||isArchived(d)||!d.next||!d.due){toast('Questa attività non è più disponibile.');return;}
 editing={type:'activity',id,expectedNext:d.next,expectedDue:d.due};
 $('#editor-title').textContent='Completa attività';
 $('#delete').classList.toggle('hidden',true);
 $('#fields').innerHTML=`<div class="activity-copy"><strong>${esc(d.next)}</strong><p>${esc(contact(d.contactId)?.company)} · ${esc(d.title)}</p><p>Data prevista: ${date(d.due)}</p></div><div class="field-grid">${area('outcome','Esito / note dell’attività')}<label class="field full">Fase dopo l’attività<select name="stage">${stages.map(s=>`<option ${d.stage===s?'selected':''}>${s}</option>`).join('')}</select></label><h3 class="form-section">Prossimo passo</h3>${field('next','Prossima azione')}${field('due','Data del prossimo passo','','date')}<label class="field full"><span><input style="width:auto" type="checkbox" name="archived"> Archivia l’opportunità senza un nuovo follow-up</span></label></div>`;
 if(!$('#editor').open)$('#editor').showModal();
}
function submitActivity(values){
 if(editing?.type!=='activity')return false;
 const data=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,typeof v==='string'?v.trim():v]));
 const current=state.deals.find(d=>d.id===editing.id);
 if(!current||isArchived(current)||current.next!==editing.expectedNext||current.due!==editing.expectedDue){toast('Attività cambiata: chiudi e riapri la scheda.');return false;}
 const archived=data.archived==='on',nextAction=data.next||'',due=data.due||'';
 if(!stages.includes(data.stage)){toast('Seleziona una fase valida.');return false;}
 if(Boolean(nextAction)!==Boolean(due)||(due&&!validDate(due))){toast('Indica insieme prossima azione e una data valida.');return false;}
 if(!archived&&data.stage!=='Cliente'&&(!nextAction||!due)){toast('Per Lead e Prospect attivi serve un prossimo passo con data.');return false;}
 const updated=structuredClone(state),deal=updated.deals.find(d=>d.id===current.id);
 const text=`Attività completata: ${current.next}\nData prevista: ${current.due}${data.outcome?'\nEsito: '+data.outcome:''}${data.stage!==current.stage?'\nFase: '+current.stage+' → '+data.stage:''}${archived?'\nOpportunità archiviata.':''}`;
 deal.history=[...(deal.history||[]),{date:today(),text,kind:'activity',scheduledFor:current.due}];
 deal.stage=data.stage;deal.archived=archived;deal.next=archived?'':nextAction;deal.due=archived?'':due;
 try{validate(updated);}catch{toast('Impossibile completare l’attività: controlla i dati.');return false;}
 if(!persist(updated))return false;
 $('#editor').close();editing=null;render();toast('Attività completata e storico aggiornato.');return true;
}
function contactHistory(id){
 const history=state.deals.filter(d=>d.contactId===id).flatMap(d=>(d.history||[]).map((h,index)=>({...h,title:d.title,index}))).sort((a,b)=>b.date.localeCompare(a.date)||b.index-a.index);
 return `<section class="related-deals"><div class="panel-title"><h2>Storico della relazione <span class="pill">${history.length}</span></h2></div><div class="timeline">${history.length?history.map(h=>`<article class="timeline-item"><small>${esc(h.date)} · ${esc(h.title)}</small><p>${esc(h.text)}</p></article>`).join(''):'<p class="related-empty">Le note e le attività completate appariranno qui.</p>'}</div></section>`;
}

function visibleDeals(){
 const rows=state.deals.filter(d=>(filter==='archived'?isArchived(d):!isArchived(d))&&(!filter||filter==='archived'||d.stage===filter)&&matches(d.title,contact(d.contactId)?.company,d.problem,d.solution));
 return rows.sort((a,b)=>sortOrder==='value'?b.setup-a.setup:sortOrder==='due'?(a.due||'9999').localeCompare(b.due||'9999'):a.title.localeCompare(b.title,'it',{sensitivity:'base'}));
}
function visibleContacts(clients=view==='clienti'){
 const phase=view==='lead'?'Lead':view==='prospect'?'Prospect':filter;
 return state.contacts.filter(c=>(clients?contactStage(c.id)==='Cliente':!phase||contactStage(c.id)===phase)&&matches(c.company,c.person,c.email,c.notes)).sort((a,b)=>a.company.localeCompare(b.company,'it',{sensitivity:'base'}));
}
function listControls(client){
 const count=client?visibleContacts().length:visibleDeals().length;
 return `<div class="list-controls"><span class="result-count">${count} ${client?'aziende':'opportunità'}</span>${!client?`<label class="sort-label">Ordina per<select id="sort-order" aria-label="Ordina opportunità"><option value="name" ${sortOrder==='name'?'selected':''}>Titolo A–Z</option><option value="value" ${sortOrder==='value'?'selected':''}>Valore maggiore</option><option value="due" ${sortOrder==='due'?'selected':''}>Prossima scadenza</option></select></label><div class="view-toggle" role="group" aria-label="Vista opportunità"><button data-pipeline-layout="board" aria-pressed="${pipelineLayout==='board'}" class="${pipelineLayout==='board'?'selected':''}">▥ Bacheca</button><button data-pipeline-layout="list" aria-pressed="${pipelineLayout==='list'}" class="${pipelineLayout==='list'?'selected':''}">☷ Elenco</button></div>`:''}<button id="export-csv" ${!count?'disabled':''}>↓ Esporta CSV</button></div>`;
}
function pipelineTable(){
 const rows=visibleDeals();
 return toolbar()+`<div class="panel">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Opportunità / Azienda</th><th>Fase</th><th>Servizio</th><th>Valore iniziale</th><th>Canone / mese</th><th>Prossimo passo</th><th></th></tr></thead><tbody>${rows.map(d=>`<tr><td><strong>${esc(d.title)}</strong><small>${esc(contact(d.contactId)?.company)}</small></td><td><span class="pill ${d.stage==='Cliente'?'green':''}">${esc(d.stage)}${isArchived(d)?' · Archiviata':''}</span></td><td>${esc(d.service||'—')}</td><td>${money(d.setup)}</td><td>${money(d.monthly)}</td><td>${esc(d.next||'—')}${d.due?`<small class="${d.due<today()?'overdue-date':''}">${date(d.due)}</small>`:''}</td><td><div class="row-actions"><button class="text-button" data-edit-deal="${esc(d.id)}">Apri scheda ↗</button>${phaseAction(d)}</div></td></tr>`).join('')}</tbody></table></div>`:empty('Nessuna opportunità trovata','Modifica i filtri o aggiungi una nuova trattativa.','Nuova trattativa')}</div>`;
}
function csvCell(value){
 let text=String(value??'');
 // Spreadsheet programs interpret text beginning with these characters as formulas.
 if(typeof value==='string'&&/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
function buildCsv(){
 let rows;
 if(view==='trattative')rows=[['Opportunità','Azienda','Fase','Archiviata','Servizio','Valore iniziale EUR','Canone mensile EUR','Prossima azione','Data prossimo passo'],...visibleDeals().map(d=>[d.title,contact(d.contactId)?.company,d.stage,isArchived(d)?'Sì':'No',d.service,d.setup,d.monthly,d.next,d.due])];
 else rows=[['Azienda','Referente','Fase','Email','Telefono','Provenienza','Note'],...visibleContacts().map(c=>[c.company,c.person,contactStage(c.id),c.email,c.phone,c.source,c.notes])];
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
function exportCsv(){
 const count=view==='trattative'?visibleDeals().length:visibleContacts().length;
 if(!count){toast('Nessun risultato da esportare.');return;}
 const blob=new Blob([buildCsv()],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`apex-${view}-${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast(`${count} ${view==='trattative'?'opportunità esportate':'aziende esportate'}. Il backup completo resta disponibile in JSON.`);
}

function phaseAction(deal){
 if(isArchived(deal)||deal.stage==='Cliente')return '';
 const next=deal.stage==='Lead'?'Prospect':'Cliente';
 return `<button type="button" class="phase-action" data-advance-deal="${esc(deal.id)}" data-target-stage="${next}">${next==='Prospect'?'Qualifica Prospect':'Converti in Cliente'} <span aria-hidden="true">→</span></button>`;
}
function advanceDeal(id,target){
 const current=state.deals.find(d=>d.id===id);
 if(!current||isArchived(current)||current.stage==='Cliente'||target!==(current.stage==='Lead'?'Prospect':'Cliente'))return false;
 if(target==='Prospect'&&(!current.next||!validDate(current.due))){openEditor('deal',id);toast('Indica prima il prossimo passo e una data per qualificare il Prospect.');return false;}
 const updated=structuredClone(state),deal=updated.deals.find(d=>d.id===id);
 deal.stage=target;deal.history=[...(deal.history||[]),{date:today(),kind:'phase',text:`Passaggio commerciale: ${current.stage} → ${target}`}];
 try{validate(updated);}catch{toast('Controlla i dati dell’opportunità prima di cambiare fase.');return false;}
 if(!persist(updated))return false;
 render();toast(`${contact(deal.contactId)?.company||'Opportunità'}: fase aggiornata a ${target}.`);return true;
}
function emailLink(value){
 const email=String(value||'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return esc(email||'—');
 return `<a class="contact-link" href="mailto:${esc(encodeURIComponent(email))}">${esc(email)}</a>`;
}
function phoneLink(value){
 const phone=String(value||'').trim();
 if(!/^\+?[\d\s().-]{3,}$/.test(phone))return esc(phone);
 const normalized=phone.replace(/[^+\d]/g,'');
 return `<a class="contact-link" href="tel:${esc(normalized)}">${esc(phone)}</a>`;
}
function contactShortcuts(item){
 if(!item.email&&!item.phone)return '';
 return `<div class="contact-shortcuts">${item.email?emailLink(item.email):''}${item.phone?phoneLink(item.phone):''}</div>`;
}

render();

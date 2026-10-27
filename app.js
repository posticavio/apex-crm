'use strict';
const KEY='apex-crm-v1';
const stages=['Lead','Prospect','Cliente'];
const salesStages=['Nuovo contatto','Trattativa','Offerta','Vinta','Persa'];
function salesLifecycle(value){return value==='Nuovo contatto'?'Lead':value==='Vinta'?'Cliente':'Prospect';}
function getSalesStage(d){
 if(d.salesStage&&salesStages.includes(d.salesStage)&&salesLifecycle(d.salesStage)===d.stage)return d.salesStage;
 return d.stage==='Cliente'?'Vinta':d.stage==='Prospect'?'Trattativa':'Nuovo contatto';
}
function normalizeSalesData(data,old){
 const value=data.salesStage||getSalesStage({stage:data.stage||old?.stage||'Lead'});
 if(!salesStages.includes(value))throw Error('Fase opportunità non valida.');
 data.salesStage=value;data.stage=salesLifecycle(value);
 if(['Vinta','Persa'].includes(value))data.salesClosedOn=old&&getSalesStage(old)===value?old.salesClosedOn||today():today();
 else data.salesClosedOn='';
}
function salesPhaseAction(d){
 const value=getSalesStage(d),index=salesStages.indexOf(value);
 if(isArchived(d)||index>=3)return '';
 const target=salesStages[index+1],label=target==='Vinta'?'Segna vinta':'Passa a '+target;
 return `<button type="button" class="phase-action" data-advance-deal="${esc(d.id)}" data-target-stage="${target}">${label} <span aria-hidden="true">→</span></button>`;
}
function advanceSalesDeal(id,target){
 const current=state.deals.find(d=>d.id===id);if(!current||isArchived(current))return false;
 const previous=getSalesStage(current),expected=salesStages[salesStages.indexOf(previous)+1];
 if(['Vinta','Persa'].includes(previous)||target!==expected)return false;
 if(target!=='Vinta'&&(!current.next||!validDate(current.due))){openEditor('deal',id);toast('Indica un prossimo passo con data prima di avanzare la trattativa.');return false;}
 const updated=structuredClone(state),d=updated.deals.find(x=>x.id===id);normalizeSalesData(Object.assign(d,{salesStage:target}),current);
 d.history=[...(d.history||[]),{date:today(),kind:'sales-stage',text:`Fase opportunità: ${previous} → ${target}.`}];
 try{validate(updated);}catch{toast('Controlla i dati prima di cambiare fase.');return false;}
 if(!persist(updated))return false;render();toast('Opportunità aggiornata: '+target+'.');return true;
}

function migrate(data){
 if(!data||!Array.isArray(data.deals))return data;
 for(const d of data.deals){
  if(!d||typeof d!=='object')continue;
  const previous=d.stage;
  if(['Primo contatto','Analisi esigenze','Demo / Proposta','Negoziazione'].includes(previous))d.stage='Prospect';
  if(previous==='Vinto')d.stage='Cliente';
  if(previous==='Perso'){d.stage='Prospect';d.salesStage='Persa';d.archived=true;}
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
let state={contacts:[],deals:[],categories:[]},view='oggi',editing=null,search='',filter='',taskFilter='all',pipelineLayout='board',sortOrder='name',categoryFilter='';
let loadError=false;
try{const saved=localStorage.getItem(KEY);if(saved){const parsed=migrate(JSON.parse(saved));validate(parsed);state=parsed;}}catch(e){loadError=true;}
function validate(data){
 if(!data||!Array.isArray(data.contacts)||!Array.isArray(data.deals))throw Error('Formato non valido');
 validateCategories(data);
 const ids=new Set();
 for(const c of data.contacts){if(!c||typeof c.id!=='string'||typeof c.company!=='string'||!c.company.trim()||ids.has(c.id))throw Error('Contatto non valido');ids.add(c.id);validateCompany(c);for(const k of ['person','email','phone','source','notes'])if(c[k]!=null&&typeof c[k]!=='string')throw Error('Campo non valido');}
 const dids=new Set();
 for(const d of data.deals){if(!d||typeof d.id!=='string'||dids.has(d.id)||!ids.has(d.contactId)||typeof d.title!=='string'||!d.title.trim()||!stages.includes(d.stage)||!Number.isFinite(d.setup)||d.setup<0||!Number.isFinite(d.monthly)||d.monthly<0)throw Error('Trattativa non valida');dids.add(d.id);for(const k of ['problem','process','solution','tools','benefit','next','due','service','referentId','referentName','lossReason','salesClosedOn'])if(d[k]!=null&&typeof d[k]!=='string')throw Error('Campo non valido');if(d.salesStage!=null&&!salesStages.includes(d.salesStage))throw Error('Fase commerciale non valida');if(d.due&&!validDate(d.due))throw Error('Data non valida');if(d.history!=null&&(!Array.isArray(d.history)||d.history.some(h=>!h||typeof h.text!=='string'||typeof h.date!=='string')))throw Error('Storico non valido');}
}
function persist(next){if(loadError){toast('Importa un backup valido o ripristina i dati prima di salvare.');return false;}try{localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}catch(e){toast('Salvataggio non riuscito: controlla spazio e permessi del browser.');return false;}}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4200);}
const contact=id=>state.contacts.find(c=>c.id===id);
const openDeals=()=>state.deals.filter(d=>!['Vinta','Persa'].includes(getSalesStage(d))&&!isArchived(d));
const matches=(...parts)=>parts.join(' ').toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it'));
function empty(title,desc,action='',type='deal'){return `<div class="empty"><div class="empty-symbol">↗</div><h3>${title}</h3><p>${desc}</p>${action?`<button class="primary" data-new="${type}">${action}</button>`:''}</div>`;}
function setView(v){view=v;search='';filter='';categoryFilter='';render();}
function render(){
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 const meta={categories:['Categorie','Categorie azienda','Regole automatiche e classificazione manuale.'],oggi:['Dashboard','Dashboard','Attività commerciali e prossimi passi di Apex Digital.'],contatti:['Contatti','Anagrafiche','Aziende e referenti · Lead, Prospect e Clienti.'],trattative:['Opportunità','Opportunità','Stati delle trattative · Nuovo contatto, Trattativa, Offerta, Vinta e Persa.'],lead:['Lead','Lead','Contatti da qualificare e prime relazioni commerciali.'],prospect:['Prospect','Prospect','Aziende con opportunità commerciali concrete.'],clienti:['Clienti','Clienti','Servizi acquisiti e canoni mensili.']}[view];
 $('#crumb').textContent=meta[0];$('#page-title').textContent=meta[1];$('#subtitle').textContent=meta[2];$('#date-label').textContent=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Rome'}).format(new Date());$('#new').textContent=view==='categories'?'+ Nuova categoria':['contatti','lead','prospect'].includes(view)?'+ Nuovo contatto':'+ Nuova trattativa';
 $('#content').innerHTML=(loadError?'<p class="notice">Impossibile leggere i dati salvati. Sono stati conservati senza sovrascriverli. Importa un backup valido per ripartire.</p>':'')+(view==='categories'?categoriesView():view==='oggi'?dashboard():view==='trattative'?pipeline():contactsView(view==='clienti'));
}
function dashboard(){const active=openDeals(),won=state.deals.filter(d=>d.stage==='Cliente'&&!isArchived(d)),tasks=state.deals.filter(d=>!isArchived(d)&&getSalesStage(d)!=='Persa'&&d.next&&d.due).sort((a,b)=>a.due.localeCompare(b.due)),due=tasks.filter(d=>d.due<=today());
 return `<div class="stats"><div class="stat"><span class="stat-label">Pipeline aperta</span><strong>${money(active.reduce((n,d)=>n+d.setup,0))}</strong><small>${active.length} trattative · costi iniziali</small></div><div class="stat"><span class="stat-label">Follow-up da gestire</span><strong>${due.length.toString().padStart(2,'0')}</strong><small>In scadenza oggi o arretrati</small></div><div class="stat"><span class="stat-label">Clienti acquisiti</span><strong>${new Set(won.map(d=>d.contactId)).size.toString().padStart(2,'0')}</strong><small>Aziende nella fase Cliente</small></div><div class="stat accent"><span class="stat-label">Canoni acquisiti / mese</span><strong>${money(won.reduce((n,d)=>n+d.monthly,0))}</strong><small>Somma dei canoni dei clienti</small></div></div><div class="dashboard"><div class="panel"><div class="panel-title"><h2>Le tue prossime azioni <span class="pill">${tasks.length}</span></h2><small>In ordine di scadenza</small></div>${activityList(tasks)}</div><div><div class="panel"><div class="panel-title"><h2>La tua pipeline</h2><button class="text-button" data-view="trattative">Apri bacheca ↗</button></div>${salesStages.map(s=>`<div class="mini-row"><span>${s}</span><strong>${state.deals.filter(d=>getSalesStage(d)===s&&!isArchived(d)).length}</strong></div>`).join('')}</div><div class="guide"><span class="guide-icon">✧</span><div><h3>Parti dal problema, poi dalla tecnologia.</h3><p>Annota il processo da migliorare e il beneficio atteso. La proposta AI viene dopo.</p></div></div></div></div>`;
}
function toolbar(client=false){const contactFilters=client&&view==='contatti'?`<select id="contact-filter" aria-label="Filtra tipo contatto"><option value="">Tutti i contatti</option>${stages.map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}</select>`:'';return `<div class="toolbar"><input id="search" aria-label="Cerca" placeholder="Cerca azienda, referente o esigenza…" value="${esc(search)}">${contactFilters}${client?categoryFilterControl():''}${!client?`<select id="stage-filter" aria-label="Filtra fase"><option value="">Tutte le fasi</option><option value="archived" ${filter==='archived'?'selected':''}>Archiviate</option>${salesStages.map(s=>`<option ${filter===s?'selected':''}>${s}</option>`).join('')}</select>`:''}${listControls(client)}</div>`;}
function pipeline(){if(pipelineLayout==='list')return pipelineTable();return toolbar()+`<div class="board">${salesStages.filter(s=>!filter||filter==='archived'||s===filter).map(s=>{const ds=visibleDeals().filter(d=>getSalesStage(d)===s);return `<section class="column stage-${salesStages.indexOf(s)}"><div class="column-heading"><h3>${s}<span>${ds.length}</span></h3><div class="column-value">${money(ds.reduce((total,d)=>total+d.setup,0))}<small>valore iniziale</small></div></div><div class="column-body">${ds.map(d=>`<div class="deal-container"><button class="deal" data-edit-deal="${esc(d.id)}"><span class="pill ${s==='Vinta'?'green':s==='Persa'?'red':''}">${esc(d.service||'Servizio AI')}</span><strong>${esc(d.title)}</strong><p>${esc(contact(d.contactId)?.company)}</p>${dealPersonLabel(d)?`<small>Referente: ${esc(dealPersonLabel(d))}</small>`:''}<div class="amount">${money(d.setup)} <small>+ ${money(d.monthly)} / mese</small></div><small>${esc(d.next||'Nessuna prossima azione')}</small>${d.due?`<small>${date(d.due)}</small>`:''}</button>${phaseAction(d)}</div>`).join('')}${!ds.length?'<div class="empty">Nessuna trattativa</div>':''}</div></section>`;}).join('')}</div>`;}
function contactsView(clients){const rows=visibleContacts(clients);return toolbar(true)+`<div class="panel">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Azienda / Referente</th><th>Fase</th><th>Categorie</th><th>${clients?'Servizi acquisiti':'Contatto'}</th><th>${clients?'Valore iniziale':'Provenienza'}</th><th>${clients?'Canone / mese':'Trattative'}</th><th></th></tr></thead><tbody>${rows.map(c=>{const deals=state.deals.filter(d=>d.contactId===c.id),won=deals.filter(d=>d.stage==='Cliente'&&!isArchived(d));return `<tr><td><strong>${esc(c.company)}</strong><small>${esc(c.person||'Referente da aggiungere')}${c.referents?.length?' · +'+c.referents.length+' referenti':''}</small></td><td><span class="pill ${contactStage(c.id)==='Cliente'?'green':''}">${contactStage(c.id)}</span></td><td>${categoryBadges(c)}</td><td>${clients?won.map(d=>`<button class="text-button" data-edit-deal="${esc(d.id)}">${esc(d.title)}</button>`).join('<br>'):`${emailLink(c.email)}<small>${phoneLink(c.phone)}</small>`}</td><td>${clients?money(won.reduce((n,d)=>n+d.setup,0)):esc(c.source||'—')}</td><td>${clients?money(won.reduce((n,d)=>n+d.monthly,0)):deals.length}</td><td><button class="text-button" data-edit-contact="${esc(c.id)}">Apri scheda ↗</button></td></tr>`;}).join('')}</tbody></table></div>`:empty(search?'Nessun risultato':clients?'I tuoi prossimi clienti partono da qui.':'Il tuo network Apex, tutto qui.',search?'Prova con un altro termine.':clients?'Le aziende appariranno qui quando una trattativa passerà a Cliente.':'Aggiungi la prima azienda e il suo referente.',search?'':clients?'Nuova trattativa':'Aggiungi un contatto',clients?'deal':'contact')}</div>`;}
function relatedDeals(id){const deals=state.deals.filter(d=>d.contactId===id);return `<section class="related-deals"><div class="panel-title"><h2>Opportunità collegate <span class="pill">${deals.length}</span></h2><button type="button" class="text-button" data-contact-deal="${esc(id)}">+ Nuova opportunità</button></div>${deals.length?deals.map(d=>`<div class="related-row"><button type="button" class="text-button" data-edit-deal="${esc(d.id)}">${esc(d.title)}</button><span class="pill">${esc(getSalesStage(d))}${isArchived(d)?' · Archiviata':''}</span><strong>${money(d.setup)}</strong></div>`).join(''):'<p class="related-empty">Nessuna opportunità collegata a questa azienda.</p>'}</section>`;}
function field(name,label,value='',type='text',full=false){return `<label class="field ${full?'full':''}">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${['company','title'].includes(name)?'required':''} ${type==='number'?'min="0" step="0.01"':''}></label>`;}
function area(name,label,value=''){return `<label class="field full">${label}<textarea name="${name}">${esc(value)}</textarea></label>`;}
function openEditor(type,id=null,overrides={}){if(type==='category'){openCategory(id);return;}const item=(type==='contact'?state.contacts:state.deals).find(x=>x.id===id)||overrides;editing={type,id};$('#editor-title').textContent=(id?'Modifica ':'Nuova ')+(type==='contact'?'scheda contatto':'trattativa');$('#delete').classList.toggle('hidden',!id);
 if(type==='contact'){$('#fields').innerHTML=`${id?contactShortcuts(item):''}<div class="field-grid"><h3 class="form-section">Anagrafica azienda</h3>${field('company','Azienda *',item.company)}${companyFields(item)}${field('person','Nome del referente principale',item.person)}${field('email','Email',item.email,'email')}${field('phone','Telefono',item.phone,'tel')}${referentsEditor(item)}${field('source','Provenienza del lead',item.source,'text',true)}${area('notes','Note sull’azienda e sul referente',item.notes)}</div>${interactionFields(item)}${id?relatedDeals(id)+contactHistory(id):''}`;}
 else{if(!state.contacts.length){toast('Aggiungi prima l’azienda: poi potrai creare la trattativa.');openEditor('contact');return;}
 $('#fields').innerHTML=`<div class="field-grid"><h3 class="form-section">Dati dell’opportunità</h3><label class="field">Azienda *<select name="contactId" required>${state.contacts.map(c=>`<option value="${esc(c.id)}" ${item.contactId===c.id?'selected':''}>${esc(c.company)}</option>`).join('')}</select></label>${field('title','Titolo opportunità *',item.title)}${dealPersonField(item)}<label class="field">Fase opportunità<select name="salesStage">${salesStages.map(s=>`<option ${getSalesStage(item)===s?'selected':''}>${s}</option>`).join('')}</select></label><label class="field">Servizio<select name="service">${['Automazione','Assistente AI','Integrazione','Consulenza AI','Altro'].map(s=>`<option ${item.service===s?'selected':''}>${s}</option>`).join('')}</select></label><h3 class="form-section">Valore commerciale</h3>${field('setup','Costo iniziale (€)',item.setup??0,'number')}${field('monthly','Canone mensile (€)',item.monthly??0,'number')}<h3 class="form-section">Analisi e soluzione</h3>${area('problem','Problema del cliente',item.problem)}${area('process','Processo attuale',item.process)}${area('solution','Soluzione proposta',item.solution)}${field('tools','Strumenti del cliente',item.tools)}${field('benefit','Beneficio atteso',item.benefit)}<h3 class="form-section">Attività e storico</h3>${field('next','Prossima azione',item.next)}${field('due','Data del prossimo passo',item.due,'date')}${area('note','Aggiungi una nota allo storico')}${area('lossReason','Motivo perdita (facoltativo, per opportunità perse)',item.lossReason)}<label class="field full"><span><input style="width:auto" type="checkbox" name="archived" ${item.archived?'checked':''}> Archiviata · escludi da pipeline e riepiloghi</span></label>${(item.history||[]).length?`<div class="field full">Storico<div class="history">${[...item.history].reverse().map(h=>`${esc(h.date)} · ${esc(h.text)}`).join('\n')}</div></div>`:''}</div>`;
 }
 if(!$('#editor').open)$('#editor').showModal();
}
$('#record-form').addEventListener('submit',e=>{e.preventDefault();if(!editing)return;const data=Object.fromEntries(new FormData(e.target));if(editing?.type==='category'){saveCategory(data);return;}if(editing?.type==='activity'){submitActivity(data);return;}const next=structuredClone(state),arr=editing.type==='contact'?next.contacts:next.deals,index=arr.findIndex(x=>x.id===editing.id),old=arr[index];
 for(const key in data)if(typeof data[key]==='string')data[key]=data[key].trim();
 if(editing.type==='contact'){try{collectCompanyData(data,old);}catch(error){toast(error.message);return;}}
 if(editing.type==='deal'){try{normalizeSalesData(data,old);}catch(error){toast(error.message);return;}data.archived=data.archived==='on';if(!['Vinta','Persa'].includes(data.salesStage)&&!data.archived&&(!data.next||!data.due)){toast('Per una trattativa aperta, indica prossima azione e data.');return;}data.setup=Number(data.setup);data.monthly=Number(data.monthly);data.history=old?.history||[];if(old&&getSalesStage(old)!==data.salesStage)data.history.push({date:today(),kind:'sales-stage',text:'Fase opportunità: '+getSalesStage(old)+' → '+data.salesStage+'.'});if(data.note)data.history.push({date:today(),text:data.note});delete data.note;try{collectDealPerson(data,old);}catch(error){toast(error.message);return;}}
 const record={...old,...data,id:editing.id||crypto.randomUUID()};if(index<0)arr.push(record);else arr[index]=record;
 try{validate(next);}catch{toast('Controlla i campi obbligatori e gli importi.');return;}
 if(persist(next)){$('#editor').close();editing=null;render();toast('Salvato nel browser.');}
});
$('#home').onclick=e=>{e.preventDefault();setView('oggi');};
$('#new').onclick=()=>openEditor(view==='categories'?'category':['contatti','lead','prospect'].includes(view)?'contact':'deal');$('#close').onclick=$('#cancel').onclick=()=>$('#editor').close();
$('#delete').onclick=()=>{const {type,id}=editing;if(type==='contact'&&state.deals.some(d=>d.contactId===id)){toast('Elimina prima le trattative collegate a questo contatto.');return;}if(!confirm('Eliminare questa scheda? L’operazione non può essere annullata.'))return;const next=structuredClone(state),key=type==='contact'?'contacts':'deals';next[key]=next[key].filter(x=>x.id!==id);if(persist(next)){$('#editor').close();render();toast('Scheda eliminata.');}};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.editCategory){openCategory(b.dataset.editCategory);return;}if(b.id==='add-referent'){if(editing?.type==='contact')$('#referent-rows').insertAdjacentHTML('beforeend',referentRow(editing.refSeq++));return;}if(b.dataset.removeReferent){b.closest('.referent-row')?.remove();return;}if(b.dataset.advanceDeal){advanceDeal(b.dataset.advanceDeal,b.dataset.targetStage);return;}if(b.dataset.contactDeal){if(confirm('Aprire una nuova opportunità? Le modifiche non salvate alla scheda saranno scartate.'))openEditor('deal',null,{contactId:b.dataset.contactDeal});return;}if(b.dataset.pipelineLayout){pipelineLayout=b.dataset.pipelineLayout;render();}if(b.id==='export-csv')exportCsv();if(b.dataset.view)setView(b.dataset.view);if(b.dataset.new)openEditor(b.dataset.new);if(b.dataset.editDeal&&(!$('#editor').open||editing?.type!=='contact'||confirm('Aprire l’opportunità? Le modifiche non salvate alla scheda saranno scartate.')))openEditor('deal',b.dataset.editDeal);if(b.dataset.editContact)openEditor('contact',b.dataset.editContact);if(b.dataset.taskFilter){taskFilter=b.dataset.taskFilter;render();}if(b.dataset.complete)openActivity(b.dataset.complete);});
document.addEventListener('input',e=>{if(e.target.id==='search'){const cursor=e.target.selectionStart;search=e.target.value;render();$('#search').focus();$('#search').setSelectionRange(cursor,cursor);}});
document.addEventListener('change',e=>{if(e.target.name==='contactId'&&editing?.type==='deal')$('#deal-referent').innerHTML=personOptions(e.target.value);if(e.target.id==='category-filter'){categoryFilter=e.target.value;render();}if(e.target.id==='sort-order'){sortOrder=e.target.value;render();}if(['stage-filter','contact-filter'].includes(e.target.id)){filter=e.target.value;render();}});
$('#export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,...state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`apex-crm-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup esportato.');};
$('#import').onclick=()=>$('#import-file').click();$('#import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=migrate(JSON.parse(await file.text()));validate(parsed);if(!confirm(`Importare ${parsed.contacts.length} contatti e ${parsed.deals.length} trattative? I dati attuali saranno sostituiti. Esporta prima un backup se vuoi conservarli.`))return;const next={contacts:parsed.contacts,deals:parsed.deals,categories:parsed.categories||[]};const wasError=loadError;loadError=false;if(persist(next)){render();toast('Backup importato.');}else loadError=wasError;}catch{toast('File non valido: usa un backup JSON del CRM Apex.');}finally{e.target.value='';}};
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
 $('#fields').innerHTML=`<div class="activity-copy"><strong>${esc(d.next)}</strong><p>${esc(contact(d.contactId)?.company)} · ${esc(d.title)}</p><p>Data prevista: ${date(d.due)}</p></div><div class="field-grid">${area('outcome','Esito / note dell’attività')}<label class="field full">Fase opportunità dopo l’attività<select name="salesStage">${salesStages.map(s=>`<option ${getSalesStage(d)===s?'selected':''}>${s}</option>`).join('')}</select></label><h3 class="form-section">Prossimo passo</h3>${field('next','Prossima azione')}${field('due','Data del prossimo passo','','date')}<label class="field full"><span><input style="width:auto" type="checkbox" name="archived"> Archivia l’opportunità senza un nuovo follow-up</span></label></div>`;
 if(!$('#editor').open)$('#editor').showModal();
}
function submitActivity(values){
 if(editing?.type!=='activity')return false;
 const data=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,typeof v==='string'?v.trim():v]));
 const current=state.deals.find(d=>d.id===editing.id);
 if(!current||isArchived(current)||current.next!==editing.expectedNext||current.due!==editing.expectedDue){toast('Attività cambiata: chiudi e riapri la scheda.');return false;}
 const archived=data.archived==='on',nextAction=data.next||'',due=data.due||'';
 try{normalizeSalesData(data,current);}catch{toast('Seleziona una fase valida.');return false;}
 if(Boolean(nextAction)!==Boolean(due)||(due&&!validDate(due))){toast('Indica insieme prossima azione e una data valida.');return false;}
 if(!archived&&!['Vinta','Persa'].includes(data.salesStage)&&(!nextAction||!due)){toast('Per Lead e Prospect attivi serve un prossimo passo con data.');return false;}
 const updated=structuredClone(state),deal=updated.deals.find(d=>d.id===current.id);
 const text=`Attività completata: ${current.next}\nData prevista: ${current.due}${data.outcome?'\nEsito: '+data.outcome:''}${data.stage!==current.stage?'\nFase: '+current.stage+' → '+data.stage:''}${archived?'\nOpportunità archiviata.':''}`;
 deal.history=[...(deal.history||[]),{date:today(),text,kind:'activity',scheduledFor:current.due}];
 deal.stage=data.stage;deal.salesStage=data.salesStage;deal.salesClosedOn=data.salesClosedOn;deal.archived=archived;deal.next=archived?'':nextAction;deal.due=archived?'':due;
 try{validate(updated);}catch{toast('Impossibile completare l’attività: controlla i dati.');return false;}
 if(!persist(updated))return false;
 $('#editor').close();editing=null;render();toast('Attività completata e storico aggiornato.');return true;
}
function contactHistory(id){
 const history=[...(contact(id)?.history||[]).map((h,index)=>({...h,title:'Anagrafica azienda',index})),...state.deals.filter(d=>d.contactId===id).flatMap(d=>(d.history||[]).map((h,index)=>({...h,title:d.title,index})))].sort((a,b)=>b.date.localeCompare(a.date)||b.index-a.index);
 return `<section class="related-deals"><div class="panel-title"><h2>Storico della relazione <span class="pill">${history.length}</span></h2></div><div class="timeline">${history.length?history.map(h=>`<article class="timeline-item"><small>${esc(h.date)} · ${esc(h.title)}</small><p>${esc(h.text)}</p></article>`).join(''):'<p class="related-empty">Le note e le attività completate appariranno qui.</p>'}</div></section>`;
}

function visibleDeals(){
 const rows=state.deals.filter(d=>(filter==='archived'?isArchived(d):!isArchived(d))&&(!filter||filter==='archived'||getSalesStage(d)===filter)&&matches(d.title,contact(d.contactId)?.company,d.problem,d.solution));
 return rows.sort((a,b)=>sortOrder==='value'?b.setup-a.setup:sortOrder==='due'?(a.due||'9999').localeCompare(b.due||'9999'):a.title.localeCompare(b.title,'it',{sensitivity:'base'}));
}
function visibleContacts(clients=view==='clienti'){
 const phase=view==='lead'?'Lead':view==='prospect'?'Prospect':filter;
 return state.contacts.filter(c=>(clients?contactStage(c.id)==='Cliente':!phase||contactStage(c.id)===phase)&&(!categoryFilter||(categoryFilter==='none'?companyCategories(c).length===0:companyCategories(c).some(cat=>cat.id===categoryFilter)))&&contactSearch(c)).sort((a,b)=>a.company.localeCompare(b.company,'it',{sensitivity:'base'}));
}
function listControls(client){
 const count=client?visibleContacts().length:visibleDeals().length;
 return `<div class="list-controls"><span class="result-count">${count} ${client?'aziende':'opportunità'}</span>${!client?`<label class="sort-label">Ordina per<select id="sort-order" aria-label="Ordina opportunità"><option value="name" ${sortOrder==='name'?'selected':''}>Titolo A–Z</option><option value="value" ${sortOrder==='value'?'selected':''}>Valore maggiore</option><option value="due" ${sortOrder==='due'?'selected':''}>Prossima scadenza</option></select></label><div class="view-toggle" role="group" aria-label="Vista opportunità"><button data-pipeline-layout="board" aria-pressed="${pipelineLayout==='board'}" class="${pipelineLayout==='board'?'selected':''}">▥ Bacheca</button><button data-pipeline-layout="list" aria-pressed="${pipelineLayout==='list'}" class="${pipelineLayout==='list'?'selected':''}">☷ Elenco</button></div>`:''}<button id="export-csv" ${!count?'disabled':''}>↓ Esporta CSV</button></div>`;
}
function pipelineTable(){
 const rows=visibleDeals();
 return toolbar()+`<div class="panel">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Opportunità / Azienda</th><th>Referente</th><th>Fase</th><th>Servizio</th><th>Valore iniziale</th><th>Canone / mese</th><th>Prossimo passo</th><th></th></tr></thead><tbody>${rows.map(d=>`<tr><td><strong>${esc(d.title)}</strong><small>${esc(contact(d.contactId)?.company)}</small></td><td>${esc(dealPersonLabel(d)||'Da assegnare')}</td><td><span class="pill ${d.stage==='Cliente'?'green':''}">${esc(d.stage)}${isArchived(d)?' · Archiviata':''}</span></td><td>${esc(d.service||'—')}</td><td>${money(d.setup)}</td><td>${money(d.monthly)}</td><td>${esc(d.next||'—')}${d.due?`<small class="${d.due<today()?'overdue-date':''}">${date(d.due)}</small>`:''}</td><td><div class="row-actions"><button class="text-button" data-edit-deal="${esc(d.id)}">Apri scheda ↗</button>${phaseAction(d)}</div></td></tr>`).join('')}</tbody></table></div>`:empty('Nessuna opportunità trovata','Modifica i filtri o aggiungi una nuova trattativa.','Nuova trattativa')}</div>`;
}
function csvCell(value){
 let text=String(value??'');
 // Spreadsheet programs interpret text beginning with these characters as formulas.
 if(typeof value==='string'&&/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
}
function buildCsv(){
 let rows;
 if(view==='trattative')rows=[['Opportunità','Azienda','Referente','Fase','Archiviata','Servizio','Valore iniziale EUR','Canone mensile EUR','Prossima azione','Data prossimo passo'],...visibleDeals().map(d=>[d.title,contact(d.contactId)?.company,dealPersonLabel(d),getSalesStage(d),isArchived(d)?'Sì':'No',d.service,d.setup,d.monthly,d.next,d.due])];
 else rows=[['Azienda','Referente principale','Fase','Email','Telefono','Provenienza','Note','Identificativo fiscale','Settore','Sito web','Indirizzo','Città','Paese','Ruolo principale','Canale preferito','Altri referenti','Categorie','Classificazione','Conversazioni'],...visibleContacts().map(c=>[c.company,c.person,contactStage(c.id),c.email,c.phone,c.source,c.notes,c.taxId,c.sector,c.website,c.address,c.city,c.country,c.primaryRole,c.preferredChannel,referentsSummary(c),companyCategories(c).map(cat=>cat.name).join(', '),c.categoryMode==='manual'?'Manuale':'Automatica',conversationSummary(c)])];
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
function exportCsv(){
 const count=view==='trattative'?visibleDeals().length:visibleContacts().length;
 if(!count){toast('Nessun risultato da esportare.');return;}
 const blob=new Blob([buildCsv()],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`apex-${view}-${today()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast(`${count} ${view==='trattative'?'opportunità esportate':'aziende esportate'}. Il backup completo resta disponibile in JSON.`);
}

function phaseAction(d){return salesPhaseAction(d);}
function advanceDeal(id,target){return advanceSalesDeal(id,target);}
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

const preferredChannels=['Nessuna preferenza','Email','Telefono','WhatsApp'];
function preferredField(name,value){return `<label class="field">Canale preferito<select name="${esc(name)}">${preferredChannels.map(s=>`<option ${value===s?'selected':''}>${s}</option>`).join('')}</select></label>`;}
function referentRow(index,r={}){
 return `<fieldset class="referent-row"><legend>Referente aggiuntivo</legend><input type="hidden" name="ref_${index}_id" value="${esc(r.id||crypto.randomUUID())}"><div class="field-grid">${field('ref_'+index+'_name','Nome *',r.name).replace('<input ','<input required ')}${field('ref_'+index+'_role','Ruolo / relazione',r.role)}${field('ref_'+index+'_email','Email',r.email,'email')}${field('ref_'+index+'_phone','Telefono',r.phone,'tel')}${preferredField('ref_'+index+'_preferred',r.preferred)}${field('ref_'+index+'_notes','Note sul referente',r.notes)}<button type="button" class="text-button remove-referent" data-remove-referent="true">Rimuovi dalla scheda</button></div></fieldset>`;
}
function companyFields(c){return `<h3 class="form-section">Dati aziendali</h3>${field('taxId','Identificativo fiscale / P. IVA',c.taxId)}${field('sector','Settore',c.sector)}${field('website','Sito web (https://…)',c.website,'url')}${field('address','Indirizzo',c.address)}${field('city','Città',c.city)}${field('country','Paese',c.country)}${categoryCompanyFields(c)}<h3 class="form-section">Referente principale</h3>`;}
function referentsEditor(c){
 editing.refSeq=(c.referents||[]).length;
 return `<h3 class="form-section">Preferenze e altri referenti</h3>${field('primaryRole','Ruolo del referente principale',c.primaryRole)}${preferredField('preferredChannel',c.preferredChannel)}<div class="field full"><div id="referent-rows">${(c.referents||[]).map((r,i)=>referentRow(i,r)).join('')}</div><button type="button" id="add-referent" class="secondary-add">+ Aggiungi referente</button></div>`;
}
function collectCompanyData(data,old){
 collectClassification(data,old);
 const referents=new Map();
 for(const key of Object.keys(data)){
  const match=/^ref_(\d+)_(id|name|role|email|phone|preferred|notes)$/.exec(key);
  if(match){if(!referents.has(match[1]))referents.set(match[1],{});referents.get(match[1])[match[2]]=data[key];delete data[key];}
 }
 data.referents=[...referents.values()].filter(r=>Object.entries(r).some(([key,v])=>key!=='id'&&key!=='preferred'&&Boolean(v)));
 for(const r of data.referents){if(!r.id)r.id=crypto.randomUUID();if(!r.name)throw Error('Indica il nome di ogni referente oppure rimuovi la riga vuota.');}
 const labels={company:'azienda',person:'referente principale',email:'email',phone:'telefono',source:'provenienza',notes:'note',taxId:'identificativo fiscale',sector:'settore',website:'sito',address:'indirizzo',city:'città',country:'paese',primaryRole:'ruolo principale',preferredChannel:'canale preferito'};
 const changed=old?Object.entries(labels).filter(([key])=>String(old[key]??'')!==String(data[key]??'')).map(([,label])=>label):[];
 if(old&&(old.categoryMode||'auto')!==data.categoryMode)changed.push('modalità classificazione');
 if(old&&JSON.stringify(old.manualCategoryIds||[])!==JSON.stringify(data.manualCategoryIds))changed.push('categorie manuali');
 if(old&&JSON.stringify(old.referents||[])!==JSON.stringify(data.referents))changed.push('referenti aggiuntivi');
 data.history=[...(old?.history||[])];
 if(!old||changed.length)data.history.push({date:today(),kind:'company',text:old?'Anagrafica aggiornata: '+changed.join(', ')+'.':'Anagrafica azienda creata.'});
 collectInteraction(data,old);
 return data;
}
function validateCompany(c){
 for(const key of ['taxId','sector','website','address','city','country','primaryRole','preferredChannel'])if(c[key]!=null&&typeof c[key]!=='string')throw Error('Campo aziendale non valido');
 if(c.referents!=null){
  if(!Array.isArray(c.referents))throw Error('Referenti non validi');
  const ids=new Set();
  for(const r of c.referents){if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||typeof r.name!=='string'||!r.name.trim())throw Error('Referente non valido');ids.add(r.id);for(const key of ['role','email','phone','preferred','notes'])if(r[key]!=null&&typeof r[key]!=='string')throw Error('Dati referente non validi');}
 }
 if(c.history!=null&&(!Array.isArray(c.history)||c.history.some(h=>!h||typeof h.date!=='string'||typeof h.text!=='string')))throw Error('Storico anagrafica non valido');
}
function contactSearch(c){return matches(c.company,c.person,c.email,c.phone,c.notes,c.taxId,c.sector,c.city,c.primaryRole,...(c.history||[]).map(h=>h.text),...companyCategories(c).map(cat=>cat.name),...(c.referents||[]).flatMap(r=>[r.name,r.role,r.email,r.phone,r.notes]));}
function referentsSummary(c){return(c.referents||[]).map(r=>[r.name,r.role,r.email,r.phone,r.preferred,r.notes].filter(Boolean).join(' · ')).join('\n');}

function normalizeCategoryText(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('it').trim();}
function categoryCatalog(){return state.categories||[];}
function categoryMatches(c,category){
 if(category.active===false||!category.keywords?.length)return false;
 const value=normalizeCategoryText(c[category.field]);
 return category.keywords.some(word=>value.includes(normalizeCategoryText(word)));
}
function companyCategories(c){
 if(c.categoryMode==='manual')return categoryCatalog().filter(cat=>(c.manualCategoryIds||[]).includes(cat.id));
 return categoryCatalog().filter(cat=>categoryMatches(c,cat));
}
function categoryBadges(c){const cats=companyCategories(c);return cats.length?`<div class="category-badges">${cats.map(cat=>`<span class="pill ${cat.active===false?'category-inactive':''}" title="${c.categoryMode==='manual'?'Scelta manuale':'Regola automatica'}">${esc(cat.name)}${cat.active===false?' · inattiva':''}</span>`).join('')}</div><small>${c.categoryMode==='manual'?'Manuale':'Automatica'}</small>`:'<small>Nessuna categoria</small>';}
function categoryFilterControl(){return `<select id="category-filter" aria-label="Filtra categoria"><option value="">Tutte le categorie</option><option value="none" ${categoryFilter==='none'?'selected':''}>Senza categoria</option>${categoryCatalog().map(c=>`<option value="${esc(c.id)}" ${categoryFilter===c.id?'selected':''}>${esc(c.name)}${c.active===false?' · inattiva':''}</option>`).join('')}</select>`;}
function categoryCompanyFields(c){return `<h3 class="form-section">Classificazione azienda</h3><label class="field full">Modalità<select name="categoryMode"><option value="auto" ${c.categoryMode!=='manual'?'selected':''}>Automatica · applica le regole</option><option value="manual" ${c.categoryMode==='manual'?'selected':''}>Manuale · usa soltanto le scelte qui sotto</option></select></label><div class="field full"><span>Categorie manuali</span><div class="category-choices">${categoryCatalog().map(cat=>`<label><input type="checkbox" name="manualcat_${esc(cat.id)}" ${(c.manualCategoryIds||[]).includes(cat.id)?'checked':''}> ${esc(cat.name)}${cat.active===false?' (inattiva)':''}</label>`).join('')||'<p>Crea le categorie dalla sezione Categorie del menu.</p>'}</div><small>Le scelte si applicano solo in modalità Manuale. Le regole automatiche si aggiornano quando salvi i dati o modifichi una regola.</small></div>`;}
function collectClassification(data,old){
 const sentMode=Object.prototype.hasOwnProperty.call(data,'categoryMode');
 data.categoryMode=sentMode?data.categoryMode:(old?.categoryMode||'auto');
 if(!['auto','manual'].includes(data.categoryMode))throw Error('Modalità di classificazione non valida.');
 data.manualCategoryIds=sentMode?[]:[...(old?.manualCategoryIds||[])];
 for(const key of Object.keys(data))if(key.startsWith('manualcat_')){if(data[key]==='on')data.manualCategoryIds.push(key.slice(10));delete data[key];}
 const known=new Set(categoryCatalog().map(c=>c.id));
 if(data.manualCategoryIds.some(id=>!known.has(id)))throw Error('Una categoria non è più disponibile. Riapri la scheda.');
 data.manualCategoryIds=[...new Set(data.manualCategoryIds)];
}
function validateCategories(data){
 const categories=data.categories||[];if(!Array.isArray(categories))throw Error('Catalogo categorie non valido');
 const ids=new Set(),names=new Set();
 for(const c of categories){
  if(!c||typeof c.id!=='string'||!c.id||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||names.has(normalizeCategoryText(c.name)))throw Error('Categoria duplicata o non valida');
  if(!['sector','source','company','notes'].includes(c.field)||!Array.isArray(c.keywords)||c.keywords.some(w=>typeof w!=='string'||!w.trim())||(c.active!=null&&typeof c.active!=='boolean'))throw Error('Regola categoria non valida');
  ids.add(c.id);names.add(normalizeCategoryText(c.name));
 }
 for(const c of data.contacts){
  if(c.categoryMode!=null&&!['auto','manual'].includes(c.categoryMode))throw Error('Modalità categoria non valida');
  if(c.manualCategoryIds!=null&&(!Array.isArray(c.manualCategoryIds)||c.manualCategoryIds.some(id=>typeof id!=='string'||!ids.has(id))||new Set(c.manualCategoryIds).size!==c.manualCategoryIds.length))throw Error('Categorie azienda non valide');
 }
}
function categoriesView(){
 const fields={sector:'Settore',source:'Provenienza',company:'Nome azienda',notes:'Note aziendali'};
 const rows=categoryCatalog().filter(c=>matches(c.name,...c.keywords));
 return `<div class="category-intro"><strong>Classifica le aziende con regole semplici.</strong><p>Una regola cerca una delle parole indicate in un campo aziendale, ignorando maiuscole e accenti. Puoi sempre scegliere la modalità Manuale nella scheda azienda. Le fasi Lead, Prospect e Cliente restano separate dalle categorie.</p></div><div class="toolbar"><input id="search" aria-label="Cerca" placeholder="Cerca categorie o parole chiave…" value="${esc(search)}"><span class="result-count">${rows.length} categorie</span></div><div class="panel">${rows.length?`<div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Regola automatica</th><th>Aziende classificate</th><th>Stato</th><th></th></tr></thead><tbody>${rows.map(cat=>`<tr><td><strong>${esc(cat.name)}</strong></td><td>${cat.keywords.length?`${fields[cat.field]} contiene una tra:<small>${esc(cat.keywords.join(', '))}</small>`:'Solo assegnazione manuale'}</td><td>${state.contacts.filter(c=>companyCategories(c).some(x=>x.id===cat.id)).length}</td><td><span class="pill ${cat.active!==false?'green':''}">${cat.active===false?'Inattiva':'Attiva'}</span></td><td><button class="text-button" data-edit-category="${esc(cat.id)}">Modifica regola ↗</button></td></tr>`).join('')}</tbody></table></div>`:empty('Nessuna categoria','Crea la prima categoria per classificare le aziende.','Nuova categoria','category')}</div>`;
}
function openCategory(id=null){
 const c=categoryCatalog().find(x=>x.id===id)||{name:'',field:'sector',keywords:[],active:true};editing={type:'category',id};
 $('#editor-title').textContent=id?'Modifica categoria':'Nuova categoria';$('#delete').classList.toggle('hidden',true);
 const fields={sector:'Settore',source:'Provenienza',company:'Nome azienda',notes:'Note aziendali'};
 $('#fields').innerHTML=`<div class="field-grid"><label class="field full">Nome categoria *<input name="categoryName" required value="${esc(c.name)}"></label><label class="field full">Campo da controllare<select name="ruleField">${Object.entries(fields).map(([key,label])=>`<option value="${key}" ${key===c.field?'selected':''}>${label}</option>`).join('')}</select></label>${area('keywords','Parole o frasi chiave (separate da virgola o a capo)',c.keywords.join('\n'))}<p class="category-help">Basta una corrispondenza. Senza parole chiave la categoria resta disponibile per l’assegnazione manuale. Le regole non utilizzano AI né consultano fonti online.</p><label class="field full"><span><input style="width:auto" type="checkbox" name="active" ${c.active!==false?'checked':''}> Categoria attiva per le regole automatiche</span></label><p class="category-help">Disattivando la regola, le assegnazioni manuali esistenti vengono conservate.</p></div>`;
 if(!$('#editor').open)$('#editor').showModal();
}
function saveCategory(data){
 if(editing?.type!=='category')return false;
 const name=String(data.categoryName||'').trim(),field=data.ruleField;
 const keywords=[...new Map(String(data.keywords||'').split(/[,\n]/).map(s=>s.trim()).filter(Boolean).map(s=>[normalizeCategoryText(s),s])).values()];
 if(!name){toast('Indica il nome della categoria.');return false;}
 if(categoryCatalog().some(c=>c.id!==editing.id&&normalizeCategoryText(c.name)===normalizeCategoryText(name))){toast('Esiste già una categoria con questo nome.');return false;}
 const next=structuredClone(state);next.categories=next.categories||[];
 const record={id:editing.id||crypto.randomUUID(),name,field,keywords,active:data.active==='on'},index=next.categories.findIndex(c=>c.id===record.id);
 if(index<0)next.categories.push(record);else next.categories[index]=record;
 try{validate(next);}catch{toast('Controlla nome e regola della categoria.');return false;}
 if(!persist(next))return false;
 $('#editor').close();editing=null;render();toast('Categoria salvata. Classificazioni automatiche aggiornate.');return true;
}

function companyPeople(c){
 if(!c)return [];
 const list=(c.person||c.email)?[{id:'primary',name:c.person||c.email,role:c.primaryRole||'',email:c.email||''}]:[];
 return list.concat((c.referents||[]).map(r=>({id:r.id,name:r.name,role:r.role||'',email:r.email||''})));
}
function personOptions(companyId,value='',snapshot=''){
 const people=companyPeople(contact(companyId));
 return `<option value="">Da assegnare / azienda</option>${people.map(p=>`<option value="${esc(p.id)}" ${p.id===value?'selected':''}>${esc(p.name)}${p.role?' · '+esc(p.role):''}</option>`).join('')}${value&&!people.some(p=>p.id===value)?`<option selected value="${esc(value)}">${esc(snapshot||'Referente storico')} (non più in anagrafica)</option>`:''}`;
}
function dealPersonField(d){const companyId=d.contactId||state.contacts[0]?.id;return `<label class="field full">Referente della trattativa<select name="referentId" id="deal-referent">${personOptions(companyId,d.referentId||'',d.referentName||'')}</select></label>`;}
function collectDealPerson(data,old){
 if(!Object.prototype.hasOwnProperty.call(data,'referentId')){data.referentId=old?.referentId||'';data.referentName=old?.referentName||'';return;}
 const person=companyPeople(contact(data.contactId)).find(p=>p.id===data.referentId);
 if(data.referentId&&!person&&!(old?.contactId===data.contactId&&old?.referentId===data.referentId))throw Error('Il referente non appartiene all’azienda selezionata.');
 data.referentName=person?.name||(data.referentId?old?.referentName||'Referente storico':'');
 if(old&&(old.referentId||'')!==data.referentId)data.history.push({date:today(),kind:'person',text:`Referente opportunità: ${old.referentName||'da assegnare'} → ${data.referentName||'da assegnare'}.`});
}
function dealPersonLabel(d){return companyPeople(contact(d.contactId)).find(p=>p.id===d.referentId)?.name||d.referentName||'';}
function interactionFields(c){
 return `<details class="interaction-editor"><summary>+ Registra una conversazione</summary><p class="category-help">La conversazione viene registrata con Salva. Per selezionare un referente appena aggiunto, salva prima l’anagrafica.</p><div class="field-grid"><label class="field">Canale<select name="interactionChannel">${['Email','Telefono','Incontro','Nota'].map(s=>`<option>${s}</option>`).join('')}</select></label>${field('interactionDate','Data conversazione',today(),'date')}<label class="field full">Persona coinvolta<select name="interactionPerson">${personOptions(c.id)}</select></label>${area('interactionText','Sintesi della conversazione')}</div></details>`;
}
function collectInteraction(data,old){
 const text=String(data.interactionText||'').trim(),channel=data.interactionChannel||'Nota',dateValue=data.interactionDate||today(),personId=data.interactionPerson||'';
 for(const key of ['interactionText','interactionChannel','interactionDate','interactionPerson'])delete data[key];
 if(!text)return;
 if(!validDate(dateValue)||dateValue>today())throw Error('Indica una data valida, non futura, per la conversazione.');
 if(!['Email','Telefono','Incontro','Nota'].includes(channel))throw Error('Canale conversazione non valido.');
 const person=companyPeople(old).find(p=>p.id===personId);
 if(personId&&!person)throw Error('Il referente non è disponibile: salva la scheda e riaprila prima di registrare la conversazione.');
 data.history.push({date:dateValue,kind:'conversation',personId,personName:person?.name||'',channel,text:`${channel}${person?' con '+person.name:''}: ${text}`});
}
function conversationSummary(c){return(c.history||[]).filter(h=>h.kind==='conversation').map(h=>h.date+' · '+h.text).join('\n');}

render();

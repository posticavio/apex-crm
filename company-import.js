'use strict';
const CSV_FIELDS=[['company','Azienda *',['azienda','ragione sociale','company','nome azienda']],['person','Referente principale',['referente','referente principale','nome referente','contatto']],['email','Email',['email','e mail']],['phone','Telefono',['telefono','phone','tel']],['taxId','Identificativo fiscale',['identificativo fiscale','identificativo fiscale p iva','p iva','partita iva','vat']],['sector','Settore',['settore','sector']],['website','Sito web',['sito web','sito','website']],['address','Indirizzo',['indirizzo','address']],['city','Città',['citta','city']],['country','Paese',['paese','country']],['source','Provenienza',['provenienza','provenienza del lead','fonte','source']],['primaryRole','Ruolo principale',['ruolo principale','ruolo referente']],['preferredChannel','Canale preferito',['canale preferito']],['notes','Note',['note','note aziendali']]];
let csvSession=null;
function parseCompanyCsv(text,delimiter){
 const src=String(text).replace(/^\uFEFF/,'');
 if(src.includes('\u0000'))throw Error('Codifica non supportata: salva il CSV in UTF-8.');
 if(!delimiter){
  const counts={';':0,',':0,'\t':0};let inQuote=false;
  for(let i=0;i<src.length;i++){const ch=src[i];if(ch==='"'){if(inQuote&&src[i+1]==='"')i++;else inQuote=!inQuote;}else if(!inQuote){if(ch==='\r'||ch==='\n')break;if(ch in counts)counts[ch]++;}}
  delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 }
 if(![';',',','\t'].includes(delimiter))throw Error('Separatore non valido.');
 let rows=[],row=[],cell='',quoted=false,afterQuote=false;
 const pushRow=()=>{row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';afterQuote=false;};
 for(let i=0;i<src.length;i++){
  const ch=src[i];
  if(quoted){if(ch==='"'){if(src[i+1]==='"'){cell+='"';i++;}else{quoted=false;afterQuote=true;}}else cell+=ch;continue;}
  if(afterQuote&&ch!==delimiter&&ch!=='\r'&&ch!=='\n')throw Error('Caratteri inattesi dopo una cella tra virgolette.');
  if(ch==='"'){if(cell)throw Error('Virgolette non valide. Racchiudi l’intera cella tra virgolette.');quoted=true;}
  else if(ch===delimiter){row.push(cell);cell='';afterQuote=false;}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&src[i+1]==='\n')i++;pushRow();}
  else cell+=ch;
  if(rows.length>5001)throw Error('Importa al massimo 5.000 righe per file.');
 }
 if(quoted)throw Error('Una cella tra virgolette non è stata chiusa.');
 if(cell||row.length||afterQuote)pushRow();
 if(rows.length<2)throw Error('Servono una riga di intestazioni e almeno un’azienda.');
 const headers=rows.shift().map(h=>h.trim());
 if(headers.length>100)throw Error('Il file contiene troppe colonne (massimo 100).');
 if(rows.length>5000)throw Error('Importa al massimo 5.000 righe per file.');
 return {headers,rows,delimiter};
}
function headerKey(v){return normalizeCategoryText(v).replace(/[^a-z0-9]+/g,' ').trim();}
function guessCsvMapping(headers){const mapping={};for(const [key,,aliases]of CSV_FIELDS){const i=headers.findIndex(h=>aliases.includes(headerKey(h)));mapping[key]=i<0?'':String(i);}return mapping;}
function csvIdentity(c){return {tax:normalizeCategoryText(c.taxId).replace(/[^a-z0-9]/g,''),email:normalizeCategoryText(c.email),name:headerKey(c.company)};}
function csvPlan(parsed,mapping,contacts){
 if(mapping.company===''||mapping.company==null)throw Error('Associa la colonna Azienda.');
 const chosen=Object.values(mapping).filter(v=>v!=='');
 if(new Set(chosen).size!==chosen.length)throw Error('Ogni colonna può essere associata a un solo campo.');
 const indexes={tax:new Map(),email:new Map(),name:new Map()},seen={tax:new Set(),email:new Set(),name:new Set()},seenTargets=new Set();
 for(const c of contacts){for(const [key,value]of Object.entries(csvIdentity(c))){if(!value)continue;if(!indexes[key].has(value))indexes[key].set(value,[]);indexes[key].get(value).push(c);}}
 return parsed.rows.map((row,index)=>{
  const incoming={};for(const [key]of CSV_FIELDS){const col=mapping[key];if(col!==''&&col!=null)incoming[key]=String(row[Number(col)]??'').trim();}
  let error='';
  if(row.length!==parsed.headers.length)error='Numero di celle diverso dalle intestazioni.';
  else if(!incoming.company)error='Nome azienda mancante.';
  else if(incoming.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(incoming.email))error='Email non valida.';
  else if(incoming.website){try{const url=new URL(incoming.website);if(!['http:','https:'].includes(url.protocol))error='Sito web non valido (usa https://).';}catch{error='Sito web non valido (usa https://).';}}
  if(error)return {row:index+2,incoming,error,action:'skip'};
  const identity=csvIdentity(incoming),hits=new Map(),reasons=[];
  for(const [key,value]of Object.entries(identity))if(value){const matches=indexes[key].get(value)||[];if(matches.length)reasons.push({tax:'identificativo fiscale',email:'email',name:'nome azienda'}[key]);for(const c of matches)hits.set(c.id,c);}
  const candidates=[...hits.values()],target=candidates[0];
  if(candidates.length>1)error='Corrispondenze con più aziende: correggi i dati prima di importare.';
  else if(target&&identity.tax&&csvIdentity(target).tax&&identity.tax!==csvIdentity(target).tax)error='Identificativi fiscali diversi: aggiornamento bloccato.';
  else if((target&&seenTargets.has(target.id))||Object.entries(identity).some(([key,value])=>value&&seen[key].has(value)))error='Possibile duplicato nel file: riga esclusa.';
  if(!error){for(const [key,value]of Object.entries(identity))if(value)seen[key].add(value);if(target)seenTargets.add(target.id);}
  return {row:index+2,incoming,targetId:target?.id,error,action:error||target?'skip':'create',reason:target?'Corrispondenza per '+reasons.join(', '):'Nuova azienda'};
 });
}
function csvImportResult(base,plan,fileName){
 const next=structuredClone(base),counts={created:0,updated:0,unchanged:0};
 for(const item of plan){
  if(item.error||item.action==='skip')continue;
  if(item.action==='update'){
   const c=next.contacts.find(x=>x.id===item.targetId);if(!c)throw Error('Azienda da aggiornare non più disponibile.');
   const changed=[];for(const [key,label]of CSV_FIELDS)if(item.incoming[key]&&item.incoming[key]!==c[key]){c[key]=item.incoming[key];changed.push(label.replace(' *',''));}
   if(!changed.length){counts.unchanged++;continue;}
   c.importOrigin={file:fileName,row:item.row,date:today()};c.history=[...(c.history||[]),{date:today(),kind:'import',text:`Import CSV ${fileName}, riga ${item.row}. Campi aggiornati: ${changed.join(', ')}.`}];counts.updated++;
  }else if(item.action==='create'){
   const c={id:crypto.randomUUID(),...item.incoming,referents:[],categoryMode:'auto',manualCategoryIds:[],importOrigin:{file:fileName,row:item.row,date:today()},history:[{date:today(),kind:'import',text:`Azienda creata da CSV ${fileName}, riga ${item.row}.`}]};next.contacts.push(c);counts.created++;
  }else throw Error('Azione di importazione non valida.');
 }
 validate(next);return {next,counts};
}
function showCsvError(error){$('#csv-error').textContent=error instanceof Error?error.message:String(error);$('#csv-error').hidden=false;}
function startCsvImport(text,fileName){
 const parsed=parseCompanyCsv(text),mapping=guessCsvMapping(parsed.headers);
 csvSession={parsed,mapping,fileName,plan:null};
 $('#csv-file-name').textContent=`${fileName} · ${parsed.rows.length} righe`;
 $('#csv-error').hidden=true;$('#csv-preview').innerHTML='';$('#csv-apply').disabled=true;
 $('#csv-mapping').innerHTML=CSV_FIELDS.map(([key,label])=>`<label class="field">${label}<select data-csv-map="${key}"><option value="">Non importare</option>${parsed.headers.map((h,i)=>`<option value="${i}" ${mapping[key]===String(i)?'selected':''}>${esc(h||'Colonna '+(i+1))} (${i+1})</option>`).join('')}</select></label>`).join('');
 if(!$('#csv-dialog').open)$('#csv-dialog').showModal();
 if(mapping.company!=='')previewCsv();
}
function previewCsv(){
 if(!csvSession)return;
 try{
  csvSession.plan=csvPlan(csvSession.parsed,csvSession.mapping,state.contacts);csvSession.base=JSON.stringify(state);csvSession.storageBase=localStorage.getItem(KEY);
  $('#csv-error').hidden=true;renderCsvPreview();
 }catch(error){csvSession.plan=null;$('#csv-preview').innerHTML='';$('#csv-apply').disabled=true;showCsvError(error);}
}
function renderCsvPreview(){
 const plan=csvSession.plan,created=plan.filter(r=>r.action==='create').length,updated=plan.filter(r=>r.action==='update').length,excluded=plan.filter(r=>r.action==='skip').length;
 $('#csv-preview').innerHTML=`<div class="csv-summary"><strong>${created} nuove</strong><strong>${updated} aggiornamenti</strong><span>${excluded} escluse</span></div><div class="csv-preview-table"><table><thead><tr><th>Riga</th><th>Azienda</th><th>Esito controllo</th><th>Azione</th></tr></thead><tbody>${plan.map((item,i)=>`<tr><td>${item.row}</td><td><strong>${esc(item.incoming.company||'—')}</strong><small>${esc(item.incoming.email||item.incoming.taxId||'')}</small></td><td>${item.error?`<span class="csv-row-error">${esc(item.error)}</span>`:`${esc(item.reason)}${item.targetId?`<small>Esistente: ${esc(contact(item.targetId)?.company)}</small>`:''}`}</td><td>${item.error?'Esclusa':`<select data-csv-action="${i}" aria-label="Azione riga ${item.row}"><option value="skip" ${item.action==='skip'?'selected':''}>Escludi</option><option value="${item.targetId?'update':'create'}" ${item.action!=='skip'?'selected':''}>${item.targetId?'Aggiorna campi non vuoti':'Crea azienda'}</option></select>`}</td></tr>`).join('')}</tbody></table></div>`;
 $('#csv-apply').disabled=created+updated===0;$('#csv-apply').textContent=`Importa ${created+updated} righe selezionate`;
}
function applyCsvImport(){
 if(!csvSession?.plan)return false;
 try{
  if(JSON.stringify(state)!==csvSession.base||localStorage.getItem(KEY)!==csvSession.storageBase)throw Error('I dati del CRM sono cambiati. Ricarica il CRM prima di importare per evitare sovrascritture.');
  const {next,counts}=csvImportResult(state,csvSession.plan,csvSession.fileName);
  if(!counts.created&&!counts.updated&&!counts.unchanged)return false;
  if(!persist(next))return false;
  $('#csv-dialog').close();csvSession=null;setView('contatti');toast(`Importazione: ${counts.created} aziende create, ${counts.updated} aggiornate, ${counts.unchanged} invariate.`);return true;
 }catch(error){showCsvError(error);return false;}
}
$('#import-companies').onclick=()=>$('#csv-file').click();
$('#csv-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('Il file supera 5 MB. Dividilo prima dell’importazione.');startCsvImport(await file.text(),file.name);}catch(error){toast(error.message);}finally{e.target.value='';}};
$('#csv-build-preview').onclick=previewCsv;$('#csv-apply').onclick=applyCsvImport;
$('#csv-cancel').onclick=()=>{$('#csv-dialog').close();csvSession=null;};
$('#csv-dialog').addEventListener('cancel',()=>{csvSession=null;});
$('#csv-dialog').addEventListener('change',e=>{
 if(!csvSession)return;
 if(e.target.dataset.csvMap){csvSession.mapping[e.target.dataset.csvMap]=e.target.value;csvSession.plan=null;$('#csv-preview').innerHTML='';$('#csv-apply').disabled=true;}
 if(e.target.dataset.csvAction!=null&&csvSession.plan){const item=csvSession.plan[Number(e.target.dataset.csvAction)];if(item&&!item.error&&['skip',item.targetId?'update':'create'].includes(e.target.value)){item.action=e.target.value;renderCsvPreview();}}
});

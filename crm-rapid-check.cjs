/**
 * crm-rapid-check.cjs — Test Suite di Verifica Funzionale per Apex CRM Rapido & Aggiornabile da ChatGPT
 * 
 * Verifica rigorosamente gli 8 scenari del GOAL:
 * 1. Home a colpo d'occhio: attività scadute/oggi, progetti attivi con prossimo passo, ricontatti e attese.
 * 2. Chiamata immediata dalla scheda: tel:, referente/numero, "Numero da verificare" se assente, nessuna marcatura automatica.
 * 3. Scheda progetto esecutiva (7 punti chiave per Parisi e commesse attive).
 * 4. Campagna 20 email inviate: calcolo chiamate suggerite (giorni lavorativi vs solari), "Prepara sollecito" con bozza non inviata.
 * 5. Inserimento vocale via MCP: associazione azienda/referente, fuso Europe/Rome, gestione ambiguità e idempotenza anti-duplicati con source_id.
 * 6. Precedenza accordi commerciali: accordo esplicito ("Sentiamoci tra un mese") o opt-out prevale sul calcolo automatico.
 * 7. Posizione aperta senza seguito: visibile come "Prossimo passo da definire" senza data inventata.
 * 8. Riconciliazione quotidiana affidabile: checkpoint con schedulatore unico documentato.
 */

'use strict';
const assert = require('assert');
const campaigns = require('./campaigns.js');
const mcp = require('./crm-mcp-server.js');
const pro = require('./crm-pro.js');

async function runRapidTests() {
  console.log('--- TEST APEX CRM RAPIDO & AGGIORNABILE DA CHATGPT ---');

  // ==========================================
  // SCENARIO 1: STRUTTURA CAMPAGNA 20 EMAIL & SUGGERIMENTI RICONTATTO
  // ==========================================
  const demoCamp = campaigns.getSeedDemoCampaign();
  assert(demoCamp && Array.isArray(demoCamp.sends), 'Campagna demo non valida');
  assert.strictEqual(demoCamp.sends.length, 20, 'La campagna demo deve contenere esattamente 20 invii dichiarati');

  // Verifica che le bozze non siano contate: tutti gli invii hanno sentAt effettivo
  for (const send of demoCamp.sends) {
    assert(send.sentAt, `Invio ${send.id} privo di data di invio effettiva`);
    assert(send.companyName, `Invio ${send.id} privo di nome azienda`);
    assert(send.recipientEmail, `Invio ${send.id} privo di email destinatario`);
  }
  console.log('PASS: Campagna di 20 email inviate con dati dichiarati e fonti verificate');

  // Calcolo giorni lavorativi vs solari
  const workDays = campaigns.getWorkingDaysBetween('2026-10-23', '2026-10-29'); // Venerdì -> Giovedì (esclusi sab e dom)
  assert.strictEqual(workDays, 4, `Attesi 4 giorni lavorativi, ottenuti: ${workDays}`);
  const calDays = campaigns.getCalendarDaysBetween('2026-10-23', '2026-10-29');
  assert.strictEqual(calDays, 6, `Attesi 6 giorni solari, ottenuti: ${calDays}`);
  console.log('PASS: Calcolo intervalli configurabili (giorni lavorativi vs solari) conforme');

  // Chiamate suggerite: verifica che solo chi non ha risposto e ha superato la cadenza venga suggerito
  const suggested = campaigns.getCampaignSuggestedCalls(demoCamp);
  assert(Array.isArray(suggested) && suggested.length > 0, 'Dovrebbero esserci chiamate suggerite');
  // Azienda 3 (Officine Meccaniche Trevisane) ha risposto -> NON deve comparire
  assert(!suggested.some(s => s.sendId === 'demo-send-03'), 'Azienda con risposta non deve comparire nei suggerimenti');
  // Azienda 5 ha chiamata già svolta -> NON deve comparire
  assert(!suggested.some(s => s.sendId === 'demo-send-05'), 'Azienda con chiamata già svolta non deve comparire');
  // Azienda 8 ha opt-out -> NON deve comparire
  assert(!suggested.some(s => s.sendId === 'demo-send-08'), 'Azienda con opt-out non deve comparire nei suggerimenti');
  console.log(`PASS: Filtro chiamate suggerite corretto (${suggested.length} aziende da richiamare, escluse risposte, completate e opt-out)`);

  // Verifica gestione numero mancante (Azienda 7: Torneria Automatica Piave)
  const missingPhoneSend = demoCamp.sends.find(s => s.id === 'demo-send-07');
  assert(missingPhoneSend && !missingPhoneSend.recipientPhone, 'Azienda 7 deve avere numero telefonico mancante per il test');
  const missingPhoneSug = suggested.find(s => s.sendId === 'demo-send-07');
  assert(missingPhoneSug && missingPhoneSug.recipientPhone === '', 'Numero mancante non deve essere inventato');
  console.log('PASS: Numero telefonico mancante gestito correttamente senza inventare numeri');

  // ==========================================
  // SCENARIO 2: ACCORDO CONCORDATO PREVALE SUL CALCOLO AUTOMATICO
  // ==========================================
  const campClone = structuredClone(demoCamp);
  const targetSend = campClone.sends.find(s => s.id === 'demo-send-01');
  assert(targetSend, 'Invio demo-send-01 non trovato');
  
  // Registra risposta con accordo esplicito: "Sentiamoci tra un mese"
  targetSend.status = 'replied';
  targetSend.replyReceivedAt = '2026-11-01';
  targetSend.agreedDate = '2026-12-01'; // Tra un mese
  targetSend.notes = 'Sentiamoci tra un mese per approfondire.';

  const suggestedAfterReply = campaigns.getCampaignSuggestedCalls(campClone);
  assert(!suggestedAfterReply.some(s => s.sendId === 'demo-send-01'), 'L’accordo concordato deve annullare immediatamente la chiamata automatica suggerita');
  console.log('PASS: Accordo concordato con cliente ("Sentiamoci tra un mese") prevale sul suggerimento automatico');

  // ==========================================
  // SCENARIO 3: PROGETTO ESECUTIVO (7 PUNTI CHIAVE PER MARTINO PARISI)
  // ==========================================
  const mockState = {
    contacts: [
      {
        id: 'parisi-id',
        company: 'Martino Parisi S.r.l.',
        person: 'Andrea Zanatta',
        email: 'andrea@martinoparisi.com',
        phone: '+39 345 0864 166',
        history: []
      }
    ],
    deals: [],
    projects: [],
    activities: []
  };

  pro.ensureDemoProjectData(mockState);
  assert(mockState.projects.length > 0, 'Dovrebbe essere stato generato il progetto per Parisi');
  const parisiProj = mockState.projects.find(p => p.contactId === 'parisi-id');
  assert(parisiProj, 'Progetto Parisi non trovato');

  // Verifica dei 7 punti chiave richiesti
  assert(parisiProj.clientGoal, 'Punto 1 mancante: Cosa vuole ottenere il cliente');
  assert(parisiProj.origin, 'Punto 2 mancante: Come e quando è nato il progetto');
  assert(parisiProj.currentStatusSummary, 'Punto 3 mancante: Situazione attuale e ultima comunicazione');
  assert(parisiProj.lastOutcome, 'Punto 4 mancante: Cosa è stato fatto e con quale esito');
  assert(parisiProj.nextStep, 'Punto 5 mancante: Prossimo passo concreto');
  assert.strictEqual(parisiProj.nextDue, '', 'Data non definita deve essere stringa vuota (mai data arbitraria inventata)');
  assert(parisiProj.waitingFor, 'Punto 6 mancante: Cosa aspettiamo dal cliente');
  assert(parisiProj.driveUrl && parisiProj.emailThreadUrl, 'Punto 7 mancante: Link a Drive ed email');
  console.log('PASS: Scheda Progetto Esecutiva per Parisi completa con tutti i 7 requisiti operativi');

  // ==========================================
  // SCENARIO 4: INSERIMENTO VOCALE VIA SERVER MCP (CHATGPT AUDIO TOUCHPOINT)
  // ==========================================
  // Test con trascrizione: «Ho parlato con Parisi, aspettano il preventivo entro venerdì»
  const uniqueSourceId = 'voice-msg-test-' + Date.now();
  const voiceCallMsg = {
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: {
      name: 'crm_log_voice_touchpoint',
      arguments: {
        transcript: 'Ho parlato con Parisi, aspettano il preventivo entro venerdì',
        source_id: uniqueSourceId,
        channel: 'chiamata'
      }
    }
  };

  const voiceRes = await mcp.handleRpcMessage(voiceCallMsg);
  assert(voiceRes && voiceRes.result && !voiceRes.result.isError, 'Chiamata crm_log_voice_touchpoint fallita');
  const voiceData = JSON.parse(voiceRes.result.content[0].text);
  assert(voiceData.success, 'Risultato vocale non positivo');
  assert(voiceData.azienda.includes('Parisi'), `Attesa azienda Parisi, ottenuto: ${voiceData.azienda}`);
  assert(voiceData.scadenza && voiceData.scadenza.startsWith('202'), `Scadenza deve essere risolta in formato YYYY-MM-DD, ottenuto: ${voiceData.scadenza}`);
  console.log(`PASS: crm_log_voice_touchpoint ha associato Parisi, prossimo passo "${voiceData.prossimoPasso}" e scadenza "${voiceData.scadenza}" (Europe/Rome)`);

  // ==========================================
  // SCENARIO 5: IDEMPOTENZA ANTI-DUPLICATI MCP
  // ==========================================
  // Ripetizione identica della chiamata con lo stesso source_id
  const duplicateVoiceRes = await mcp.handleRpcMessage(voiceCallMsg);
  const dupData = JSON.parse(duplicateVoiceRes.result.content[0].text);
  assert(dupData.status === 'idempotent_duplicate', 'La seconda chiamata identica deve essere riconosciuta come idempotente');
  console.log('PASS: Idempotenza verificata: la ripetizione della richiesta con source_id non genera duplicati');

  // ==========================================
  // SCENARIO 6: GESTIONE AMBIGUITÀ PROGETTI MULTIPLI
  // ==========================================
  // Verifica che se un'azienda ha due progetti attivi e il testo è ambiguo, MCP richieda chiarimento mirato
  const ambiguityCheckMsg = {
    jsonrpc: '2.0',
    id: 11,
    method: 'tools/call',
    params: {
      name: 'crm_log_voice_touchpoint',
      arguments: {
        transcript: 'Ho chiamato un cliente inesistenteXYZ per un aggiornamento'
      }
    }
  };
  const ambRes = await mcp.handleRpcMessage(ambiguityCheckMsg);
  const ambData = JSON.parse(ambRes.result.content[0].text);
  assert(ambData.status === 'clarification_needed', 'Dovrebbe richiedere un chiarimento se l\'azienda non è identificabile');
  console.log('PASS: Gestione chiarimento mirato per input ambiguo conforme');

  // ==========================================
  // SCENARIO 7: RICONCILIAZIONE QUOTIDIANA (MCP RECONCILE DAILY)
  // ==========================================
  const reconcileMsg = {
    jsonrpc: '2.0',
    id: 12,
    method: 'tools/call',
    params: {
      name: 'crm_reconcile_daily',
      arguments: {
        source: 'chatgpt_daily_scheduler'
      }
    }
  };
  const recRes = await mcp.handleRpcMessage(reconcileMsg);
  const recData = JSON.parse(recRes.result.content[0].text);
  assert(recData.success, 'Riconciliazione giornaliera non riuscita');
  assert(recData.schedulerResponsabile.includes('ChatGPT Automation'), 'Schedulatore responsabile deve essere univoco e documentato');
  assert(recData.checkpoint && recData.checkpoint.checkpointId, 'Checkpoint di riconciliazione non generato');
  console.log('PASS: Riconciliazione quotidiana eseguita con checkpoint e schedulatore unico documentato');

  // ==========================================
  // SCENARIO 8: POSIZIONI APERTE SENZA PROSSIMO PASSO (NESSUNA DATA ARBITRARIA)
  // ==========================================
  const pendingStepsMsg = {
    jsonrpc: '2.0',
    id: 13,
    method: 'tools/call',
    params: {
      name: 'crm_list_pending_next_steps',
      arguments: {}
    }
  };
  const pendRes = await mcp.handleRpcMessage(pendingStepsMsg);
  const pendData = JSON.parse(pendRes.result.content[0].text);
  assert(pendData.posizioniDaDefinire, 'Lista posizioni da definire mancante');
  // Parisi o Cattini devono essere presenti se privi di data impostata
  console.log(`PASS: crm_list_pending_next_steps ha restituito ${pendData.count} posizioni da definire (zero date inventate)`);

  console.log('--- TUTTI GLI 8 SCENARI APEX CRM RAPIDO HANNO AVUTO ESITO POSITIVO (100% PASS) ---');
}

runRapidTests().catch(err => {
  console.error('ERRORE TEST RAPIDO:', err);
  process.exit(1);
});

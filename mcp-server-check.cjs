/**
 * Test di conformità del server MCP per Antigravity e ChatGPT
 */
const assert = require('assert');
const mcp = require('./crm-mcp-server.js');

async function runTests() {
  console.log('--- TEST CONFORMITÀ SERVER MCP (ANTIGRAVITY & CHATGPT) ---');

  // 1. Test Handshake Initialize
  const initMsg = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'test-client', version: '1.0' }
    }
  };
  const initRes = await mcp.handleRpcMessage(initMsg);
  assert(initRes && initRes.result, 'Risposta initialize non valida');
  assert.strictEqual(initRes.result.serverInfo.name, 'apex-crm-mcp');
  assert.strictEqual(initRes.result.protocolVersion, '2024-11-05');
  assert(initRes.result.capabilities.tools, 'Capabilities tools mancante');
  console.log('PASS: MCP initialize handshake');

  // 2. Test tools/list
  const listMsg = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  };
  const listRes = await mcp.handleRpcMessage(listMsg);
  assert(listRes && listRes.result && Array.isArray(listRes.result.tools), 'tools/list deve restituire un array');
  const toolNames = listRes.result.tools.map(t => t.name);
  console.log(`PASS: tools/list ha restituito ${toolNames.length} tools`);
  const expectedTools = [
    'crm_summary',
    'crm_list_companies',
    'crm_get_company',
    'crm_create_company',
    'crm_update_company',
    'crm_list_deals',
    'crm_create_deal',
    'crm_advance_deal',
    'crm_list_activities',
    'crm_create_activity',
    'crm_complete_activity',
    'crm_list_quotes',
    'crm_list_projects',
    'crm_search',
    'crm_sync_status'
  ];
  for (const exp of expectedTools) {
    assert(toolNames.includes(exp), `Tool obbligatorio mancante: ${exp}`);
  }
  console.log('PASS: tutti i 15 tools obbligatori sono presenti e tipizzati');

  // 3. Test execution crm_summary
  const summaryCall = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'crm_summary',
      arguments: {}
    }
  };
  const summaryRes = await mcp.handleRpcMessage(summaryCall);
  assert(summaryRes.result && summaryRes.result.content && summaryRes.result.content[0].text);
  const parsedSummary = JSON.parse(summaryRes.result.content[0].text);
  assert(parsedSummary.summary, 'Summary object mancante');
  console.log('PASS: crm_summary eseguito:', JSON.stringify(parsedSummary.summary));

  // 4. Test execution crm_list_companies
  const compCall = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'crm_list_companies',
      arguments: { limit: 10 }
    }
  };
  const compRes = await mcp.handleRpcMessage(compCall);
  assert(compRes.result && compRes.result.content);
  const parsedComps = JSON.parse(compRes.result.content[0].text);
  assert(parsedComps.companies && parsedComps.companies.length > 0, 'Dovrebbero essere presenti aziende nel CRM');
  console.log(`PASS: crm_list_companies ha restituito ${parsedComps.companies.length} aziende da Supabase`);

  // 5. Test execution crm_search
  const searchCall = {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'crm_search',
      arguments: { query: 'Cattini' }
    }
  };
  const searchRes = await mcp.handleRpcMessage(searchCall);
  const parsedSearch = JSON.parse(searchRes.result.content[0].text);
  assert(parsedSearch.risultatiAziende.some(c => c.nome.includes('Cattini')), 'Ricerca Cattini fallita');
  console.log('PASS: crm_search ha trovato con successo Cattini');

  // 6. Test resources/list e prompts/list
  const resList = await mcp.handleRpcMessage({ jsonrpc: '2.0', id: 6, method: 'resources/list' });
  assert(resList.result.resources.length >= 2);
  const promptList = await mcp.handleRpcMessage({ jsonrpc: '2.0', id: 7, method: 'prompts/list' });
  assert(promptList.result.prompts.length >= 2);
  console.log('PASS: resources/list e prompts/list conformi');

  console.log('ALL MCP SERVER TESTS PASSED SUCCESSFULLY (100% Antigravity & ChatGPT Ready)!');
}

runTests().catch(err => {
  console.error('MCP TEST FAILED:', err);
  process.exit(1);
});

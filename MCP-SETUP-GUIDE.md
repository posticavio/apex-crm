# 🚀 Guida di Configurazione MCP Server Apex Digital CRM
## Per Google Antigravity e OpenAI ChatGPT (Desktop & Developer)

Il server MCP `crm-mcp-server.js` implementa lo standard ufficiale **Model Context Protocol (MCP 2024-11-05)** e si collega direttamente al cloud Supabase di Apex Digital CRM, rendendo tutti i dati delle aziende, delle trattative, delle attività e dei preventivi accessibili agli assistenti AI.

---

### 1. 🤖 Configurazione in Google Antigravity (Già attivo!)

Il server è già stato registrato automaticamente nel file di configurazione globale:
`C:\Users\posti\.gemini\config\mcp_config.json`

```json
{
  "mcpServers": {
    "apex_crm": {
      "command": "node",
      "args": [
        "c:\\Users\\posti\\Desktop\\codex\\crm personale\\crm-mcp-server.js"
      ]
    }
  }
}
```

Gli strumenti sono immediatamente disponibili nelle sessioni di Antigravity.

---

### 2. 💬 Configurazione in OpenAI ChatGPT Desktop (Windows & macOS)

Per utilizzare il server MCP all'interno dell'applicazione ufficiale **ChatGPT Desktop**:

1. Apri ChatGPT Desktop e vai su **Impostazioni (Settings)** ➔ **Avanzate / Developer** ➔ **Model Context Protocol (MCP)**.
2. In alternativa, apri il file di configurazione di ChatGPT:
   - **Windows**: `%APPDATA%\OpenAI\ChatGPT\config.json` (oppure `~/.config/chatgpt/config.json`)
   - **macOS**: `~/Library/Application Support/OpenAI/ChatGPT/config.json`
3. Aggiungi il blocco `apex_crm`:

```json
{
  "mcpServers": {
    "apex_crm": {
      "command": "node",
      "args": [
        "c:\\Users\\posti\\Desktop\\codex\\crm personale\\crm-mcp-server.js"
      ]
    }
  }
}
```

4. Riavvia ChatGPT Desktop. Troverai l'icona con il martello/strumenti con tutti i comandi CRM.

---

### 3. 🌐 Modalità HTTP/SSE (per Client Web, ChatGPT Actions o Server Remoti)

Se desideri esporre il server MCP via rete locale o HTTP invece che stdio:

```bash
node crm-mcp-server.js --port 3333
```

- Endpoint RPC / SSE: `http://localhost:3333/`
- Health check: `http://localhost:3333/health`

---

### 4. 🛠️ Strumenti (Tools) Disponibili per ChatGPT e Antigravity

| Tool | Descrizione |
| :--- | :--- |
| `crm_summary` | Riepilogo esecutivo con valore pipeline, MRR, clienti, prospect, lead e attività in scadenza. |
| `crm_list_companies` | Ricerca e filtro anagrafiche aziende per fase commerciale (`Lead`, `Prospect`, `Cliente`). |
| `crm_get_company` | Dossier completo di un'azienda (anagrafica, referenti, storico attività, preventivi, progetti). |
| `crm_create_company` | Crea una nuova azienda con sincronizzazione cloud istantanea. |
| `crm_update_company` | Aggiorna dati, recapiti, note o stadio di un'azienda esistente. |
| `crm_list_deals` | Elenca le opportunità di vendita aperte/vinte/perse con valori e scadenze. |
| `crm_create_deal` | Crea una nuova trattativa commerciale indicando problema, soluzione, setup e canone. |
| `crm_advance_deal` | Avanza una trattativa di fase (`Nuovo contatto` ➔ `Trattativa` ➔ `Offerta` ➔ `Vinta` / `Persa`). |
| `crm_list_activities` | Elenca attività operative e richiami (scaduti, oggi, futuri, completati). |
| `crm_create_activity` | Crea una nuova attività (chiamata, demo, email, meeting, compito). |
| `crm_complete_activity` | Segna come completata un'attività, archivia l'esito e pianifica il follow-up successivo. |
| `crm_list_quotes` | Elenca i preventivi con righe, totale imponibile e stato approvazione. |
| `crm_list_projects` | Monitora le commesse attive, milestone con vincoli di dipendenza, budget e marginalità. |
| `crm_search` | Ricerca rapida universale a tutto testo in tutto il CRM. |
| `crm_sync_status` | Verifica lo stato di connessione e sincronizzazione con Supabase Cloud. |

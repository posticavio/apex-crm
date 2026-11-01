@echo off
setlocal
set "NODE_BIN=C:\Users\posti\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
set "VERCEL_CLI=C:\Users\posti\Desktop\codex\1Money\.sites-runtime\tooling\node_modules\vercel\dist\index.js"
set "VERCEL_GLOBAL_CONFIG=C:\Users\posti\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Roaming\com.vercel.cli\Data"
set "VERCEL_SCOPE=team_OrPb8Nz0JxJI54UVutypSXUH"

echo [1/3] Controllo sintassi e test automatici CRM...
"%NODE_BIN%" --check app.js || exit /b 1
"%NODE_BIN%" --check company-import.js || exit /b 1
"%NODE_BIN%" --check quotes.js || exit /b 1
"%NODE_BIN%" --check activities.js || exit /b 1
"%NODE_BIN%" --check projects.js || exit /b 1
"%NODE_BIN%" --check analytics.js || exit /b 1
"%NODE_BIN%" --check crm-pro.js || exit /b 1
"%NODE_BIN%" crm-check.cjs || exit /b 1
"%NODE_BIN%" import-check.cjs || exit /b 1
"%NODE_BIN%" relationship-check.cjs || exit /b 1
"%NODE_BIN%" sales-check.cjs || exit /b 1
"%NODE_BIN%" resource-check.cjs || exit /b 1
"%NODE_BIN%" unscheduled-check.cjs || exit /b 1
"%NODE_BIN%" quotes-check.cjs || exit /b 1
"%NODE_BIN%" activities-check.cjs || exit /b 1
"%NODE_BIN%" enterprise-check.cjs || exit /b 1
"%NODE_BIN%" crm-pro-check.cjs || exit /b 1

echo [2/3] Collegamento progetto Vercel (apex-crm)...
"%NODE_BIN%" "%VERCEL_CLI%" --global-config "%VERCEL_GLOBAL_CONFIG%" link --yes --project apex-crm --scope "%VERCEL_SCOPE%" || exit /b 1

echo [3/3] Pubblicazione in produzione su Vercel...
"%NODE_BIN%" "%VERCEL_CLI%" --global-config "%VERCEL_GLOBAL_CONFIG%" deploy --prod --yes --scope "%VERCEL_SCOPE%" || exit /b 1

echo Pubblicazione completata con successo!

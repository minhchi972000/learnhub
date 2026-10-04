# Dev mode: FastAPI with auto-reload on :8000 (new window) + Vite on :5173
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root/backend'; uv run learnhub serve --reload"

Push-Location "$root/frontend"
try {
    if (-not (Test-Path node_modules)) { npm install }
    npm run dev
} finally { Pop-Location }

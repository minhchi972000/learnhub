# Build the frontend and serve API + UI on http://127.0.0.1:8000
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Push-Location "$root/frontend"
try {
    if (-not (Test-Path node_modules)) { npm install }
    npm run build
} finally { Pop-Location }

Push-Location "$root/backend"
try {
    uv run learnhub validate
    uv run learnhub serve
} finally { Pop-Location }

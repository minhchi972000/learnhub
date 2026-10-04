# Build the frontend once, then start prod (:8000) and demo (:8001) side by side, each in its own window.
param([string]$BindHost = '127.0.0.1')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Push-Location "$root/frontend"
try {
    if (-not (Test-Path node_modules)) { npm install }
    npm run build
} finally { Pop-Location }

foreach ($name in 'prod', 'demo') {
    Start-Process powershell -ArgumentList '-NoExit', '-File', "$root/scripts/serve.ps1", '-Env', $name, '-BindHost', $BindHost, '-SkipBuild'
}
Write-Host "prod: http://${BindHost}:8000   demo: http://${BindHost}:8001" -ForegroundColor Cyan

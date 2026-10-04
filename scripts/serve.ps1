# Run one environment (demo or prod) with the built frontend.
#   ./scripts/serve.ps1 -Env prod                 # http://127.0.0.1:8000, data in data/prod
#   ./scripts/serve.ps1 -Env demo                 # http://127.0.0.1:8001, data in data/demo (wiped on start)
#   ./scripts/serve.ps1 -Env demo -BindHost 0.0.0.0   # reachable from other machines on the LAN
# Extra LEARNHUB_* variables (e.g. LEARNHUB_ADMIN_TOKEN) are read from .env.<Env> in the repo root.
param(
    [Parameter(Mandatory)][ValidateSet('demo', 'prod')][Alias('Env')][string]$Environment,
    [int]$Port = 0,
    [string]$BindHost = '127.0.0.1',
    [switch]$SkipBuild
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if ($Port -eq 0) { $Port = @{ prod = 8000; demo = 8001 }[$Environment] }

$envFile = Join-Path $root ".env.$Environment"
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            Set-Item "env:$($Matches[1])" $Matches[2]
        }
    }
}
$env:LEARNHUB_ENV = $Environment

if ($Environment -eq 'prod' -and -not $env:LEARNHUB_ADMIN_TOKEN) {
    Write-Warning "LEARNHUB_ADMIN_TOKEN is not set (see .env.prod.example): POST /api/content/reload is disabled."
}

if (-not $SkipBuild) {
    Push-Location "$root/frontend"
    try {
        if (-not (Test-Path node_modules)) { npm install }
        npm run build
    } finally { Pop-Location }
}

Push-Location "$root/backend"
try {
    uv run learnhub validate
    if ($LASTEXITCODE -ne 0) { throw "Content validation failed" }
    Write-Host "LearnHub [$Environment] on http://${BindHost}:$Port" -ForegroundColor Cyan
    uv run learnhub serve --host $BindHost --port $Port
} finally { Pop-Location }

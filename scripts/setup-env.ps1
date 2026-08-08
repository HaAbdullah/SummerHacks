# Copies all .env.example files to their local counterparts if missing.
# Safe to re-run — will not overwrite existing .env files.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Copy-IfMissing {
    param(
        [string]$Source,
        [string]$Dest
    )
    if (-not (Test-Path $Source)) {
        Write-Host "Skip (missing example): $Source" -ForegroundColor Yellow
        return
    }
    if (Test-Path $Dest) {
        Write-Host "Exists (left unchanged): $Dest" -ForegroundColor DarkGray
        return
    }
    Copy-Item $Source $Dest
    Write-Host "Created: $Dest" -ForegroundColor Green
}

Write-Host "Setting up environment files..." -ForegroundColor Cyan

Copy-IfMissing (Join-Path $Root ".env.example") (Join-Path $Root ".env")
Copy-IfMissing (Join-Path $Root "backend\.env.example") (Join-Path $Root "backend\.env")
Copy-IfMissing (Join-Path $Root "frontend\.env.example") (Join-Path $Root "frontend\.env.local")

Write-Host ""
Write-Host "Done. Next steps:" -ForegroundColor Cyan
Write-Host "  Backend:  cd backend; activate .venv; pip install -r requirements.txt; uvicorn app.main:app --reload --port 8000"
Write-Host "  Frontend: cd frontend; npm install; npm run dev"
Write-Host ""
Write-Host "  Frontend  http://localhost:3000"
Write-Host "  Backend   http://localhost:8000"

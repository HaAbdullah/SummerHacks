#!/usr/bin/env bash
# Copies all .env.example files to their local counterparts if missing.
# Safe to re-run — will not overwrite existing .env files.

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_if_missing() {
  local src="$1"
  local dest="$2"
  if [[ ! -f "$src" ]]; then
    echo "Skip (missing example): $src"
    return
  fi
  if [[ -f "$dest" ]]; then
    echo "Exists (left unchanged): $dest"
    return
  fi
  cp "$src" "$dest"
  echo "Created: $dest"
}

echo "Setting up environment files..."

copy_if_missing "$ROOT/.env.example" "$ROOT/.env"
copy_if_missing "$ROOT/backend/.env.example" "$ROOT/backend/.env"
copy_if_missing "$ROOT/frontend/.env.example" "$ROOT/frontend/.env.local"

echo ""
echo "Done. Next steps:"
echo "  Backend:  cd backend; activate .venv; pip install -r requirements.txt; uvicorn app.main:app --reload --port 8000"
echo "  Frontend: cd frontend; npm install; npm run dev"
echo ""
echo "  Frontend  http://localhost:3000"
echo "  Backend   http://localhost:8000"

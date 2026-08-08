# Frontend (Next.js)

## Setup

```bash
# From repo root
cd frontend
npm install

# Environment variables
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS/Linux
```

Or from repo root run the shared env setup script (see root README).

## Run

```bash
npm run dev
```

App: http://localhost:3000

The backend URL is read from `NEXT_PUBLIC_API_URL` (see `src/lib/api.ts`).

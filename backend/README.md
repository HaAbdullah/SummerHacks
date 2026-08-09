# Backend (FastAPI)

```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # Windows
# cp .env.example .env   # macOS/Linux

uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

## Vehicle search

One endpoint for the search bar. Send whatever the user typed, in any order.

```
GET /api/vehicles/search?q=2018 toyota corolla
```

```json
{
  "query": "2018 toyota corolla",
  "results": [
    {
      "id": "toyota-corolla-2018",
      "label": "2018 Toyota Corolla",
      "make": "Toyota",
      "model": "Corolla",
      "year": 2018
    }
  ]
}
```

Handles `2018 toyota corolla`, `toyota corolla`, `corolla`, `toyota`, `corolla 2018`.
Returns `[]` for under two characters, so it is safe to call on every keystroke.

**`year` is null when the user didn't type one.** Ask for it rather than defaulting —
mods differ sharply between model years.

`GET /api/vehicles/cache` reports cache state for debugging.

## How the vPIC integration works

Data comes from [NHTSA vPIC](https://vpic.nhtsa.dot.gov/api/) — free, no API key, covers
every vehicle sold in the US since 1981.

Two traits shape the code:

- `getallmakes` returns **12,321 makes** (610KB), most of them trailer and RV
  manufacturers. It is fetched **once at startup** and filtered in memory, never per
  keystroke. Real consumer brands rank above the noise.
- Model lists for 12 popular makes are prefetched at startup so a bare `corolla` — with
  no make typed — still resolves. Searching all 12,321 makes per keystroke is not an
  option.

If vPIC is unreachable, search degrades to the consumer-brand list instead of failing.

### What vPIC cannot give you

Verified against the live API — worth knowing before planning features on it:

| Data | Available from make/model/year? |
|---|---|
| Makes, models, years | Yes |
| Body dimensions | Yes, via `GetCanadianVehicleSpecifications` (metric, Canadian trims) |
| Engine, brakes | **No — VIN only**, through `decodevinvalues/{VIN}` |
| Exhaust | **No — no exhaust field exists anywhere in vPIC** |

`GetModelsForMakeYear` returns only `Make_ID`, `Make_Name`, `Model_ID`, `Model_Name`.
There are no specs on that path.

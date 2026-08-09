@echo off
REM Durable local API starter — double-click or run from a normal terminal.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Missing .venv — create it with: python -m venv .venv ^& .venv\Scripts\pip install -r requirements.txt
  pause
  exit /b 1
)

REM Free port 8000 if something stale is holding it
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
  echo Killing PID %%p on port 8000
  taskkill /F /PID %%p >nul 2>&1
)

echo Starting SummerHacks API on http://127.0.0.1:8000 ...
echo Docs: http://127.0.0.1:8000/docs
echo Logs: data\uvicorn.log
echo.
".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause

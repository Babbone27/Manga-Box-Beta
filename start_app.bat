@echo off
set PORT=8000

echo Reset della porta %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

timeout /t 1 /nobreak >nul

echo Avvio Manga Box sulla porta %PORT%...

set PYTHON_CMD=python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    set PYTHON_CMD=python3
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERRORE] Python non trovato. Installa Python da python.org per avviare l'app.
        pause
        exit /b
    )
)

start "" "http://localhost:%PORT%"
%PYTHON_CMD% -m http.server %PORT%

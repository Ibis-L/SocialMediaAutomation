@echo off
TITLE News Portal Local Server
echo ======================================================
echo Starting News Portal (Backend + Frontend)
echo ======================================================

cd /d "%~dp0"

echo [1/3] Checking backend virtual environment...
if not exist "backend\venv" (
    echo Creating Python virtual environment...
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
) else (
    call backend\venv\Scripts\activate.bat
)

echo [2/3] Applying database migrations (SQLite)...
set DEBUG=True
cd backend\dashboard
python manage.py migrate --noinput
cd ..\..

echo [3/3] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo Installing npm dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo ======================================================
echo Launching Backend on http://localhost:8000
echo Launching Frontend on http://localhost:3000
echo ======================================================
echo.

start "News Portal - Backend" cmd /k "cd /d "%~dp0backend\dashboard" && call ..\venv\Scripts\activate.bat && set DEBUG=True && python manage.py runserver 0.0.0.0:8000"
start "News Portal - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Both servers have been launched in separate windows!
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:8000
echo - Admin:    http://localhost:8000/admin
echo.
pause


@echo off
echo Checking Python installation...

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in the PATH.
    echo Please install Python and try again.
    pause
    exit /b
)

echo Checking required packages...
python -c "import flask, flask_cors" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing required packages...
    python -m pip install flask flask-cors
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install required packages.
        echo Using local virtual environment instead...
        
        if exist ".venv\Scripts\python.exe" (
            echo Using local virtual environment...
            set "PYTHON_CMD=.venv\Scripts\python.exe"
        ) else (
            echo Error: Required packages are missing and no virtual environment found.
            pause
            exit /b
        )
    ) else (
        set "PYTHON_CMD=python"
    )
) else (
    set "PYTHON_CMD=python"
)

echo Starting LHD ACP & ORU Monitoring application...
echo Once started, open a web browser and go to http://localhost:5000

%PYTHON_CMD% ping_acp_oru.py

pause 
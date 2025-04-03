#!/bin/bash

# Check if Python is installed
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "Error: Python is not installed. Please install Python first."
    exit 1
fi

# Use python3 if available, otherwise use python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

# Check if required packages are installed
if ! $PYTHON_CMD -c "import flask, flask_cors" &> /dev/null; then
    echo "Installing required packages..."
    $PYTHON_CMD -m pip install flask flask-cors
    
    # If installation fails, try using local virtual environment
    if [ $? -ne 0 ]; then
        echo "Failed to install required packages."
        echo "Checking for local virtual environment..."
        
        if [ -f ".venv/bin/python" ]; then
            echo "Using local virtual environment..."
            PYTHON_CMD=".venv/bin/python"
        elif [ -f ".venv/Scripts/python" ]; then
            echo "Using local virtual environment..."
            PYTHON_CMD=".venv/Scripts/python"
        else
            echo "Error: Required packages are missing and no virtual environment found."
            exit 1
        fi
    fi
fi

# Run the application
echo "Starting LHD ACP & ORU Monitoring application..."
echo "Once started, open a web browser and go to http://localhost:5000"
$PYTHON_CMD ping_acp_oru.py 
# LHD ACP & ORU Monitoring System

## Portable Setup Instructions

### Files Required for Server Installation
1. `.venv` folder - Contains the Python virtual environment with all required packages
2. `ping_acp_oru.py` - The Python server script
3. `acp_adam_monitoring.html` - The monitoring dashboard HTML file
4. `run_monitoring.bat` - Windows batch file to start the application
5. `run_monitoring.sh` - Linux/Mac shell script to start the application
6. `requirements.txt` - List of Python dependencies

### Installation on Windows Server
1. Copy all files to a folder on the server
2. Make sure to keep the folder structure intact, with the `.venv` folder in the same directory as the other files
3. Double-click `run_monitoring.bat` to start the monitoring system
4. The script will:
   - Check if Python is installed
   - Verify if required packages are installed
   - Use the local .venv if needed
   - Start the monitoring server

### Installation on Linux/Mac Server
1. Copy all files to a folder on the server
2. Make sure to keep the folder structure intact
3. Open a terminal and navigate to the folder
4. Make the shell script executable: `chmod +x run_monitoring.sh`
5. Run the script: `./run_monitoring.sh`
6. The script will:
   - Check for Python (python3 or python)
   - Verify if required packages are installed
   - Use the local .venv if needed
   - Start the monitoring server

### Important Notes
- The server doesn't need internet access when using the included .venv
- If internet is available, the scripts can install required packages automatically
- The application will run at http://localhost:5000
- Keep the terminal/command window open to maintain the server running
- Close the terminal/command window to stop the server

### Troubleshooting
- If you see an error about Python not being found, make sure Python is installed or the `.venv` folder was copied correctly
- If the server starts but no dashboard appears, manually open a browser and go to http://localhost:5000
- If you get a "port already in use" error, make sure no other application is using port 5000
- If you have installation errors, verify that the requirements.txt file is present

## System Requirements
- Windows, Linux, or Mac OS
- Python 3.6 or higher (if not using the included .venv)
- No internet connection required when using the included .venv
- Minimum 4GB RAM
- Network access to the ACP and ORU devices for pinging

## Features
- Real-time monitoring of ACP and ORU devices
- Automatic ping of all configured devices
- Detailed status display with response times
- History tracking and export functionality
- Fullscreen mode for control room displays
- Clickable IP addresses for direct device access 
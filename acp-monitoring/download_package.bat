@echo off
echo Membuat folder download...
mkdir flask_offline
cd flask_offline

echo Mengunduh flask==2.0.1 dan flask-cors==3.0.10 beserta dependensinya...
pip download flask==2.0.1 flask-cors==3.0.10

echo Paket telah diunduh ke folder flask_offline
pause

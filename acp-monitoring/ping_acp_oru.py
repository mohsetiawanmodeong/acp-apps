#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import subprocess
import platform
import threading
import time
import os
import json
from datetime import datetime

app = Flask(__name__, static_folder='./')
CORS(app)  # Enable CORS for all routes

# Cache for ping results (to reduce system load)
ping_cache = {}
ping_cache_timeout = 2  # Cache results for 2 seconds

def ping_ip(ip_address):
    """
    Ping an IP address and return the result
    """
    # Check cache first
    current_time = time.time()
    if ip_address in ping_cache:
        cache_time, result = ping_cache[ip_address]
        if current_time - cache_time < ping_cache_timeout:
            return result
    
    # Use different ping command based on OS
    if platform.system().lower() == "windows":
        command = ["ping", "-n", "1", "-w", "1000", ip_address]
    else:
        command = ["ping", "-c", "1", "-W", "1", ip_address]
    
    try:
        # Execute ping command with a timeout
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        stdout, stderr = process.communicate(timeout=2)
        output = stdout.decode('utf-8', errors='ignore')
        
        # Parse the result
        if platform.system().lower() == "windows":
            success = "TTL=" in output
        else:
            success = " 0% packet loss" in output
        
        # Extract response time if successful
        response_time = None
        if success:
            if platform.system().lower() == "windows":
                time_parts = [line for line in output.split('\n') if "time=" in line or "time<" in line]
                if time_parts:
                    if "time=" in time_parts[0]:
                        time_str = time_parts[0].split("time=")[1].split("ms")[0].strip()
                        response_time = float(time_str)
                    elif "time<" in time_parts[0]:
                        # Handle "time<1ms" case
                        response_time = 0.5  # Approximate value for "time<1ms"
            else:
                time_parts = [line for line in output.split('\n') if "time=" in line]
                if time_parts:
                    time_str = time_parts[0].split("time=")[1].split(" ")[0].strip()
                    response_time = float(time_str)
        
        # Simplify the response message
        if success:
            response_text = f"Reply from {ip_address}"
        else:
            response_text = "Request timed out."
        
        result = {
            "success": success,
            "responseTime": response_time if success else "-",
            "responseText": response_text,
            "timestamp": datetime.now().isoformat()
        }
        
        # Update cache
        ping_cache[ip_address] = (current_time, result)
        return result
    
    except subprocess.TimeoutExpired:
        # Timeout occurred
        process.kill()
        result = {
            "success": False,
            "responseTime": "-",
            "responseText": "Request timed out.",
            "timestamp": datetime.now().isoformat()
        }
        ping_cache[ip_address] = (current_time, result)
        return result
    
    except Exception as e:
        # Some other error occurred
        result = {
            "success": False,
            "responseTime": "-",
            "responseText": "Request timed out.",
            "timestamp": datetime.now().isoformat()
        }
        ping_cache[ip_address] = (current_time, result)
        return result

@app.route('/')
def index():
    """Serve the main HTML file"""
    return send_from_directory('./', 'acp_adam_monitoring.html')

@app.route('/api/ping-all', methods=['POST'])
def ping_all_devices():
    """Ping all devices in the request and return results"""
    data = request.json
    devices = data.get('devices', [])
    results = {}
    
    # Create threads for parallel pinging
    threads = []
    
    def ping_device(device_id, ip, device_type):
        result = ping_ip(ip)
        result["deviceType"] = device_type
        result["ip"] = ip
        
        if device_id not in results:
            results[device_id] = {}
        results[device_id][device_type] = result
    
    # Start a thread for each ping
    for device in devices:
        device_id = device['id']
        # Ping ACP
        t1 = threading.Thread(target=ping_device, args=(device_id, device['adamIp'], 'adam'))
        threads.append(t1)
        t1.start()
        
        # Ping ORU
        t2 = threading.Thread(target=ping_device, args=(device_id, device['oruIp'], 'oru'))
        threads.append(t2)
        t2.start()
    
    # Wait for all threads to complete
    for t in threads:
        t.join()
    
    return jsonify(results)

@app.route('/api/ping/<ip_address>', methods=['GET'])
def ping_single(ip_address):
    """Ping a single IP address and return the result"""
    result = ping_ip(ip_address)
    result["ip"] = ip_address
    return jsonify(result)

if __name__ == '__main__':
    print("Starting ACP & ORU Monitoring Server")
    print("Access the dashboard at http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True) 
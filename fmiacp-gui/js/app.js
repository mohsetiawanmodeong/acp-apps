/**
 * FMIACP Dashboard Application
 * Main JavaScript file for FMIACP Dashboard UI
 */

// Global variables
let fmiacpData = [];
let fmiacpCurrentData = [];
let tableData = []; // Global tableData variable
let refreshTimer = null;
let currentPage = 1;
let rowsPerPage = 25; // Default value, will be updated by entries-select
let apiBaseUrl = 'http://localhost:4990'; // Global API base URL that can be updated

// Document ready function
$(document).ready(function() {
    console.log('FMIACP Dashboard initialized');
    
    // Create login status display
    createLoginStatusDisplay();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize tabs
    initBootstrapTabs();
    
    // Initial connection attempt
    initialConnection();
    
    // Start the connection checker
    startConnectionChecker();
});

// Function to create login status display in navbar
function createLoginStatusDisplay() {
    if (!$('#login-status').length) {
        const statusDiv = $('<div>')
            .attr('id', 'login-status')
            .addClass('status-disconnected')
            .text('Terputus')
            .attr('title', 'Status koneksi API')
            .css('margin-right', '10px');
        
        $('.navbar-nav.ms-auto').prepend(statusDiv);
    }
}

// Set up event listeners for UI controls
function setupEventListeners() {
    // Refresh button
    $('#refresh-btn').on('click', function() {
        console.log('Manual refresh requested');
        
        // Add spinning animation to the refresh icon
        const $icon = $(this).find('i');
        $icon.addClass('refresh-spin');
        
        // Show loading indicator
        showLoading(true);
        
        // Fetch data and handle completion
        fetchData()
            .then(() => {
                console.log('Manual refresh completed successfully');
            })
            .catch(error => {
                console.error('Manual refresh failed:', error);
            })
            .finally(() => {
                // Stop spinning animation
                setTimeout(() => {
                    $icon.removeClass('refresh-spin');
                }, 500);
                
                // Hide loading indicator
                showLoading(false);
            });
    });
    
    // Fullscreen button
    $('#fullscreen-btn').on('click', function() {
        toggleFullScreen();
    });
    
    // Download data button
    $('#download-data-btn').on('click', function() {
        downloadData();
    });
    
    // Tab change event
    $('a[data-bs-toggle="pill"]').on('shown.bs.tab', function(e) {
        // Reload the content based on the tab that was activated
        const tabId = $(e.target).attr('href');
        
        if (tabId === '#dashboard-tab') {
            updateDashboard();
        } else if (tabId === '#machine-tab') {
            renderMachineData();
        } else if (tabId === '#table-tab') {
            renderDataTable();
        } else if (tabId === '#status-tab') {
            updateAppStatus(window.lastSuccessfulStatus);
        }
    });
    
    // Table filter events - these are now handled in data-handlers.js
    // since they require re-rendering the DataTable
    
    // Machine filter event for the machine data tab
    $('#machine-filter').on('change', function() {
        renderMachineData();
    });
}

// Initialize connection to API
async function initialConnection() {
    console.log('Initializing connection to API...');
    try {
        // Show loading indicator
        showLoading(true);
        
        // Try to connect and get status
        const statusData = await makeApiRequest('/api/getAppStatusFMIACP');
        
        // Update UI with connection status and app info
        updateLoginStatus(true);
        updateAppStatus(statusData);
        
        // Initial data fetch
        await fetchData();
        
        // Start auto refresh with 1-second interval
        startAutoRefresh();
        
        console.log('Connection initialized successfully');
    } catch (error) {
        // Handle connection error
        console.error('Connection initialization failed:', error);
        
        // Update UI with connection status
        updateLoginStatus(false);
        updateAppStatus(null);
    } finally {
        // Hide loading indicator regardless of result
        showLoading(false);
    }
}

// Update login status and connection indicators
function updateLoginStatus(isLoggedIn) {
    // Extract port from API URL
    const portMatch = apiBaseUrl.match(/:(\d+)/);
    const port = portMatch ? portMatch[1] : '?';
    
    // Update connection status text
    const connectionStatus = $('#connection-status');
    if (connectionStatus.length) {
        connectionStatus.text(isLoggedIn ? 
            `Tersambung (Port: ${port})` : 
            `Terputus (Port: ${port})`);
            
        // Update class for styling
        connectionStatus.removeClass('text-success text-danger')
            .addClass(isLoggedIn ? 'text-success' : 'text-danger');
    }
    
    // Update refresh indicator with a simple dot showing connected/disconnected
    const refreshStatus = $('#refresh-status');
    if (refreshStatus.length) {
        refreshStatus
            .removeClass('status-connected status-disconnected')
            .addClass(isLoggedIn ? 'status-connected' : 'status-disconnected')
            .attr('title', isLoggedIn ? 'API Connected' : 'API Disconnected');
    }
    
    // Update database connection status if exists
    const dbConnection = $('#db-connection');
    if (dbConnection.length) {
        dbConnection
            .removeClass('text-success text-danger')
            .addClass(isLoggedIn ? 'text-success' : 'text-danger')
            .find('.connection-text')
            .text(isLoggedIn ? 'Connected' : 'Disconnected');
    }
    
    // Log status change
    console.log(`Connection status updated: ${isLoggedIn ? 'Connected' : 'Disconnected'} to ${apiBaseUrl}`);
}

// Function to make API requests
async function makeApiRequest(endpoint, method = 'GET', data = null) {
    try {
        // Construct proper URL without duplication
        let url = '';
        
        // Make sure apiBaseUrl doesn't end with slash
        const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        
        // Make sure endpoint starts with slash
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        // Combine them for target URL
        const targetUrl = `${baseUrl}${formattedEndpoint}`;
        url = targetUrl;
        
        console.log(`Making API request to: ${url}`);
        
        // Prepare fetch options - no credentials in the frontend
        const fetchOptions = {
            method: method,
            // Use credentials: 'include' to send cookies if the server uses session auth
            credentials: 'include'
        };
        
        // Add body for POST requests
        if (method === 'POST' && data) {
            fetchOptions.headers = {
                'Content-Type': 'application/json'
            };
            fetchOptions.body = JSON.stringify(data);
        }
        
        // Make fetch request
        const response = await fetch(url, fetchOptions);
        
        // Log response status
        console.log(`Response status: ${response.status} for ${url}`);
        
        // Check if response is OK
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        // Parse JSON response
        const responseData = await response.json();
        console.log(`Response received from ${url}`);
        
        return responseData;
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// Function to initialize all Bootstrap tabs
function initBootstrapTabs() {
    console.log("Bootstrap tabs initialization started");
    
    // Use jQuery approach for Bootstrap tabs which is more compatible
    $('.nav-link[data-bs-toggle="pill"]').on('click', function(e) {
        e.preventDefault();
        $(this).tab('show');
        console.log(`Tab switched to: ${$(this).attr('href')}`);
    });
    
    // Ensure a tab is active when the page loads
    if ($('.nav-link.active').length === 0) {
        // Set the default tab as active
        $('.nav-link[href="#dashboard-tab"]').tab('show');
    }
    
    console.log("Bootstrap tabs initialized");
}

// Function to fetch data from API
async function fetchData() {
    showLoading(true);
    $('#last-update-time').text(new Date().toLocaleTimeString());
    
    try {
        console.log(`Fetching data from API: ${apiBaseUrl}`);
        
        // Fetch application status first
        const statusData = await makeApiRequest('/api/getAppStatusFMIACP');
        console.log('App status data:', statusData);
        
        // Store last successful status
        if (statusData) {
            window.lastSuccessfulStatus = statusData;
        }
        
        // Update app status display
        updateAppStatus(statusData);
        
        // Fetch other data as needed
        const [fmiacpDataResponse, machineDataResponse] = await Promise.all([
            makeApiRequest('/api/getFMIACP'),
            makeApiRequest('/api/getFMIACPCurrent')
        ]);
        
        // Update global data
        fmiacpData = fmiacpDataResponse;
        fmiacpCurrentData = machineDataResponse;
        
        // Process data for the table
        if (Array.isArray(fmiacpDataResponse)) {
            // Transform the data for the table format
            tableData = processDataForTable(fmiacpDataResponse);
        }
        
        // Update filters for table
        if (typeof updateTableFilters === 'function') {
            updateTableFilters();
        }
        
        // Update UI for other tabs
        if (typeof updateDashboard === 'function') {
            updateDashboard();
        }
        
        if (typeof renderMachineData === 'function') {
            renderMachineData();
        }
        
        if (typeof renderDataTable === 'function') {
            renderDataTable();
        }
        
        // Update connection status to success
        updateLoginStatus(true);
        
        console.log("All data fetched successfully");
    } catch (error) {
        console.error("Error fetching data:", error);
        
        // Update app status with connection failure
        updateAppStatus(null);
        
        // Update connection status to failure
        updateLoginStatus(false);
    } finally {
        showLoading(false);
    }
}

// Process API data into table format
function processDataForTable(apiData) {
    if (!Array.isArray(apiData)) return [];
    
    // Group data by machine name to create a single row per machine
    const machineGroups = {};
    
    apiData.forEach(item => {
        const machineName = item.MACHINE_NAME;
        if (!machineName) return;
        
        if (!machineGroups[machineName]) {
            machineGroups[machineName] = {
                MachineName: machineName,
                MachineAddress: item.MACHINE_ADDRESS || 'N/A',
                ConnectionStatus: 'Unknown',
                TimeStamp: item.LAST_UPDATE || null,
                HasErrors: false,
                TrackCount: 0
            };
        }
        
        // Update machine status
        if (item.MEASUREMENT === 'ONLINE' && item.VALUE === '1') {
            machineGroups[machineName].ConnectionStatus = 'Online';
        } else if (item.MEASUREMENT === 'ONLINE' && item.VALUE === '0') {
            machineGroups[machineName].ConnectionStatus = 'Offline';
        }
        
        // Track count (can be customized based on your data)
        if (item.CATEGORY === 'TRACK') {
            machineGroups[machineName].TrackCount++;
        }
        
        // Update timestamp with most recent update
        if (item.LAST_UPDATE) {
            const itemDate = new Date(item.LAST_UPDATE);
            const currentDate = machineGroups[machineName].TimeStamp ? 
                new Date(machineGroups[machineName].TimeStamp) : null;
                
            if (!currentDate || itemDate > currentDate) {
                machineGroups[machineName].TimeStamp = item.LAST_UPDATE;
            }
        }
        
        // Check for errors
        if (item.CATEGORY === 'ERROR' || item.TYPE === 'ERROR') {
            machineGroups[machineName].HasErrors = true;
        }
    });
    
    // Convert grouped data to array
    return Object.values(machineGroups);
}

// Function to display loading indicator
function showLoading(show) {
    if (show) {
        // Show loading indicator
        if (!$('#loading-overlay').length) {
            const overlay = $('<div id="loading-overlay" class="loading-overlay"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>');
            $('body').append(overlay);
        }
        $('#loading-overlay').show();
    } else {
        // Hide loading indicator
        $('#loading-overlay').hide();
    }
}

// Function to start auto-refresh
function startAutoRefresh() {
    // Clear any existing timer
    if (window.refreshTimer) {
        clearInterval(window.refreshTimer);
        window.refreshTimer = null;
    }
    
    // Fixed 1-second interval
    const interval = 1000;
    console.log(`Setting up auto refresh with interval: ${interval}ms`);
    
    // Set up background refresh
    window.refreshTimer = setInterval(function() {
        // Use refreshDataSmoothly if available, otherwise use fetchData
        if (typeof refreshDataSmoothly === 'function') {
            refreshDataSmoothly();
        } else {
            fetchData();
        }
    }, interval);
}

// Function to periodically check connection status
function startConnectionChecker() {
    // Clear any existing checkers
    if (window.connectionCheckerTimer) {
        clearInterval(window.connectionCheckerTimer);
    }
    
    // Set up a new connection checker that runs every 10 seconds
    window.connectionCheckerTimer = setInterval(async function() {
        try {
            // Simple ping to API without hardcoded credentials
            const response = await fetch(`${apiBaseUrl}/api/getAppStatusFMIACP`, {
                credentials: 'include'
            });
            
            // If we get a response, connection is OK
            if (response.ok) {
                // Only update UI if connection status changed from disconnected to connected
                const wasDisconnected = !$('#db-connection').hasClass('text-success');
                
                if (wasDisconnected) {
                    console.log('Connection restored after being disconnected');
                    
                    // Update login status to success
                    updateLoginStatus(true);
                }
                
                // Try to parse response if possible
                try {
                    const data = await response.json();
                    // Only update UI if we have a valid response
                    if (data && typeof data === 'object') {
                        updateAppStatus(data);
                    }
                } catch (e) {
                    console.warn("Could not parse API response:", e);
                }
            } else {
                // Server responded but with an error
                console.error(`Connection check failed with status: ${response.status}`);
                
                // Check if this is a new disconnection
                const wasConnected = $('#db-connection').hasClass('text-success');
                
                if (wasConnected) {
                    updateLoginStatus(false);
                    updateAppStatus(null);
                }
            }
        } catch (error) {
            // Network error, server is likely down
            console.error("Connection check failed:", error);
            
            // Check if this is a new disconnection
            const wasConnected = $('#db-connection').hasClass('text-success');
            
            if (wasConnected) {
                // Update UI for disconnection
                updateLoginStatus(false);
                updateAppStatus(null);
            }
        }
    }, 10000); // Check every 10 seconds
    
    console.log("Connection checker started");
}

// Function to toggle fullscreen
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => {
            console.error(`Error attempting to enable fullscreen: ${e.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Function to update app status display if not found in data-handlers.js
function updateAppStatus(status) {
    // If the function is already defined in data-handlers.js, don't redefine it
    if (window.updateAppStatusDefined) return;
    
    // Format bytes to human readable format
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Format microseconds to readable format
    function formatMicroseconds(microseconds) {
        return (microseconds / 1000).toFixed(2) + ' ms';
    }
    
    // Check if status is valid
    const isConnected = status !== null && typeof status === 'object';
    
    // Update basic app info
    $('#app-name').text(isConnected ? (status.Name || '-') : '-');
    $('#app-version').text(isConnected ? (status.Version || '-') : '-');
    
    // Update database connection status
    const dbConnection = isConnected ? 'Connected' : 'Disconnected';
    $('#db-connection')
        .removeClass('text-success text-danger')
        .addClass(isConnected ? 'text-success' : 'text-danger')
        .find('.connection-text')
        .text(dbConnection);
    
    // If not connected, clear all data displays
    if (!isConnected) {
        $('#data-store-size').text('-');
        $('#data-store-count').text('-');
        $('#data-store-fail-count').text('-');
        $('#data-input-count').text('-');
        $('#data-input-request-count').text('-');
        $('#data-output-count').text('-');
        $('#data-output-request-count').text('-');
        
        // Clear memory usage
        $('#memory-rss').text('-');
        $('#memory-heapTotal').text('-');
        $('#memory-heapUsed').text('-');
        $('#memory-external').text('-');
        $('#memory-arrayBuffers').text('-');
        
        // Clear CPU usage
        $('#cpu-user').text('-');
        $('#cpu-system').text('-');
        $('#cpu-total').text('-');
        
        return;
    }
    
    // Update data statistics
    $('#data-store-size').text(status.DataStoreSize || 0);
    $('#data-store-count').text(status.DataStoreCount || 0);
    $('#data-store-fail-count').text(status.DataStoreFailCount || 0);
    $('#data-input-count').text(status.DataInputCount || 0);
    $('#data-input-request-count').text(status.DataInputRequestCount || 0);
    $('#data-output-count').text(status.DataOutputCount || 0);
    $('#data-output-request-count').text(status.DataOutputRequestCount || 0);
    
    // Update memory usage
    if (status.UsageMemory) {
        $('#memory-rss').text(formatBytes(status.UsageMemory.rss || 0));
        $('#memory-heapTotal').text(formatBytes(status.UsageMemory.heapTotal || 0));
        $('#memory-heapUsed').text(formatBytes(status.UsageMemory.heapUsed || 0));
        $('#memory-external').text(formatBytes(status.UsageMemory.external || 0));
        $('#memory-arrayBuffers').text(formatBytes(status.UsageMemory.arrayBuffers || 0));
    }
    
    // Update CPU usage
    if (status.UsageCPU) {
        $('#cpu-user').text(formatMicroseconds(status.UsageCPU.user || 0));
        $('#cpu-system').text(formatMicroseconds(status.UsageCPU.system || 0));
    }
    
    // Update total CPU percentage
    $('#cpu-total').text(status.CPU ? status.CPU + '%' : '0%');
}

// ... rest of the original file content ...
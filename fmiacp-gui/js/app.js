/**
 * FMIACP Dashboard Application
 * Main JavaScript file for FMIACP Dashboard UI
 */

// Global variables
let fmiacpData = [];
let fmiacpCurrentData = [];
let refreshTimer = null;
let currentPage = 1;
const rowsPerPage = 15;
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
    
    // Table filter event
    $('#table-filter').on('change', function() {
        renderDataTable();
    });
    
    // Table search event
    $('#table-search').on('input', function() {
        renderDataTable();
    });
    
    // Machine filter event
    $('#machine-filter').on('change', function() {
        renderMachineData();
    });
    
    // Pagination buttons
    $('#prev-page').on('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderDataTable();
        }
    });
    
    $('#next-page').on('click', function() {
        const totalRows = filteredTableData ? filteredTableData.length : 0;
        const totalPages = Math.ceil(totalRows / rowsPerPage);
        
        if (currentPage < totalPages) {
            currentPage++;
            renderDataTable();
        }
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
    return new Promise((resolve, reject) => {
        // Construct proper URL without duplication
        let url = '';
        
        // Make sure apiBaseUrl doesn't end with slash
        const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        
        // Make sure endpoint starts with slash
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        // Combine them for target URL - now directly connecting to API without proxy
        const targetUrl = `${baseUrl}${formattedEndpoint}`;
        url = targetUrl;
        
        console.log(`Making API request to: ${url}`);
        
        // Set up timeout for fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        // Standard fetch with explicit cors mode and browser's built-in authentication
        fetch(url, {
            method: method,
            mode: 'cors', // Explicitly request CORS mode
            // This triggers the browser's authentication dialog when needed
            credentials: 'include',
            headers: {
                'Content-Type': data ? 'application/json' : 'application/x-www-form-urlencoded'
            },
            body: data ? JSON.stringify(data) : null,
            signal: controller.signal // Add signal for timeout
        })
        .then(response => {
            clearTimeout(timeoutId); // Clear timeout on success
            console.log(`Response status: ${response.status} for ${targetUrl}`);
            
            if (response.ok) {
                return response.json();
            } else if (response.status === 401) {
                // Update login status
                updateLoginStatus(false);
                
                // Show message about authentication
                console.log("Authentication required, browser should show login dialog");
                reject(new Error(`Authentication required (401)`));
                return;
            } else {
                // Other error responses
                console.error(`API error: ${response.status} - ${response.statusText}`);
                reject(new Error(`API request failed: ${response.status} ${response.statusText}`));
                return;
            }
        })
        .then(data => {
            // Valid data received
            console.log(`Response received from ${targetUrl}`);
            
            // Update login status if we get here
            updateLoginStatus(true);
            
            resolve(data);
        })
        .catch(error => {
            clearTimeout(timeoutId); // Clear timeout on error
            console.error(`Error in API request to ${targetUrl}:`, error);
            
            // Update app status with connection failure
            updateAppStatus(null);
                
            // Update connection status to failure
            updateLoginStatus(false);
            
            // Check for timeout or connection refused errors
            if (error.name === 'AbortError') {
                console.error("Request timeout detected");
                reject(new Error("Connection timeout - server might be down"));
            } else if (error.message.includes('Failed to fetch') || 
                       error.message.includes('NetworkError') || 
                       error.message.includes('CORS')) {
                
                console.warn("Connection error detected", error);
                
                // Show error notification
                displayError("Connection Error", 
                    "Cannot access API at " + url + 
                    "<br>Server might be down or unreachable", 
                    "app.js:214");
                
                updateLoginStatus(false);
            }
            
            reject(error);
        });
    });
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
        
        // Update UI for other tabs
        updateDashboard();
        renderMachineData();
        renderDataTable();
        
        // Update connection status to success
        updateLoginStatus(true);
        
        console.log("All data fetched successfully");
    } catch (error) {
        console.error("Error fetching data:", error);
        displayError("Error fetching data", error.message);
        
        // Update app status with connection failure
        updateAppStatus(null);
        
        // Update connection status to failure
        updateLoginStatus(false);
    } finally {
        showLoading(false);
    }
}

// Function to display error message in dashboard
function displayError(message, details = "", source = "") {
    const dashboardGrid = $('#dashboard-grid');
    dashboardGrid.html(`
        <div class="col-12">
            <div class="card">
                <div class="card-body">
                    <div class="alert alert-danger mb-0">
                        <h5 class="alert-heading">${message}</h5>
                        <p>${details}</p>
                    </div>
                </div>
            </div>
        </div>
    `);
}

// Function to initialize all Bootstrap tabs
function initBootstrapTabs() {
    // Ensure all tab links show their content when clicked
    $('.nav-link[data-bs-toggle="pill"]').on('click', function (e) {
        e.preventDefault();
        const target = $(this).attr('href');
        
        // Hide all tab panes
        $('.tab-pane').removeClass('show active');
        
        // Show selected tab pane
        $(target).addClass('show active');
        
        // Update active class on tab links
        $('.nav-link').removeClass('active');
        $(this).addClass('active');
        
        console.log(`Tab switched to: ${target}`);
    });
    
    // Make sure at least one tab is active when the page loads
    if ($('.nav-link.active').length === 0) {
        $('.nav-link[href="#dashboard-tab"]').click();
    }
    
    console.log("Bootstrap tabs initialized");
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
            // Simple ping to API - using same approach as makeApiRequest for consistency
            const response = await fetch(`${apiBaseUrl}/api/getAppStatusFMIACP`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'include'
                // No extra headers that could trigger CORS preflight
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

// More functions will be added in additional files 
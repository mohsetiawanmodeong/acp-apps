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
    // Tab navigation - gunakan aktivasi tab Bootstrap 5 yang benar
    $('.nav-link').on('click', function(e) {
        // Tab event handling dikelola oleh Bootstrap, tidak perlu override
        console.log(`Tab clicked: ${$(this).attr('href')}`);
    });
    
    // Refresh interval change
    $('#refresh-interval').on('change', startAutoRefresh);
    
    // Fullscreen toggle
    $('#fullscreen-btn').on('click', toggleFullScreen);
    
    // Download data button
    $('#download-data-btn').on('click', downloadData);
    
    // Logout button
    $('#logout-btn').on('click', function() {
        sessionStorage.removeItem('credentials');
        updateLoginStatus(false);
        showToast('Info', 'Berhasil logout dari sistem');
    });
    
    // Pagination controls
    $('#prev-page').on('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderDataTable();
        }
    });
    
    $('#next-page').on('click', function() {
        const totalPages = Math.ceil(fmiacpData.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderDataTable();
        }
    });
    
    // Search and filter
    $('#table-search').on('input', function() {
        currentPage = 1;
        renderDataTable();
    });
    
    $('#table-filter').on('change', function() {
        currentPage = 1;
        renderDataTable();
    });
    
    $('#machine-filter').on('change', renderMachineData);
}

// Initial connection attempt
async function initialConnection() {
    try {
        showLoading(true);
        
        // Log API base URL
        console.log(`Trying to connect to API at: ${apiBaseUrl}`);
        
        // Initial data fetch
        await fetchData();
        console.log("Successfully connected to API");
        
        // Show success notification
        showLoading(false);
        showToast('Success', `Berhasil terhubung ke server API di ${apiBaseUrl}`);
        
        // Start auto-refresh immediately with smooth updates
        startAutoRefresh();
    } catch (error) {
        console.error("Initial connection failed:", error);
        
        // Try alternative ports
        console.log("Attempting to find server on alternative ports...");
        const portSuccess = await tryNextPort();
        
        if (!portSuccess) {
            console.error("Could not find API on any port");
            displayError("Tidak dapat terhubung ke server API", 
                "Sistem tidak dapat menemukan server pada port manapun. Pastikan server berjalan dan dapat diakses. " +
                "Periksa apakah alamat API URL sudah benar dan kredensial login yang valid.");
            
            showLoading(false);
        } else {
            // If port detection successful, start auto-refresh
            startAutoRefresh();
        }
    }
}

// Function to update login status display
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
    
    // Log status change
    console.log(`Connection status updated: ${isLoggedIn ? 'Connected' : 'Disconnected'} to ${apiBaseUrl}`);
}

// Function to make API requests
async function makeApiRequest(endpoint, method = 'GET', data = null) {
    try {
        // Gunakan kredensial yang benar untuk authentikasi API
        const credentials = sessionStorage.getItem('credentials');
        const authHeader = credentials ? 
            `Basic ${credentials}` : 
            `Basic ${btoa('fmiacp:track1nd0')}`;
        
        // Construct proper URL without duplication
        let url = '';
        
        // Make sure apiBaseUrl doesn't end with slash
        const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        
        // Make sure endpoint starts with slash
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        // Combine them
        url = `${baseUrl}${formattedEndpoint}`;
        
        console.log(`Making API request to: ${url}`);
        
        // Menggunakan fetch dengan konfigurasi sederhana untuk menghindari masalah CORS
        const options = {
            method: method,
            headers: {
                'Authorization': authHeader
            }
        };
        
        // Only add Content-Type for requests with body
        if (data && (method === 'POST' || method === 'PUT')) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
        
        // Direct fetch with proper configuration
        const response = await fetch(url, options);
        
        // Log response details
        console.log(`Response status: ${response.status} for ${url}`);
        
        // Check if login is required
        if (response.status === 401) {
            // Clear credentials and update login status
            sessionStorage.removeItem('credentials');
            updateLoginStatus(false);
            console.log(`Authentication required for ${url}`);
            
            // Prompt for login
            const loginResult = await promptLogin();
            if (loginResult) {
                // Retry the original request with new credentials
                console.log(`Retrying request to ${url} with new credentials`);
                return makeApiRequest(endpoint, method, data);
            } else {
                throw new Error('Authentication failed');
            }
        }
        
        // Check for other errors
        if (!response.ok) {
            throw new Error(`API request failed with status: ${response.status} for ${url}`);
        }
        
        // Update login status to success
        updateLoginStatus(true);
        
        // Check content type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const responseData = await response.json();
            console.log(`Response data received from ${url}`);
            return responseData;
        } else {
            console.log(`Non-JSON response received from ${url}`);
            return { success: true, message: 'Received non-JSON response' };
        }
    } catch (error) {
        console.error(`API request error for ${endpoint}:`, error);
        throw error;
    }
}

// Function to fetch data from API
async function fetchData() {
    showLoading(true);
    $('#last-update-time').text(new Date().toLocaleTimeString());
    
    try {
        console.log(`Fetching data from API: ${apiBaseUrl}`);
        
        // Parallel requests for all endpoints
        const [fmiacpDataResponse, machineDataResponse, statusData] = await Promise.all([
            makeApiRequest('/api/getFMIACP'),
            makeApiRequest('/api/getFMIACPCurrent'),
            makeApiRequest('/api/getAppStatusFMIACP')
        ]);
        
        // Update global data
        fmiacpData = fmiacpDataResponse;
        fmiacpCurrentData = machineDataResponse;
        
        // Update UI
        updateDashboard();
        renderMachineData();
        renderDataTable();
        updateAppStatus(statusData);
        
        // Update connection status to success
        updateLoginStatus(true);
        
        console.log("All data fetched successfully");
    } catch (error) {
        console.error("Error fetching data:", error);
        displayError("Error fetching data", error.message);
    } finally {
        showLoading(false);
    }
}

// Function to display error message in dashboard
function displayError(message, details = "") {
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

// More functions will be added in additional files 
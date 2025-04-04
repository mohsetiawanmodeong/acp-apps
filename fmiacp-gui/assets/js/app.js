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
    
    // Inisialisasi Bootstrap tabs
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
    
    // Logout button
    $('#logout-btn').on('click', function() {
        sessionStorage.removeItem('credentials');
        updateLoginStatus(false);
        showToast('Info', 'Berhasil logout dari sistem');
    });
    
    // API URL update
    $('#update-api-btn').on('click', function() {
        const newUrl = $('#api-url-input').val().trim();
        if (newUrl) {
            apiBaseUrl = newUrl;
            console.log(`API URL updated to: ${apiBaseUrl}`);
            fetchData();
        }
    });
}

// Initial connection attempt
async function initialConnection() {
    try {
        showLoading(true);
        
        // Log API base URL
        console.log(`Trying to connect to API at: ${apiBaseUrl}`);
        
        await fetchData();
        console.log("Successfully connected to API");
        showLoading(false);
    } catch (error) {
        console.error("Initial connection failed:", error);
        
        // Try alternative ports
        console.log("Attempting to find server on alternative ports...");
        const portSuccess = await tryNextPort();
        
        if (!portSuccess) {
            console.error("Could not find API on any port");
            displayError("Tidak dapat terhubung ke server API", 
                "Sistem tidak dapat menemukan server pada port manapun. Pastikan server berjalan dan dapat diakses. " +
                "Periksa apakah alamat API URL sudah benar.");
            
            // Show toast with troubleshooting info
            showToast("Error", "Koneksi ke API gagal. Klik 'Update' setelah mengubah URL API.");
        }
        
        showLoading(false);
    }
    
    // Start auto-refresh
    startAutoRefresh();
}

// Function to update login status display
function updateLoginStatus(isLoggedIn) {
    const statusElement = $('#login-status');
    
    if (statusElement.length) {
        // Extract port from API URL
        const portMatch = apiBaseUrl.match(/:(\d+)/);
        const port = portMatch ? portMatch[1] : '?';
        
        // Update status text
        statusElement.text(isLoggedIn ? 
            `Tersambung (${apiBaseUrl})` : 
            `Terputus (${apiBaseUrl})`);
            
        // Update class for styling
        statusElement.removeClass('status-connected status-disconnected')
            .addClass(isLoggedIn ? 'status-connected' : 'status-disconnected');
            
        // Update tooltip
        statusElement.attr('title', isLoggedIn ? 
            `Terhubung ke API pada ${apiBaseUrl}` : 
            `Tidak dapat terhubung ke API pada ${apiBaseUrl}`);
            
        // Update logout button visibility
        $('#logout-btn').toggle(isLoggedIn);
        
        // Log status change
        console.log(`Connection status updated: ${isLoggedIn ? 'Connected' : 'Disconnected'} to ${apiBaseUrl}`);
    }
}

// Function to make API requests
async function makeApiRequest(endpoint, method = 'GET', data = null) {
    try {
        // Create authentication header
        const credentials = sessionStorage.getItem('credentials');
        const authHeader = credentials ? 
            `Basic ${credentials}` : 
            `Basic ${btoa('fmiacp:track1nd0')}`;
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            credentials: 'omit' // Omit credentials to avoid CORS preflight issues
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        // Construct proper URL without duplication
        let url = '';
        
        // Make sure apiBaseUrl doesn't end with slash
        const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        
        // Make sure endpoint starts with slash
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        // Combine them
        url = `${baseUrl}${formattedEndpoint}`;
        
        console.log(`Making API request to: ${url} with options:`, options);
        
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
            console.log(`Response data received from ${url}:`, responseData);
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
    
    try {
        console.log(`Fetching data from API: ${apiBaseUrl}`);
        
        // Try endpoints individually to help debug
        let statusData, fmiacpDataResponse, machineDataResponse;
        
        try {
            console.log("Fetching app status...");
            statusData = await makeApiRequest('/api/getAppStatusFMIACP');
            console.log("App status fetched successfully:", statusData);
            
            // Update App Status tab
            if (statusData) {
                updateAppStatus(statusData);
            }
        } catch (error) {
            console.error("Failed to fetch app status:", error);
        }
        
        try {
            console.log("Fetching FMIACP data...");
            // Endpoint yang benar adalah /api/getFMIACP (bukan /api/getFMIACPData)
            const rawFmiacpData = await makeApiRequest('/api/getFMIACP');
            
            // Handle response format
            if (rawFmiacpData && Array.isArray(rawFmiacpData)) {
                fmiacpDataResponse = { data: rawFmiacpData }; // Wrap in data property for backward compatibility
            } else if (rawFmiacpData && rawFmiacpData.data) {
                fmiacpDataResponse = rawFmiacpData; // Already has data property
            } else {
                fmiacpDataResponse = { data: [] }; // Empty data array
            }
            
            console.log(`FMIACP data fetched successfully: ${fmiacpDataResponse.data.length} records`);
        } catch (error) {
            console.error("Failed to fetch FMIACP data:", error);
        }
        
        try {
            console.log("Fetching machine data...");
            // Endpoint yang benar adalah /api/getFMIACPCurrent (bukan /api/getFMIACPCurrentData)
            const rawMachineData = await makeApiRequest('/api/getFMIACPCurrent');
            
            // Handle response format
            if (rawMachineData && Array.isArray(rawMachineData)) {
                machineDataResponse = { data: rawMachineData }; // Wrap in data property for backward compatibility
            } else if (rawMachineData && rawMachineData.data) {
                machineDataResponse = rawMachineData; // Already has data property
            } else {
                machineDataResponse = { data: [] }; // Empty data array
            }
            
            console.log(`Machine data fetched successfully: ${machineDataResponse.data.length} records`);
        } catch (error) {
            console.error("Failed to fetch machine data:", error);
        }
        
        // Update status display
        if (statusData) {
            const status = statusData.Status || 'Unknown';
            $('#app-status').text(status)
                .removeClass()
                .addClass(status === 'Running' ? 'status-running' : 'status-stopped');
        }
        
        // Update FMIACP data
        if (fmiacpDataResponse && Array.isArray(fmiacpDataResponse.data)) {
            fmiacpData = fmiacpDataResponse.data;
            currentPage = 1;
            renderDataTable();
        } else {
            fmiacpData = [];
            renderDataTable();
        }
        
        // Update machine data
        if (machineDataResponse && Array.isArray(machineDataResponse.data)) {
            fmiacpCurrentData = machineDataResponse.data;
            renderMachineData();
        } else {
            fmiacpCurrentData = [];
            renderMachineData();
        }
        
        // Update last updated timestamp
        const now = new Date();
        $('#last-update-time').text(now.toLocaleString());
        
        // Update dashboard counters and charts
        updateDashboard();
        
        showLoading(false);
    } catch (error) {
        console.error("Error fetching data:", error);
        showLoading(false);
        
        // Display error message
        displayError("Gagal mengambil data dari server FMIACP", error.message);
    }
}

// Function to display error message
function displayError(message, details = "") {
    const grid = $('#dashboard-grid');
    if (grid.length) {
        grid.html(`
            <div class="error-container col-12 bg-danger-subtle p-4 rounded border-start border-danger border-4">
                <h4 class="text-danger">Error Koneksi</h4>
                <p>${message}</p>
                <p class="text-danger">${details}</p>
                <div class="error-help mt-3">
                    <p><strong>Langkah-langkah troubleshooting:</strong></p>
                    <ol>
                        <li>Pastikan server FMIACP berjalan (ngrok.exe atau fmiacp.js)</li>
                        <li>Periksa port yang digunakan oleh server (biasanya 4990 atau 50790)</li>
                        <li>Periksa alamat API URL yang telah dikonfigurasi: <code>${apiBaseUrl}</code></li>
                        <li>Ubah URL API jika diperlukan dan klik tombol "Update"</li>
                        <li>Periksa koneksi jaringan Anda dan pastikan dapat mengakses server</li>
                    </ol>
                    <div class="bg-light p-3 rounded">
                        <p><strong>Info Debugging:</strong></p>
                        <p>URL API Saat Ini: <code>${apiBaseUrl}</code></p>
                        <p>Error Detail: <code>${details || "Tidak ada detail error tambahan"}</code></p>
                    </div>
                </div>
            </div>
        `);
    }
    
    // Update counts
    $('#total-machines').text('0');
    $('#active-machines').text('0');
    $('#inactive-machines').text('0');
    $('#total-data-points').text('0');
    
    // Update latest data overview
    $('#latest-data-overview').html(`
        <div class="alert alert-warning">
            <strong>Tidak ada data tersedia.</strong>
            <p>Terjadi error koneksi. Silakan periksa pengaturan API.</p>
        </div>
    `);
}

// Inisialisasi Bootstrap tabs
function initBootstrapTabs() {
    // Cari semua tab triggers dengan atribut data-bs-toggle="tab"
    try {
        const tabTriggerList = document.querySelectorAll('a[data-bs-toggle="tab"]');
        if (tabTriggerList.length > 0) {
            // Inisialisasi semua tab
            tabTriggerList.forEach(tabTriggerEl => {
                new bootstrap.Tab(tabTriggerEl);
            });
            
            // Aktifkan tab pertama
            const firstTab = new bootstrap.Tab(tabTriggerList[0]);
            firstTab.show();
            
            console.log('Bootstrap tabs initialized successfully');
        } else {
            console.warn('No Bootstrap tabs found with data-bs-toggle="tab"');
        }
    } catch (error) {
        console.error('Error initializing Bootstrap tabs:', error);
    }
}

// More functions will be added in additional files 
/**
 * FMIACP Dashboard UI Handlers
 * UI-related functions for FMIACP Dashboard
 */

// Start automatic refresh for data
function startAutoRefresh() {
    // Clear previous timer if exists
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    // Get refresh interval from select
    const interval = parseInt($('#refresh-interval').val(), 10);
    console.log(`Auto-refresh enabled: ${interval}ms interval`);
    
    // Set new timer to refresh data periodically
    refreshTimer = setInterval(refreshDataSmoothly, interval);
    
    // Log to UI - removed auto-refresh notification
    // if (interval >= 1000) {
    //     showToast('Info', `Auto-refresh enabled: ${interval/1000} detik`);
    // }
}

// Function to refresh data smoothly without page flicker
async function refreshDataSmoothly() {
    try {
        // Update last update time
        $('#last-update-time').text(new Date().toLocaleTimeString());
        
        // Fetch data without showing loading overlay
        console.log(`Refreshing data from API: ${apiBaseUrl}`);
        
        // Use Promise.all to fetch all data in parallel
        const [fmiacpDataResponse, machineDataResponse, statusData] = await Promise.all([
            makeApiRequest('/api/getFMIACP'),
            makeApiRequest('/api/getFMIACPCurrent'),
            makeApiRequest('/api/getAppStatusFMIACP')
        ]);
        
        // Update global data
        fmiacpData = fmiacpDataResponse;
        fmiacpCurrentData = machineDataResponse;
        
        // Update UI elements smoothly with animation
        updateUIElementsSmoothly(statusData);
        
        console.log("Data refreshed successfully");
    } catch (error) {
        console.error("Error refreshing data:", error);
        
        // Don't show error directly, just log it
        // This prevents UI disruption during auto-refresh
    }
}

// Update UI elements smoothly with animation
function updateUIElementsSmoothly(statusData) {
    // Update machine counts with animation
    const allMachines = fmiacpCurrentData ? [...new Set(fmiacpCurrentData.map(item => item.MACHINE_NAME))].filter(Boolean) : [];
    const totalMachines = allMachines.length;
    
    // Calculate active machines (updated in the last hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const activeMachines = fmiacpCurrentData ? 
        [...new Set(fmiacpCurrentData
            .filter(item => item.LAST_UPDATE && new Date(item.LAST_UPDATE) > oneHourAgo)
            .map(item => item.MACHINE_NAME))].filter(Boolean).length : 0;
    
    // Calculate count of data points
    const totalDataPoints = fmiacpData ? fmiacpData.length : 0;
    
    // Animate count updates
    animateCountUpdate('#total-machines', totalMachines);
    animateCountUpdate('#active-machines', activeMachines);
    animateCountUpdate('#inactive-machines', totalMachines - activeMachines);
    animateCountUpdate('#total-data-points', totalDataPoints);
    
    // Only update content if we're on the relevant tab
    const activeTabId = $('.tab-pane.active').attr('id');
    
    if (activeTabId === 'dashboard-tab') {
        updateDashboard();
    } else if (activeTabId === 'machine-tab') {
        renderMachineData();
    } else if (activeTabId === 'table-tab') {
        renderDataTable();
    } else if (activeTabId === 'status-tab') {
        updateAppStatus(statusData);
    }
    
    // Update connection status
    updateLoginStatus(true);
}

// Animate count update
function animateCountUpdate(selector, newValue) {
    const element = $(selector);
    const currentValue = parseInt(element.text(), 10) || 0;
    
    if (currentValue !== newValue) {
        // Add highlight animation class
        element.addClass('value-changed');
        
        // Update the value
        element.text(newValue);
        
        // Remove highlight class after animation completes
        setTimeout(() => {
            element.removeClass('value-changed');
        }, 1000);
    }
}

// Function to toggle fullscreen
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Function to download data as CSV
function downloadData() {
    if (fmiacpData.length === 0) {
        showToast('Warning', 'Tidak ada data tersedia untuk diunduh');
        console.warn('Tidak ada data tersedia untuk diunduh');
        return;
    }
    
    // Create CSV content
    const headers = ['ID', 'MACHINE_NAME', 'START_TIME', 'CATEGORY', 'TYPE', 'MEASUREMENT', 'VALUE', 'LAST_UPDATE'];
    
    let csvContent = headers.join(',') + '\n';
    
    fmiacpData.forEach(item => {
        const startTime = item.START_TIME ? new Date(item.START_TIME).toISOString() : '';
        const lastUpdate = item.LAST_UPDATE ? new Date(item.LAST_UPDATE).toISOString() : '';
        
        const row = [
            item.ID,
            `"${item.MACHINE_NAME || ''}"`,
            `"${startTime}"`,
            `"${item.CATEGORY || ''}"`,
            `"${item.TYPE || ''}"`,
            `"${item.MEASUREMENT || ''}"`,
            `"${item.VALUE || ''}"`,
            `"${lastUpdate}"`
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fmiacp_data_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Function to show/hide loading overlay
function showLoading(show) {
    if (show) {
        $('#loading-overlay').fadeIn(300);
    } else {
        $('#loading-overlay').fadeOut(300);
    }
}

// Function to show toast notification
function showToast(type, message) {
    const toastEl = $('#toast-notification');
    
    // Configure toast to autohide after 3 seconds
    const toast = new bootstrap.Toast(toastEl, {
        delay: 3000 // Set toast to display for 3 seconds
    });
    
    // Set toast content
    $('#toast-title').text(type);
    $('#toast-message').text(message);
    
    // Set toast class based on type
    toastEl.removeClass('bg-success bg-danger bg-warning bg-info');
    switch(type.toLowerCase()) {
        case 'success':
            toastEl.addClass('bg-success');
            break;
        case 'error':
            toastEl.addClass('bg-danger');
            break;
        case 'warning':
            toastEl.addClass('bg-warning');
            $('#toast-title').addClass('text-dark');
            $('#toast-message').addClass('text-dark');
            break;
        default:
            toastEl.addClass('bg-info');
    }
    
    // Show toast
    toast.show();
}

// Function to update dashboard display
function updateDashboard() {
    // If no data available, show a message
    if (!fmiacpCurrentData || fmiacpCurrentData.length === 0) {
        $('#total-machines').text('0');
        $('#active-machines').text('0');
        $('#inactive-machines').text('0');
        $('#total-data-points').text('0');
        
        $('#latest-data-overview').html(`
            <div class="alert alert-warning">
                <strong>Tidak ada data tersedia.</strong>
                <p>Pastikan server API berjalan dan terkoneksi ke database.</p>
            </div>
        `);
        
        $('#dashboard-grid').html(`
            <div class="col-12">
                <div class="alert alert-primary">
                    <h5>Tidak Ada Data</h5>
                    <p>Tidak ada data yang tersedia untuk ditampilkan pada dashboard.</p>
                    <p>Periksa koneksi ke server API atau database mungkin kosong.</p>
                </div>
            </div>
        `);
        return;
    }
    
    // Get unique machines
    const machines = [...new Set(fmiacpCurrentData.map(item => item.MACHINE_NAME))];
    
    // Count active and inactive machines
    const activeMachines = machines.filter(machine => {
        const machineData = fmiacpCurrentData.find(item => item.MACHINE_NAME === machine);
        return machineData && new Date(machineData.LAST_UPDATE) > new Date(Date.now() - 3600000); // Active if updated in the last hour
    }).length;
    
    // Update stats
    $('#total-machines').text(machines.length);
    $('#active-machines').text(activeMachines);
    $('#inactive-machines').text(machines.length - activeMachines);
    $('#total-data-points').text(fmiacpData.length);
    
    // Clear dashboard grid
    $('#dashboard-grid').empty();
    
    // Update data overview
    $('#latest-data-overview').html(`
        <div class="row">
            <div class="col-md-4">
                <p><strong>Total Mesin:</strong> ${machines.length}</p>
            </div>
            <div class="col-md-4">
                <p><strong>Kategori Aktif:</strong> ${[...new Set(fmiacpCurrentData.map(item => item.CATEGORY))].length}</p>
            </div>
            <div class="col-md-4">
                <p><strong>Tipe Data:</strong> ${[...new Set(fmiacpCurrentData.map(item => item.TYPE))].length}</p>
            </div>
        </div>
    `);
    
    // Show latest data per machine
    machines.forEach(machine => {
        const machineData = fmiacpCurrentData.filter(item => item.MACHINE_NAME === machine);
        
        // Determine machine status
        const lastUpdate = new Date(Math.max(...machineData.map(item => new Date(item.LAST_UPDATE))));
        const isActive = lastUpdate > new Date(Date.now() - 3600000); // Active if updated in the last hour
        
        const cardHtml = `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <div class="card-header">
                        <h5 class="card-title mb-0">${machine}</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="indicator ${isActive ? 'bg-success' : 'bg-danger'} me-2" 
                                 style="width: 12px; height: 12px; border-radius: 50%;"></div>
                            <span>${isActive ? 'Aktif' : 'Tidak Aktif'}</span>
                        </div>
                        <div class="small text-muted mb-2">Update terakhir: ${lastUpdate.toLocaleString()}</div>
                        <div class="bg-light p-2 rounded small">
                            Jumlah data: ${machineData.length}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        $('#dashboard-grid').append(cardHtml);
    });
}

// Function to render machine data
function renderMachineData() {
    const machineDataList = $('#machine-data-list');
    machineDataList.empty();
    
    // If no data is available, show a message
    if (!fmiacpCurrentData || fmiacpCurrentData.length === 0) {
        machineDataList.html(`
            <div class="col-12">
                <div class="alert alert-primary">
                    <h5>Tidak Ada Data Mesin</h5>
                    <p>Tidak ada data mesin yang tersedia saat ini.</p>
                    <p>Periksa koneksi ke server API atau database mungkin kosong.</p>
                </div>
            </div>
        `);
        return;
    }
    
    // Get unique machines for filter dropdown
    const machines = [...new Set(fmiacpCurrentData.map(item => item.MACHINE_NAME))];
    const machineFilter = $('#machine-filter');
    
    // Clear previous options except the first one
    machineFilter.find('option:not(:first)').remove();
    
    // Add machine options
    machines.forEach(machine => {
        machineFilter.append(new Option(machine, machine));
    });
    
    // Get selected machine filter
    const selectedMachine = machineFilter.val();
    let filteredData = fmiacpCurrentData;
    
    if (selectedMachine !== 'all') {
        filteredData = fmiacpCurrentData.filter(item => item.MACHINE_NAME === selectedMachine);
    }
    
    // Group by machine and type
    const groupedData = {};
    filteredData.forEach(item => {
        const key = `${item.MACHINE_NAME}-${item.TYPE}`;
        if (!groupedData[key]) {
            groupedData[key] = [];
        }
        groupedData[key].push(item);
    });
    
    // If no filtered data, show a message
    if (Object.keys(groupedData).length === 0) {
        machineDataList.html(`
            <div class="col-12">
                <div class="alert alert-warning">
                    <h5>Tidak Ada Data Ditemukan</h5>
                    <p>Tidak ada data mesin yang sesuai dengan filter yang dipilih.</p>
                    <p>Coba pilih filter yang berbeda atau pastikan server API berjalan.</p>
                </div>
            </div>
        `);
        return;
    }
    
    // Create cards for each machine-type combo
    Object.keys(groupedData).forEach(key => {
        const items = groupedData[key];
        const firstItem = items[0];
        
        const lastUpdate = new Date(firstItem.LAST_UPDATE);
        const isRecent = lastUpdate > new Date(Date.now() - 3600000); // Updated in the last hour
        
        const cardHtml = `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card h-100">
                    <div class="card-header">
                        <h5 class="card-title mb-0">${firstItem.MACHINE_NAME} - ${firstItem.TYPE}</h5>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="indicator ${isRecent ? 'bg-success' : 'bg-danger'} me-2" 
                                 style="width: 12px; height: 12px; border-radius: 50%;"></div>
                            <span>${isRecent ? 'Data Terbaru' : 'Data Lama'}</span>
                        </div>
                        <p class="mb-1"><strong>Kategori:</strong> ${firstItem.CATEGORY || '-'}</p>
                        <p class="mb-1"><strong>Pengukuran:</strong> ${firstItem.MEASUREMENT || '-'}</p>
                        <p class="mb-1"><strong>Nilai:</strong> ${firstItem.VALUE || '-'}</p>
                        <div class="small text-muted mt-2">Update terakhir: ${lastUpdate.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
        
        machineDataList.append(cardHtml);
    });
} 
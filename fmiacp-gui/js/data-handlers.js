/**
 * FMIACP Dashboard Data Handlers
 * Data handling functions for FMIACP Dashboard
 */

// Function to render data table
function renderDataTable() {
    const tableBody = $('#fmiacp-table-body');
    tableBody.empty();
    
    // If no data is available, show a message
    if (!fmiacpData || fmiacpData.length === 0) {
        tableBody.html(`
            <tr>
                <td colspan="8" class="text-center p-4">
                    <div class="alert alert-primary d-inline-block text-start">
                        <h5>Tidak Ada Data</h5>
                        <p>Tidak ada data FMIACP yang tersedia.</p>
                        <p>Periksa koneksi ke server API atau database mungkin kosong.</p>
                    </div>
                </td>
            </tr>
        `);
        
        // Update page info
        $('#page-info').text('Page 0 of 0');
        
        // Disable pagination buttons
        $('#prev-page').prop('disabled', true);
        $('#next-page').prop('disabled', true);
        
        return;
    }
    
    // Get filter and search values
    const filterValue = $('#table-filter').val();
    const searchValue = $('#table-search').val().toLowerCase();
    
    // Update category filter if needed
    const categoryFilter = $('#table-filter');
    if (categoryFilter.find('option').length <= 1) {
        const categories = [...new Set(fmiacpData.map(item => item.CATEGORY))];
        categories.forEach(category => {
            if (category) {
                categoryFilter.append(new Option(category, category));
            }
        });
    }
    
    // Filter data
    let filteredData = [...fmiacpData];
    
    if (filterValue !== 'all') {
        filteredData = filteredData.filter(item => item.CATEGORY === filterValue);
    }
    
    if (searchValue) {
        filteredData = filteredData.filter(item => 
            (item.MACHINE_NAME && item.MACHINE_NAME.toLowerCase().includes(searchValue)) ||
            (item.CATEGORY && item.CATEGORY.toLowerCase().includes(searchValue)) ||
            (item.TYPE && item.TYPE.toLowerCase().includes(searchValue)) ||
            (item.MEASUREMENT && item.MEASUREMENT.toLowerCase().includes(searchValue)) ||
            (item.VALUE && item.VALUE.toLowerCase().includes(searchValue))
        );
    }
    
    // If no filtered data, show a message
    if (filteredData.length === 0) {
        tableBody.html(`
            <tr>
                <td colspan="8" class="text-center p-4">
                    <div class="alert alert-warning d-inline-block text-start">
                        <h5>Tidak Ada Data yang Sesuai</h5>
                        <p>Tidak ada data yang cocok dengan filter atau pencarian Anda.</p>
                        <p>Coba ubah kriteria pencarian atau hapus filter.</p>
                    </div>
                </td>
            </tr>
        `);
        
        // Update page info
        $('#page-info').text('Page 0 of 0');
        
        // Disable pagination buttons
        $('#prev-page').prop('disabled', true);
        $('#next-page').prop('disabled', true);
        
        return;
    }
    
    // Sort by ID descending (newest first)
    filteredData.sort((a, b) => b.ID - a.ID);
    
    // Pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pagedData = filteredData.slice(startIndex, endIndex);
    
    // Update page info
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    $('#page-info').text(`Page ${currentPage} of ${totalPages || 1}`);
    
    // Disable/enable pagination buttons
    $('#prev-page').prop('disabled', currentPage === 1);
    $('#next-page').prop('disabled', currentPage >= totalPages);
    
    // Render table rows
    pagedData.forEach(item => {
        const startTime = item.START_TIME ? new Date(item.START_TIME).toLocaleString() : '-';
        const lastUpdate = item.LAST_UPDATE ? new Date(item.LAST_UPDATE).toLocaleString() : '-';
        
        const row = $('<tr>').html(`
            <td>${item.ID}</td>
            <td>${item.MACHINE_NAME || '-'}</td>
            <td>${startTime}</td>
            <td>${item.CATEGORY || '-'}</td>
            <td>${item.TYPE || '-'}</td>
            <td>${item.MEASUREMENT || '-'}</td>
            <td>${item.VALUE || '-'}</td>
            <td>${lastUpdate}</td>
        `);
        
        tableBody.append(row);
    });
}

// Function to update app status display
function updateAppStatus(status) {
    // Update basic app info
    $('#app-name').text(status.Name || '-');
    $('#app-version').text(status.Version || '-');
    
    const dbConnection = status.DatabaseConnection || '-';
    $('#db-connection').text(dbConnection)
        .removeClass('text-success text-danger')
        .addClass(dbConnection === 'Connected' ? 'text-success' : 'text-danger');
    
    // Update data statistics
    $('#data-store-size').text(status.DataStoreSize || 0);
    $('#data-store-count').text(status.DataStoreCount || 0);
    $('#data-store-fail-count').text(status.DataStoreFailCount || 0);
    $('#data-input-count').text(status.DataInputCount || 0);
    $('#data-input-request-count').text(status.DataInputRequestCount || 0);
    $('#data-output-count').text(status.DataOutputCount || 0);
    $('#data-output-request-count').text(status.DataOutputRequestCount || 0);
    
    // Update system usage
    $('#cpu-usage').text(`${status.CPU || 0}%`);
    
    if (status.UsageMemory) {
        const heapTotal = (status.UsageMemory.heapTotal / (1024 * 1024)).toFixed(2);
        const heapUsed = (status.UsageMemory.heapUsed / (1024 * 1024)).toFixed(2);
        $('#memory-usage').text(`Heap: ${heapUsed} MB / ${heapTotal} MB`);
    }
}

// Function to attempt connection to a specific port
async function attemptConnection(port) {
    try {
        const tempUrl = `http://localhost:${port}`;
        console.log(`Mencoba koneksi ke ${tempUrl}/api/getAppStatusFMIACP`);
        
        // Update notification if it exists
        if (window.connectionNotification) {
            window.connectionNotification.text(`Mencoba koneksi ke port ${port}...`);
        }
        
        // Create a promise that will resolve when we get a response
        return new Promise((resolve) => {
            // Direct request to API endpoint for status
            fetch(`${tempUrl}/api/getAppStatusFMIACP`, {
                method: 'GET',
                // Use browser's built-in auth to allow login popup
                credentials: 'include',
                mode: 'cors',
                cache: 'no-cache'
            })
            .then(response => {
                if (response.ok || response.status === 401) {
                    console.log(`Server ditemukan di port ${port} via fetch (status: ${response.status})`);
                    apiBaseUrl = tempUrl;
                    resolve(true);
                    return;
                }
                console.log(`Server merespon dengan status ${response.status} di port ${port}`);
                resolve(false);
            })
            .catch((error) => {
                console.log(`Fetch gagal di port ${port}, server mungkin tidak ada:`, error);
                resolve(false);
            });
            
            // Set timeout
            setTimeout(() => {
                console.log(`Timeout koneksi di port ${port}`);
                resolve(false);
            }, 3000);
        });
    } catch (error) {
        console.error("Error memeriksa port:", error);
        return false;
    }
}

// Function to try multiple ports sequentially
async function tryNextPort() {
    // List of common ports to try
    const commonPorts = [4990, 50790, 8080, 3000, 5000];
    
    // Create notification toast
    window.connectionNotification = $('<div>')
        .addClass('toast-body')
        .text('Mencari port server API...');
    
    // Try ports sequentially
    for (const port of commonPorts) {
        console.log(`Trying to connect to port ${port}...`);
        
        // Update notification
        if (window.connectionNotification) {
            window.connectionNotification.text(`Mencoba koneksi ke port ${port}...`);
        }
        
        const success = await attemptConnection(port);
        if (success) {
            // Update API URL with successful port
            apiBaseUrl = `http://localhost:${port}`;
            $('#api-url-input').val(apiBaseUrl);
            
            console.log(`Successfully connected to port ${port}`);
            
            // Try to fetch data with new URL
            try {
                await fetchData();
                return true;
            } catch (error) {
                console.error("Error fetching data after port detection:", error);
                // Continue trying other ports if data fetch fails
            }
        }
    }
    
    // If all ports failed
    console.error('Failed to connect to any port');
    return false;
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
                    <p>Tidak ada data mesin yang tersedia.</p>
                    <p>Periksa koneksi ke server API atau database mungkin kosong.</p>
                </div>
            </div>
        `);
        
        // Update machine filter
        const machineFilter = $('#machine-filter');
        machineFilter.empty();
        machineFilter.append(new Option('All Machines', 'all'));
        
        return;
    }
    
    // Get filter value
    const filterValue = $('#machine-filter').val();
    
    // Update machine filter if needed
    const machineFilter = $('#machine-filter');
    if (machineFilter.find('option').length <= 1) {
        machineFilter.empty();
        machineFilter.append(new Option('All Machines', 'all'));
        
        // Get unique machine names
        const machines = [...new Set(fmiacpCurrentData.map(item => item.MACHINE_NAME))].sort();
        machines.forEach(machine => {
            if (machine) {
                machineFilter.append(new Option(machine, machine));
            }
        });
    }
    
    // Filter data by machine if needed
    let filteredData = [...fmiacpCurrentData];
    if (filterValue !== 'all') {
        filteredData = filteredData.filter(item => item.MACHINE_NAME === filterValue);
    }
    
    // Group by machine
    const machineGroups = {};
    filteredData.forEach(item => {
        if (!machineGroups[item.MACHINE_NAME]) {
            machineGroups[item.MACHINE_NAME] = [];
        }
        machineGroups[item.MACHINE_NAME].push(item);
    });
    
    // If no filtered data, show a message
    if (Object.keys(machineGroups).length === 0) {
        machineDataList.html(`
            <div class="col-12">
                <div class="alert alert-warning">
                    <h5>Tidak Ada Data yang Sesuai</h5>
                    <p>Tidak ada data yang cocok dengan filter Anda.</p>
                    <p>Coba pilih filter lain atau pilih "All Machines".</p>
                </div>
            </div>
        `);
        return;
    }
    
    // Sort machine names
    const sortedMachineNames = Object.keys(machineGroups).sort();
    
    // Create cards for each machine
    sortedMachineNames.forEach(machineName => {
        const machineItems = machineGroups[machineName];
        
        // Sort items by type
        machineItems.sort((a, b) => {
            if (a.CATEGORY !== b.CATEGORY) {
                return a.CATEGORY.localeCompare(b.CATEGORY);
            }
            return a.TYPE.localeCompare(b.TYPE);
        });
        
        // Determine machine status based on last update time
        const lastUpdate = new Date(Math.max(...machineItems.map(item => new Date(item.LAST_UPDATE))));
        const isActive = lastUpdate > new Date(Date.now() - 3600000); // Active if updated in the last hour
        
        // Create card
        const card = $('<div>').addClass('col-md-6 mb-4').html(`
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">${machineName}</h5>
                    <span class="status-indicator ${isActive ? 'status-active' : 'status-inactive'}">
                        ${isActive ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                </div>
                <div class="card-body">
                    <div class="mb-2">
                        <small class="text-muted">Update terakhir: ${lastUpdate.toLocaleString()}</small>
                    </div>
                    <div class="machine-data-items">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Kategori</th>
                                    <th>Tipe</th>
                                    <th>Pengukuran</th>
                                    <th>Nilai</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${machineItems.map(item => `
                                    <tr>
                                        <td>${item.CATEGORY || '-'}</td>
                                        <td>${item.TYPE || '-'}</td>
                                        <td>${item.MEASUREMENT || '-'}</td>
                                        <td>${item.VALUE || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `);
        
        machineDataList.append(card);
    });
}

// Function to update dashboard
function updateDashboard() {
    // Get machine counts
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
    
    // Update stats
    $('#total-machines').text(totalMachines);
    $('#active-machines').text(activeMachines);
    $('#inactive-machines').text(totalMachines - activeMachines);
    $('#total-data-points').text(totalDataPoints);
    
    // Update data overview
    const dataOverview = $('#latest-data-overview');
    
    if (!fmiacpCurrentData || fmiacpCurrentData.length === 0) {
        // Show message if no data available
        dataOverview.html(`
            <div class="alert alert-warning">
                <h5>Tidak ada data tersedia.</h5>
                <p>Pastikan server API berjalan dan terkoneksi ke database.</p>
            </div>
        `);
        
        // Set dashboard grid message
        $('#dashboard-grid').html(`
            <div class="col-12">
                <div class="card">
                    <div class="card-body">
                        <div class="alert alert-primary mb-0">
                            <h5>Tidak Ada Data</h5>
                            <p>Tidak ada data yang tersedia untuk ditampilkan pada dashboard.</p>
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        return;
    }
    
    // Get recent machine data overview
    const totalAktif = fmiacpCurrentData.filter(item => 
        item.LAST_UPDATE && new Date(item.LAST_UPDATE) > oneHourAgo).length;
        
    // Get types of data
    const dataTypes = [...new Set(fmiacpCurrentData.map(item => item.TYPE))].filter(Boolean).length;
    
    // Update data overview
    dataOverview.html(`
        <div class="row mb-2">
            <div class="col-md-4">
                <strong>Total Mesin:</strong> ${totalMachines}
            </div>
            <div class="col-md-4">
                <strong>Kategori Aktif:</strong> ${dataTypes}
            </div>
            <div class="col-md-4">
                <strong>Tipe Data:</strong> ${dataTypes}
            </div>
        </div>
    `);
    
    // Update dashboard grid with machine cards
    const dashboardGrid = $('#dashboard-grid');
    dashboardGrid.empty();
    
    // Get most recent updates for each machine
    const machineUpdates = {};
    fmiacpCurrentData.forEach(item => {
        if (!machineUpdates[item.MACHINE_NAME] || 
            (item.LAST_UPDATE && new Date(item.LAST_UPDATE) > new Date(machineUpdates[item.MACHINE_NAME].LAST_UPDATE))) {
            machineUpdates[item.MACHINE_NAME] = item;
        }
    });
    
    // Sort machines by name
    const machineNames = Object.keys(machineUpdates).sort();
    
    // Create machine cards
    machineNames.forEach(machineName => {
        const machineData = machineUpdates[machineName];
        const isActive = machineData.LAST_UPDATE && new Date(machineData.LAST_UPDATE) > oneHourAgo;
        const updateTime = machineData.LAST_UPDATE ? new Date(machineData.LAST_UPDATE).toLocaleString() : 'Unknown';
        
        // Count data points for this machine
        const dataCount = fmiacpData ? fmiacpData.filter(item => item.MACHINE_NAME === machineName).length : 0;
        
        // Create card
        const card = $('<div>').addClass('col-md-4 mb-4').html(`
            <div class="card h-100">
                <div class="card-header">
                    <h5 class="card-title mb-0">${machineName}</h5>
                </div>
                <div class="card-body">
                    <div class="status-badge ${isActive ? 'status-online' : 'status-offline'} mb-3">
                        ${isActive ? 'Aktif' : 'Tidak Aktif'}
                    </div>
                    <p><strong>Update terakhir:</strong> ${updateTime}</p>
                    <p><strong>Jumlah data:</strong> ${dataCount}</p>
                </div>
            </div>
        `);
        
        dashboardGrid.append(card);
    });
} 
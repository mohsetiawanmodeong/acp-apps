/**
 * FMIACP Dashboard Data Handlers
 * Data handling functions for FMIACP Dashboard
 */

// Use the rowsPerPage from app.js to avoid duplicate declaration

// Function to render data table
function renderDataTable() {
    const tableBody = $('#data-table tbody');
    
    // Destroy existing DataTable if it exists
    if ($.fn.DataTable.isDataTable('#data-table')) {
        $('#data-table').DataTable().destroy();
    }
    
    // Clear the table
    tableBody.empty();
    
    // Check if we have FMIACP data
    if (!fmiacpData || fmiacpData.length === 0) {
        tableBody.append('<tr><td colspan="9" class="text-center">No data available</td></tr>');
        return;
    }
    
    // Get filter values
    const machineFilter = $('#machine-name-filter').val();
    const typeFilter = $('#type-filter').val();
    const valueFilter = $('#value-filter').val();
    
    // Apply filters to the data
    let filteredData = fmiacpData;
    
    if (machineFilter) {
        filteredData = filteredData.filter(item => item.MACHINE_NAME === machineFilter);
    }
    
    if (typeFilter) {
        filteredData = filteredData.filter(item => item.TYPE === typeFilter);
    }
    
    if (valueFilter) {
        filteredData = filteredData.filter(item => item.VALUE === valueFilter);
    }
    
    // Handle no matching data
    if (filteredData.length === 0) {
        tableBody.append('<tr><td colspan="9" class="text-center">No data matches the selected filters</td></tr>');
        return;
    }
    
    // Populate the table with the filtered data
    filteredData.forEach(item => {
        // Format the value with appropriate styling and badge
        let valueBadge = '';
        if (item.VALUE === '1') {
            valueBadge = '<span class="badge bg-success">ON</span>';
        } else if (item.VALUE === '0') {
            valueBadge = '<span class="badge bg-danger">OFF</span>';
        } else {
            valueBadge = item.VALUE || 'N/A';
        }
        
        const rowHtml = `<tr>
            <td>${item.ID || 'N/A'}</td>
            <td>${item.MACHINE_NAME || 'N/A'}</td>
            <td>${item.START_TIME ? new Date(item.START_TIME).toLocaleString() : 'N/A'}</td>
            <td>${item.CATEGORY || 'N/A'}</td>
            <td>${item.TYPE || 'N/A'}</td>
            <td>${item.MEASUREMENT || 'N/A'}</td>
            <td>${valueBadge}</td>
            <td>${item.LAST_UPDATE ? new Date(item.LAST_UPDATE).toLocaleString() : 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary view-details" data-machine="${item.MACHINE_NAME}">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        </tr>`;
        tableBody.append(rowHtml);
    });
    
    // Initialize DataTable with improved configuration
    $('#data-table').DataTable({
        "paging": true,
        "ordering": true,
        "info": true,
        "searching": true,
        "lengthChange": true,
        "lengthMenu": [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
        "pageLength": rowsPerPage, // Use the global rowsPerPage variable
        "language": {
            "info": "Showing _START_ to _END_ of _TOTAL_ entries",
            "infoEmpty": "Showing 0 to 0 of 0 entries",
            "search": "Search:",
            "lengthMenu": "Show _MENU_ entries",
            "paginate": {
                "first": "First",
                "last": "Last",
                "next": "Next",
                "previous": "Previous"
            }
        },
        "responsive": true,
        "autoWidth": false,
        "stateSave": true,
        "order": [[0, "asc"]], // Sort by ID column by default
        "drawCallback": function() {
            // Add event handlers for detail buttons after each draw
            $('#data-table tbody').on('click', '.view-details', function() {
                const machineName = $(this).data('machine');
                showMachineDetails(machineName);
            });
        }
    });
}

// Function to update table filters when data is loaded
function updateTableFilters() {
    // Skip if no data
    if (!fmiacpData || fmiacpData.length === 0) return;
    
    // Update machine name filter
    const machineSelect = $('#machine-name-filter');
    if (machineSelect.find('option').length <= 1) {
        machineSelect.empty().append('<option value="">All Machines</option>');
        const machineNames = [...new Set(fmiacpData.map(item => item.MACHINE_NAME))].filter(Boolean).sort();
        machineNames.forEach(name => {
            machineSelect.append(`<option value="${name}">${name}</option>`);
        });
    }
    
    // Update type filter
    const typeSelect = $('#type-filter');
    if (typeSelect.find('option').length <= 1) {
        typeSelect.empty().append('<option value="">All Types</option>');
        const types = [...new Set(fmiacpData.map(item => item.TYPE))].filter(Boolean).sort();
        types.forEach(type => {
            typeSelect.append(`<option value="${type}">${type}</option>`);
        });
    }
    
    // Set up custom filter handlers for DataTables
    if ($.fn.DataTable.isDataTable('#data-table')) {
        // Apply filters when they change
        $('#machine-name-filter, #type-filter, #value-filter').off('change').on('change', function() {
            // Just re-render the table with the new filters
            renderDataTable();
        });
    }
}

// Function to update app status display
function updateAppStatus(status) {
    // Set flag to indicate this function is defined
    window.updateAppStatusDefined = true;
    
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
    if (!fmiacpCurrentData || fmiacpCurrentData.length === 0) {
        $('#dashboard-grid').html('<div class="col-12"><div class="card"><div class="card-body text-center"><p>No machine data available</p></div></div></div>');
        return;
    }
    
    // Generate summary metrics
    const summaryData = generateSummaryData();
    
    // Update the data overview section with summary charts
    updateDataOverview(summaryData);
    
    // Get unique machine names
    const machineNames = [...new Set(fmiacpCurrentData.map(item => item.MACHINE_NAME))].filter(Boolean);
    
    // Clear existing grid
    $('#dashboard-grid').empty();
    
    // Add title for machine cards section
    $('#dashboard-grid').append('<div class="col-12 mb-3"><h5>Machine Status Cards</h5></div>');
    
    // Add machine cards
    machineNames.forEach(machineName => {
        // Get data for this machine
        const machineData = fmiacpCurrentData.filter(item => item.MACHINE_NAME === machineName);
        
        // Calculate online status
        const onlineStatus = machineData.some(item => 
            item.MEASUREMENT === 'ONLINE' && item.VALUE === '1');
        
        // Get latest update time
        const updateTimes = machineData
            .map(item => item.LAST_UPDATE ? new Date(item.LAST_UPDATE) : null)
            .filter(Boolean);
        
        const latestUpdate = updateTimes.length > 0 ? 
            new Date(Math.max(...updateTimes.map(d => d.getTime()))) : null;
        
        // Create machine card with improved styling
        const card = $(`
            <div class="col-md-4 mb-3">
                <div class="card h-100 ${onlineStatus ? 'border-success' : 'border-danger'}">
                    <div class="card-header ${onlineStatus ? 'bg-success text-white' : 'bg-danger text-white'}">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">${machineName}</h5>
                            <span class="badge bg-light text-dark rounded-pill">
                                ${machineData.length} signals
                            </span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <div class="d-flex justify-content-between">
                                <span>Status:</span>
                                <span class="fw-bold ${onlineStatus ? 'text-success' : 'text-danger'}">
                                    ${onlineStatus ? 'ONLINE' : 'OFFLINE'}
                                </span>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between">
                                <span>Last Update:</span>
                                <span>${latestUpdate ? latestUpdate.toLocaleString() : 'N/A'}</span>
                            </div>
                        </div>
                        <div class="signal-summary">
                            <h6 class="border-top pt-2">Signal Summary</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>Measurement</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${generateSignalTableRows(machineData)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-primary view-details-btn" 
                            data-machine="${machineName}">
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        `);
        
        // Add event listener to the "View Details" button
        card.find('.view-details-btn').on('click', function() {
            const machineName = $(this).data('machine');
            // Switch to machine tab and filter by this machine
            $('a[data-bs-toggle="pill"][href="#machine-tab"]').tab('show');
            $('#machine-filter').val(machineName).trigger('change');
        });
        
        dashboardGrid.append(card);
    });
    
    // Add click handlers for the machine cards
    setupMachineCardHandlers();
}

// Generate HTML for signal table rows
function generateSignalTableRows(machineData) {
    let rows = '';
    
    // Get unique signal types
    const uniqueSignals = [...new Set(machineData.map(item => 
        `${item.TYPE}|${item.MEASUREMENT}`))];
    
    // Display at most 5 signals in the card
    const displaySignals = uniqueSignals.slice(0, 5);
    
    displaySignals.forEach(signalKey => {
        const [type, measurement] = signalKey.split('|');
        // Find the latest data for this signal
        const signalData = machineData
            .filter(item => item.TYPE === type && item.MEASUREMENT === measurement)
            .sort((a, b) => {
                const dateA = a.LAST_UPDATE ? new Date(a.LAST_UPDATE) : new Date(0);
                const dateB = b.LAST_UPDATE ? new Date(b.LAST_UPDATE) : new Date(0);
                return dateB - dateA;
            });
        
        if (signalData.length > 0) {
            const latestSignal = signalData[0];
            
            // Determine the status class based on value
            let valueClass = '';
            if (latestSignal.VALUE === '1') {
                valueClass = 'text-success';
            } else if (latestSignal.VALUE === '0') {
                valueClass = 'text-danger';
            }
            
            rows += `
                <tr>
                    <td>${type}</td>
                    <td>${measurement}</td>
                    <td class="${valueClass} fw-bold">${latestSignal.VALUE}</td>
                </tr>
            `;
        }
    });
    
    // If there are more signals than we're displaying
    if (uniqueSignals.length > 5) {
        rows += `
            <tr>
                <td colspan="3" class="text-center">
                    <span class="text-muted">+ ${uniqueSignals.length - 5} more signals</span>
                </td>
            </tr>
        `;
    }
    
    return rows || '<tr><td colspan="3" class="text-center">No signal data</td></tr>';
}

// Generate summary data for dashboard overview
function generateSummaryData() {
    const summaryData = {
        totalMachines: 0,
        activeMachines: 0,
        signalsByType: {},
        valueDistribution: {
            '0': 0,
            '1': 0,
            'other': 0
        },
        timeSeriesData: [],
        categoryDistribution: {}
    };
    
    if (!fmiacpData || fmiacpData.length === 0) {
        return summaryData;
    }
    
    // Get unique machine names
    const machineNames = [...new Set(fmiacpCurrentData.map(item => item.MACHINE_NAME))].filter(Boolean);
    summaryData.totalMachines = machineNames.length;
    
    // Calculate active machines (with at least one signal value of 1)
    summaryData.activeMachines = machineNames.filter(machineName => {
        return fmiacpCurrentData.some(item => 
            item.MACHINE_NAME === machineName && 
            item.MEASUREMENT === 'ONLINE' && 
            item.VALUE === '1');
    }).length;
    
    // Count signals by type
    fmiacpData.forEach(item => {
        // Count by type
        if (!summaryData.signalsByType[item.TYPE]) {
            summaryData.signalsByType[item.TYPE] = 0;
        }
        summaryData.signalsByType[item.TYPE]++;
        
        // Count value distribution
        if (item.VALUE === '0') {
            summaryData.valueDistribution['0']++;
        } else if (item.VALUE === '1') {
            summaryData.valueDistribution['1']++;
        } else {
            summaryData.valueDistribution['other']++;
        }
        
        // Count by category
        if (!summaryData.categoryDistribution[item.CATEGORY]) {
            summaryData.categoryDistribution[item.CATEGORY] = 0;
        }
        summaryData.categoryDistribution[item.CATEGORY]++;
    });
    
    // Process time series data (group by day)
    const timeData = {};
    fmiacpData.forEach(item => {
        if (item.START_TIME) {
            const date = new Date(item.START_TIME);
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            
            if (!timeData[dateKey]) {
                timeData[dateKey] = {
                    date: dateKey,
                    count: 0,
                    valueOne: 0
                };
            }
            
            timeData[dateKey].count++;
            
            if (item.VALUE === '1') {
                timeData[dateKey].valueOne++;
            }
        }
    });
    
    // Convert time data to array and sort by date
    summaryData.timeSeriesData = Object.values(timeData).sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });
    
    return summaryData;
}

// Store chart instances globally to update instead of recreate
let valueDistributionChart = null;
let categoryDistributionChart = null;
let signalTypesChart = null;
let timeSeriesChart = null;

// Update the dashboard overview section with summary charts
function updateDataOverview(summaryData) {
    const overviewSection = $('#latest-data-overview');
    
    // If first time, create the container for the charts
    if (!document.getElementById('value-distribution-chart')) {
        const content = `
            <div class="row">
                <div class="col-md-4 mb-3">
                    <h6 class="border-bottom pb-2">Value Distribution</h6>
                    <canvas id="value-distribution-chart" height="200"></canvas>
                </div>
                <div class="col-md-4 mb-3">
                    <h6 class="border-bottom pb-2">Category Distribution</h6>
                    <canvas id="category-distribution-chart" height="200"></canvas>
                </div>
                <div class="col-md-4 mb-3">
                    <h6 class="border-bottom pb-2">Signal Types</h6>
                    <canvas id="signal-types-chart" height="200"></canvas>
                </div>
                    </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6 class="border-bottom pb-2">Data Trend Over Time</h6>
                    <canvas id="time-series-chart" height="150"></canvas>
                </div>
            </div>
        `;
        
        overviewSection.html(content);
    }
    
    // Draw or update charts if the Chart.js library is loaded
    if (typeof Chart !== 'undefined') {
        // Value distribution chart
        updateValueDistributionChart(summaryData);
        
        // Category distribution chart
        updateCategoryDistributionChart(summaryData);
        
        // Signal types chart
        updateSignalTypesChart(summaryData);
        
        // Time series chart
        updateTimeSeriesChart(summaryData);
    } else {
        // If Chart.js is not loaded, display a text summary instead
        overviewSection.html(`
            <div class="alert alert-info">
                <p>Chart.js library is not loaded. Add it to enable data visualization.</p>
                <p>Summary: ${summaryData.totalMachines} machines, ${summaryData.activeMachines} active.</p>
                <p>Values: ${summaryData.valueDistribution['1']} ON signals, ${summaryData.valueDistribution['0']} OFF signals.</p>
            </div>
        `);
    }
}

// Update value distribution chart
function updateValueDistributionChart(summaryData) {
    const valueCtx = document.getElementById('value-distribution-chart').getContext('2d');
    
    if (valueDistributionChart) {
        // Update existing chart
        valueDistributionChart.data.datasets[0].data = [
            summaryData.valueDistribution['0'],
            summaryData.valueDistribution['1'],
            summaryData.valueDistribution['other']
        ];
        valueDistributionChart.update('none'); // Use 'none' mode for smoother updates
    } else {
        // Create new chart
        valueDistributionChart = new Chart(valueCtx, {
            type: 'pie',
            data: {
                labels: ['OFF (0)', 'ON (1)', 'Other'],
                datasets: [{
                    data: [
                        summaryData.valueDistribution['0'],
                        summaryData.valueDistribution['1'],
                        summaryData.valueDistribution['other']
                    ],
                    backgroundColor: ['#dc3545', '#198754', '#6c757d']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500 // Shorter animation for updates
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Update category distribution chart
function updateCategoryDistributionChart(summaryData) {
    const categoryCtx = document.getElementById('category-distribution-chart').getContext('2d');
    const categories = Object.keys(summaryData.categoryDistribution);
    const categoryValues = Object.values(summaryData.categoryDistribution);
    
    if (categoryDistributionChart) {
        // Check if labels are the same
        const labelsMatch = arraysEqual(categoryDistributionChart.data.labels, categories);
        
        if (labelsMatch) {
            // Just update the data
            categoryDistributionChart.data.datasets[0].data = categoryValues;
            categoryDistributionChart.update('none');
        } else {
            // Destroy and recreate if categories changed
            categoryDistributionChart.destroy();
            categoryDistributionChart = null;
            
            // Create new chart
            categoryDistributionChart = new Chart(categoryCtx, {
                type: 'bar',
                data: {
                    labels: categories,
                    datasets: [{
                        label: 'Signals',
                        data: categoryValues,
                        backgroundColor: '#0d6efd'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    } else {
        // Create new chart
        categoryDistributionChart = new Chart(categoryCtx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Signals',
                    data: categoryValues,
                    backgroundColor: '#0d6efd'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Update signal types chart
function updateSignalTypesChart(summaryData) {
    const typeCtx = document.getElementById('signal-types-chart').getContext('2d');
    const signalTypes = Object.keys(summaryData.signalsByType);
    const signalValues = Object.values(summaryData.signalsByType);
    
    if (signalTypesChart) {
        // Check if labels are the same
        const labelsMatch = arraysEqual(signalTypesChart.data.labels, signalTypes);
        
        if (labelsMatch) {
            // Just update the data
            signalTypesChart.data.datasets[0].data = signalValues;
            signalTypesChart.update('none');
        } else {
            // Destroy and recreate if types changed
            signalTypesChart.destroy();
            signalTypesChart = null;
            
            // Create new chart
            signalTypesChart = new Chart(typeCtx, {
                type: 'doughnut',
                data: {
                    labels: signalTypes,
                    datasets: [{
                        data: signalValues,
                        backgroundColor: [
                            '#0d6efd', '#6610f2', '#6f42c1', '#d63384', 
                            '#dc3545', '#fd7e14', '#ffc107', '#198754'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            display: true
                        }
                    }
                }
            });
        }
    } else {
        // Create new chart
        signalTypesChart = new Chart(typeCtx, {
            type: 'doughnut',
            data: {
                labels: signalTypes,
                datasets: [{
                    data: signalValues,
                    backgroundColor: [
                        '#0d6efd', '#6610f2', '#6f42c1', '#d63384', 
                        '#dc3545', '#fd7e14', '#ffc107', '#198754'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        display: true
                    }
                }
            }
        });
    }
}

// Update time series chart
function updateTimeSeriesChart(summaryData) {
    const timeCtx = document.getElementById('time-series-chart').getContext('2d');
    const timeLabels = summaryData.timeSeriesData.map(d => d.date);
    const countData = summaryData.timeSeriesData.map(d => d.count);
    const valueOneData = summaryData.timeSeriesData.map(d => d.valueOne);
    
    if (timeSeriesChart) {
        // Check if labels are the same
        const labelsMatch = arraysEqual(timeSeriesChart.data.labels, timeLabels);
        
        if (labelsMatch) {
            // Just update the data
            timeSeriesChart.data.datasets[0].data = countData;
            timeSeriesChart.data.datasets[1].data = valueOneData;
            timeSeriesChart.update('none');
        } else {
            // Destroy and recreate if time range changed
            timeSeriesChart.destroy();
            timeSeriesChart = null;
            
            // Create new chart
            timeSeriesChart = new Chart(timeCtx, {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [
                        {
                            label: 'Total Signals',
                            data: countData,
                            borderColor: '#0d6efd',
                            backgroundColor: 'rgba(13, 110, 253, 0.1)',
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Value = 1 (ON)',
                            data: valueOneData,
                            borderColor: '#198754',
                            borderWidth: 2,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 500
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    } else {
        // Create new chart
        timeSeriesChart = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: timeLabels,
                datasets: [
                    {
                        label: 'Total Signals',
                        data: countData,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 2,
                        fill: true
                    },
                    {
                        label: 'Value = 1 (ON)',
                        data: valueOneData,
                        borderColor: '#198754',
                        borderWidth: 2,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Helper function to compare arrays
function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Set up event handlers for machine cards
function setupMachineCardHandlers() {
    $('.view-details-btn').off('click').on('click', function() {
        const machineName = $(this).data('machine');
        // Switch to machine tab and filter by this machine
        $('a[data-bs-toggle="pill"][href="#machine-tab"]').tab('show');
        $('#machine-filter').val(machineName).trigger('change');
    });
}

// Function to show machine details when view button is clicked
function showMachineDetails(machineName) {
    if (!machineName || !fmiacpCurrentData) return;
    
    // Filter data for the selected machine
    const machineData = fmiacpCurrentData.filter(item => item.MACHINE_NAME === machineName);
    
    if (machineData.length === 0) {
        showToast('Error', `No data found for machine ${machineName}`, 'error');
        return;
    }
    
    // Create modal if it doesn't exist
    if (!$('#machine-details-modal').length) {
        const modal = `
        <div class="modal fade" id="machine-details-modal" tabindex="-1" aria-labelledby="machine-details-title" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="machine-details-title">Machine Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div id="machine-details-content">
                            <!-- Content will be dynamically inserted here -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        `;
        $('body').append(modal);
    }
    
    // Update modal title
    $('#machine-details-title').text(`Machine Details: ${machineName}`);
    
    // Get the latest update time
    const updateTimes = machineData
        .map(item => item.LAST_UPDATE ? new Date(item.LAST_UPDATE) : null)
        .filter(Boolean);
    
    const latestUpdate = updateTimes.length > 0 ? 
        new Date(Math.max(...updateTimes.map(d => d.getTime()))) : null;
    
    // Determine online status
    const onlineStatus = machineData.some(item => 
        item.MEASUREMENT === 'ONLINE' && item.VALUE === '1');
    
    // Group data by category
    const categories = {};
    machineData.forEach(item => {
        if (!categories[item.CATEGORY]) {
            categories[item.CATEGORY] = [];
        }
        categories[item.CATEGORY].push(item);
    });
    
    // Generate content for modal
    let content = `
        <div class="mb-3">
            <div class="d-flex justify-content-between">
                <span>Status:</span>
                <span class="fw-bold ${onlineStatus ? 'text-success' : 'text-danger'}">
                    ${onlineStatus ? 'ONLINE' : 'OFFLINE'}
                </span>
            </div>
            <div class="d-flex justify-content-between">
                <span>Last Update:</span>
                <span>${latestUpdate ? latestUpdate.toLocaleString() : 'N/A'}</span>
            </div>
        </div>
    `;
    
    // Add tabs for each category
    if (Object.keys(categories).length > 0) {
        content += `
            <ul class="nav nav-tabs" id="machineDetailsTabs" role="tablist">
                ${Object.keys(categories).map((category, index) => `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link ${index === 0 ? 'active' : ''}" 
                            id="tab-${category.toLowerCase()}" 
                            data-bs-toggle="tab" 
                            data-bs-target="#content-${category.toLowerCase()}" 
                            type="button" 
                            role="tab" 
                            aria-controls="content-${category.toLowerCase()}" 
                            aria-selected="${index === 0}">
                            ${category}
                        </button>
                    </li>
                `).join('')}
            </ul>
            <div class="tab-content mt-3" id="machineTabContent">
                ${Object.keys(categories).map((category, index) => `
                    <div class="tab-pane fade ${index === 0 ? 'show active' : ''}" 
                        id="content-${category.toLowerCase()}" 
                        role="tabpanel" 
                        aria-labelledby="tab-${category.toLowerCase()}">
                        <table class="table table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Measurement</th>
                                    <th>Value</th>
                                    <th>Last Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${categories[category].map(item => `
                                    <tr>
                                        <td>${item.TYPE || '-'}</td>
                                        <td>${item.MEASUREMENT || '-'}</td>
                                        <td class="${item.VALUE === '1' ? 'text-success' : (item.VALUE === '0' ? 'text-danger' : '')}">
                                            ${item.VALUE || '-'}
                                        </td>
                                        <td>${item.LAST_UPDATE ? new Date(item.LAST_UPDATE).toLocaleString() : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        content += '<div class="alert alert-info">No detailed data available for this machine.</div>';
    }
    
    // Update modal content
    $('#machine-details-content').html(content);
    
    // Show the modal
    const modalElement = document.getElementById('machine-details-modal');
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
} 
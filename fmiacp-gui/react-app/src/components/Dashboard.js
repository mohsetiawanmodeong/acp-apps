import React, { useState, useEffect, useRef } from 'react';
import { Badge, Table } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title
);

// Helper function to get stored filter values from localStorage
const getStoredFilter = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error("Error retrieving stored filter:", error);
    return defaultValue;
  }
};

// Helper function to store filter values in localStorage
const storeFilter = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Error storing filter:", error);
  }
};

const Dashboard = ({ data = [], loading, lastUpdate, onRefresh }) => {
  // Default date values
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  
  const defaultDateRange = {
    startDate: yesterday,
    endDate: today
  };
  
  // Initial state values from localStorage for persistence
  const [machineStats, setMachineStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    dataPoints: 0
  });

  const [machineTypesData, setMachineTypesData] = useState({
    labels: [],
    counts: [],
  });

  const [statusDistribution, setStatusDistribution] = useState({
    labels: ['ON', 'OFF'],
    counts: [0, 0]
  });

  // eslint-disable-next-line no-unused-vars
  const [activityTimeline, setActivityTimeline] = useState({
    labels: [],
    datasets: []
  });
  
  // eslint-disable-next-line no-unused-vars
  const [machineTrends, setMachineTrends] = useState({
    labels: [],
    datasets: []
  });
  
  const [topProblematicMachines, setTopProblematicMachines] = useState([]);

  // Load stored filters from localStorage
  const [dateRange, setDateRange] = useState(getStoredFilter('machineTrendsFilter', defaultDateRange));
  
  const [filteredMachineTrends, setFilteredMachineTrends] = useState({
    labels: [],
    datasets: []
  });

  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  const refreshTimerRef = useRef(null);

  // Load activity timeline filter from localStorage
  const [activityTimelineFilter, setActivityTimelineFilter] = useState(
    getStoredFilter('activityTimelineFilter', defaultDateRange)
  );

  const [filteredActivityTimeline, setFilteredActivityTimeline] = useState({
    labels: [],
    datasets: []
  });

  // Set up auto refresh
  useEffect(() => {
    // Initial refresh
    if (onRefresh) {
      // Start auto-refresh timer for every 10 seconds
      refreshTimerRef.current = setInterval(() => {
        onRefresh();
        setLastRefreshed(new Date().toLocaleTimeString());
      }, 10000); // 10 seconds
    }

    return () => {
      // Clean up timer on component unmount
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [onRefresh]);

  // Effect for updating localStorage when filters change
  useEffect(() => {
    storeFilter('machineTrendsFilter', dateRange);
  }, [dateRange]);

  useEffect(() => {
    storeFilter('activityTimelineFilter', activityTimelineFilter);
  }, [activityTimelineFilter]);

  useEffect(() => {
    if (data && data.length > 0) {
      // Calculate machine statistics
      const uniqueMachines = [...new Set(data.map(item => item.MACHINE_NAME))];
      const activeMachines = [...new Set(data.filter(item => item.VALUE === '1' || item.VALUE === 1).map(item => item.MACHINE_NAME))];
      
      // Set machine stats
      setMachineStats({
        total: uniqueMachines.length,
        active: activeMachines.length,
        inactive: uniqueMachines.length - activeMachines.length,
        dataPoints: data.length
      });

      // Update last refreshed time when data changes
      setLastRefreshed(new Date().toLocaleTimeString());

      // Calculate machine types data
      const types = [...new Set(data.map(item => item.TYPE))];
      const typeCounts = types.map(type => {
        return data.filter(item => item.TYPE === type).length;
      });
      
      setMachineTypesData({
        labels: types,
        counts: typeCounts
      });

      // Calculate status distribution
      const onCount = data.filter(item => item.VALUE === '1' || item.VALUE === 1).length;
      const offCount = data.filter(item => item.VALUE === '0' || item.VALUE === 0).length;
      
      setStatusDistribution({
        labels: ['ON', 'OFF'],
        counts: [onCount, offCount]
      });

      // Create timeline data - group by hour
      const last24Hours = [];
      const now = new Date();
      
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - i);
        last24Hours.push(hour);
      }

      const timeLabels = last24Hours.map(date => `${date.getHours()}:00`);
      
      // Create datasets for different machine types
      const topTypes = types.slice(0, 3); // Take top 3 machine types
      const datasets = topTypes.map((type, index) => {
        const color = index === 0 ? '#4e73df' : index === 1 ? '#1cc88a' : '#36b9cc';
        
        const hourData = last24Hours.map(hour => {
          const startOfHour = new Date(hour);
          const endOfHour = new Date(hour);
          endOfHour.setHours(hour.getHours() + 1);
          
          // Count entries of this type in this hour
          return data.filter(item => {
            const itemDate = new Date(item.START_TIME || item.TIMESTAMP);
            return item.TYPE === type && 
                   itemDate >= startOfHour && 
                   itemDate < endOfHour;
          }).length;
        });
        
        return {
          label: type,
          data: hourData,
          borderColor: color,
          backgroundColor: `${color}80`,
          tension: 0.3,
          fill: false
        };
      });
      
      setActivityTimeline({
        labels: timeLabels,
        datasets: datasets
      });
      
      // CREATE MACHINE TREND DATA
      // Get top 5 machines for trend analysis
      const machineEventCounts = {};
      uniqueMachines.forEach(machine => {
        machineEventCounts[machine] = data.filter(item => item.MACHINE_NAME === machine).length;
      });
      
      // Sort machines by event count and get top 5
      const topMachines = Object.keys(machineEventCounts)
        .sort((a, b) => machineEventCounts[b] - machineEventCounts[a])
        .slice(0, 5);
      
      // Create trend datasets for top machines
      const machineTrendDatasets = generateMachineTrendData(topMachines, data);
      
      // Store machine trends data (for potential future use)
      // eslint-disable-next-line no-unused-vars
      setMachineTrends({
        labels: generateTimeLabels(),
        datasets: machineTrendDatasets
      });
      
      // Check if we have active date filters and apply them to the new data
      const hasCustomDateRange = 
        dateRange.startDate !== new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] ||
        dateRange.endDate !== new Date().toISOString().split('T')[0];
      
      // If we have custom date range, apply it to the new data
      if (hasCustomDateRange) {
        const filteredLabels = generateTimeLabels(dateRange.startDate, dateRange.endDate);
        const filteredDatasets = generateMachineTrendData(topMachines, data, dateRange.startDate, dateRange.endDate);
        
        setFilteredMachineTrends({
          labels: filteredLabels,
          datasets: filteredDatasets
        });
      } else {
        // Otherwise use the default data (last 24 hours)
        setFilteredMachineTrends({
          labels: generateTimeLabels(),
          datasets: machineTrendDatasets
        });
      }
      
      // CREATE TOP 10 PROBLEMATIC MACHINES DATA
      // Count active events by machine
      const machineActiveEvents = {};
      uniqueMachines.forEach(machine => {
        machineActiveEvents[machine] = data.filter(item => 
          item.MACHINE_NAME === machine && (item.VALUE === '1' || item.VALUE === 1)
        ).length;
      });
      
      // Sort and get top 10 problematic machines
      const problematicMachines = Object.keys(machineActiveEvents)
        .map(machine => ({
          name: machine,
          activeEvents: machineActiveEvents[machine],
          totalEvents: machineEventCounts[machine],
          type: data.find(item => item.MACHINE_NAME === machine)?.TYPE || 'Unknown',
        }))
        .sort((a, b) => b.activeEvents - a.activeEvents)
        .slice(0, 10);
      
      setTopProblematicMachines(problematicMachines);

      // Generate default activity timeline (last 24 hours)
      const activityTimelineData = generateActivityTimelineData(data);
      setActivityTimeline(activityTimelineData);
      
      // Apply current activity timeline filter if set
      const hasCustomActivityRange = 
        activityTimelineFilter.startDate !== new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] ||
        activityTimelineFilter.endDate !== new Date().toISOString().split('T')[0];
      
      if (hasCustomActivityRange) {
        const filteredData = generateActivityTimelineData(
          data,
          activityTimelineFilter.startDate, 
          activityTimelineFilter.endDate
        );
        setFilteredActivityTimeline(filteredData);
      } else {
        setFilteredActivityTimeline(activityTimelineData);
      }
    }
  }, [data, dateRange.startDate, dateRange.endDate, activityTimelineFilter.startDate, activityTimelineFilter.endDate]);

  // New function to generate time labels based on date range
  const generateTimeLabels = (start = null, end = null) => {
    const timeLabels = [];
    const startDate = start ? new Date(start) : new Date(new Date().setDate(new Date().getDate() - 1));
    const endDate = end ? new Date(end) : new Date();
    
    // Set to beginning of day
    startDate.setHours(0, 0, 0, 0);
    
    // Set to end of day
    endDate.setHours(23, 59, 59, 999);
    
    // Generate hourly labels between start and end date
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      timeLabels.push(`${currentDate.getHours()}:00`);
      currentDate.setHours(currentDate.getHours() + 1);
    }
    
    return timeLabels;
  };
  
  // New function to generate machine trend data based on date range
  const generateMachineTrendData = (machines, data, start = null, end = null) => {
    const startDate = start ? new Date(start) : new Date(new Date().setDate(new Date().getDate() - 1));
    const endDate = end ? new Date(end) : new Date();
    
    // Set to beginning of day
    startDate.setHours(0, 0, 0, 0);
    
    // Set to end of day
    endDate.setHours(23, 59, 59, 999);
    
    // Generate hourly time slots
    const timeSlots = [];
    const currentSlot = new Date(startDate);
    while (currentSlot <= endDate) {
      timeSlots.push(new Date(currentSlot));
      currentSlot.setHours(currentSlot.getHours() + 1);
    }
    
    // Create datasets for each machine
    return machines.map((machine, index) => {
      const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'];
      const color = colors[index % colors.length];
      
      const hourData = timeSlots.map(hour => {
        const startOfHour = new Date(hour);
        const endOfHour = new Date(hour);
        endOfHour.setHours(hour.getHours() + 1);
        
        // Count entries for this machine in this hour
        return data.filter(item => {
          const itemDate = new Date(item.START_TIME || item.TIMESTAMP);
          return item.MACHINE_NAME === machine && 
                 itemDate >= startOfHour && 
                 itemDate < endOfHour;
        }).length;
      });
      
      return {
        label: machine,
        data: hourData,
        borderColor: color,
        backgroundColor: `${color}30`,
        borderWidth: 2,
        tension: 0.3,
        fill: true
      };
    });
  };
  
  // Handle date filter change for Machine Trends
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    const newDateRange = {
      ...dateRange,
      [name]: value
    };
    setDateRange(newDateRange);
    storeFilter('machineTrendsFilter', newDateRange);
  };
  
  // Apply date filter for Machine Trends - Modified to store the filter settings
  const applyDateFilter = () => {
    if (!data || data.length === 0) return;
    
    // Get top 5 machines
    const uniqueMachines = [...new Set(data.map(item => item.MACHINE_NAME))];
    const machineEventCounts = {};
    uniqueMachines.forEach(machine => {
      machineEventCounts[machine] = data.filter(item => item.MACHINE_NAME === machine).length;
    });
    
    const topMachines = Object.keys(machineEventCounts)
      .sort((a, b) => machineEventCounts[b] - machineEventCounts[a])
      .slice(0, 5);
    
    // Generate new time labels and datasets based on date range
    const timeLabels = generateTimeLabels(dateRange.startDate, dateRange.endDate);
    const datasets = generateMachineTrendData(topMachines, data, dateRange.startDate, dateRange.endDate);
    
    setFilteredMachineTrends({
      labels: timeLabels,
      datasets: datasets
    });
    
    // Store the applied filter to localStorage
    storeFilter('machineTrendsFilter', dateRange);
  };
  
  // Reset date filter to last 24 hours for Machine Trends
  const resetDateFilter = () => {
    const newDateRange = {
      startDate: yesterday,
      endDate: today
    };
    
    setDateRange(newDateRange);
    
    // Apply default filter immediately
    if (data && data.length > 0) {
      const uniqueMachines = [...new Set(data.map(item => item.MACHINE_NAME))];
      const machineEventCounts = {};
      uniqueMachines.forEach(machine => {
        machineEventCounts[machine] = data.filter(item => item.MACHINE_NAME === machine).length;
      });
      
      const topMachines = Object.keys(machineEventCounts)
        .sort((a, b) => machineEventCounts[b] - machineEventCounts[a])
        .slice(0, 5);
        
      // Reset to default data (last 24 hours)
      setFilteredMachineTrends({
        labels: generateTimeLabels(),
        datasets: generateMachineTrendData(topMachines, data)
      });
    }
    
    // Reset the stored filter in localStorage
    storeFilter('machineTrendsFilter', newDateRange);
  };

  // ACTIVITY TIMELINE DATA function definition
  // Create timeline data - group by hour
  const generateActivityTimelineData = (dataToUse, startDateStr, endDateStr) => {
    if (!dataToUse || dataToUse.length === 0) return {labels: [], datasets: []};
    
    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setDate(new Date().getDate() - 1));
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    
    // Calculate hours between dates, but cap at 72 hours (3 days) for readability
    let hoursDiff = Math.min(Math.floor((endDate - startDate) / (1000 * 60 * 60)), 72);
    if (hoursDiff < 1) hoursDiff = 24; // Default to 24 hours if range is invalid
    
    const timePoints = [];
    const now = new Date(endDate);
    
    for (let i = hoursDiff - 1; i >= 0; i--) {
      const hour = new Date(now);
      hour.setHours(now.getHours() - i);
      timePoints.push(hour);
    }

    const timeLabels = timePoints.map(date => {
      return `${date.toLocaleDateString()} ${date.getHours()}:00`;
    });
    
    // Get top 5 machines for timeline
    const uniqueMachines = [...new Set(dataToUse.map(item => item.MACHINE_NAME))];
    const machineEventCounts = {};
    uniqueMachines.forEach(machine => {
      machineEventCounts[machine] = dataToUse.filter(item => item.MACHINE_NAME === machine).length;
    });
    
    // Sort machines by event count and get top 5
    const topMachines = Object.keys(machineEventCounts)
      .sort((a, b) => machineEventCounts[b] - machineEventCounts[a])
      .slice(0, 5);
    
    // Create datasets for top 5 machines
    const datasets = topMachines.map((machine, index) => {
      const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'];
      const color = colors[index % colors.length];
      
      const hourData = timePoints.map(hour => {
        const startOfHour = new Date(hour);
        const endOfHour = new Date(hour);
        endOfHour.setHours(hour.getHours() + 1);
        
        // Count entries of this machine in this hour
        return dataToUse.filter(item => {
          const itemDate = new Date(item.START_TIME || item.TIMESTAMP);
          return item.MACHINE_NAME === machine && 
                 itemDate >= startOfHour && 
                 itemDate < endOfHour;
        }).length;
      });
      
      return {
        label: machine,
        data: hourData,
        borderColor: color,
        backgroundColor: `${color}30`,
        tension: 0.3,
        fill: true
      };
    });
    
    return {
      labels: timeLabels,
      datasets: datasets
    };
  };

  // Handle date change for Activity Timeline
  const handleActivityTimelineFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilter = {
      ...activityTimelineFilter,
      [name]: value
    };
    setActivityTimelineFilter(newFilter);
    storeFilter('activityTimelineFilter', newFilter);
  };

  // Apply date filter for activity timeline
  const applyActivityTimelineFilter = () => {
    if (!data || data.length === 0) return;
    
    const filteredData = generateActivityTimelineData(
      data,
      activityTimelineFilter.startDate, 
      activityTimelineFilter.endDate
    );
    
    setFilteredActivityTimeline(filteredData);
    
    // Store the applied filter
    storeFilter('activityTimelineFilter', activityTimelineFilter);
  };
  
  // Reset activity timeline filter to last 24 hours
  const resetActivityTimelineFilter = () => {
    const newFilter = {
      startDate: yesterday,
      endDate: today
    };
    
    setActivityTimelineFilter(newFilter);
    
    // Apply default filter immediately
    if (data && data.length > 0) {
      const defaultData = generateActivityTimelineData(data);
      setFilteredActivityTimeline(defaultData);
    }
    
    // Reset the stored filter
    storeFilter('activityTimelineFilter', newFilter);
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'ACP Status Distribution'
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Data by Machine Type'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Data Points'
        }
      }
    }
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Activity Timeline (Top 5 Machines)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Activity Count'
        }
      }
    }
  };
  
  // New options for machine trends chart
  const machineTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Machine Activity Trends (Last 24 Hours)'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Event Count'
        }
      }
    }
  };

  // Add manual refresh function
  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh();
      setLastRefreshed(new Date().toLocaleTimeString());
    }
  };

  // Function to export data
  // eslint-disable-next-line no-unused-vars
  const exportData = (chartType) => {
    // Simple export function - in production, you'd implement proper export logic
    alert(`Exporting ${chartType} data...`);
    // Would typically download CSV/JSON of the relevant data
  };

  // Function to generate report
  // eslint-disable-next-line no-unused-vars
  const generateReport = (chartType) => {
    // Simple report generation function
    alert(`Generating report for ${chartType}...`);
    // Would typically generate a PDF or other report format
  };

  if (loading) {
    return (
      <div className="text-center my-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Dashboard Header with Refresh Info */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <i className="bi bi-speedometer2 me-2"></i>
              <h5 className="mb-0">Dashboard</h5>
            </div>
            <div className="d-flex align-items-center">
              <small className="text-muted me-3">
                <i className="bi bi-clock me-1"></i>
                Auto-refresh: 10s | Last: {lastRefreshed}
              </small>
              <button 
                className="btn btn-sm btn-outline-primary" 
                onClick={handleManualRefresh}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards Row */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card h-100 border-left-primary shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Total Machines
                  </div>
                  <div className="h3 mb-0 font-weight-bold">{machineStats.total}</div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-truck"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card h-100 border-left-success shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Active Machines
                  </div>
                  <div className="h3 mb-0 font-weight-bold">{machineStats.active}</div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-check-circle"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card h-100 border-left-warning shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Inactive Machines
                  </div>
                  <div className="h3 mb-0 font-weight-bold">{machineStats.inactive}</div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-exclamation-circle"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card h-100 border-left-info shadow-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Data Points
                  </div>
                  <div className="h3 mb-0 font-weight-bold">{machineStats.dataPoints}</div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-database"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card mb-4 bg-light shadow-sm">
        <div className="card-body py-3">
          <h5 className="card-title mb-3">System Status</h5>
          <div className="row">
            <div className="col-md-6">
              <div className="status-item mb-2">
                <div className="d-flex align-items-center mb-1">
                  <span className="status-dot me-2" style={{ backgroundColor: '#1cc88a', width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' }}></span>
                  <span>API Connection: </span>
                  <Badge bg="success" className="ms-2">Online</Badge>
                </div>
              </div>
              <div className="status-item mb-2">
                <div className="d-flex align-items-center mb-1">
                  <span className="status-dot me-2" style={{ backgroundColor: '#1cc88a', width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block' }}></span>
                  <span>Database: </span>
                  <Badge bg="success" className="ms-2">Connected</Badge>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="status-info text-muted">
                <p className="mb-1"><strong>Last Update:</strong> {lastUpdate || 'N/A'}</p>
                <p className="mb-0"><strong>Latest Data:</strong> {data.length > 0 ? 
                  new Date(data[0].START_TIME || data[0].TIMESTAMP).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div style={{ height: '250px' }}>
                <Pie 
                  data={{
                    labels: statusDistribution.labels,
                    datasets: [
                      {
                        data: statusDistribution.counts,
                        backgroundColor: ['#1cc88a', '#e74a3b'],
                        borderColor: ['#1cc88a', '#e74a3b'],
                        borderWidth: 1,
                      },
                    ],
                  }} 
                  options={pieChartOptions} 
                />
              </div>
            </div>
            <div className="card-footer small text-muted">
              Distribution of ACP status (ON/OFF)
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div style={{ height: '250px' }}>
                <Bar 
                  data={{
                    labels: machineTypesData.labels,
                    datasets: [
                      {
                        data: machineTypesData.counts,
                        backgroundColor: '#4e73df',
                        barPercentage: 0.7,
                      },
                    ],
                  }} 
                  options={barChartOptions} 
                />
              </div>
            </div>
            <div className="card-footer small text-muted">
              Number of data points by machine type
            </div>
          </div>
        </div>
      </div>

      {/* Machine Trends Chart - NEW */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Machine Trends
            </h5>
          </div>
        </div>
        <div className="card-body">
          <form className="row g-2 align-items-center mb-3">
            <div className="col-auto">
              <label className="col-form-label col-form-label-sm">Start</label>
            </div>
            <div className="col-auto">
              <input 
                type="date" 
                className="form-control form-control-sm" 
                style={{width: "140px"}}
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                max={dateRange.endDate}
              />
            </div>
            <div className="col-auto">
              <label className="col-form-label col-form-label-sm">End</label>
            </div>
            <div className="col-auto">
              <input 
                type="date" 
                className="form-control form-control-sm" 
                style={{width: "140px"}}
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                min={dateRange.startDate}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="col-auto">
              <button 
                type="button"
                className="btn btn-sm btn-primary"
                onClick={applyDateFilter}
              >
                Filter
              </button>
            </div>
            <div className="col-auto">
              <button 
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={resetDateFilter}
              >
                Reset
              </button>
            </div>
          </form>
          <div style={{ height: '300px' }}>
            <Line 
              data={filteredMachineTrends} 
              options={machineTrendOptions} 
            />
          </div>
        </div>
        <div className="card-footer small text-muted">
          Trend analysis for top 5 machines over the selected date range
        </div>
      </div>

      {/* Activity Timeline - Full Width */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Activity Timeline
            </h5>
          </div>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <p className="text-xs font-weight-bold text-primary mb-2">
              Grafik ini menunjukkan jumlah aktivitas (events) per jam dari lima mesin teratas.
              Setiap titik mewakili jumlah event untuk mesin tertentu pada jam tersebut.
              Semakin tinggi nilai, semakin banyak aktivitas.
            </p>
            
            <div className="row g-2 align-items-center mb-3">
              <div className="col-auto">
                <label className="col-form-label col-form-label-sm">Start</label>
              </div>
              <div className="col-auto">
                <input 
                  type="date" 
                  className="form-control form-control-sm" 
                  style={{width: "140px"}}
                  name="startDate"
                  value={activityTimelineFilter.startDate}
                  onChange={handleActivityTimelineFilterChange}
                  max={activityTimelineFilter.endDate}
                />
              </div>
              <div className="col-auto">
                <label className="col-form-label col-form-label-sm">End</label>
              </div>
              <div className="col-auto">
                <input 
                  type="date" 
                  className="form-control form-control-sm" 
                  style={{width: "140px"}}
                  name="endDate"
                  value={activityTimelineFilter.endDate}
                  onChange={handleActivityTimelineFilterChange}
                  min={activityTimelineFilter.startDate}
                  max={today}
                />
              </div>
              <div className="col-auto">
                <button 
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={applyActivityTimelineFilter}
                >
                  Filter
                </button>
              </div>
              <div className="col-auto">
                <button 
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={resetActivityTimelineFilter}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          
          <div style={{ height: '300px' }}>
            <Line data={filteredActivityTimeline} options={lineChartOptions} />
          </div>
          
          <div className="card-footer small text-muted">
            Activity timeline for top 5 machines over selected date range
          </div>
        </div>
      </div>

      {/* Top 10 Event Machines - NEW */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Top 10 Event Machines
          </h5>
        </div>
        <div className="card-body">
          {topProblematicMachines.length > 0 ? (
            <div className="table-responsive">
              <Table hover className="table-sm">
                <thead className="table-light">
                  <tr>
                    <th>Machine</th>
                    <th>Type</th>
                    <th className="text-center">Active Events</th>
                    <th className="text-center">Total Events</th>
                  </tr>
                </thead>
                <tbody>
                  {topProblematicMachines.map((machine, index) => (
                    <tr key={index}>
                      <td><strong>{machine.name}</strong></td>
                      <td>{machine.type}</td>
                      <td className="text-center fw-bold text-danger">{machine.activeEvents}</td>
                      <td className="text-center">{machine.totalEvents}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted">No event machines detected</p>
          )}
        </div>
        <div className="card-footer small text-muted">
          Machines ranked by number of active events
        </div>
      </div>

      {/* Machine Status Summary */}
      <div className="card shadow-sm">
        <div className="card-header bg-light">
          <h5 className="mb-0">Machine Status Summary</h5>
        </div>
        <div className="card-body pb-0">
          <div className="row">
            <div className="col-lg-6 mb-4">
              <div className="card bg-primary text-white shadow">
                <div className="card-body">
                  Machine Health
                  <div className="mt-2">
                    <div className="d-flex justify-content-between">
                      <span>Overall:</span>
                      <span>{Math.round((machineStats.active / Math.max(machineStats.total, 1)) * 100)}%</span>
                    </div>
                    <div className="progress mt-1">
                      <div 
                        className="progress-bar" 
                        role="progressbar" 
                        style={{ width: `${(machineStats.active / Math.max(machineStats.total, 1)) * 100}%` }}
                        aria-valuenow={(machineStats.active / Math.max(machineStats.total, 1)) * 100} 
                        aria-valuemin="0" 
                        aria-valuemax="100">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-6 mb-4">
              <div className="card bg-success text-white shadow">
                <div className="card-body">
                  System Performance
                  <div className="mt-2">
                    <div className="d-flex justify-content-between">
                      <span>Response Time:</span>
                      <span>Good</span>
                    </div>
                    <div className="progress mt-1">
                      <div 
                        className="progress-bar" 
                        role="progressbar" 
                        style={{ width: '85%' }}
                        aria-valuenow="85" 
                        aria-valuemin="0" 
                        aria-valuemax="100">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="card-footer text-muted">
          <i className="bi bi-info-circle me-2"></i>
          Dashboard displays machine health metrics and system performance indicators
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 
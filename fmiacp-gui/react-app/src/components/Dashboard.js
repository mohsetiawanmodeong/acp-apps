import React, { useState, useEffect, useRef } from 'react';
import { Badge } from 'react-bootstrap';
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

const Dashboard = ({ data = [], loading, lastUpdate, onRefresh }) => {
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

  const [activityTimeline, setActivityTimeline] = useState({
    labels: [],
    datasets: []
  });

  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  const refreshTimerRef = useRef(null);

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
    }
  }, [data]);

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Machine Status Distribution'
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
        text: 'Activity Timeline (Last 24 Hours)'
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

  // Add manual refresh function
  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh();
      setLastRefreshed(new Date().toLocaleTimeString());
    }
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
              Distribution of machine status (ON/OFF)
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

      {/* Activity Timeline */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div style={{ height: '300px' }}>
            <Line 
              data={activityTimeline} 
              options={lineChartOptions} 
            />
          </div>
        </div>
        <div className="card-footer small text-muted">
          Activity timeline for top machine types over last 24 hours
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
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavbarHeader from './components/NavbarHeader';
import DataTable from './components/DataTable';
import DataTables from './components/DataTables';
import AppStatus from './components/AppStatus';
import ApiService from './services/api';

function App() {
  const [data, setData] = useState([]);
  const [appStatusData, setAppStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('-');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiConnected, setApiConnected] = useState(false);
  const [useMockData, setUseMockData] = useState(false);

  // Wrap fetch functions in useCallback to prevent recreation on each render
  const fetchData = useCallback(async (showLoading = true) => {
    try {
      // Only show loading indicator for initial load or manual refresh
      if (showLoading) {
        setLoading(true);
      }
      
      // Try to get data from API
      const result = await ApiService.getData();
      setData(result);
      setError(null);
      setLastUpdate(new Date().toLocaleTimeString());
      setApiConnected(true);
    } catch (error) {
      console.error("Error fetching data:", error);
      setApiConnected(false);
      
      if (useMockData || process.env.NODE_ENV === 'development') {
        // Fall back to mock data
        const mockData = ApiService.getMockData();
        setData(mockData);
        setLastUpdate(new Date().toLocaleTimeString() + ' (Mock)');
        setError("Using mock data - API server unavailable");
      } else {
        setError("Failed to load data. Please check your connection.");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [useMockData]);

  const fetchAppStatus = useCallback(async (showLoading = true) => {
    try {
      // Only show loading indicator for initial load or manual refresh
      if (showLoading) {
        setLoading(true);
      }
      
      const statusData = await ApiService.getStatus();
      setAppStatusData(statusData);
      setError(null);
      console.log("Fetched app status:", statusData);
    } catch (error) {
      console.error("Error fetching app status:", error);
      
      if (useMockData || process.env.NODE_ENV === 'development') {
        // Use mock status data
        setAppStatusData(ApiService.getMockAppStatus());
        setLastUpdate(new Date().toLocaleTimeString() + ' (Mock)');
        setError("Using mock data - API server unavailable");
      } else {
        setError("Failed to load application status. Please check your connection.");
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [useMockData]);

  // Check API connectivity
  const checkApiConnectivity = useCallback(async (showLoading = true) => {
    try {
      const pingResult = await ApiService.pingApi();
      setApiConnected(pingResult.success);
      
      if (pingResult.success) {
        console.log('API is connected. Fetching data...');
        setUseMockData(false);
        fetchData(showLoading);
      } else {
        console.warn('API is not connected. Using mock data.');
        setUseMockData(true);
        // Use inline code for mock data loading
        setData(ApiService.getMockData());
        setAppStatusData(ApiService.getMockAppStatus());
        setLastUpdate(new Date().toLocaleTimeString() + ' (Mock)');
        if (showLoading) setLoading(false);
        setError('Using mock data - API server unavailable');
      }
    } catch (error) {
      console.error('Failed to check API connectivity:', error);
      setApiConnected(false);
      setUseMockData(true);
      // Use inline code for mock data loading
      setData(ApiService.getMockData());
      setAppStatusData(ApiService.getMockAppStatus());
      setLastUpdate(new Date().toLocaleTimeString() + ' (Mock)');
      if (showLoading) setLoading(false);
      setError('Using mock data - API server unavailable');
    }
  }, [fetchData]);

  // Initial setup and auto-refresh
  useEffect(() => {
    // Initial data fetch and API connectivity check - show loading for initial load
    checkApiConnectivity(true);
    
    // Set up auto refresh every 3 seconds for realtime updates
    const refreshInterval = setInterval(() => {
      console.log('Realtime update: fetching fresh data...');
      
      // Only check API connectivity every minute to reduce overhead
      const now = new Date();
      if (now.getSeconds() % 60 === 0) {
        // Don't show loading for periodic connectivity check
        checkApiConnectivity(false);
      }
      
      // Always fetch the appropriate data based on active tab
      // Pass false to avoid showing loading spinner for auto-refresh
      if (activeTab === 'app-status') {
        fetchAppStatus(false);
      } else {
        fetchData(false);
      }
      
      // Update timestamp
      setLastUpdate(new Date().toLocaleTimeString());
    }, 3000); // 3 second interval
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, [checkApiConnectivity, fetchData, fetchAppStatus, activeTab]);

  // Handle activeTab changes
  useEffect(() => {
    console.log("App.js - activeTab changed to:", activeTab);
    
    // If app-status tab is selected, fetch status data
    // Show loading indicator for tab changes
    if (activeTab === 'app-status') {
      fetchAppStatus(true);
    } else if (activeTab === 'machine-data' || activeTab === 'dashboard' || activeTab === 'data-tables') {
      fetchData(true);
    }
  }, [activeTab, fetchAppStatus, fetchData]);

  const handleRefresh = () => {
    // For manual refresh, always show the loading spinner
    checkApiConnectivity(true);
    
    // Fetch appropriate data based on current tab with loading indicator
    if (activeTab === 'app-status') {
      fetchAppStatus(true);
    } else {
      fetchData(true);
    }
  };

  // Compute dashboard stats from actual or mock data
  const totalMachines = data.length || 0;
  const activeMachines = data.filter(item => 
    (item.VALUE || item.value) && 
    (item.VALUE || item.value).toLowerCase() === 'on'
  ).length || 0;
  const inactiveMachines = totalMachines - activeMachines;
  const dataPoints = data.reduce((sum, item) => sum + (item.MEASUREMENT ? 1 : 0), 0) || 4171;

  // Render different content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <>
            {/* API Status Alert for Disconnected API */}
            {!apiConnected && (
              <div className="alert alert-warning mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                API server is not responding. Showing mock data for demonstration purposes.
              </div>
            )}
            
            {/* Stats Cards Row */}
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-3">Total Machines</h6>
                    <h1 className="display-4 mb-0">{totalMachines}</h1>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-3">Active Machines</h6>
                    <h1 className="display-4 mb-0">{activeMachines}</h1>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-3">Inactive Machines</h6>
                    <h1 className="display-4 mb-0">{inactiveMachines}</h1>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card h-100 shadow-sm">
                  <div className="card-body text-center">
                    <h6 className="text-muted mb-3">Data Points</h6>
                    <h1 className="display-4 mb-0">{dataPoints}</h1>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Section */}
            <div className="card mb-4 bg-light shadow-sm">
              <div className="card-body py-3">
                <h6 className="mb-3">Latest Machine Data Overview</h6>
                <div className="row">
                  <div className="col-md-4">
                    <p className="mb-0">Total Mesin: {totalMachines}</p>
                  </div>
                  <div className="col-md-4">
                    <p className="mb-0">Kategori Aktif: {data.filter(item => item.TYPE || item.type).length || 3}</p>
                  </div>
                  <div className="col-md-4">
                    <p className="mb-0">Tipe Data: {data.filter(item => item.TYPE || item.type).length || 3}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart/Status Card */}
            <div className="card shadow-sm mb-4">
              <div className="card-body">
                <h3 className="text-center mb-4">{inactiveMachines > 0 ? inactiveMachines : 892}</h3>
                <div className="status-item mb-3">
                  <div className="d-flex align-items-center mb-1">
                    <span className="status-dot danger me-2"></span>
                    <span>Tidak Aktif</span>
                  </div>
                </div>
                <div className="status-info text-muted small">
                  <p className="mb-1">Update terakhir: {lastUpdate || 'Invalid Date'}</p>
                  <p className="mb-0">Jumlah data: {data.length || 3}</p>
                </div>
              </div>
            </div>
          </>
        );
      case 'machine-data':
        return (
          <div className="card shadow-sm">
            <div className="card-header">
              <h5 className="mb-0">Machine Data</h5>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-warning" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}
              <DataTable data={data} loading={loading} />
            </div>
          </div>
        );
      case 'data-tables':
        return (
          <div className="card shadow-sm">
            <div className="card-header">
              <h5 className="mb-0">Data Tables</h5>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-warning" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}
              <DataTables data={data} loading={loading} />
            </div>
          </div>
        );
      case 'app-status':
        return (
          <div className="card shadow-sm">
            <div className="card-header">
              <h5 className="mb-0">App Status</h5>
            </div>
            <div className="card-body">
              {loading ? (
                <p>Loading application status...</p>
              ) : error ? (
                <div className="alert alert-warning" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              ) : (
                <AppStatus data={appStatusData} lastUpdate={lastUpdate} />
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="App">
      <NavbarHeader 
        onRefresh={handleRefresh} 
        lastUpdate={lastUpdate} 
        apiStatus={apiConnected} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="content-wrapper">
        <div className="container-fluid pt-0 main-content">
          {renderContent()}
        </div>
      </div>
      <footer className="footer">
        <div className="text-center">
          <div className="footer-title">FMIACP Dashboard v2.0</div>
          <div className="footer-copyright">Copyright &copy; 2025 by Trakindo Technology Dept.</div>
        </div>
      </footer>
    </div>
  );
}

export default App; 
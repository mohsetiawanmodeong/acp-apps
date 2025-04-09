import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavbarHeader from './components/NavbarHeader';
import DataTables from './components/DataTables';
import MachineData from './components/MachineData';
import AppStatus from './components/AppStatus';
import Dashboard from './components/Dashboard';
import ApiService from './services/api';

function App() {
  const [data, setData] = useState([]);
  const [appStatusData, setAppStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('-');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiConnected, setApiConnected] = useState(false);

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
      setData([]);
      setError("Failed to load data. Please check your connection.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

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
      setAppStatusData(null);
      setError("Failed to load application status. Please check your connection.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Check API connectivity
  const checkApiConnectivity = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Directly try to fetch data instead of using a ping
      await fetchData(false);
      setApiConnected(true);
    } catch (error) {
      console.error('Failed to connect to API:', error);
      setApiConnected(false);
      setData([]);
      setError('API server is not available. Please check your connection.');
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [fetchData]);

  // Initial setup and auto-refresh
  useEffect(() => {
    // Initial data fetch and API connectivity check - show loading for initial load
    checkApiConnectivity(true);
    
    // Set up auto refresh every 10 seconds for realtime updates
    const refreshInterval = setInterval(() => {
      console.log('Realtime update: fetching fresh data...');
      
      // Always fetch the appropriate data based on active tab
      // Pass false to avoid showing loading spinner for auto-refresh
      if (activeTab === 'app-status') {
        fetchAppStatus(false);
      } else {
        fetchData(false);
      }
      
      // Update timestamp
      setLastUpdate(new Date().toLocaleTimeString());
    }, 10000); // 10 second interval
    
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
    if (activeTab === 'app-status') {
      fetchAppStatus(true);
    } else {
      fetchData(true);
    }
  };

  // Function to render the appropriate content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div>
            {error && (
              <div className="alert alert-warning" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}
            <Dashboard 
              data={data} 
              loading={loading} 
              lastUpdate={lastUpdate} 
              onRefresh={handleRefresh}
            />
          </div>
        );
      case 'machine-data':
        return (
          <div className="card shadow-sm">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-truck me-2"></i>
                Machine Data
              </h5>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-warning" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}
              <MachineData data={data} loading={loading} />
            </div>
          </div>
        );
      case 'data-tables':
        return (
          <div className="card shadow-sm">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-table me-2"></i>
                Data Tables
              </h5>
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
              <h5 className="mb-0">
                <i className="bi bi-cpu me-2"></i>
                App Status
              </h5>
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
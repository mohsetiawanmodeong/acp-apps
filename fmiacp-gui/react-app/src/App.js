import React, { useState, useEffect } from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import NavbarHeader from './components/NavbarHeader';
import DataTable from './components/DataTable';
import ApiService from './services/api';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('-');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchData();

    // Set up auto refresh every 60 seconds
    const refreshInterval = setInterval(fetchData, 60000);
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Add effect to log activeTab changes
  useEffect(() => {
    console.log("App.js - activeTab changed to:", activeTab);
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Try to get data from API
      const result = await ApiService.getData();
      setData(result);
      setError(null);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data. Please check your connection.");
      
      // If in development, fall back to mock data
      if (process.env.NODE_ENV === 'development') {
        const mockData = await ApiService.getMockData();
        setData(mockData);
        setLastUpdate(new Date().toLocaleTimeString() + ' (Mock Data)');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  // Compute dashboard stats
  const totalMachines = data.length || 0;
  const activeMachines = data.filter(item => item.value && item.value.toLowerCase() === 'normal').length || 0;
  const inactiveMachines = totalMachines - activeMachines;
  const dataPoints = 4171; // Example value, replace with actual calculation if available

  // Render different content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <>
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
                    <p className="mb-0">Kategori Aktif: {data.filter(item => item.type).length || 3}</p>
                  </div>
                  <div className="col-md-4">
                    <p className="mb-0">Tipe Data: {data.filter(item => item.type).length || 3}</p>
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
                <div className="alert alert-danger" role="alert">
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
              <p>Data tables content goes here</p>
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
              <p>Application status information goes here</p>
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
        apiStatus={!error} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="container-fluid pt-1">
        {renderContent()}
      </div>
      <footer className="footer">
        <div className="text-center">
          <div>FMIACP Dashboard v2.0</div>
          <div>Copyright © {new Date().getFullYear()} by Trakindo Technology Dept.</div>
        </div>
      </footer>
    </div>
  );
}

export default App; 
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

  useEffect(() => {
    fetchData();

    // Set up auto refresh every 60 seconds
    const refreshInterval = setInterval(fetchData, 60000);
    
    // Clean up on unmount
    return () => clearInterval(refreshInterval);
  }, []);

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

  return (
    <div className="App">
      <NavbarHeader onRefresh={handleRefresh} lastUpdate={lastUpdate} apiStatus={!error} />
      <div className="container-fluid mt-4">
        <div className="row">
          <div className="col">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0">FMIACP Dashboard</h5>
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
          </div>
        </div>
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
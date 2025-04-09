/**
 * API Service for FMIACP Dashboard
 * Handles all API requests to the backend
 */

import axios from 'axios';

// Configuration for API
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4990', // Updated port to match fmiacp.js
  timeout: 15000, // 15 seconds
  retryAttempts: 2,
};

// Create API client instance
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create an offset date for testing when API is not available
const createMockData = () => {
  const mockData = [];
  const machineTypes = ['Excavator', 'Dump Truck', 'Bulldozer', 'Wheel Loader', 'Motor Grader'];
  const sites = ['Site A', 'Site B', 'Site C', 'Site D'];
  const serials = ['ABC123', 'DEF456', 'GHI789', 'JKL012', 'MNO345'];
  
  for (let i = 0; i < 20; i++) {
    const randomDate = new Date();
    randomDate.setHours(randomDate.getHours() - Math.floor(Math.random() * 24));
    
    mockData.push({
      ID: `M${(i + 1).toString().padStart(3, '0')}`,
      MACHINEID: `${100 + i}`,
      MACHINE_NAME: `ACP${(i + 1).toString().padStart(2, '0')}`,
      TYPE: machineTypes[Math.floor(Math.random() * machineTypes.length)],
      SITE: sites[Math.floor(Math.random() * sites.length)],
      SERIAL: serials[Math.floor(Math.random() * serials.length)] + i,
      VALUE: Math.random() > 0.7 ? 'ON' : 'OFF', 
      DESCRIPTION: `Alert on machine ${i + 1}`,
      TIMESTAMP: randomDate.toISOString(),
    });
  }
  
  return mockData;
};

// Handle API call with retry capability
const callApiWithRetry = async (apiCall, retryCount = 0) => {
  try {
    return await apiCall();
  } catch (error) {
    if (retryCount < API_CONFIG.retryAttempts) {
      console.warn(`API call failed, retrying... (${retryCount + 1}/${API_CONFIG.retryAttempts})`);
      // Exponential backoff: wait longer between each retry
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
      return callApiWithRetry(apiCall, retryCount + 1);
    }
    
    // If running in development mode and all retries failed, return mock data
    if (process.env.NODE_ENV === 'development') {
      console.warn('API call failed after retries, using mock data');
      return createMockData();
    }
    
    throw error;
  }
};

// API Service with methods for data operations
const ApiService = {
  // Get all machine data (updated to match the actual endpoint)
  getData: async () => {
    return callApiWithRetry(async () => {
      try {
        // Try to get current data first
        const response = await apiClient.get('/api/getFMIACPCurrent');
        return response.data;
      } catch (error) {
        // Fall back to all data if current is not available
        console.warn('Current data endpoint not available, trying general endpoint');
        const response = await apiClient.get('/api/getFMIACP');
        return response.data;
      }
    });
  },
  
  // Get historical data (modified to use actual endpoint)
  getHistoricalData: async () => {
    return callApiWithRetry(async () => {
      const response = await apiClient.get('/api/getFMIACP');
      return response.data;
    });
  },
  
  // Get application status
  getStatus: async () => {
    try {
      const response = await apiClient.get('/api/getAppStatusFMIACP');
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response || error.message || error);
      
      // Enhanced error message based on response
      const errorMessage = error.response?.data?.message || 
                           error.message || 
                           'An unknown error occurred';
      
      // Rethrow with better message for components to catch
      throw new Error(errorMessage);
    }
  },
  
  // Create new data entry (POST request matching the backend endpoint)
  createData: async (data) => {
    return callApiWithRetry(async () => {
      const response = await apiClient.post('/api/createFMIACP', data);
      return response.data;
    });
  },
  
  // Get mock data when API is not available during development
  getMockData: async () => {
    // Sample data structure matching what the API would return
    return [
      {
        MACHINE_NAME: "ACP01",
        TYPE: "PRESSURE",
        VALUE: "ON",
        START_TIME: "2023-05-12T08:30:00",
        CATEGORY: "Alert",
        MEASUREMENT: "HIGH",
        DESCRIPTION: "High pressure detected"
      },
      {
        MACHINE_NAME: "ACP01",
        TYPE: "TEMPERATURE",
        VALUE: "OFF",
        START_TIME: "2023-05-12T08:30:00",
        CATEGORY: "Normal",
        MEASUREMENT: "NORMAL",
        DESCRIPTION: "Normal temperature"
      },
      {
        MACHINE_NAME: "ACP02",
        TYPE: "LEVEL",
        VALUE: "ON",
        START_TIME: "2023-05-12T08:35:00",
        CATEGORY: "Alert",
        MEASUREMENT: "LOW",
        DESCRIPTION: "Low fluid level"
      },
      {
        MACHINE_NAME: "ACP03",
        TYPE: "PRESSURE",
        VALUE: "OFF",
        START_TIME: "2023-05-12T08:40:00",
        CATEGORY: "Normal",
        MEASUREMENT: "NORMAL",
        DESCRIPTION: "Normal pressure"
      }
    ];
  },
  
  // Export data to CSV
  exportData: async () => {
    try {
      // Get data first
      const data = await ApiService.getData();
      
      // Convert to CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add header row
      const headers = Object.keys(data[0] || {});
      csvContent += headers.join(",") + "\r\n";
      
      // Add data rows
      data.forEach(item => {
        const row = headers.map(header => {
          // Handle commas and quotes in the data
          const cell = item[header] !== null && item[header] !== undefined 
            ? item[header].toString() 
            : '';
          return `"${cell.replace(/"/g, '""')}"`;
        });
        csvContent += row.join(",") + "\r\n";
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `fmiacp-data-${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return true;
    } catch (error) {
      console.error('Export Error:', error);
      throw new Error('Failed to export data: ' + error.message);
    }
  }
};

export default ApiService; 
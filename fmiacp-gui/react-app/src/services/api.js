/**
 * API Service for FMIACP Dashboard
 * Handles all API requests to the backend
 */

import axios from 'axios';

// Configuration for API
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4990', // Updated port to match fmiacp.js
  timeout: 15000, // 15 seconds
  retryAttempts: 3,
  retryDelay: 1000
};

// Create API client instance
const apiClient = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Use withCredentials to send cookies for session-based auth
  withCredentials: true
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Log detailed error information for debugging
    console.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    
    return Promise.reject(error);
  }
);

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

// Generate mock app status data for development
const createMockAppStatus = () => {
  return {
    Name: "FMIACP",
    Version: "2.0",
    StartTime: new Date().toISOString(),
    DataStoreSize: Math.floor(Math.random() * 1000),
    DataStoreCount: Math.floor(Math.random() * 5000),
    DataStoreFailCount: Math.floor(Math.random() * 10),
    DataInputCount: Math.floor(Math.random() * 10000),
    DataInputRequestCount: Math.floor(Math.random() * 12000),
    DataOutputCount: Math.floor(Math.random() * 8000),
    DataOutputRequestCount: Math.floor(Math.random() * 9000),
    CPU: (Math.random() * 20).toFixed(2),
    UsageMemory: {
      rss: Math.floor(Math.random() * 1024 * 1024 * 100), // Random bytes
      heapTotal: Math.floor(Math.random() * 1024 * 1024 * 80),
      heapUsed: Math.floor(Math.random() * 1024 * 1024 * 60),
      external: Math.floor(Math.random() * 1024 * 1024 * 20),
      arrayBuffers: Math.floor(Math.random() * 1024 * 1024 * 10)
    },
    UsageCPU: {
      user: Math.floor(Math.random() * 10000),
      system: Math.floor(Math.random() * 5000)
    }
  };
};

// Handle API call with retry capability
const callApiWithRetry = async (apiCall, retryCount = 0) => {
  try {
    return await apiCall();
  } catch (error) {
    if (retryCount < API_CONFIG.retryAttempts) {
      console.warn(`API call failed, retrying... (${retryCount + 1}/${API_CONFIG.retryAttempts})`);
      
      // Calculate backoff delay: exponential backoff with jitter
      const delay = API_CONFIG.retryDelay * Math.pow(2, retryCount) * (0.9 + Math.random() * 0.2);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return callApiWithRetry(apiCall, retryCount + 1);
    }
    
    // If running in development mode and all retries failed, return mock data
    if (process.env.NODE_ENV === 'development') {
      console.warn('API call failed after retries, using mock data');
      
      // Determine what type of mock data to return based on URL in the error
      if (error.config && error.config.url) {
        if (error.config.url.includes('AppStatus')) {
          return createMockAppStatus();
        }
      }
      
      return createMockData();
    }
    
    throw error;
  }
};

// API Service with methods for data operations
const ApiService = {
  // Get all machine data
  getData: async () => {
    return callApiWithRetry(async () => {
      try {
        console.log('Attempting to fetch current data from /api/getFMIACPCurrent');
        // Try to get current data first
        const response = await apiClient.get('/api/getFMIACPCurrent');
        console.log('Successfully fetched data from /api/getFMIACPCurrent', response.data);
        return response.data;
      } catch (currentError) {
        console.warn('Current data endpoint failed:', currentError.message);
        
        // Fall back to all data if current is not available
        console.log('Falling back to /api/getFMIACP');
        const response = await apiClient.get('/api/getFMIACP');
        console.log('Successfully fetched data from /api/getFMIACP', response.data);
        return response.data;
      }
    });
  },
  
  // Get historical data
  getHistoricalData: async () => {
    return callApiWithRetry(async () => {
      console.log('Fetching historical data from /api/getFMIACP');
      const response = await apiClient.get('/api/getFMIACP');
      console.log('Successfully fetched historical data', response.data);
      return response.data;
    });
  },
  
  // Get application status
  getStatus: async () => {
    return callApiWithRetry(async () => {
      console.log('Fetching app status from /api/getAppStatusFMIACP');
      const response = await apiClient.get('/api/getAppStatusFMIACP');
      console.log('Successfully fetched app status', response.data);
      return response.data;
    }).catch(error => {
      console.error('Failed to get app status:', error.message);
      
      // Enhanced error message
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'An unknown error occurred';
      
      // Rethrow with better message for components to catch
      throw new Error(`Failed to load application status: ${errorMessage}`);
    });
  },
  
  // Create new data entry (POST request)
  createData: async (data) => {
    return callApiWithRetry(async () => {
      console.log('Creating new data entry at /api/createFMIACP');
      const response = await apiClient.post('/api/createFMIACP', data);
      console.log('Successfully created data entry', response.data);
      return response.data;
    });
  },
  
  // Ping API to check connectivity
  pingApi: async () => {
    try {
      console.log('Pinging API to check connectivity');
      const response = await apiClient.get('/api/getAppStatusFMIACP', { timeout: 5000 });
      return { success: true, status: response.status, data: response.data };
    } catch (error) {
      console.error('API ping failed:', error.message);
      return { 
        success: false, 
        status: error.response?.status || 0,
        message: error.message
      };
    }
  },
  
  // Get mock data when API is not available during development
  getMockData: createMockData,
  
  // Get mock app status data for development
  getMockAppStatus: createMockAppStatus,
  
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
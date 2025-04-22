/**
 * API Service for FMIACP Dashboard
 * Handles all API requests to the backend
 */

import axios from 'axios';

// Configuration for API
const API_CONFIG = {
  // baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4990', // Updated port to match fmiacp.js
  baseURL: process.env.REACT_APP_API_URL || 'https://grspcnuggbctrm.fmi.com/', // Updated port to match fmiacp.js
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
    
    console.error('API call failed after all retries');
    throw error;
  }
};

// API Service with methods for data operations
const ApiService = {
  // Get all machine data
  getData: async () => {
    return callApiWithRetry(async () => {
      console.log('Fetching historical data from /api/getFMIACP');
      const response = await apiClient.get('/api/getFMIACP');
      console.log('Successfully fetched data from /api/getFMIACP', response.data);
      return response.data;
    });
  },
  
  // Get current data only
  getCurrentData: async () => {
    return callApiWithRetry(async () => {
      try {
        console.log('Attempting to fetch current data from /api/getFMIACPCurrent');
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
  
  // Export data to CSV
  exportData: async () => {
    try {
      const response = await apiClient.get('/api/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fmiacp_export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  },

  // Ping API to check connectivity
  pingApi: async () => {
    try {
      const response = await apiClient.get('/api/ping', { timeout: 2000 });
      return { success: response.status === 200, message: 'API is available' };
    } catch (error) {
      console.warn('API ping failed:', error.message);
      return { success: false, message: error.message };
    }
  }
};

export default ApiService;
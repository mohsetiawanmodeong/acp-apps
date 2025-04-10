import React, { useState, useEffect } from 'react';
import { Card, Form } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend
);

const MachineData = ({ data = [], loading }) => {
  const [selectedMachine, setSelectedMachine] = useState('');
  const [machines, setMachines] = useState([]);
  const [machineData, setMachineData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    // Extract machine list from actual data
    if (data && data.length > 0) {
      const uniqueMachines = [...new Set(data.map(item => item.MACHINE_NAME))].sort();
      
      setMachines(uniqueMachines);
      
      // Auto-select first machine if none selected
      if (uniqueMachines.length > 0 && !selectedMachine) {
        setSelectedMachine(uniqueMachines[0]);
      }
      
      setIsLoading(false);
    }
  }, [data, selectedMachine]);

  useEffect(() => {
    // Filter data for selected machine
    if (selectedMachine && data && data.length > 0) {
      const filteredData = data.filter(item => item.MACHINE_NAME === selectedMachine);
      setMachineData(filteredData);
      setCurrentPage(1); // Reset to first page when changing machine
    }
  }, [selectedMachine, data]);

  const handleMachineChange = (e) => {
    setSelectedMachine(e.target.value);
  };

  // Handle download data as CSV
  const handleDownloadCSV = () => {
    if (machineData.length === 0) return;
    
    // Create CSV headers
    const headers = ['NO', 'MACHINE NAME', 'TYPE', 'CATEGORY', 'MEASUREMENT', 'VALUE', 'TIMESTAMP'];
    
    // Format data rows
    const rows = machineData.map((item, index) => [
      index + 1,
      item.MACHINE_NAME || '',
      item.TYPE || '',
      item.CATEGORY || '',
      item.MEASUREMENT || '',
      item.VALUE !== undefined ? item.VALUE : '',
      formatTimestamp(item.START_TIME || item.TIMESTAMP)
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedMachine}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp; // Return original if invalid
    return date.toLocaleString();
  };

  // Format value for display
  const formatValue = (value) => {
    if (value === '0' || value === 0) return 'OFF';
    if (value === '1' || value === 1) return 'ON';
    return value;
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = machineData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(machineData.length / itemsPerPage);

  // Handle page change
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Prepare data for machine activity chart
  const prepareMachineActivityData = () => {
    if (!machineData || machineData.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }
    
    // Sort data by timestamp
    const sortedData = [...machineData].sort((a, b) => {
      const dateA = new Date(a.START_TIME || a.TIMESTAMP);
      const dateB = new Date(b.START_TIME || b.TIMESTAMP);
      return dateA - dateB;
    });
    
    // Generate time labels
    const timeLabels = sortedData.map(item => {
      const date = new Date(item.START_TIME || item.TIMESTAMP);
      return date.toLocaleString();
    });
    
    // Convert values to numeric (1 for ON, 0 for OFF)
    const values = sortedData.map(item => {
      if (item.VALUE === '1' || item.VALUE === 1) return 1;
      if (item.VALUE === '0' || item.VALUE === 0) return 0;
      return null;
    });
    
    // Generate datasets by type
    const typeMap = {};
    sortedData.forEach((item, index) => {
      if (!typeMap[item.TYPE]) {
        typeMap[item.TYPE] = {
          label: item.TYPE,
          data: new Array(sortedData.length).fill(null),
          borderColor: getTypeColor(item.TYPE),
          backgroundColor: getTypeColor(item.TYPE, 0.2),
          tension: 0.3,
          fill: true,
          pointRadius: 4
        };
      }
      typeMap[item.TYPE].data[index] = values[index];
    });
    
    return {
      labels: timeLabels,
      datasets: Object.values(typeMap)
    };
  };
  
  // Get color for machine type
  const getTypeColor = (type, alpha = 1) => {
    const colorMap = {
      'PARKING_BRAKE': `rgba(255, 193, 7, ${alpha})`, // warning color (yellow)
      'FRONT_SAFE_ZONE': `rgba(13, 110, 253, ${alpha})`, // primary color (blue)
      'REAR_SAFE_ZONE': `rgba(13, 202, 240, ${alpha})`, // info color (light blue)
      'DEFAULT': `rgba(153, 102, 255, ${alpha})`
    };
    
    return colorMap[type] || colorMap.DEFAULT;
  };
  
  // Get badge color class for type
  const getTypeBadgeClass = (type) => {
    const badgeMap = {
      'PARKING_BRAKE': 'bg-warning',
      'FRONT_SAFE_ZONE': 'bg-primary',
      'REAR_SAFE_ZONE': 'bg-info',
    };
    
    return badgeMap[type] || 'bg-secondary';
  };
  
  // Format type name for display
  const formatTypeName = (type) => {
    return type;
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 1.2,
        ticks: {
          callback: function(value) {
            if (value === 0) return 'OFF';
            if (value === 1) return 'ON';
            return '';
          }
        },
        title: {
          display: true,
          text: 'Status'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Machine Activity Timeline'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            let status = 'Unknown';
            if (value === 0) status = 'OFF';
            if (value === 1) status = 'ON';
            return `${context.dataset.label}: ${status}`;
          }
        }
      }
    }
  };

  if (loading || isLoading) {
    return (
      <div className="text-center my-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="machine-data-container">
      {/* Machine Selection */}
      <div className="mb-4">
        <div className="row align-items-center">
          <div className="col-md-2 d-flex align-items-center">
            <i className="bi bi-gear-fill me-2"></i>
            <span>Select Machine</span>
          </div>
          <div className="col-md-6">
            <Form.Select 
              className="form-select" 
              value={selectedMachine} 
              onChange={handleMachineChange}
              aria-label="Select Machine"
            >
              {machines.map((machine) => (
                <option key={machine} value={machine}>
                  {machine}
                </option>
              ))}
            </Form.Select>
          </div>
          <div className="col-md-4 text-end">
            <button 
              className="btn btn-success" 
              onClick={handleDownloadCSV}
              disabled={machineData.length === 0}
            >
              <i className="bi bi-download me-1"></i> Export to CSV
            </button>
          </div>
        </div>
      </div>

      {/* Machine Details */}
      {selectedMachine && (
        <div className="mb-4">
          <Card className="shadow-sm mb-4">
              <Card.Body>
              <div className="mb-2">
                <strong>Total Log Entries:</strong> {machineData.length}
              </div>
              {machineData.length > 0 && (
                <div>
                  <strong>Last Updated:</strong> {formatTimestamp(machineData[0].START_TIME || machineData[0].TIMESTAMP)}
                </div>
              )}
              </Card.Body>
            </Card>
        </div>
      )}

      {/* Machine Log Data with Pagination */}
      {machineData.length > 0 ? (
        <>
          {/* Show entries selector */}
          <div className="row mb-3">
            <div className="col-md-6">
              <div className="d-flex align-items-center">
                <label className="me-2">Show</label>
                <select 
                  className="form-select form-select-sm" 
                  style={{ width: 'auto' }}
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[10, 25, 50, 100].map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <label className="ms-2">entries</label>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-striped table-hover table-sm">
              <thead className="table-light">
                <tr>
                  <th className="text-center">NO.</th>
                  <th className="text-center">MACHINE NAME</th>
                  <th className="text-center">TYPE</th>
                  <th className="text-center">CATEGORY</th>
                  <th className="text-center">MEASUREMENT</th>
                  <th className="text-center">VALUE</th>
                  <th className="text-center">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={index}>
                    <td className="text-center">{indexOfFirstItem + index + 1}</td>
                    <td className="text-center">{item.MACHINE_NAME}</td>
                    <td className="text-center">
                      <span className={`badge ${getTypeBadgeClass(item.TYPE)} px-2 py-1`} style={{minWidth: '130px', display: 'inline-block'}}>
                        {formatTypeName(item.TYPE)}
                      </span>
                    </td>
                    <td className="text-center">{item.CATEGORY}</td>
                    <td className="text-center">{item.MEASUREMENT}</td>
                    <td className="text-center">
                      {item.VALUE !== undefined && item.VALUE !== null ? (
                        typeof item.VALUE === 'string' && (item.VALUE === '0' || item.VALUE === '1') ? (
                          <span className={`badge px-2 py-1 ${formatValue(item.VALUE) === 'ON' ? 'bg-success' : 'bg-danger'}`} style={{minWidth: '60px', display: 'inline-block'}}>
                            {formatValue(item.VALUE)}
                          </span>
                        ) : item.VALUE
                      ) : '-'}
                    </td>
                    <td className="text-center">{formatTimestamp(item.START_TIME || item.TIMESTAMP)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="row mt-3">
            <div className="col-md-6">
              <div className="text-muted">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, machineData.length)} of {machineData.length} entries
              </div>
            </div>
            <div className="col-md-6">
              <nav aria-label="Data pagination">
                <ul className="pagination justify-content-end">
                  {/* Previous button */}
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>
                  
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(number => {
                      // Show pages around current page
                      if (totalPages <= 5) return true;
                      if (number === 1 || number === totalPages) return true;
                      if (Math.abs(number - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((number, index, array) => {
                      // Add ellipsis
                      if (index > 0 && array[index - 1] !== number - 1) {
                        return (
                          <React.Fragment key={`ellipsis-${number}`}>
                            <li className="page-item disabled">
                              <span className="page-link">...</span>
                            </li>
                            <li className={`page-item ${currentPage === number ? 'active' : ''}`}>
                              <button 
                                className="page-link" 
                                onClick={() => paginate(number)}
                              >
                                {number}
                              </button>
                            </li>
                          </React.Fragment>
                        );
                      }
                      return (
                        <li 
                          key={number} 
                          className={`page-item ${currentPage === number ? 'active' : ''}`}
                        >
                          <button 
                            className="page-link" 
                            onClick={() => paginate(number)}
                          >
                            {number}
                          </button>
                        </li>
                      );
                    })}
                  
                  {/* Next button */}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>

          {/* Machine Activity Chart */}
          <div className="card shadow-sm mt-4 mb-4">
            <div className="card-header bg-light">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-graph-up me-2"></i>
                  Machine Activity Chart
                </h5>
              </div>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <Line data={prepareMachineActivityData()} options={chartOptions} />
              </div>
            </div>
            <div className="card-footer small text-muted">
              Activity timeline for {selectedMachine} showing status changes over time
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-info">
          <i className="bi bi-info-circle me-2"></i>
          No data available for the selected machine. Please select another machine or check your connection.
        </div>
      )}
    </div>
  );
};

export default MachineData; 
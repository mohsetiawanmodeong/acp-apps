import React, { useState, useEffect } from 'react';
import { Table, Form, Badge, Spinner } from 'react-bootstrap';

const DataTable = ({ data = [], loading = false }) => {
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({
    machineNameFilter: '',
    typeFilter: '',
    valueFilter: ''
  });

  useEffect(() => {
    if (!data || data.length === 0) {
      setFilteredData([]);
      return;
    }
    
    // Apply filters
    let result = [...data];
    
    if (filters.machineNameFilter) {
      result = result.filter(item => {
        const machineName = item.MACHINE_NAME || '';
        return machineName.toLowerCase().includes(filters.machineNameFilter.toLowerCase());
      });
    }
    
    if (filters.typeFilter) {
      result = result.filter(item => {
        const type = item.TYPE || '';
        return type.toLowerCase().includes(filters.typeFilter.toLowerCase());
      });
    }
    
    if (filters.valueFilter) {
      result = result.filter(item => {
        const value = String(item.VALUE || '');
        return value.toLowerCase().includes(filters.valueFilter.toLowerCase());
      });
    }
    
    // Sort by timestamp in descending order
    result.sort((a, b) => {
      const timeA = a.TIMESTAMP || a.START_TIME || '';
      const timeB = b.TIMESTAMP || b.START_TIME || '';
      
      return new Date(timeB) - new Date(timeA);
    });
    
    setFilteredData(result);
  }, [data, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value
    }));
  };

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="data-table-container">
      <div className="filter-row mb-3">
        <div className="row">
          <div className="col-md-4 mb-2">
            <label htmlFor="machine-name-filter" className="form-label">Machine Name</label>
            <Form.Control
              type="text"
              id="machine-name-filter"
              name="machineNameFilter"
              value={filters.machineNameFilter}
              onChange={handleFilterChange}
              placeholder="Filter by machine name..."
              className="form-control"
            />
          </div>
          <div className="col-md-4 mb-2">
            <label htmlFor="type-filter" className="form-label">Type</label>
            <Form.Control
              type="text"
              id="type-filter"
              name="typeFilter"
              value={filters.typeFilter}
              onChange={handleFilterChange}
              placeholder="Filter by type..."
              className="form-control"
            />
          </div>
          <div className="col-md-4 mb-2">
            <label htmlFor="value-filter" className="form-label">Value</label>
            <Form.Control
              type="text"
              id="value-filter"
              name="valueFilter"
              value={filters.valueFilter}
              onChange={handleFilterChange}
              placeholder="Filter by value..."
              className="form-control"
            />
          </div>
        </div>
      </div>
      
      <div className="table-responsive">
        {loading ? (
          <div className="text-center p-5">
            <Spinner animation="border" role="status" variant="primary" className="mb-2" />
            <p>Loading data...</p>
          </div>
        ) : (
          <Table striped hover responsive className="machine-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Machine Name</th>
                <th>Type</th>
                <th className="value-column">Value</th>
                <th>Description</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <tr key={`${item.ID || index}-${index}`}>
                    <td>{item.ID}</td>
                    <td>{item.MACHINE_NAME}</td>
                    <td>{item.TYPE}</td>
                    <td className="value-column">
                      {item.VALUE === 'ON' ? (
                        <Badge bg="danger">Alert</Badge>
                      ) : item.VALUE === 'OFF' ? (
                        <Badge bg="success">Normal</Badge>
                      ) : (
                        item.VALUE
                      )}
                    </td>
                    <td>{item.DESCRIPTION || '-'}</td>
                    <td>{formatDate(item.TIMESTAMP || item.START_TIME)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center">No data available</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default DataTable; 
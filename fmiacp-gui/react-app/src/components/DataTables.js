import React, { useState, useEffect, useRef } from 'react';
import ApiService from '../services/api';

/**
 * DataTables component to display data from API in tabular format
 */
const DataTables = ({ data, loading }) => {
  const [tableData, setTableData] = useState([]);
  const [sortField, setSortField] = useState('START_TIME');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterText, setFilterText] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const entriesOptions = [10, 25, 50, 100];
  
  // Add a filter for "NO." column sorting
  const [rowNumberSort, setRowNumberSort] = useState('asc');
  
  // Preserve sorting state through renders
  const sortingRef = useRef({
    field: 'START_TIME',
    direction: 'desc',
    rowNumberOrder: 'asc',
    isCustomSorted: false
  });

  useEffect(() => {
    if (data && data.length) {
      let sortedData = [...data];
      
      // Apply existing sort if we have custom sorting applied
      if (sortingRef.current.isCustomSorted) {
        if (sortingRef.current.field === 'rowNumber') {
          // For row number sorting, we just need to reverse if needed
          if (sortingRef.current.rowNumberOrder === 'desc') {
            sortedData.reverse();
          }
        } else {
          // Sort by the selected field
          sortedData = sortedData.sort((a, b) => {
            const aValue = a[sortingRef.current.field] || '';
            const bValue = b[sortingRef.current.field] || '';
            
            // Handle different data types
            if (sortingRef.current.field === 'START_TIME' || sortingRef.current.field === 'TIMESTAMP') {
              return sortingRef.current.direction === 'asc' 
                ? new Date(aValue) - new Date(bValue)
                : new Date(bValue) - new Date(aValue);
            }
            
            if (typeof aValue === 'number' && typeof bValue === 'number') {
              return sortingRef.current.direction === 'asc' ? aValue - bValue : bValue - aValue;
            }
            
            // Default string comparison
            return sortingRef.current.direction === 'asc'
              ? String(aValue).localeCompare(String(bValue))
              : String(bValue).localeCompare(String(aValue));
          });
        }
      } else {
        // Default sort by START_TIME descending if no custom sort is applied
        sortedData = sortedData.sort((a, b) => {
          const aTime = a.START_TIME || a.TIMESTAMP || '';
          const bTime = b.START_TIME || b.TIMESTAMP || '';
          return new Date(bTime) - new Date(aTime); // Descending order (newest first)
        });
      }
      
      setTableData(sortedData);
    }
  }, [data]);

  // Handle change in entries per page
  const handleEntriesChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing entries per page
  };

  // Handle sorting for regular columns
  const handleSort = (field) => {
    const newDirection = 
      field === sortField && sortDirection === 'asc' ? 'desc' : 'asc';
    
    setSortField(field);
    setSortDirection(newDirection);
    
    // Update our sorting ref
    sortingRef.current = {
      field: field,
      direction: newDirection,
      rowNumberOrder: rowNumberSort,
      isCustomSorted: true
    };
    
    // Sort the data
    const sortedData = [...tableData].sort((a, b) => {
      const aValue = a[field] || '';
      const bValue = b[field] || '';
      
      // Handle different data types
      if (field === 'START_TIME' || field === 'TIMESTAMP') {
        return newDirection === 'asc' 
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return newDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Default string comparison
      return newDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
    
    setTableData(sortedData);
  };

  // Handle sorting for row number column
  const handleRowNumberSort = () => {
    const newDirection = rowNumberSort === 'asc' ? 'desc' : 'asc';
    setRowNumberSort(newDirection);
    
    // Update our sorting ref
    sortingRef.current = {
      field: 'rowNumber',
      direction: sortDirection,
      rowNumberOrder: newDirection,
      isCustomSorted: true
    };
    
    // For row number sorting, we keep the same filtered data but reverse the order
    const currentData = [...tableData];
    if (newDirection === 'desc') {
      currentData.reverse();
    }
    
    setTableData(currentData);
  };

  // Handle filtering
  const handleFilter = (e) => {
    const value = e.target.value;
    setFilterText(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle column-specific filtering with special handling for VALUE
  const handleColumnFilter = (column, value) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Clear column filter
  const clearColumnFilter = (column) => {
    setColumnFilters(prev => {
      const newFilters = {...prev};
      delete newFilters[column];
      return newFilters;
    });
  };

  // Format value for display and filtering
  const formatValue = (value) => {
    if (value === '0' || value === 0) return 'OFF';
    if (value === '1' || value === 1) return 'ON';
    return value;
  };

  // Apply VALUE filter with special handling for ON/OFF values
  const applyValueFilter = (item, filterValue) => {
    const itemValue = item['VALUE'];
    const formattedValue = formatValue(itemValue);
    
    // Convert filter to uppercase for case-insensitive matching
    const upperFilter = filterValue.toUpperCase();
    
    // Check if filter matches ON/OFF display value
    if (formattedValue && formattedValue.toString().toUpperCase().includes(upperFilter)) {
      return true;
    }
    
    // Special handling for ON/OFF text search
    if (upperFilter === 'ON' && (itemValue === 1 || itemValue === '1')) {
      return true;
    }
    if (upperFilter === 'OFF' && (itemValue === 0 || itemValue === '0')) {
      return true;
    }
    
    // Also allow searching by the original values
    if (itemValue && itemValue.toString().toLowerCase().includes(filterValue.toLowerCase())) {
      return true;
    }
    
    return false;
  };

  // Get filtered data with special handling for VALUE column
  const getFilteredData = () => {
    // Start with all data
    let result = tableData;
    
    // Apply global filter first if it exists
    if (filterText) {
      result = result.filter(item => {
        return Object.entries(item).some(([key, val]) => {
          if (key === 'VALUE') {
            return applyValueFilter(item, filterText);
          }
          return val && val.toString().toLowerCase().includes(filterText.toLowerCase());
        });
      });
    }
    
    // Then apply column-specific filters
    if (Object.keys(columnFilters).length > 0) {
      Object.entries(columnFilters).forEach(([column, filterValue]) => {
        if (filterValue) {
          result = result.filter(item => {
            // Special handling for VALUE column
            if (column === 'VALUE') {
              return applyValueFilter(item, filterValue);
            }
            
            const value = item[column];
            return value && value.toString().toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      });
    }
    
    return result;
  };

  // Pagination
  const filteredData = getFilteredData();
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return timestamp; // Return original if invalid
    return date.toLocaleString();
  };

  // Determine column headers from data and customize their order
  const getTableHeaders = () => {
    if (!tableData.length) return [];
    
    // Define a reordering of fields
    const headerOrder = [
      'MACHINE_NAME',
      'START_TIME',
      'TYPE',       // Type sekarang sebelum Category
      'CATEGORY',   // Category setelah Type
      'MEASUREMENT',
      'VALUE',
      // All other fields that may exist in the data
    ];
    
    // Get all headers from the data
    const allHeaders = Object.keys(tableData[0]);
    
    // Create an ordered list of headers based on our preference
    const orderedHeaders = [];
    
    // First add headers in our specific order (if they exist in the data)
    headerOrder.forEach(header => {
      if (allHeaders.includes(header)) {
        orderedHeaders.push(header);
      }
    });
    
    // Then add any remaining headers that weren't in our ordered list
    allHeaders.forEach(header => {
      if (!orderedHeaders.includes(header) && header !== 'ID') {
        orderedHeaders.push(header);
      }
    });
    
    return orderedHeaders;
  };

  const headers = getTableHeaders();

  // Handle page change
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle download data as CSV
  const handleDownload = () => {
    ApiService.exportData()
      .then(() => console.log('Data exported successfully'))
      .catch(err => console.error('Export failed:', err));
  };

  if (loading) {
    return (
      <div className="text-center my-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="alert alert-info my-3">
        <i className="bi bi-info-circle me-2"></i>
        No data available. Please check your connection or try again later.
      </div>
    );
  }

  return (
    <div className="data-tables-container mb-3">
      {/* Header with title and export button */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">All Data Log ACP</h5>
        <button className="btn btn-success btn-sm" onClick={handleDownload}>
          <i className="bi bi-download me-1"></i> Export to CSV
        </button>
      </div>

      {/* Second row - Show entries and search */}
      <div className="row mb-3">
        <div className="col-md-6">
          <div className="d-flex align-items-center">
            <label className="me-2">Show</label>
            <select 
              className="form-select form-select-sm" 
              style={{ width: 'auto' }}
              value={itemsPerPage}
              onChange={handleEntriesChange}
            >
              {entriesOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <label className="ms-2">entries</label>
          </div>
        </div>
        <div className="col-md-6">
          <div className="input-group input-group-sm" style={{ maxWidth: '300px', float: 'right' }}>
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Filter data..."
              value={filterText}
              onChange={handleFilter}
            />
            {filterText && (
              <button 
                className="btn btn-outline-secondary" 
                type="button"
                onClick={() => setFilterText('')}
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-responsive">
        <table className="table table-striped table-hover table-sm">
          <thead className="table-light">
            <tr>
              <th 
                className={`text-center sortable ${sortField === 'rowNumber' ? 'active' : ''}`}
                onClick={handleRowNumberSort}
              >
                NO.
                <i className={`bi bi-caret-${rowNumberSort === 'asc' ? 'up' : 'down'}-fill ms-1`}></i>
              </th>
              {headers.map(header => (
                <th 
                  key={header} 
                  className={sortField === header ? 'sortable active' : 'sortable'}
                  onClick={() => handleSort(header)}
                >
                  {header.replace(/_/g, ' ')}
                  {sortField === header && (
                    <i className={`bi bi-caret-${sortDirection === 'asc' ? 'up' : 'down'}-fill ms-1`}></i>
                  )}
                </th>
              ))}
            </tr>
            <tr className="column-filters">
              <th></th> {/* Empty cell for the No. column */}
              {headers.map(header => (
                <th key={`filter-${header}`}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder={`Filter ${header.replace(/_/g, ' ')}...`}
                    value={columnFilters[header] || ''}
                    onChange={(e) => handleColumnFilter(header, e.target.value)}
                    onClick={(e) => e.stopPropagation()} // Prevent sorting when clicking on the filter
                  />
                  {columnFilters[header] && (
                    <button 
                      className="btn btn-sm btn-link clear-filter" 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearColumnFilter(header);
                      }}
                    >
                      <i className="bi bi-x"></i>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item, index) => (
              <tr key={index}>
                <td className="text-center">{indexOfFirstItem + index + 1}</td>
                {headers.map(header => (
                  <td key={header}>
                    {header === 'START_TIME' || header === 'TIMESTAMP'
                      ? formatTimestamp(item[header]) 
                      : header === 'VALUE' 
                        ? <span className={`badge ${formatValue(item[header]) === 'ON' ? 'bg-success' : 'bg-danger'}`}>
                            {formatValue(item[header])}
                          </span>
                        : item[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table footer with pagination */}
      <div className="row mt-3">
        {/* Page info (left) */}
        <div className="col-md-4 text-start">
          <div className="text-muted">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {/* Entries info (center) */}
        <div className="col-md-4 text-center">
          <div className="text-muted">
            Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} results
            {filterText && ` (filtered from ${tableData.length} total)`}
          </div>
        </div>

        {/* Pagination (right) */}
        <div className="col-md-4 text-end">
          {totalPages > 1 && (
            <nav aria-label="Data table pagination">
              <ul className="pagination pagination-sm justify-content-end mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => paginate(1)}
                    disabled={currentPage === 1}
                    title="First Page"
                  >
                    <i className="bi bi-chevron-double-left"></i>
                  </button>
                </li>
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Previous Page"
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                </li>
                
                {/* Show only 3 pages max */}
                {(() => {
                  // Determine which pages to show
                  let startPage = Math.max(1, currentPage - 1);
                  let endPage = Math.min(startPage + 2, totalPages);
                  
                  // Adjust if at the end
                  if (endPage === totalPages) {
                    startPage = Math.max(1, endPage - 2);
                  }
                  
                  const pages = [];
                  for (let i = startPage; i <= endPage; i++) {
                    pages.push(
                      <li 
                        key={i} 
                        className={`page-item ${currentPage === i ? 'active' : ''}`}
                      >
                        <button 
                          className="page-link" 
                          onClick={() => paginate(i)}
                        >
                          {i}
                        </button>
                      </li>
                    );
                  }
                  return pages;
                })()}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Next Page"
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </li>
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => paginate(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last Page"
                  >
                    <i className="bi bi-chevron-double-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataTables; 
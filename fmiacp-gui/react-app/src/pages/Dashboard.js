import React, { useState, useEffect } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import DataTable from '../components/DataTable';

const Dashboard = ({ data, isLoading, lastUpdated, error, appStatus, onRefresh }) => {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    dataPoints: 0
  });

  // Calculate statistics when data changes
  useEffect(() => {
    if (!data || data.length === 0) return;
    
    const total = data.length;
    const active = data.filter(item => item.VALUE === 'ON').length;
    const inactive = total - active;
    const dataPoints = data.reduce((sum, item) => sum + 1, 0);
    
    setStats({
      total,
      active,
      inactive,
      dataPoints
    });
  }, [data]);

  return (
    <div className="tab-content">
      <div className="tab-pane fade show active" id="dashboard-tab">
        {/* Stat Cards */}
        <div className="row mb-3">
          <div className="col-md-3 mb-3 mb-md-0">
            <div className="card stat-card h-100">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">Total Machines</h6>
                <div className="stat-value total">{stats.total}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3 mb-md-0">
            <div className="card stat-card h-100">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">Active Machines</h6>
                <div className="stat-value online">{stats.active}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3 mb-md-0">
            <div className="card stat-card h-100">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">Inactive Machines</h6>
                <div className="stat-value offline">{stats.inactive}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card stat-card h-100">
              <div className="card-body">
                <h6 className="card-subtitle mb-2 text-muted">Data Points</h6>
                <div className="stat-value total">{stats.dataPoints}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Data Overview */}
        <div className="row mb-3">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">Latest Machine Data Overview</h5>
              </div>
              <div className="card-body" id="latest-data-overview">
                <div className="row">
                  <div className="col-md-4">
                    <strong>Total Mesin:</strong> {stats.total}
                  </div>
                  <div className="col-md-4">
                    <strong>Kategori Aktif:</strong> {stats.active > 0 ? stats.active : 0}
                  </div>
                  <div className="col-md-4">
                    <strong>Tipe Data:</strong> {data && data.length > 0 ? [...new Set(data.map(item => item.TYPE))].length : 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Data Table */}
        <Card className="shadow-sm mb-4">
          <Card.Header>
            <h5 className="mb-0">Machine Status Data</h5>
          </Card.Header>
          <Card.Body>
            <DataTable 
              data={data} 
              isLoading={isLoading} 
              onRefresh={onRefresh}
            />
          </Card.Body>
        </Card>
        
        {/* Server status info if available */}
        {appStatus && (
          <Card className="shadow-sm mt-4">
            <Card.Header>Server Status</Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <small className="text-muted">Server Version</small>
                  <p>{appStatus.Version}</p>
                </Col>
                <Col md={4}>
                  <small className="text-muted">Data Store Size</small>
                  <p>{appStatus.DataStoreSize}</p>
                </Col>
                <Col md={4}>
                  <small className="text-muted">Total Requests</small>
                  <p>{appStatus.DataOutputRequestCount}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 
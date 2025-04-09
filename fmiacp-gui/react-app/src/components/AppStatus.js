import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge } from 'react-bootstrap';
import { format } from 'date-fns';

const AppStatus = ({ data, lastUpdate }) => {
  const [appInfo, setAppInfo] = useState({
    Name: 'FMIACP',
    Version: '1.0.0',
    StartTime: new Date(),
    DataStoreSize: 0,
    DataStoreCount: 0,
    DataInputCount: 0,
    DataOutputCount: 0,
    CPU: 0,
    UsageMemory: { rss: 0, heapTotal: 0, heapUsed: 0 }
  });
  
  const [uptime, setUptime] = useState('0 days, 0 hours, 0 minutes');

  useEffect(() => {
    // Update app info when data changes
    if (data) {
      setAppInfo(data);
      // Calculate uptime based on current time
      updateUptime();
    }
    
    // Update uptime every minute
    const uptimeInterval = setInterval(updateUptime, 60000);
    
    return () => {
      clearInterval(uptimeInterval);
    };
  }, [data]);

  const updateUptime = () => {
    if (data && data.StartTime) {
      setUptime(calculateUptime(new Date(data.StartTime)));
    }
  };

  const calculateUptime = (startTime) => {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${days} days, ${hours} hours, ${minutes} minutes`;
  };

  // Format memory size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* App Info Cards */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Application Status</Card.Title>
              <Row>
                <Col md={6}>
                  <Table borderless>
                    <tbody>
                      <tr>
                        <td className="fw-bold">Name:</td>
                        <td>{appInfo.Name || 'FMIACP'}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Version:</td>
                        <td>{appInfo.Version || '1.0.0'}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">API Status:</td>
                        <td>
                          {data ? (
                            <Badge bg="success">Connected</Badge>
                          ) : (
                            <Badge bg="danger">Disconnected</Badge>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Last Updated:</td>
                        <td>{lastUpdate || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
                <Col md={6}>
                  <Table borderless>
                    <tbody>
                      <tr>
                        <td className="fw-bold">Uptime:</td>
                        <td>{uptime}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Data Store Size:</td>
                        <td>{appInfo.DataStoreSize || 0} items</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Data Store Count:</td>
                        <td>{appInfo.DataStoreCount || 0}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">CPU Usage:</td>
                        <td>{appInfo.CPU ? `${appInfo.CPU.toFixed(2)}%` : '0%'}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Data Statistics */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Data Statistics</Card.Title>
              <Row>
                <Col md={6}>
                  <Table borderless>
                    <tbody>
                      <tr>
                        <td className="fw-bold">Data Input Count:</td>
                        <td>{appInfo.DataInputCount || 0}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Data Input Requests:</td>
                        <td>{appInfo.DataInputRequestCount || 0}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
                <Col md={6}>
                  <Table borderless>
                    <tbody>
                      <tr>
                        <td className="fw-bold">Data Output Count:</td>
                        <td>{appInfo.DataOutputCount || 0}</td>
                      </tr>
                      <tr>
                        <td className="fw-bold">Data Output Requests:</td>
                        <td>{appInfo.DataOutputRequestCount || 0}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Memory Usage */}
      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Memory Usage</Card.Title>
              <Table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>RSS (Resident Set Size)</td>
                    <td>
                      {appInfo.UsageMemory && appInfo.UsageMemory.rss 
                        ? formatBytes(appInfo.UsageMemory.rss) 
                        : '0 Bytes'}
                    </td>
                  </tr>
                  <tr>
                    <td>Heap Total</td>
                    <td>
                      {appInfo.UsageMemory && appInfo.UsageMemory.heapTotal 
                        ? formatBytes(appInfo.UsageMemory.heapTotal) 
                        : '0 Bytes'}
                    </td>
                  </tr>
                  <tr>
                    <td>Heap Used</td>
                    <td>
                      {appInfo.UsageMemory && appInfo.UsageMemory.heapUsed 
                        ? formatBytes(appInfo.UsageMemory.heapUsed) 
                        : '0 Bytes'}
                    </td>
                  </tr>
                  <tr>
                    <td>Heap Usage Percentage</td>
                    <td>
                      {appInfo.UsageMemory && appInfo.UsageMemory.heapTotal && appInfo.UsageMemory.heapUsed
                        ? ((appInfo.UsageMemory.heapUsed / appInfo.UsageMemory.heapTotal) * 100).toFixed(2) + '%'
                        : '0%'}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AppStatus; 
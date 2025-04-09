import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Spinner } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';

const MachineData = ({ data = [] }) => {
  const [selectedMachine, setSelectedMachine] = useState('');
  const [machines, setMachines] = useState([]);
  const [machineData, setMachineData] = useState({
    activityData: {},
    statusData: {}
  });
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract machine list from actual data
    if (data && data.length > 0) {
      const uniqueMachines = [...new Set(data.map(item => item.MACHINE_NAME))];
      
      // Format for the dropdown
      const machineOptions = uniqueMachines.map(name => ({
        id: name,
        name: name
      }));
      
      setMachines(machineOptions);
      
      // Auto-select first machine
      if (machineOptions.length > 0 && !selectedMachine) {
        setSelectedMachine(machineOptions[0].name);
      }
      
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    // Process machine data when machine is selected
    if (selectedMachine && data && data.length > 0) {
      processAndSetMachineData(selectedMachine, timeRange);
    }
  }, [selectedMachine, timeRange, data]);

  const processAndSetMachineData = (machineName, range) => {
    setLoading(true);
    
    // Filter data for selected machine
    const machineSpecificData = data.filter(item => item.MACHINE_NAME === machineName);
    
    if (machineSpecificData.length === 0) {
      setLoading(false);
      return;
    }
    
    // Generate time labels based on range
    const getTimeLabels = () => {
      const now = new Date();
      const labels = [];
      
      switch (range) {
        case '24h':
          for (let i = 0; i < 24; i++) {
            labels.push(`${i}:00`);
          }
          break;
        case '7d':
          for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
          }
          break;
        case '30d':
          for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
          }
          break;
        default:
          for (let i = 0; i < 24; i++) {
            labels.push(`${i}:00`);
          }
      }
      
      return labels;
    };
    
    const timeLabels = getTimeLabels();
    
    // Prepare data for charts
    // Group data by type
    const dataByType = {};
    
    machineSpecificData.forEach(item => {
      if (!dataByType[item.TYPE]) {
        dataByType[item.TYPE] = [];
      }
      dataByType[item.TYPE].push(item);
    });
    
    // Process activity data (ON/OFF status)
    const activityTypes = Object.keys(dataByType).filter(type => 
      dataByType[type].some(item => item.VALUE === 'ON' || item.VALUE === 'OFF')
    );
    
    const activityDatasets = activityTypes.map((type, index) => {
      const typeData = dataByType[type];
      const colorIndex = index % 5;
      const colors = [
        { border: '#0d6efd', background: 'rgba(13, 110, 253, 0.2)' },
        { border: '#dc3545', background: 'rgba(220, 53, 69, 0.2)' },
        { border: '#198754', background: 'rgba(25, 135, 84, 0.2)' },
        { border: '#ffc107', background: 'rgba(255, 193, 7, 0.2)' },
        { border: '#6c757d', background: 'rgba(108, 117, 125, 0.2)' }
      ];
      
      // Convert data to 0/1 for ON/OFF
      const values = timeLabels.map(() => null); // Initialize with null
      
      typeData.forEach(item => {
        const date = new Date(item.START_TIME);
        let index;
        
        switch (range) {
          case '24h':
            index = date.getHours();
            break;
          case '7d': {
            const dayDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
            if (dayDiff < 7) index = 6 - dayDiff;
            break;
          }
          case '30d': {
            const dayDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
            if (dayDiff < 30) index = 29 - dayDiff;
            break;
          }
          default:
            index = date.getHours();
        }
        
        if (index >= 0 && index < values.length) {
          values[index] = item.VALUE === 'ON' ? 1 : 0;
        }
      });
      
      return {
        label: `${type} Status`,
        data: values,
        borderColor: colors[colorIndex].border,
        backgroundColor: colors[colorIndex].background,
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: colors[colorIndex].border,
        stepped: true
      };
    });
    
    // Process numeric data
    const numericTypes = Object.keys(dataByType).filter(type => 
      dataByType[type].some(item => !isNaN(parseFloat(item.VALUE)))
    );
    
    const numericDatasets = numericTypes.map((type, index) => {
      const typeData = dataByType[type];
      const colorIndex = index % 5;
      const colors = [
        { border: '#0d6efd', background: 'rgba(13, 110, 253, 0.1)' },
        { border: '#dc3545', background: 'rgba(220, 53, 69, 0.1)' },
        { border: '#198754', background: 'rgba(25, 135, 84, 0.1)' },
        { border: '#ffc107', background: 'rgba(255, 193, 7, 0.1)' },
        { border: '#6c757d', background: 'rgba(108, 117, 125, 0.1)' }
      ];
      
      // Extract numeric values
      const values = timeLabels.map(() => null); // Initialize with null
      
      typeData.forEach(item => {
        const numericValue = parseFloat(item.VALUE);
        if (!isNaN(numericValue)) {
          const date = new Date(item.START_TIME);
          let index;
          
          switch (range) {
            case '24h':
              index = date.getHours();
              break;
            case '7d': {
              const dayDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
              if (dayDiff < 7) index = 6 - dayDiff;
              break;
            }
            case '30d': {
              const dayDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
              if (dayDiff < 30) index = 29 - dayDiff;
              break;
            }
            default:
              index = date.getHours();
          }
          
          if (index >= 0 && index < values.length) {
            values[index] = numericValue;
          }
        }
      });
      
      return {
        label: `${type} ${typeData[0].MEASUREMENT || ''}`,
        data: values,
        borderColor: colors[colorIndex].border,
        backgroundColor: colors[colorIndex].background,
        tension: 0.4,
        yAxisID: `y${index > 0 ? index : ''}`
      };
    });
    
    // Set chart data
    setMachineData({
      activityData: {
        labels: timeLabels,
        datasets: activityDatasets
      },
      sensorData: {
        labels: timeLabels,
        datasets: numericDatasets
      }
    });
    
    setLoading(false);
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Status'
        },
        min: 0,
        max: 1,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            return value === 0 ? 'OFF' : value === 1 ? 'ON' : '';
          }
        }
      }
    }
  };
  
  // Dynamic options for sensor charts
  const getSensorChartOptions = () => {
    if (!machineData.sensorData || !machineData.sensorData.datasets) {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        }
      };
    }
    
    const scales = {
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      }
    };
    
    // Add a scale for each dataset
    machineData.sensorData.datasets.forEach((dataset, index) => {
      const yAxisID = `y${index > 0 ? index : ''}`;
      scales[yAxisID] = {
        type: 'linear',
        display: true,
        position: index === 0 ? 'left' : 'right',
        title: {
          display: true,
          text: dataset.label
        },
        grid: {
          drawOnChartArea: index === 0
        }
      };
    });
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales
    };
  };

  return (
    <div>
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Select Machine</Form.Label>
            <Form.Select 
              value={selectedMachine} 
              onChange={(e) => setSelectedMachine(e.target.value)}
              disabled={loading}
            >
              {machines.map((machine) => (
                <option key={machine.id} value={machine.name}>
                  {machine.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Time Range</Form.Label>
            <Form.Select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              disabled={loading}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : (
        <>
          {/* Activity Status Chart */}
          {machineData.activityData.datasets && machineData.activityData.datasets.length > 0 ? (
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>Machine Status Over Time</Card.Title>
                <div style={{ height: '300px' }}>
                  <Line data={machineData.activityData} options={chartOptions} />
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Card className="mb-4">
              <Card.Body className="text-center">
                <Card.Title>Machine Status Over Time</Card.Title>
                <p className="my-5">No status data available for this machine</p>
              </Card.Body>
            </Card>
          )}
          
          {/* Sensor Data Chart */}
          {machineData.sensorData.datasets && machineData.sensorData.datasets.length > 0 ? (
            <Card>
              <Card.Body>
                <Card.Title>Sensor Data Over Time</Card.Title>
                <div style={{ height: '300px' }}>
                  <Line data={machineData.sensorData} options={getSensorChartOptions()} />
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Card>
              <Card.Body className="text-center">
                <Card.Title>Sensor Data Over Time</Card.Title>
                <p className="my-5">No sensor data available for this machine</p>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default MachineData; 
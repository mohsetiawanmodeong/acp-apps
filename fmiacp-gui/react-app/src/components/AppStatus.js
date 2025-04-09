import React from 'react';
import { BiHdd, BiMemoryCard, BiMicrochip, BiServer } from 'react-icons/bi';

// Format bytes to KB, MB, GB
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const AppStatus = ({ data }) => {
  if (!data) {
    return <div>No application status data available.</div>;
  }

  // Format memory usage
  const memory = data.UsageMemory || {};
  const rss = formatBytes(memory.rss || 0);
  const heapTotal = formatBytes(memory.heapTotal || 0);
  const heapUsed = formatBytes(memory.heapUsed || 0);
  const external = formatBytes(memory.external || 0);
  const arrayBuffers = formatBytes(memory.arrayBuffers || 0);
  
  // Format CPU usage
  const cpuUsage = data.UsageCPU || {};
  const userCPU = cpuUsage.user ? Math.round(cpuUsage.user / 1000) + '.00 ms' : '0.00 ms';
  const systemCPU = cpuUsage.system ? Math.round(cpuUsage.system / 1000) + '.00 ms' : '0.00 ms';
  const totalCPU = data.CPU ? data.CPU + '%' : '0.00%';

  return (
    <div>
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">App Name</h5>
              <h2 className="app-info-value">{data.Name || 'FMIACP'}</h2>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Version</h5>
              <h2 className="app-info-value">{data.Version || '2.0'}</h2>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Database Connection</h5>
              <div className="database-status">
                <i className="bi bi-database-check text-success me-2"></i>
                <h2 className="app-info-value text-success">Connected</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-md-7 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">Data Statistics</h5>
              
              <div className="data-stats-table">
                <div className="data-stat-row">
                  <div className="data-stat-icon">
                    <BiHdd />
                  </div>
                  <div className="data-stat-label">Data Store Size:</div>
                  <div className="data-stat-value">{data.DataStoreSize || 0}</div>
                </div>
                
                <div className="data-stat-row">
                  <div className="data-stat-icon">
                    <BiServer />
                  </div>
                  <div className="data-stat-label">Data Store Count:</div>
                  <div className="data-stat-value">{data.DataStoreCount || 0}</div>
                </div>
                
                <div className="data-stat-row">
                  <div className="data-stat-icon">
                    <BiServer />
                  </div>
                  <div className="data-stat-label">Data Store Fail Count:</div>
                  <div className="data-stat-value">{data.DataStoreFailCount || 0}</div>
                </div>
                
                <div className="data-stat-row">
                  <div className="data-stat-icon">
                    <BiServer />
                  </div>
                  <div className="data-stat-label">Data Input Count:</div>
                  <div className="data-stat-value">{data.DataInputCount || 0}</div>
                </div>
                
                <div className="data-stat-row">
                  <div className="data-stat-icon">
                    <BiServer />
                  </div>
                  <div className="data-stat-label">Data Input Request Count:</div>
                  <div className="data-stat-value">{data.DataInputRequestCount || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-5 mb-3">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title">System Usage</h5>
              
              <h6 className="mt-4 text-primary">Memory Usage</h6>
              <div className="system-stat-row">
                <div className="system-stat-icon">
                  <BiMemoryCard />
                </div>
                <div className="system-stat-label">RSS:</div>
                <div className="system-stat-value">{rss}</div>
              </div>
              
              <div className="system-stat-row">
                <div className="system-stat-icon">
                  <BiMemoryCard />
                </div>
                <div className="system-stat-label">Heap Total:</div>
                <div className="system-stat-value">{heapTotal}</div>
              </div>
              
              <div className="system-stat-row">
                <div className="system-stat-icon">
                  <BiMemoryCard />
                </div>
                <div className="system-stat-label">Heap Used:</div>
                <div className="system-stat-value">{heapUsed}</div>
              </div>
              
              <div className="system-stat-row">
                <div className="system-stat-icon">
                  <BiMemoryCard />
                </div>
                <div className="system-stat-label">External:</div>
                <div className="system-stat-value">{external}</div>
              </div>
              
              <div className="system-stat-row">
                <div className="system-stat-icon">
                  <BiMemoryCard />
                </div>
                <div className="system-stat-label">Array Buffers:</div>
                <div className="system-stat-value">{arrayBuffers}</div>
              </div>
              
              <h6 className="mt-4 text-primary">CPU Usage</h6>
              <div className="system-stat-row">
                <div className="system-stat-icon">
                  <BiMicrochip />
                </div>
                <div className="system-stat-label">User CPU:</div>
                <div className="system-stat-value">{userCPU}</div>
              </div>
              
              <div className="system-stat-row">
                <div className="system-stat-icon">
                  <BiMicrochip />
                </div>
                <div className="system-stat-label">System CPU:</div>
                <div className="system-stat-value">{systemCPU}</div>
              </div>
              
              <div className="system-stat-row">
                <div className="system-stat-icon">
                  <BiMicrochip />
                </div>
                <div className="system-stat-label">Total CPU:</div>
                <div className="system-stat-value">{totalCPU}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppStatus; 
import React from 'react';

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
      <h3 className="mb-4">FMIACP App Status</h3>
      
      <div className="row mb-3">
        <div className="col-md-4 mb-3 mb-md-0">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">App Name</h6>
              <p className="h4" id="app-name">{data.Name || 'FMIACP'}</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-4 mb-3 mb-md-0">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Version</h6>
              <p className="h4" id="app-version">{data.Version || '2.0'}</p>
            </div>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="card-subtitle mb-2 text-muted">Database Connection</h6>
              <p className="h4" id="db-connection">
                <i className="bi bi-database-check text-success me-2"></i>
                <span className="text-success">Connected</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="mb-0">Data Statistics</h6>
            </div>
            <div className="card-body">
              <table className="table table-sm table-striped">
                <tbody>
                  <tr>
                    <td><i className="bi bi-database"></i> Data Store Size:</td>
                    <td id="data-store-size" className="text-end">{data.DataStoreSize || 0}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-check-circle"></i> Data Store Count:</td>
                    <td id="data-store-count" className="text-end">{data.DataStoreCount || 0}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-exclamation-triangle"></i> Data Store Fail Count:</td>
                    <td id="data-store-fail-count" className="text-end">{data.DataStoreFailCount || 0}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-arrow-down-circle"></i> Data Input Count:</td>
                    <td id="data-input-count" className="text-end">{data.DataInputCount || 0}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-arrow-down"></i> Data Input Request Count:</td>
                    <td id="data-input-request-count" className="text-end">{data.DataInputRequestCount || 0}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-arrow-up-circle"></i> Data Output Count:</td>
                    <td id="data-output-count" className="text-end">{data.DataOutputCount || 0}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-arrow-up"></i> Data Output Request Count:</td>
                    <td id="data-output-request-count" className="text-end">{data.DataOutputRequestCount || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-3">
          <div className="card h-100">
            <div className="card-header">
              <h6 className="mb-0">System Usage</h6>
            </div>
            <div className="card-body">
              {/* Memory Section */}
              <h6 className="border-bottom pb-2 text-primary">Memory Usage</h6>
              <table className="table table-sm table-striped mb-4">
                <tbody>
                  <tr>
                    <td><i className="bi bi-hdd-rack"></i> RSS:</td>
                    <td id="memory-rss" className="text-end">{rss}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-hdd"></i> Heap Total:</td>
                    <td id="memory-heapTotal" className="text-end">{heapTotal}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-hdd-fill"></i> Heap Used:</td>
                    <td id="memory-heapUsed" className="text-end">{heapUsed}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-device-hdd"></i> External:</td>
                    <td id="memory-external" className="text-end">{external}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-collection"></i> Array Buffers:</td>
                    <td id="memory-arrayBuffers" className="text-end">{arrayBuffers}</td>
                  </tr>
                </tbody>
              </table>
              
              {/* CPU Section */}
              <h6 className="border-bottom pb-2 text-success">CPU Usage</h6>
              <table className="table table-sm table-striped">
                <tbody>
                  <tr>
                    <td><i className="bi bi-person"></i> User CPU:</td>
                    <td id="cpu-user" className="text-end">{userCPU}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-gear"></i> System CPU:</td>
                    <td id="cpu-system" className="text-end">{systemCPU}</td>
                  </tr>
                  <tr>
                    <td><i className="bi bi-percent"></i> Total CPU:</td>
                    <td id="cpu-total" className="text-end">{totalCPU}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppStatus; 
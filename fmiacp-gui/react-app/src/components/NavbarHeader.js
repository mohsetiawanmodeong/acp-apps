import React, { useState } from 'react';

/**
 * NavbarHeader component for the application
 * Displays the title and download button
 */
const NavbarHeader = ({ onRefresh, lastUpdate, apiStatus, activeTab, setActiveTab }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    
    // Reset refreshing state after animation completes
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000); // Match this with animation duration
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleTabClick = (tabName) => {
    console.log("Setting active tab to:", tabName);
    setActiveTab(tabName);
  };

  // Navy blue color from CSS variables
  const navyBlue = "#0a2351";

  return (
    <>
      {/* Top Navbar with logo and title */}
      <nav className="navbar navbar-dark" style={{ backgroundColor: navyBlue }}>
        <div className="container-fluid position-relative">
          {/* Logo Freeport di kiri */}
          <div className="logo-freeport">
            <img 
              src="/img/logo-freeport.png" 
              alt="Freeport" 
            />
          </div>
          
          {/* FMIACP Dashboard text di tengah dengan warna kuning */}
          <div className="position-absolute start-50 translate-middle-x">
            <h4 className="mb-0 text-warning">FMIACP Dashboard</h4>
          </div>
          
          {/* Buttons dan Logo Trakindo di kanan */}
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-link text-white me-2"
              onClick={handleRefreshClick}
              title="Refresh Data"
            >
              <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'fa-spin' : ''}`}></i>
            </button>
            
            <button 
              className="btn btn-link text-white me-4"
              onClick={handleFullscreen}
              title="Toggle Fullscreen"
            >
              <i className="bi bi-fullscreen"></i>
            </button>
            
            <div className="logo-trakindo">
              <img 
                src="/img/logo-trakindo.png" 
                alt="Trakindo" 
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Second navigation bar with bottom tabs - exactly like image 2 */}
      <div style={{ backgroundColor: navyBlue }} className="bottom-nav-container mb-3">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <ul className="nav nav-tabs main-tabs flex-nowrap">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'dashboard' ? 'active bg-white text-primary' : 'text-white'}`}
                onClick={() => handleTabClick('dashboard')}
              >
                <i className={`bi bi-grid me-1 ${activeTab === 'dashboard' ? 'text-primary' : ''}`}></i> Dashboard
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'machine-data' ? 'active bg-white text-primary' : 'text-white'}`}
                onClick={() => handleTabClick('machine-data')}
              >
                <i className={`bi bi-truck me-1 ${activeTab === 'machine-data' ? 'text-primary' : ''}`}></i> Machine Data
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'data-tables' ? 'active bg-white text-primary' : 'text-white'}`}
                onClick={() => handleTabClick('data-tables')}
              >
                <i className={`bi bi-table me-1 ${activeTab === 'data-tables' ? 'text-primary' : ''}`}></i> Data Tables
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeTab === 'app-status' ? 'active bg-white text-primary' : 'text-white'}`}
                onClick={() => handleTabClick('app-status')}
              >
                <i className={`bi bi-cpu me-1 ${activeTab === 'app-status' ? 'text-primary' : ''}`}></i> App Status
              </button>
            </li>
          </ul>

          {/* Last update info */}
          <div className="download-info d-flex align-items-center">
            <button className="btn btn-success btn-sm me-3">
              <i className="bi bi-download me-1"></i> Download Data
            </button>
            <div className="last-update text-white small">
              Last update: {lastUpdate}
              <span className={`ms-2 status-dot ${apiStatus ? 'bg-success' : 'bg-danger'}`}></span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavbarHeader;
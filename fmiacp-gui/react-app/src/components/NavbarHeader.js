import React from 'react';
import { BiRefresh, BiFullscreen, BiDownload } from 'react-icons/bi';

/**
 * NavbarHeader component for the application
 * Displays the title and download button
 */
const NavbarHeader = ({ onRefresh, lastUpdate, apiStatus, activeTab, setActiveTab }) => {
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

  // Add debug log for activeTab
  console.log("Current activeTab:", activeTab);

  const handleTabClick = (tabName) => {
    console.log("Setting active tab to:", tabName);
    setActiveTab(tabName);
  };

  return (
    <>
      {/* Navbar - Logo dan judul di tengah */}
      <nav className="navbar navbar-dark sticky-top">
        <div className="container-fluid">
          {/* Logo Freeport di kiri */}
          <div className="navbar-brand d-flex align-items-center">
            <img 
              src={process.env.PUBLIC_URL + "/img/logo-freeport.png"} 
              alt="Freeport" 
              className="logo-freeport me-4" 
            />
          </div>
          
          {/* FMIACP Dashboard text di tengah dengan warna kuning */}
          <div className="navbar-title-container">
            <h4 className="dashboard-title">FMIACP Dashboard</h4>
          </div>
          
          {/* Buttons dan Logo Trakindo di kanan */}
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-link refresh-btn" 
              onClick={onRefresh}
              title="Refresh Data"
            >
              <BiRefresh size={25} />
            </button>
            
            <button 
              className="btn btn-link fullscreen-btn me-4"
              onClick={handleFullscreen}
              title="Toggle Fullscreen"
            >
              <BiFullscreen size={25} />
            </button>
            
            <div className="navbar-brand d-flex align-items-center">
              <img 
                src={process.env.PUBLIC_URL + "/img/logo-trakindo.png"} 
                alt="Trakindo" 
                className="logo-trakindo" 
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Menu & Last Update Info */}
      <div className="container-fluid p-0">
        <div className="row gx-0">
          <div className="col-12">
            <div className="dashboard-tabs-container bg-white py-2 px-3">
              <div className="d-flex justify-content-between align-items-center">
                {/* Tab Navigation */}
                <ul className="nav nav-tabs border-0">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                      onClick={() => handleTabClick('dashboard')}
                      type="button"
                    >
                      Dashboard
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'machine-data' ? 'active' : ''}`}
                      onClick={() => handleTabClick('machine-data')}
                      type="button"
                    >
                      Machine Data
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'data-tables' ? 'active' : ''}`}
                      onClick={() => handleTabClick('data-tables')}
                      type="button"
                    >
                      Data Tables
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'app-status' ? 'active' : ''}`}
                      onClick={() => handleTabClick('app-status')}
                      type="button"
                    >
                      App Status
                    </button>
                  </li>
                </ul>

                {/* Download & Last Update */}
                <div className="d-flex align-items-center">
                  <button className="btn btn-success download-data-btn">
                    <BiDownload size={18} className="me-1" /> Download Data
                  </button>
                  <div className="ms-3 last-update-info">
                    <span className="text-muted small">Last update: {lastUpdate}</span>
                    <span className={`status-indicator ${apiStatus ? 'connected' : 'disconnected'}`} title="API Status"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NavbarHeader; 
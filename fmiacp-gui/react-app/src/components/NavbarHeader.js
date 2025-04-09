import React, { useState } from 'react';
import { BiRefresh, BiFullscreen, BiDownload } from 'react-icons/bi';

/**
 * NavbarHeader component for the application
 * Displays the title and download button
 */
const NavbarHeader = ({ onRefresh, lastUpdate, apiStatus }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

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

  return (
    <>
      {/* Navbar - Hanya logo dan judul di tengah */}
      <nav className="navbar navbar-dark sticky-top">
        <div className="container-fluid position-relative">
          {/* Logo Freeport di kiri */}
          <div className="navbar-brand">
            <img src={process.env.PUBLIC_URL + "/img/logo-freeport.png"} alt="Freeport" className="logo-freeport" />
          </div>
          
          {/* FMIACP Dashboard text di tengah dengan warna kuning */}
          <h4 className="mb-0 dashboard-title">FMIACP Dashboard</h4>
          
          {/* Buttons dan Logo Trakindo di kanan */}
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-light btn-sm me-2" 
              onClick={onRefresh}
              title="Refresh Data"
            >
              <BiRefresh />
            </button>
            
            <button 
              className="btn btn-light btn-sm me-2"
              onClick={handleFullscreen}
              title="Toggle Fullscreen"
            >
              <BiFullscreen />
            </button>
            
            <div className="navbar-brand">
              <img src={process.env.PUBLIC_URL + "/img/logo-trakindo.png"} alt="Trakindo" className="logo-trakindo" />
            </div>
          </div>
        </div>
      </nav>

      {/* Menu & Dashboard Controls */}
      <div className="container-fluid my-3">
        <div className="row mb-3">
          <div className="col-12">
            <div className="card dashboard-controls">
              <div className="card-body">
                <div className="row align-items-center">
                  {/* Menu Tabs */}
                  <div className="col-md-8">
                    <ul className="nav nav-pills dashboard-nav">
                      <li className="nav-item">
                        <button 
                          className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} 
                          onClick={() => setActiveTab('dashboard')}
                          type="button"
                        >
                          Dashboard
                        </button>
                      </li>
                      <li className="nav-item">
                        <button 
                          className={`nav-link ${activeTab === 'machine-data' ? 'active' : ''}`} 
                          onClick={() => setActiveTab('machine-data')}
                          type="button"
                        >
                          Machine Data
                        </button>
                      </li>
                      <li className="nav-item">
                        <button 
                          className={`nav-link ${activeTab === 'data-tables' ? 'active' : ''}`} 
                          onClick={() => setActiveTab('data-tables')}
                          type="button"
                        >
                          Data Tables
                        </button>
                      </li>
                      <li className="nav-item">
                        <button 
                          className={`nav-link ${activeTab === 'app-status' ? 'active' : ''}`} 
                          onClick={() => setActiveTab('app-status')}
                          type="button"
                        >
                          App Status
                        </button>
                      </li>
                      <li className="nav-item ms-2">
                        <button className="btn btn-success btn-sm">
                          <BiDownload /> Download Data
                        </button>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Update interval & last update */}
                  <div className="col-md-4">
                    <div className="d-flex justify-content-end align-items-center">
                      <div className="d-flex align-items-center">
                        <span className="me-2 text-muted small">Last update: {lastUpdate}</span>
                        <span className={`status-indicator ${apiStatus ? 'connected' : 'disconnected'}`} title="API Status"></span>
                      </div>
                    </div>
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
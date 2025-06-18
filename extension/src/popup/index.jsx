// React Popup Entry Point
// Main entry point for the JobScrapper React popup component

import React from 'react';
import ReactDOM from 'react-dom/client';
import JobScrapperPopup from './JobScrapperPopup.jsx';
import './PopupStyles.css';

// Initialize the React popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('popup-root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(<JobScrapperPopup />);
  } else {
    console.error('Popup container not found');
  }
});

// Export for potential module usage
export default JobScrapperPopup;

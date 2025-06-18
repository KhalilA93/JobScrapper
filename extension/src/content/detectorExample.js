// Job Site Detector Usage Example

import { JobSiteDetector } from './jobSiteDetector.js';

// Initialize detector
const detector = new JobSiteDetector();
detector.init();

// Listen for site detection
detector.onSiteDetected((event) => {
  const { site, isJobPage, config } = event.detail;
  console.log(`Detected: ${site}, Job Page: ${isJobPage}`);
  
  if (isJobPage) {
    // Access site-specific selectors
    const selectors = detector.getSelectors();
    console.log('Available selectors:', Object.keys(selectors));
    
    // Get job title element
    const titleElement = detector.getElement('jobTitle');
    if (titleElement) {
      console.log('Job Title:', titleElement.textContent);
    }
    
    // Check site features
    if (detector.supportsFeature('easyApply')) {
      console.log('Site supports Easy Apply');
    }
  }
});

// Example: Wait for specific element on LinkedIn
detector.onJobPageEntered(async (siteData) => {
  if (siteData.site === 'linkedin') {
    const applyButton = await detector.waitForElement('easyApply', 3000);
    if (applyButton) {
      console.log('Easy Apply button found!');
    }
  }
});

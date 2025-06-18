// Stealth Scraping Usage Examples
// Implementation patterns for natural web scraping

import { StealthScraper } from './stealthScraper.js';
import { StealthUtils, StealthInteractions, StealthPatterns } from './stealthUtils.js';
import { JobSiteStealth } from './jobSiteStealth.js';

// Example 1: Basic stealth interactions
async function basicStealthExample() {
  const stealth = new StealthScraper();
  
  // Human-like delays
  await StealthUtils.actionDelay(); // 500-1500ms
  await StealthUtils.microDelay();  // 50-200ms
  await StealthUtils.pageDelay();   // 2000-5000ms
  
  // Natural clicking
  const button = document.querySelector('.apply-button');
  await StealthInteractions.naturalClick(button);
  
  // Human-like typing
  const input = document.querySelector('input[name="email"]');
  await stealth.simulateTyping(input, 'user@example.com', {
    mistakes: 0.02 // 2% chance of typos
  });
  
  // Natural scrolling
  await StealthInteractions.exploreContent({
    scrollCount: 3,
    readSections: true,
    backtrack: 0.2
  });
}

// Example 2: Job application flow
async function jobApplicationExample() {
  const jobStealth = new JobSiteStealth();
  
  // LinkedIn job application
  const jobCard = document.querySelector('[data-job-id="123456"]');
  const applicationData = {
    phone: '+1-555-0123',
    coverLetter: 'I am interested in this position...',
    customAnswers: {
      'experience': '5 years',
      'sponsorship': 'No',
      'salary': 'Negotiable'
    }
  };
  
  const result = await jobStealth.applyToJob('linkedin', jobCard, applicationData);
  console.log('Application result:', result);
}

// Example 3: Rate limiting patterns
async function rateLimitingExample() {
  // Check rate limits before actions
  const stealth = new StealthScraper();
  await stealth.checkRateLimit();
  
  // Job-specific rate limiting
  await StealthRateLimit.jobApplicationDelay(); // 5-15 minutes
  await StealthRateLimit.searchPageDelay();     // 10-30 seconds
  await StealthRateLimit.profileViewDelay();    // 3-8 seconds
  
  // Bulk operations with exponential backoff
  for (let i = 0; i < 10; i++) {
    await StealthRateLimit.bulkOperationDelay(i);
    // Perform operation
  }
}

// Example 4: User agent rotation
async function userAgentExample() {
  const stealth = new StealthScraper({
    rotateUserAgent: true,
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...'
    ]
  });
  
  // Each request uses different user agent
  const headers1 = stealth.generateHeaders();
  const headers2 = stealth.generateHeaders();
  console.log('UA1:', headers1['User-Agent']);
  console.log('UA2:', headers2['User-Agent']);
}

// Example 5: DOM interaction simulation
async function domInteractionExample() {
  const stealth = new StealthScraper();
  
  // Scroll to element naturally
  const targetElement = document.querySelector('.job-description');
  await stealth.scrollToElement(targetElement, {
    offset: 100,
    smooth: true
  });
  
  // Simulate mouse movement and hover
  await stealth.simulateMouseMovement(targetElement, {
    duration: 500,
    curve: 'bezier'
  });
  
  // Wait for element with human-like checking
  const dynamicElement = await stealth.waitForElement('.loading-content', {
    timeout: 10000,
    checkInterval: 'random' // Random intervals between checks
  });
}

// Example 6: Form filling with natural behavior
async function formFillingExample() {
  const formData = {
    '#firstName': 'John',
    '#lastName': 'Doe',
    '#email': 'john.doe@example.com',
    '#phone': '+1-555-0123',
    'textarea[name="coverLetter"]': 'Dear Hiring Manager...'
  };
  
  await StealthInteractions.fillForm(formData, {
    fieldDelay: true,
    tabNavigation: true // Occasionally use Tab key
  });
}

// Example 7: Search interaction pattern
async function searchExample() {
  const searchInput = document.querySelector('input[name="q"]');
  
  await StealthInteractions.performSearch(searchInput, 'software engineer', {
    clearFirst: true,
    submitMethod: 'enter'
  });
  
  // Browse results naturally
  await StealthPatterns.jobSearchBrowsing('software engineer');
}

// Example 8: Detection avoidance
async function detectionAvoidanceExample() {
  // Break behavioral patterns
  await StealthAvoidance.breakPattern();
  
  // Simulate human errors
  await StealthAvoidance.simulateHumanError();
  
  // Randomize browser fingerprint
  await StealthAvoidance.randomizeFingerprint();
  
  // Check if behavior looks suspicious
  const isSuspicious = StealthSession.isSuspiciousBehavior();
  if (isSuspicious) {
    console.warn('Behavior may appear suspicious, slowing down...');
    await StealthUtils.pageDelay();
  }
}

// Example 9: LinkedIn specific flow
async function linkedInFlowExample() {
  const linkedInStealth = new JobSiteStealth();
  
  // Browse LinkedIn jobs
  await linkedInStealth.browseJobs('linkedin', {
    keyword: 'frontend developer',
    location: 'San Francisco, CA',
    experienceLevel: 'mid'
  });
  
  // Apply to specific job
  const jobElement = document.querySelector('[data-job-id="987654"]');
  const result = await linkedInStealth.applyToJob('linkedin', jobElement, {
    phone: '+1-555-0123',
    coverLetter: 'I am excited about this opportunity...',
    customAnswers: {
      'years of experience': '4',
      'willing to relocate': 'Yes',
      'expected salary': '$120,000'
    }
  });
}

// Example 10: Error handling and recovery
async function errorHandlingExample() {
  const stealth = new StealthScraper();
  
  try {
    // Attempt stealth operation
    const element = await stealth.waitForElement('.target-element', {
      timeout: 5000
    });
    
    await StealthInteractions.naturalClick(element);
    
  } catch (error) {
    console.error('Stealth operation failed:', error);
    
    // Recovery strategies
    if (error.message.includes('rate limit')) {
      await stealth.exponentialBackoff();
    } else if (error.message.includes('Element not found')) {
      // Try alternative selectors
      const fallbackElement = document.querySelector('.alternative-selector');
      if (fallbackElement) {
        await StealthInteractions.naturalClick(fallbackElement);
      }
    }
  }
}

// Example 11: Session monitoring
async function sessionMonitoringExample() {
  // Log actions for pattern analysis
  StealthSession.logAction('page_view');
  StealthSession.logAction('job_click', jobElement);
  StealthSession.logAction('application_submit');
  
  // Get session statistics
  const stats = StealthSession.getSessionStats();
  console.log('Session stats:', {
    duration: `${stats.duration} seconds`,
    actionCount: stats.actionCount,
    actionsPerMinute: stats.actionsPerMinute.toFixed(2),
    pageViews: stats.pageViews
  });
  
  // Check for suspicious behavior
  if (StealthSession.isSuspiciousBehavior()) {
    console.warn('Suspicious behavior detected, implementing countermeasures...');
    await StealthUtils.pageDelay();
    await StealthAvoidance.breakPattern();
  }
}

// Export examples for testing
export {
  basicStealthExample,
  jobApplicationExample,
  rateLimitingExample,
  userAgentExample,
  domInteractionExample,
  formFillingExample,
  searchExample,
  detectionAvoidanceExample,
  linkedInFlowExample,
  errorHandlingExample,
  sessionMonitoringExample
};

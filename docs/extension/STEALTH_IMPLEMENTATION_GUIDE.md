# Stealth Scraping Implementation Guide

This guide demonstrates how to implement and use the stealth scraping utilities to avoid bot detection while maintaining natural, human-like behavior.

## Core Stealth Components

### 1. StealthScraper (Base Class)
The foundation class providing core stealth functionality:

```javascript
import { StealthScraper } from './stealthScraper.js';

// Initialize with custom configuration
const stealth = new StealthScraper({
  minActionDelay: 500,
  maxActionDelay: 3000,
  maxRequestsPerMinute: 20,
  enableMouseSimulation: true,
  enableScrollSimulation: true
});

// Human-like delays
await stealth.randomDelay(1000, 3000);

// Natural mouse movement and click
await stealth.simulateClick(element, {
  hover: true,
  scroll: true,
  delay: true
});

// Human-like typing with mistakes
await stealth.simulateTyping(inputElement, 'text to type', {
  minDelay: 80,
  maxDelay: 200,
  mistakes: 0.02 // 2% chance of typos
});
```

### 2. StealthUtils (Common Patterns)
Pre-configured patterns for common scenarios:

```javascript
import { StealthUtils, StealthInteractions } from './stealthUtils.js';

// Different delay types
await StealthUtils.microDelay();        // 50-200ms
await StealthUtils.actionDelay();       // 500-1500ms
await StealthUtils.pageDelay();         // 2000-5000ms
await StealthUtils.readingDelay(300);   // Based on text length

// Natural interactions
await StealthInteractions.naturalClick(element);
await StealthInteractions.carefulClick(element);
await StealthInteractions.exploreContent({
  scrollCount: 3,
  readSections: true,
  backtrack: 0.2
});
```

### 3. Advanced Stealth Features
Enhanced detection avoidance and fingerprint management:

```javascript
import { AdvancedStealth } from './advancedStealth.js';

const advancedStealth = new AdvancedStealth({
  randomizeFingerprint: true,
  spoofWebGL: true,
  spoofCanvas: true,
  enableIdleSimulation: true
});

// Apply fingerprint modifications
await advancedStealth.applyFingerprint();

// Simulate idle behavior
await advancedStealth.simulateIdleBehavior(30000);

// Execute behavior patterns
await advancedStealth.behaviorPatterns.executePattern('jobSeekerBehavior');
```

## Implementation Patterns

### Job Application Flow

```javascript
import { JobSiteStealth } from './jobSiteStealth.js';
import { formFiller } from './formFiller.js';

async function applyToJob(jobElement, userProfile) {
  const jobStealth = new JobSiteStealth();
  const siteName = detectJobSite(); // linkedin, indeed, glassdoor
  
  try {
    // Use site-specific stealth handler
    const result = await jobStealth.applyToJob(siteName, jobElement, {
      phone: userProfile.phone,
      coverLetter: userProfile.coverLetter,
      customAnswers: userProfile.answers
    });
    
    return result;
  } catch (error) {
    console.error('Application failed:', error);
    return { success: false, error: error.message };
  }
}
```

### Form Filling with Stealth

```javascript
async function fillJobApplicationForm(userProfile) {
  const siteName = window.location.hostname.includes('linkedin') ? 'linkedin' : 'generic';
  
  // Use site-specific form filler
  await formFiller[siteName].fillForm(userProfile);
  
  // Add natural post-fill behavior
  await StealthUtils.readingDelay(100); // Review filled form
  await StealthInteractions.exploreContent({ scrollCount: 1 });
}
```

### Search and Browse Pattern

```javascript
async function searchAndBrowseJobs(searchTerm, options = {}) {
  const stealth = new StealthScraper();
  
  // Natural search entry
  const searchInput = await stealth.waitForElement('input[type="search"]');
  await StealthInteractions.performSearch(searchInput, searchTerm);
  
  // Browse results naturally
  await StealthInteractions.exploreContent({
    scrollCount: 3,
    readSections: true,
    backtrack: 0.3
  });
  
  // View some job details
  const jobCards = document.querySelectorAll('.job-card, [data-job-id]');
  const viewCount = Math.min(3, Math.floor(Math.random() * 5) + 1);
  
  for (let i = 0; i < viewCount && i < jobCards.length; i++) {
    const randomIndex = Math.floor(Math.random() * jobCards.length);
    await StealthInteractions.naturalClick(jobCards[randomIndex]);
    await StealthUtils.readingDelay(200);
    await StealthRateLimit.profileViewDelay();
  }
}
```

## Rate Limiting Strategies

### Application Rate Limiting
```javascript
import { StealthRateLimit } from './stealthUtils.js';

async function processJobApplications(jobs, userProfile) {
  for (const job of jobs) {
    try {
      await applyToJob(job, userProfile);
      
      // Wait between applications (5-15 minutes)
      await StealthRateLimit.jobApplicationDelay();
      
    } catch (error) {
      console.error('Application failed:', error);
      
      // Longer delay on errors
      await StealthRateLimit.bulkOperationDelay(jobs.indexOf(job));
    }
  }
}
```

### Search Rate Limiting
```javascript
async function processSearchResults() {
  const pages = document.querySelectorAll('.pagination a');
  
  for (const page of pages) {
    await StealthInteractions.naturalClick(page);
    
    // Process page content
    await searchAndBrowseJobs();
    
    // Delay between pages
    await StealthRateLimit.searchPageDelay();
  }
}
```

## Error Handling and Recovery

### Graceful Error Recovery
```javascript
async function robustJobApplication(jobElement, userProfile, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await applyToJob(jobElement, userProfile);
      
      if (result.success) {
        return result;
      }
      
      // If application failed, wait before retry
      await StealthUtils.actionDelay();
      
    } catch (error) {
      console.warn(`Application attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff on errors
      await StealthRateLimit.bulkOperationDelay(attempt);
    }
  }
}
```

### Detection Recovery
```javascript
import { DetectionAvoider } from './advancedStealth.js';

async function handleBotDetection() {
  const avoider = new DetectionAvoider();
  
  // Check if bot detection is active
  const detected = await avoider.detectBotDetection();
  
  if (detected) {
    console.warn('Bot detection detected, applying countermeasures');
    
    // Apply countermeasures
    await avoider.counterBotDetection();
    
    // Add extra human-like behavior
    await advancedStealth.simulateIdleBehavior(60000); // 1 minute
    
    // Change behavior pattern
    await advancedStealth.behaviorPatterns.executePattern('casualBrowser');
  }
}
```

## Best Practices

### 1. Timing Variation
```javascript
// Bad: Consistent timing
await new Promise(resolve => setTimeout(resolve, 1000));

// Good: Variable timing with human-like distribution
await stealth.randomDelay(800, 1500);
```

### 2. Mouse Movement
```javascript
// Bad: Direct click without movement
element.click();

// Good: Natural mouse movement before click
await stealth.simulateMouseMovement(element);
await stealth.simulateClick(element);
```

### 3. Form Filling
```javascript
// Bad: Instant form filling
input.value = 'text';

// Good: Human-like typing with occasional mistakes
await stealth.simulateTyping(input, 'text', {
  mistakes: 0.02,
  minDelay: 80,
  maxDelay: 200
});
```

### 4. Session Management
```javascript
import { StealthSession } from './stealthUtils.js';

// Track session behavior
StealthSession.logAction('job_application_start');

// Check for suspicious behavior
if (StealthSession.isSuspiciousBehavior()) {
  console.warn('Behavior appears suspicious, adjusting patterns');
  await StealthUtils.pageDelay();
  await advancedStealth.simulateIdleBehavior(30000);
}
```

### 5. Fingerprint Management
```javascript
// Randomize fingerprint on session start
await advancedStealth.applyFingerprint();

// Rotate user agents
const headers = stealth.generateHeaders();
console.log('Using User-Agent:', headers['User-Agent']);
```

## Site-Specific Implementations

### LinkedIn Easy Apply
```javascript
async function linkedinEasyApply(jobElement, applicationData) {
  const linkedinStealth = new LinkedInStealth();
  
  // Read job details first
  await linkedinStealth.readJobDetails();
  
  // Handle Easy Apply flow
  const result = await linkedinStealth.handleEasyApply(applyButton, applicationData);
  
  return result;
}
```

### Indeed Application
```javascript
async function indeedApplication(jobElement, applicationData) {
  const indeedStealth = new IndeedStealth();
  
  // Use Indeed-specific patterns
  const result = await indeedStealth.applyToJob(jobElement, applicationData);
  
  return result;
}
```

## Monitoring and Analytics

### Session Statistics
```javascript
// Get session performance metrics
const stats = StealthSession.getSessionStats();
console.log('Session duration:', stats.duration, 'seconds');
console.log('Actions per minute:', stats.actionsPerMinute);
console.log('Average action interval:', stats.averageActionInterval, 'ms');
```

### Rate Limit Monitoring
```javascript
// Check current rate limit status
const rateLimitOk = await stealth.checkRateLimit();
if (!rateLimitOk) {
  console.log('Rate limited, waiting for backoff');
}
```

This implementation provides a comprehensive stealth scraping system that mimics human behavior while avoiding common bot detection techniques. The modular design allows for easy customization and extension for specific job sites and use cases.

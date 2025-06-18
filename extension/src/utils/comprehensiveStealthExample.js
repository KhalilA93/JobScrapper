// Comprehensive Stealth Integration Example
// Demonstrates how to combine all stealth techniques for job scraping

import { StealthScraper } from './stealthScraper.js';
import { StealthUtils, StealthInteractions, StealthRateLimit, StealthSession } from './stealthUtils.js';
import { AdvancedStealth } from './advancedStealth.js';
import { JobSiteStealth } from './jobSiteStealth.js';
import { formFiller } from './formFiller.js';
import { jobSiteDetector } from '../content/jobSiteDetector.js';

class ComprehensiveJobScraper {
  constructor(options = {}) {
    this.config = {
      maxApplications: options.maxApplications || 10,
      sessionDuration: options.sessionDuration || 3600000, // 1 hour
      enableAdvancedStealth: options.enableAdvancedStealth !== false,
      enableBehaviorPatterns: options.enableBehaviorPatterns !== false,
      enableRateLimit: options.enableRateLimit !== false
    };
    
    // Initialize stealth components
    this.stealth = new StealthScraper({
      minActionDelay: 800,
      maxActionDelay: 3000,
      maxRequestsPerMinute: 15, // Conservative for job sites
      enableMouseSimulation: true,
      enableScrollSimulation: true
    });
    
    this.advancedStealth = new AdvancedStealth({
      randomizeFingerprint: true,
      spoofWebGL: true,
      spoofCanvas: true,
      enableIdleSimulation: true,
      enableTabSwitchSimulation: true
    });
    
    this.jobSiteHandler = new JobSiteStealth();
    
    // Session tracking
    this.applicationCount = 0;
    this.sessionStartTime = Date.now();
    this.lastBehaviorCheck = Date.now();
  }

  // Main scraping orchestration
  async startJobScraping(userProfile, searchCriteria) {
    console.log('🚀 Starting comprehensive job scraping session');
    
    try {
      // Initialize stealth environment
      await this.initializeStealth();
      
      // Detect current job site
      const siteInfo = await this.detectJobSite();
      console.log(`📍 Detected job site: ${siteInfo.name}`);
      
      // Execute site-specific scraping flow
      const results = await this.executeSiteSpecificFlow(siteInfo, userProfile, searchCriteria);
      
      console.log('✅ Scraping session completed successfully');
      return results;
      
    } catch (error) {
      console.error('❌ Scraping session failed:', error);
      await this.handleError(error);
      throw error;
    } finally {
      await this.cleanupSession();
    }
  }

  // Initialize stealth environment
  async initializeStealth() {
    console.log('🔧 Initializing stealth environment...');
    
    // Apply advanced fingerprint modifications
    if (this.config.enableAdvancedStealth) {
      await this.advancedStealth.applyFingerprint();
      
      // Check for and counter bot detection
      const detectionAvoider = this.advancedStealth.detectionAvoider;
      const detected = await detectionAvoider.detectBotDetection();
      
      if (detected) {
        console.warn('⚠️ Bot detection detected, applying countermeasures');
        await detectionAvoider.counterBotDetection();
        await StealthUtils.pageDelay();
      }
    }
    
    // Initial page exploration to appear natural
    await this.simulateInitialPageLoad();
    
    console.log('✅ Stealth environment initialized');
  }

  // Simulate natural page load behavior
  async simulateInitialPageLoad() {
    // Simulate user landing on page and getting oriented
    await StealthUtils.readingDelay(200); // Read page title/header
    
    // Natural scrolling to explore page
    await StealthInteractions.exploreContent({
      scrollCount: 2,
      readSections: true,
      backtrack: 0.1
    });
    
    // Occasional mouse movement
    const headings = document.querySelectorAll('h1, h2, h3');
    if (headings.length > 0) {
      const randomHeading = headings[Math.floor(Math.random() * headings.length)];
      await this.stealth.simulateMouseMovement(randomHeading);
    }
  }

  // Detect current job site
  async detectJobSite() {
    const detectionResult = jobSiteDetector.detectCurrentSite();
    
    if (!detectionResult.isJobSite) {
      throw new Error('Current page is not a recognized job site');
    }
    
    return detectionResult;
  }

  // Execute site-specific scraping flow
  async executeSiteSpecificFlow(siteInfo, userProfile, searchCriteria) {
    const results = {
      siteName: siteInfo.name,
      applicationsSubmitted: 0,
      jobsViewed: 0,
      errors: [],
      sessionStats: {}
    };
    
    try {
      // Step 1: Perform job search if needed
      if (searchCriteria) {
        await this.performJobSearch(siteInfo, searchCriteria);
        results.searchPerformed = true;
      }
      
      // Step 2: Browse and analyze job listings
      const jobListings = await this.discoverJobListings(siteInfo);
      results.jobsFound = jobListings.length;
      
      // Step 3: Process job applications
      const applicationResults = await this.processJobApplications(
        siteInfo, 
        jobListings, 
        userProfile
      );
      
      results.applicationsSubmitted = applicationResults.successful;
      results.jobsViewed = applicationResults.viewed;
      results.errors = applicationResults.errors;
      
      // Step 4: Session cleanup and statistics
      results.sessionStats = StealthSession.getSessionStats();
      
      return results;
      
    } catch (error) {
      results.errors.push(error.message);
      throw error;
    }
  }

  // Perform job search with stealth
  async performJobSearch(siteInfo, searchCriteria) {
    console.log('🔍 Performing job search...');
    
    // Use site-specific search handler
    const searchHandler = this.jobSiteHandler.getSiteHandler(siteInfo.name);
    
    // Execute search with natural behavior
    await searchHandler.browseJobs(searchCriteria);
    
    // Post-search natural behavior
    await this.simulateSearchResultsReview();
    
    console.log('✅ Job search completed');
  }

  // Simulate reviewing search results
  async simulateSearchResultsReview() {
    // Natural result browsing behavior
    await StealthInteractions.exploreContent({
      scrollCount: 3,
      readSections: true,
      backtrack: 0.2
    });
    
    // Look at a few job titles
    const jobTitles = document.querySelectorAll('.job-title, h3, h4, [data-testid*="title"]');
    const reviewCount = Math.min(5, Math.floor(Math.random() * 3) + 2);
    
    for (let i = 0; i < reviewCount && i < jobTitles.length; i++) {
      const randomTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];
      await this.stealth.simulateMouseMovement(randomTitle);
      await StealthUtils.readingDelay(50);
    }
  }

  // Discover job listings on current page
  async discoverJobListings(siteInfo) {
    console.log('📋 Discovering job listings...');
    
    const selectors = siteInfo.selectors;
    const jobElements = document.querySelectorAll(selectors.jobCard || '.job-card, [data-job-id], .job-listing');
    
    console.log(`Found ${jobElements.length} job listings`);
    return Array.from(jobElements);
  }

  // Process job applications with comprehensive stealth
  async processJobApplications(siteInfo, jobListings, userProfile) {
    console.log(`📝 Processing ${jobListings.length} job applications...`);
    
    const results = {
      successful: 0,
      viewed: 0,
      errors: []
    };
    
    // Limit applications per session
    const maxApplications = Math.min(this.config.maxApplications, jobListings.length);
    const selectedJobs = this.selectJobsForApplication(jobListings, maxApplications);
    
    for (let i = 0; i < selectedJobs.length; i++) {
      const job = selectedJobs[i];
      
      try {
        // Check session limits
        if (this.shouldEndSession()) {
          console.log('⏰ Session time limit reached, ending applications');
          break;
        }
        
        // Behavioral check and adjustment
        await this.performBehaviorCheck();
        
        // Process single job application
        const applicationResult = await this.processSingleApplication(
          siteInfo, 
          job, 
          userProfile,
          i + 1,
          selectedJobs.length
        );
        
        if (applicationResult.success) {
          results.successful++;
        }
        results.viewed++;
        
        // Post-application behavior and rate limiting
        await this.postApplicationBehavior(i, selectedJobs.length);
        
      } catch (error) {
        console.error(`Application ${i + 1} failed:`, error);
        results.errors.push(`Job ${i + 1}: ${error.message}`);
        
        // Error recovery delay
        await StealthRateLimit.bulkOperationDelay(results.errors.length);
      }
    }
    
    console.log(`✅ Applications processed: ${results.successful}/${results.viewed}`);
    return results;
  }

  // Select jobs for application using intelligent filtering
  selectJobsForApplication(jobListings, maxApplications) {
    // Shuffle array to avoid always applying to first jobs
    const shuffled = [...jobListings].sort(() => Math.random() - 0.5);
    
    // Take random subset
    return shuffled.slice(0, maxApplications);
  }

  // Process a single job application
  async processSingleApplication(siteInfo, jobElement, userProfile, current, total) {
    console.log(`📋 Processing application ${current}/${total}`);
    
    StealthSession.logAction('job_application_start', jobElement);
    
    // Natural job viewing behavior
    await this.simulateJobReview(jobElement);
    
    // Site-specific application process
    const siteHandler = this.jobSiteHandler.getSiteHandler(siteInfo.name);
    const applicationResult = await siteHandler.applyToJob(jobElement, {
      phone: userProfile.phone,
      coverLetter: userProfile.coverLetter,
      customAnswers: userProfile.customAnswers || {}
    });
    
    // Log application result
    StealthSession.logAction('job_application_complete', jobElement);
    this.applicationCount++;
    
    console.log(`${applicationResult.success ? '✅' : '❌'} Application ${current}: ${applicationResult.success ? 'Success' : 'Failed'}`);
    
    return applicationResult;
  }

  // Simulate natural job review behavior
  async simulateJobReview(jobElement) {
    // Click to view job details
    await StealthInteractions.carefulClick(jobElement);
    
    // Read job title and company
    const title = jobElement.querySelector('.job-title, h3, h4') || jobElement;
    await this.stealth.simulateMouseMovement(title);
    await StealthUtils.readingDelay(100);
    
    // Look for salary information
    const salaryElement = document.querySelector('.salary, [data-testid*="salary"]');
    if (salaryElement) {
      await this.stealth.simulateMouseMovement(salaryElement);
      await StealthUtils.readingDelay(50);
    }
    
    // Read job description
    const description = document.querySelector('.job-description, .description');
    if (description) {
      await this.stealth.scrollToElement(description);
      await StealthUtils.readingDelay(description.textContent?.length || 200);
    }
    
    // Check company information
    const company = document.querySelector('.company-name, .employer');
    if (company) {
      await this.stealth.simulateMouseMovement(company);
      await StealthUtils.readingDelay(80);
    }
  }

  // Post-application behavior and rate limiting
  async postApplicationBehavior(applicationIndex, totalApplications) {
    // Natural post-application delay
    await StealthUtils.actionDelay();
    
    // Occasionally browse other jobs
    if (Math.random() < 0.3) {
      console.log('👀 Browsing other jobs naturally...');
      await this.simulateJobBrowsing();
    }
    
    // Rate limiting between applications
    if (applicationIndex < totalApplications - 1) {
      console.log('⏱️ Rate limiting before next application...');
      await StealthRateLimit.jobApplicationDelay();
    }
    
    // Periodic idle simulation
    if (applicationIndex > 0 && applicationIndex % 3 === 0) {
      console.log('😴 Simulating idle behavior...');
      await this.advancedStealth.simulateIdleBehavior(15000);
    }
  }

  // Simulate browsing other jobs naturally
  async simulateJobBrowsing() {
    const otherJobs = document.querySelectorAll('.job-card, [data-job-id]');
    if (otherJobs.length > 1) {
      const randomJob = otherJobs[Math.floor(Math.random() * Math.min(3, otherJobs.length))];
      await StealthInteractions.naturalClick(randomJob);
      await StealthUtils.readingDelay(150);
      await StealthRateLimit.profileViewDelay();
    }
  }

  // Perform behavioral check and adjustment
  async performBehaviorCheck() {
    const now = Date.now();
    
    // Check every 5 minutes
    if (now - this.lastBehaviorCheck > 300000) {
      console.log('🧠 Performing behavior check...');
      
      // Check if behavior looks suspicious
      if (StealthSession.isSuspiciousBehavior()) {
        console.warn('⚠️ Suspicious behavior detected, adjusting patterns');
        
        // Execute casual browsing pattern
        if (this.config.enableBehaviorPatterns) {
          await this.advancedStealth.behaviorPatterns.executePattern('casualBrowser');
        }
        
        // Add extra idle time
        await this.advancedStealth.simulateIdleBehavior(30000);
      }
      
      this.lastBehaviorCheck = now;
    }
  }

  // Check if session should end
  shouldEndSession() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    return sessionDuration > this.config.sessionDuration ||
           this.applicationCount >= this.config.maxApplications;
  }

  // Handle errors gracefully
  async handleError(error) {
    console.error('🚨 Handling error:', error.message);
    
    // Check if it's a rate limiting error
    if (error.message.includes('rate limit') || error.message.includes('too many requests')) {
      console.log('⏸️ Rate limit detected, implementing extended backoff');
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
    }
    
    // Check if it's a bot detection error
    if (error.message.includes('bot') || error.message.includes('automation')) {
      console.log('🤖 Bot detection suspected, implementing countermeasures');
      await this.advancedStealth.detectionAvoider.counterBotDetection();
      await this.advancedStealth.simulateIdleBehavior(60000); // 1 minute
    }
    
    // Generic error recovery
    await StealthUtils.pageDelay();
  }

  // Clean up session
  async cleanupSession() {
    console.log('🧹 Cleaning up session...');
    
    // Final session statistics
    const stats = StealthSession.getSessionStats();
    console.log('📊 Session Statistics:');
    console.log(`  Duration: ${stats.duration} seconds`);
    console.log(`  Actions: ${stats.actionCount}`);
    console.log(`  Applications: ${this.applicationCount}`);
    console.log(`  Actions per minute: ${stats.actionsPerMinute.toFixed(2)}`);
    
    // Natural session ending behavior
    await StealthInteractions.exploreContent({
      scrollCount: 1,
      readSections: false
    });
    
    console.log('✅ Session cleanup completed');
  }
}

// Usage example
async function runComprehensiveJobScraping() {
  const scraper = new ComprehensiveJobScraper({
    maxApplications: 8,
    sessionDuration: 2700000, // 45 minutes
    enableAdvancedStealth: true,
    enableBehaviorPatterns: true
  });
  
  const userProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    coverLetter: 'I am excited to apply for this position...',
    customAnswers: {
      'experience': '5 years',
      'salary': '$75,000',
      'sponsor': 'No',
      'remote': 'Yes'
    }
  };
  
  const searchCriteria = {
    keyword: 'Software Engineer',
    location: 'New York, NY',
    datePosted: 'week',
    experienceLevel: 'mid'
  };
  
  try {
    const results = await scraper.startJobScraping(userProfile, searchCriteria);
    console.log('🎉 Scraping completed successfully:', results);
    return results;
  } catch (error) {
    console.error('💥 Scraping failed:', error);
    throw error;
  }
}

export { ComprehensiveJobScraper, runComprehensiveJobScraping };

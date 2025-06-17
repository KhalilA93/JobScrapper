// Content script - injected into job site pages
// Handles DOM parsing, job scraping, and form auto-filling

class JobScrapperContent {
  constructor() {
    this.platform = this.detectPlatform();
    this.selectors = this.getSelectors();
    this.isProcessing = false;
    this.processedJobs = new Set();
    
    this.init();
  }

  init() {
    console.log(`JobScrapper initialized on ${this.platform}`);
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.onMessage.bind(this));
    
    // Add UI overlay
    this.createUI();
    
    // Start monitoring for new job listings
    this.startMonitoring();
  }

  detectPlatform() {
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('indeed.com')) return 'indeed';
    if (hostname.includes('glassdoor.com')) return 'glassdoor';
    if (hostname.includes('jobs.google.com')) return 'google';
    if (hostname.includes('ziprecruiter.com')) return 'ziprecruiter';
    if (hostname.includes('monster.com')) return 'monster';
    
    return 'unknown';
  }

  getSelectors() {
    const selectors = {
      linkedin: {
        jobCards: '.job-card-container, .jobs-search-results__list-item',
        jobTitle: '.job-card-list__title, .jobs-unified-top-card__job-title',
        company: '.job-card-container__company-name, .jobs-unified-top-card__company-name',
        location: '.job-card-container__metadata-item, .jobs-unified-top-card__bullet',
        applyButton: '.jobs-apply-button, .jobs-s-apply button',
        easyApplyButton: '.jobs-apply-button--top-card',
        description: '.jobs-description-content__text, .jobs-box__html-content',
        nextButton: '.artdeco-button--primary[aria-label*="Continue"], .artdeco-button--primary[aria-label*="Next"]',
        submitButton: '.artdeco-button--primary[aria-label*="Submit"], .artdeco-button--primary[data-control-name="continue_unify"]',
        formFields: {
          name: 'input[name*="name"], input[id*="name"]',
          email: 'input[name*="email"], input[id*="email"]',
          phone: 'input[name*="phone"], input[id*="phone"]',
          resume: 'input[type="file"]',
          coverLetter: 'textarea[name*="cover"], textarea[id*="cover"]'
        }
      },
      indeed: {
        jobCards: '.job_seen_beacon, .slider_container .slider_item',
        jobTitle: '.jobTitle a span, .jobTitle-color-purple',
        company: '.companyName, .companyName a',
        location: '.companyLocation',
        applyButton: '.indeedApplyButton, .ia-continueButton',
        description: '.jobsearch-jobDescriptionText, .jobsearch-JobComponent-description',
        formFields: {
          name: 'input[name*="name"], input[id*="applicant.name"]',
          email: 'input[name*="email"], input[id*="applicant.emailAddress"]',
          phone: 'input[name*="phone"], input[id*="applicant.phoneNumber"]',
          resume: 'input[type="file"]'
        }
      },
      glassdoor: {
        jobCards: '.react-job-listing, .jobContainer',
        jobTitle: '.jobTitle, .job-search-key-9ujsbx',
        company: '.employerName, .job-search-key-cfb8yz',
        location: '.location, .job-search-key-1rd3saf',
        applyButton: '.applyButton, .job-search-key-l2wjgv',
        description: '.jobDescriptionContent, .desc'
      },
      google: {
        jobCards: '.PwjeAc, .pE8vnd',
        jobTitle: '.BjJfJf, .pdKnvb',
        company: '.vNEEBe, .nJlQNd',
        location: '.Qk80Jf, .Io6YTe',
        applyButton: '.pMhGee, .RfiBUb'
      }
    };

    return selectors[this.platform] || {};
  }

  createUI() {
    // Create floating control panel
    const panel = document.createElement('div');
    panel.id = 'jobscrapper-panel';
    panel.innerHTML = `
      <div class="js-panel-header">
        <h3>JobScrapper</h3>
        <button class="js-minimize">−</button>
      </div>
      <div class="js-panel-content">
        <div class="js-status">Ready</div>
        <div class="js-stats">
          <span class="js-found-count">Jobs found: 0</span>
          <span class="js-applied-count">Applied: 0</span>
        </div>
        <div class="js-controls">
          <button class="js-scan-btn">Scan Jobs</button>
          <button class="js-auto-apply-btn">Auto Apply</button>
          <button class="js-stop-btn" disabled>Stop</button>
        </div>
        <div class="js-settings">
          <label>
            <input type="checkbox" class="js-auto-scroll"> Auto scroll
          </label>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      #jobscrapper-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        background: #ffffff;
        border: 2px solid #0073b1;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        font-size: 14px;
      }
      .js-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #0073b1;
        color: white;
        border-radius: 6px 6px 0 0;
      }
      .js-panel-header h3 {
        margin: 0;
        font-size: 16px;
      }
      .js-minimize {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
      }
      .js-panel-content {
        padding: 12px;
      }
      .js-status {
        padding: 8px;
        background: #f3f6f8;
        border-radius: 4px;
        margin-bottom: 8px;
        text-align: center;
        font-weight: 500;
      }
      .js-stats {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        font-size: 12px;
        color: #666;
      }
      .js-controls {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 12px;
      }
      .js-controls button {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      .js-controls button:hover:not(:disabled) {
        background: #f3f6f8;
        border-color: #0073b1;
      }
      .js-controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .js-stop-btn {
        grid-column: span 2;
        background: #d73027 !important;
        color: white !important;
        border-color: #d73027 !important;
      }
      .js-settings label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #666;
      }
      .job-highlight {
        outline: 2px solid #0073b1 !important;
        outline-offset: 2px;
        background: rgba(0, 115, 177, 0.1) !important;
      }
      .job-processing {
        outline: 2px solid #f39c12 !important;
        background: rgba(243, 156, 18, 0.1) !important;
      }
      .job-applied {
        outline: 2px solid #27ae60 !important;
        background: rgba(39, 174, 96, 0.1) !important;
      }
      .job-error {
        outline: 2px solid #e74c3c !important;
        background: rgba(231, 76, 60, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);

    // Add event listeners
    this.setupUIEventListeners();
  }

  setupUIEventListeners() {
    const panel = document.getElementById('jobscrapper-panel');
    
    panel.querySelector('.js-minimize').addEventListener('click', () => {
      const content = panel.querySelector('.js-panel-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });

    panel.querySelector('.js-scan-btn').addEventListener('click', () => {
      this.scanJobs();
    });

    panel.querySelector('.js-auto-apply-btn').addEventListener('click', () => {
      this.startAutoApply();
    });

    panel.querySelector('.js-stop-btn').addEventListener('click', () => {
      this.stopProcessing();
    });
  }

  updateStatus(status) {
    const statusEl = document.querySelector('.js-status');
    if (statusEl) statusEl.textContent = status;
  }

  updateStats(found = 0, applied = 0) {
    const foundEl = document.querySelector('.js-found-count');
    const appliedEl = document.querySelector('.js-applied-count');
    
    if (foundEl) foundEl.textContent = `Jobs found: ${found}`;
    if (appliedEl) appliedEl.textContent = `Applied: ${applied}`;
  }

  async scanJobs() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.updateStatus('Scanning jobs...');
    
    try {
      const jobs = await this.extractJobListings();
      this.updateStats(jobs.length, 0);
      this.updateStatus(`Found ${jobs.length} jobs`);
      
      // Send job data to background script
      chrome.runtime.sendMessage({
        action: 'saveJobData',
        data: { jobs, platform: this.platform, url: window.location.href }
      });

      // Highlight job cards
      this.highlightJobs(jobs);
      
    } catch (error) {
      console.error('Error scanning jobs:', error);
      this.updateStatus('Error scanning jobs');
    } finally {
      this.isProcessing = false;
    }
  }

  async extractJobListings() {
    const jobs = [];
    const jobCards = document.querySelectorAll(this.selectors.jobCards);
    
    jobCards.forEach((card, index) => {
      try {
        const job = this.extractJobFromCard(card, index);
        if (job && job.title && job.company) {
          jobs.push(job);
        }
      } catch (error) {
        console.error('Error extracting job from card:', error);
      }
    });
    
    return jobs;
  }

  extractJobFromCard(card, index) {
    const getTextContent = (selector) => {
      const element = card.querySelector(selector);
      return element ? element.textContent.trim() : '';
    };

    const getHref = (selector) => {
      const element = card.querySelector(selector);
      return element ? element.href || element.getAttribute('href') : '';
    };

    return {
      id: `${this.platform}-${Date.now()}-${index}`,
      title: getTextContent(this.selectors.jobTitle),
      company: getTextContent(this.selectors.company),
      location: getTextContent(this.selectors.location),
      description: getTextContent(this.selectors.description),
      url: getHref(this.selectors.jobTitle) || window.location.href,
      platform: this.platform,
      scrapedAt: new Date().toISOString(),
      element: card
    };
  }

  highlightJobs(jobs) {
    jobs.forEach(job => {
      if (job.element) {
        job.element.classList.add('job-highlight');
      }
    });
  }

  async startAutoApply() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.updateStatus('Starting auto-apply...');
    
    const scanBtn = document.querySelector('.js-scan-btn');
    const applyBtn = document.querySelector('.js-auto-apply-btn');
    const stopBtn = document.querySelector('.js-stop-btn');
    
    scanBtn.disabled = true;
    applyBtn.disabled = true;
    stopBtn.disabled = false;

    try {
      const jobs = await this.extractJobListings();
      let appliedCount = 0;
      
      for (let i = 0; i < jobs.length && this.isProcessing; i++) {
        const job = jobs[i];
        
        // Check if job matches criteria
        const matchResult = await chrome.runtime.sendMessage({
          action: 'checkJobMatch',
          data: job
        });
        
        if (!matchResult.match) {
          console.log(`Skipping job: ${job.title} (no match)`);
          continue;
        }
        
        // Check if already applied
        if (this.processedJobs.has(job.id)) {
          continue;
        }
        
        this.updateStatus(`Applying to: ${job.title}`);
        
        try {
          // Highlight current job being processed
          if (job.element) {
            job.element.classList.add('job-processing');
          }
          
          const result = await this.applyToJob(job);
          
          if (result.success) {
            appliedCount++;
            this.processedJobs.add(job.id);
            
            if (job.element) {
              job.element.classList.remove('job-processing');
              job.element.classList.add('job-applied');
            }
            
            // Send to background script
            chrome.runtime.sendMessage({
              action: 'applyToJob',
              data: job
            });
            
          } else {
            if (job.element) {
              job.element.classList.remove('job-processing');
              job.element.classList.add('job-error');
            }
          }
          
          this.updateStats(jobs.length, appliedCount);
          
          // Delay between applications
          await this.delay(5000); // 5 second delay
          
        } catch (error) {
          console.error(`Error applying to job ${job.title}:`, error);
          if (job.element) {
            job.element.classList.remove('job-processing');
            job.element.classList.add('job-error');
          }
        }
      }
      
      this.updateStatus(`Completed! Applied to ${appliedCount} jobs`);
      
    } catch (error) {
      console.error('Error in auto-apply process:', error);
      this.updateStatus('Error in auto-apply process');
    } finally {
      this.isProcessing = false;
      scanBtn.disabled = false;
      applyBtn.disabled = false;
      stopBtn.disabled = true;
    }
  }

  async applyToJob(job) {
    try {
      // Find and click apply button
      const applyButton = job.element.querySelector(this.selectors.applyButton);
      
      if (!applyButton) {
        throw new Error('Apply button not found');
      }
      
      // Check if it's an easy apply (LinkedIn)
      if (this.platform === 'linkedin' && applyButton.textContent.includes('Easy Apply')) {
        return await this.handleLinkedInEasyApply(job, applyButton);
      }
      
      // For other platforms or regular applications
      applyButton.click();
      
      // Wait for application form to load
      await this.delay(2000);
      
      // Try to fill and submit form
      const formFilled = await this.fillApplicationForm();
      
      if (formFilled) {
        return { success: true, method: 'form_submission' };
      } else {
        return { success: true, method: 'button_click' };
      }
      
    } catch (error) {
      console.error('Error applying to job:', error);
      return { success: false, error: error.message };
    }
  }

  async handleLinkedInEasyApply(job, applyButton) {
    try {
      // Click Easy Apply button
      applyButton.click();
      await this.delay(2000);
      
      let step = 0;
      const maxSteps = 10;
      
      while (step < maxSteps) {
        // Fill current form step
        await this.fillCurrentFormStep();
        await this.delay(1000);
        
        // Look for Next/Continue button
        const nextButton = document.querySelector(this.selectors.nextButton);
        const submitButton = document.querySelector(this.selectors.submitButton);
        
        if (submitButton && submitButton.textContent.toLowerCase().includes('submit')) {
          // Final step - submit application
          submitButton.click();
          await this.delay(2000);
          return { success: true, method: 'easy_apply', steps: step + 1 };
        } else if (nextButton) {
          // Continue to next step
          nextButton.click();
          await this.delay(2000);
          step++;
        } else {
          // No more buttons found, might be completed
          break;
        }
      }
      
      return { success: true, method: 'easy_apply', steps: step };
      
    } catch (error) {
      console.error('LinkedIn Easy Apply error:', error);
      return { success: false, error: error.message };
    }
  }

  async fillCurrentFormStep() {
    // Get user profile data
    const userProfile = await chrome.runtime.sendMessage({ action: 'getUserProfile' });
    
    // Fill form fields if they exist
    const fields = this.selectors.formFields;
    
    if (fields) {
      // Fill name
      const nameField = document.querySelector(fields.name);
      if (nameField && userProfile.name) {
        nameField.value = userProfile.name;
        nameField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Fill email
      const emailField = document.querySelector(fields.email);
      if (emailField && userProfile.email) {
        emailField.value = userProfile.email;
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Fill phone
      const phoneField = document.querySelector(fields.phone);
      if (phoneField && userProfile.phone) {
        phoneField.value = userProfile.phone;
        phoneField.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Fill cover letter
      const coverLetterField = document.querySelector(fields.coverLetter);
      if (coverLetterField && userProfile.coverLetter) {
        coverLetterField.value = userProfile.coverLetter;
        coverLetterField.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // Handle dropdowns and checkboxes
    await this.handleSpecialFormElements();
  }

  async handleSpecialFormElements() {
    // Handle common dropdown questions
    const dropdowns = document.querySelectorAll('select');
    dropdowns.forEach(dropdown => {
      const label = dropdown.previousElementSibling?.textContent?.toLowerCase() || '';
      
      if (label.includes('experience')) {
        // Select appropriate experience level
        const options = Array.from(dropdown.options);
        const experienceOption = options.find(opt => 
          opt.textContent.includes('2-5') || opt.textContent.includes('Mid')
        );
        if (experienceOption) dropdown.value = experienceOption.value;
      }
      
      if (label.includes('visa') || label.includes('sponsorship')) {
        // Handle visa sponsorship questions
        const noOption = Array.from(dropdown.options).find(opt => 
          opt.textContent.toLowerCase().includes('no')
        );
        if (noOption) dropdown.value = noOption.value;
      }
    });
    
    // Handle radio buttons for common questions
    const radioGroups = document.querySelectorAll('input[type="radio"]');
    const processedNames = new Set();
    
    radioGroups.forEach(radio => {
      if (processedNames.has(radio.name)) return;
      processedNames.add(radio.name);
      
      const question = radio.closest('fieldset')?.querySelector('legend')?.textContent?.toLowerCase() || '';
      
      if (question.includes('authorized to work')) {
        const yesOption = document.querySelector(`input[name="${radio.name}"][value*="yes"], input[name="${radio.name}"][value*="Yes"]`);
        if (yesOption) yesOption.checked = true;
      }
      
      if (question.includes('visa sponsorship')) {
        const noOption = document.querySelector(`input[name="${radio.name}"][value*="no"], input[name="${radio.name}"][value*="No"]`);
        if (noOption) noOption.checked = true;
      }
    });
  }

  async fillApplicationForm() {
    try {
      await this.fillCurrentFormStep();
      
      // Look for submit button
      const submitButton = document.querySelector('button[type="submit"], input[type="submit"], .btn-primary, .apply-button');
      
      if (submitButton) {
        await this.delay(1000);
        submitButton.click();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error filling application form:', error);
      return false;
    }
  }

  stopProcessing() {
    this.isProcessing = false;
    this.updateStatus('Stopped');
    
    const scanBtn = document.querySelector('.js-scan-btn');
    const applyBtn = document.querySelector('.js-auto-apply-btn');
    const stopBtn = document.querySelector('.js-stop-btn');
    
    if (scanBtn) scanBtn.disabled = false;
    if (applyBtn) applyBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
  }

  startMonitoring() {
    // Monitor for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // New content added, could be new job listings
          this.handleNewContent(mutation.addedNodes);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  handleNewContent(nodes) {
    // Check if any new nodes contain job listings
    nodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const newJobs = node.querySelectorAll(this.selectors.jobCards);
        if (newJobs.length > 0) {
          console.log(`Found ${newJobs.length} new job cards`);
          // Could trigger auto-processing here if enabled
        }
      }
    });
  }

  onMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'checkPresence':
        sendResponse({ present: true });
        break;
        
      case 'processQueue':
        if (!this.isProcessing) {
          this.startAutoApply();
        }
        sendResponse({ success: true });
        break;
        
      case 'getJobCount':
        const jobCards = document.querySelectorAll(this.selectors.jobCards);
        sendResponse({ count: jobCards.length });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new JobScrapperContent();
  });
} else {
  new JobScrapperContent();
}

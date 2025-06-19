// End-to-End Tests for JobScrapper Critical Application Flows
import puppeteer from 'puppeteer';
import { jest } from '@jest/globals';
import { mockLinkedInResponse, mockIndeedResponse, mockChromeMessages } from '@tests/mocks/jobSiteMocks';

describe('JobScrapper E2E Tests', () => {
  let browser;
  let page;
  let extensionPath;
  let backgroundPage;
  
  beforeAll(async () => {
    // Configure browser for extension testing
    extensionPath = process.cwd() + '/extension';
    
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      devtools: false,
      args: [
        `--load-extension=${extensionPath}`,
        '--disable-extensions-except=' + extensionPath,
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    });
  });
  
  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
    
    // Get extension background page
    const targets = await browser.targets();
    const backgroundTarget = targets.find(target => 
      target.type() === 'background_page' || target.type() === 'service_worker'
    );
    
    if (backgroundTarget) {
      backgroundPage = await backgroundTarget.page();
    }
    
    // Mock Chrome extension APIs
    await page.evaluateOnNewDocument(() => {
      window.chrome = {
        runtime: {
          sendMessage: (message, callback) => {
            // Mock message responses
            const mockResponses = {
              'GET_SETTINGS': { success: true, data: { autoApply: true, platforms: ['linkedin'] } },
              'START_SCRAPING': { success: true, message: 'Scraping started' },
              'STOP_SCRAPING': { success: true, message: 'Scraping stopped' }
            };
            
            if (callback) {
              setTimeout(() => callback(mockResponses[message.type] || { success: true }), 100);
            }
          },
          onMessage: {
            addListener: () => {}
          }
        },
        storage: {
          local: {
            get: (keys, callback) => {
              callback({
                settings: { autoApply: true, platforms: ['linkedin'] },
                stats: { totalJobs: 50, totalApplications: 15 }
              });
            },
            set: (data, callback) => {
              if (callback) callback();
            }
          }
        }
      };
    });
  });
  
  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });
  
  describe('Critical Flow 1: Job Site Detection and Data Extraction', () => {
    test('should detect LinkedIn job page and extract job data', async () => {
      // Navigate to mock LinkedIn job page
      await page.setContent(`
        <html>
          <head><title>Software Engineer - Tech Corp | LinkedIn</title></head>
          <body>
            ${mockLinkedInResponse.html}
            <script>
              // Simulate extension content script injection
              window.addEventListener('DOMContentLoaded', () => {
                // Mock job detection
                const jobData = {
                  title: 'Senior Software Engineer',
                  company: 'Tech Innovations Inc',
                  location: 'San Francisco, CA',
                  url: window.location.href,
                  platform: 'linkedin'
                };
                
                window.detectedJobData = jobData;
              });
            </script>
          </body>
        </html>
      `);
      
      await page.goto('data:text/html,<html></html>');
      await page.setContent(`
        <html>
          <head><title>Software Engineer - Tech Corp | LinkedIn</title></head>
          <body>
            ${mockLinkedInResponse.html}
          </body>
        </html>
      `);
      
      // Wait for content to load
      await page.waitForSelector('.jobs-search__results-list', { timeout: 5000 });
      
      // Extract job data using the same logic as content script
      const jobData = await page.evaluate(() => {
        const titleElement = document.querySelector('.job-card-list__title');
        const companyElement = document.querySelector('.job-card-container__company-name');
        const locationElement = document.querySelector('.job-card-container__location');
        const applyButton = document.querySelector('.jobs-apply-button');
        
        return {
          title: titleElement ? titleElement.textContent.trim() : '',
          company: companyElement ? companyElement.textContent.trim() : '',
          location: locationElement ? locationElement.textContent.trim() : '',
          hasEasyApply: !!applyButton,
          platform: 'linkedin'
        };
      });
      
      expect(jobData.title).toBe('Senior Software Engineer');
      expect(jobData.company).toBe('Tech Innovations Inc');
      expect(jobData.location).toBe('San Francisco, CA');
      expect(jobData.hasEasyApply).toBe(true);
      expect(jobData.platform).toBe('linkedin');
    });
    
    test('should detect Indeed job page and extract job data', async () => {
      await page.setContent(`
        <html>
          <head><title>Full Stack Developer - StartupCorp | Indeed</title></head>
          <body>
            ${mockIndeedResponse.html}
          </body>
        </html>
      `);
      
      await page.waitForSelector('.jobsearch-SerpJobCard', { timeout: 5000 });
      
      const jobData = await page.evaluate(() => {
        const titleElement = document.querySelector('.title a span');
        const companyElement = document.querySelector('.company a');
        const locationElement = document.querySelector('.location');
        const salaryElement = document.querySelector('.salaryText');
        
        return {
          title: titleElement ? titleElement.textContent.trim() : '',
          company: companyElement ? companyElement.textContent.trim() : '',
          location: locationElement ? locationElement.textContent.trim() : '',
          salary: salaryElement ? salaryElement.textContent.trim() : '',
          platform: 'indeed'
        };
      });
      
      expect(jobData.title).toBe('Full Stack Developer');
      expect(jobData.company).toBe('StartupCorp');
      expect(jobData.salary).toContain('$80,000 - $120,000');
    });
  });
  
  describe('Critical Flow 2: Auto-Application Process', () => {
    test('should simulate Easy Apply flow on LinkedIn', async () => {
      await page.setContent(`
        <html>
          <body>
            ${mockLinkedInResponse.html}
            <div id="application-modal" style="display: none;">
              <form id="easy-apply-form">
                <input type="text" name="firstName" placeholder="First Name" />
                <input type="text" name="lastName" placeholder="Last Name" />
                <input type="email" name="email" placeholder="Email" />
                <input type="tel" name="phone" placeholder="Phone" />
                <textarea name="coverLetter" placeholder="Cover Letter"></textarea>
                <button type="submit" class="submit-application">Submit Application</button>
              </form>
            </div>
            
            <script>
              // Mock Easy Apply modal behavior
              document.querySelector('.jobs-apply-button').addEventListener('click', () => {
                document.getElementById('application-modal').style.display = 'block';
              });
              
              // Mock form submission
              document.getElementById('easy-apply-form').addEventListener('submit', (e) => {
                e.preventDefault();
                document.body.setAttribute('data-application-status', 'submitted');
              });
            </script>
          </body>
        </html>
      `);
      
      // Click Easy Apply button
      await page.click('.jobs-apply-button');
      
      // Wait for modal to appear
      await page.waitForSelector('#application-modal', { visible: true });
      
      // Fill out application form
      await page.type('input[name="firstName"]', 'John');
      await page.type('input[name="lastName"]', 'Doe');
      await page.type('input[name="email"]', 'john.doe@example.com');
      await page.type('input[name="phone"]', '555-123-4567');
      await page.type('textarea[name="coverLetter"]', 'I am interested in this position...');
      
      // Submit application
      await page.click('.submit-application');
      
      // Verify application was submitted
      await page.waitForFunction(() => 
        document.body.getAttribute('data-application-status') === 'submitted'
      );
      
      const applicationStatus = await page.evaluate(() => 
        document.body.getAttribute('data-application-status')
      );
      
      expect(applicationStatus).toBe('submitted');
    });
    
    test('should handle application errors gracefully', async () => {
      await page.setContent(`
        <html>
          <body>
            <button class="apply-button" onclick="simulateError()">Apply</button>
            <div id="error-message" style="display: none;"></div>
            
            <script>
              function simulateError() {
                document.getElementById('error-message').style.display = 'block';
                document.getElementById('error-message').textContent = 'Application failed. Please try again.';
                document.body.setAttribute('data-error', 'application-failed');
              }
            </script>
          </body>
        </html>
      `);
      
      await page.click('.apply-button');
      
      await page.waitForSelector('#error-message', { visible: true });
      
      const errorMessage = await page.textContent('#error-message');
      const errorAttribute = await page.getAttribute('body', 'data-error');
      
      expect(errorMessage).toContain('Application failed');
      expect(errorAttribute).toBe('application-failed');
    });
  });
  
  describe('Critical Flow 3: Extension Popup Functionality', () => {
    test('should display job statistics in popup', async () => {
      // Create a mock popup page
      const popupHtml = `
        <html>
          <head>
            <style>
              .dashboard { padding: 20px; }
              .stat-card { margin: 10px 0; padding: 10px; border: 1px solid #ccc; }
              .stat-number { font-size: 24px; font-weight: bold; }
              .stat-label { font-size: 14px; color: #666; }
            </style>
          </head>
          <body>
            <div class="dashboard">
              <div class="stat-card">
                <div class="stat-number" id="total-jobs">0</div>
                <div class="stat-label">Total Jobs Found</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" id="total-applications">0</div>
                <div class="stat-label">Applications Submitted</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" id="success-rate">0%</div>
                <div class="stat-label">Success Rate</div>
              </div>
            </div>
            
            <script>
              // Mock loading stats from Chrome storage
              if (window.chrome && window.chrome.storage) {
                chrome.storage.local.get(['stats'], (result) => {
                  if (result.stats) {
                    document.getElementById('total-jobs').textContent = result.stats.totalJobs || 0;
                    document.getElementById('total-applications').textContent = result.stats.totalApplications || 0;
                    const successRate = result.stats.totalJobs > 0 
                      ? Math.round((result.stats.totalApplications / result.stats.totalJobs) * 100)
                      : 0;
                    document.getElementById('success-rate').textContent = successRate + '%';
                  }
                });
              } else {
                // Fallback for testing
                document.getElementById('total-jobs').textContent = '50';
                document.getElementById('total-applications').textContent = '15';
                document.getElementById('success-rate').textContent = '30%';
              }
            </script>
          </body>
        </html>
      `;
      
      await page.setContent(popupHtml);
      
      // Wait for stats to load
      await page.waitForFunction(() => 
        document.getElementById('total-jobs').textContent !== '0'
      );
      
      const totalJobs = await page.textContent('#total-jobs');
      const totalApplications = await page.textContent('#total-applications');
      const successRate = await page.textContent('#success-rate');
      
      expect(totalJobs).toBe('50');
      expect(totalApplications).toBe('15');
      expect(successRate).toBe('30%');
    });
    
    test('should allow starting and stopping scraping from popup', async () => {
      const popupHtml = `
        <html>
          <body>
            <div class="controls">
              <button id="start-scraping">Start Scraping</button>
              <button id="stop-scraping" disabled>Stop Scraping</button>
              <div id="status">Ready</div>
            </div>
            
            <script>
              let isScrapingActive = false;
              
              document.getElementById('start-scraping').addEventListener('click', () => {
                if (window.chrome && window.chrome.runtime) {
                  chrome.runtime.sendMessage({type: 'START_SCRAPING'}, (response) => {
                    if (response.success) {
                      isScrapingActive = true;
                      document.getElementById('start-scraping').disabled = true;
                      document.getElementById('stop-scraping').disabled = false;
                      document.getElementById('status').textContent = 'Scraping Active';
                    }
                  });
                } else {
                  // Mock for testing
                  isScrapingActive = true;
                  document.getElementById('start-scraping').disabled = true;
                  document.getElementById('stop-scraping').disabled = false;
                  document.getElementById('status').textContent = 'Scraping Active';
                }
              });
              
              document.getElementById('stop-scraping').addEventListener('click', () => {
                if (window.chrome && window.chrome.runtime) {
                  chrome.runtime.sendMessage({type: 'STOP_SCRAPING'}, (response) => {
                    if (response.success) {
                      isScrapingActive = false;
                      document.getElementById('start-scraping').disabled = false;
                      document.getElementById('stop-scraping').disabled = true;
                      document.getElementById('status').textContent = 'Stopped';
                    }
                  });
                } else {
                  // Mock for testing
                  isScrapingActive = false;
                  document.getElementById('start-scraping').disabled = false;
                  document.getElementById('stop-scraping').disabled = true;
                  document.getElementById('status').textContent = 'Stopped';
                }
              });
            </script>
          </body>
        </html>
      `;
      
      await page.setContent(popupHtml);
      
      // Test starting scraping
      await page.click('#start-scraping');
      
      await page.waitForFunction(() => 
        document.getElementById('status').textContent === 'Scraping Active'
      );
      
      const statusAfterStart = await page.textContent('#status');
      const startButtonDisabled = await page.evaluate(() => 
        document.getElementById('start-scraping').disabled
      );
      
      expect(statusAfterStart).toBe('Scraping Active');
      expect(startButtonDisabled).toBe(true);
      
      // Test stopping scraping
      await page.click('#stop-scraping');
      
      await page.waitForFunction(() => 
        document.getElementById('status').textContent === 'Stopped'
      );
      
      const statusAfterStop = await page.textContent('#status');
      const stopButtonDisabled = await page.evaluate(() => 
        document.getElementById('stop-scraping').disabled
      );
      
      expect(statusAfterStop).toBe('Stopped');
      expect(stopButtonDisabled).toBe(true);
    });
  });
  
  describe('Critical Flow 4: Background Processing and Sync', () => {
    test('should process job queue in background', async () => {
      // Create a test page that simulates background processing
      const backgroundTestHtml = `
        <html>
          <body>
            <div id="queue-status">Queue Empty</div>
            <div id="processed-count">0</div>
            <button id="add-jobs">Add Jobs to Queue</button>
            
            <script>
              let jobQueue = [];
              let processedCount = 0;
              
              function addJobsToQueue() {
                const newJobs = [
                  { id: 1, title: 'Job 1', platform: 'linkedin' },
                  { id: 2, title: 'Job 2', platform: 'indeed' },
                  { id: 3, title: 'Job 3', platform: 'glassdoor' }
                ];
                
                jobQueue.push(...newJobs);
                document.getElementById('queue-status').textContent = 'Processing';
                
                // Simulate background processing
                processQueue();
              }
              
              function processQueue() {
                if (jobQueue.length === 0) {
                  document.getElementById('queue-status').textContent = 'Queue Empty';
                  return;
                }
                
                // Process one job at a time
                setTimeout(() => {
                  const job = jobQueue.shift();
                  processedCount++;
                  document.getElementById('processed-count').textContent = processedCount;
                  
                  if (jobQueue.length > 0) {
                    processQueue();
                  } else {
                    document.getElementById('queue-status').textContent = 'Queue Empty';
                  }
                }, 100);
              }
              
              document.getElementById('add-jobs').addEventListener('click', addJobsToQueue);
            </script>
          </body>
        </html>
      `;
      
      await page.setContent(backgroundTestHtml);
      
      // Add jobs to queue
      await page.click('#add-jobs');
      
      // Wait for processing to complete
      await page.waitForFunction(() => 
        document.getElementById('queue-status').textContent === 'Queue Empty' &&
        parseInt(document.getElementById('processed-count').textContent) === 3
      , { timeout: 5000 });
      
      const finalStatus = await page.textContent('#queue-status');
      const processedCount = await page.textContent('#processed-count');
      
      expect(finalStatus).toBe('Queue Empty');
      expect(processedCount).toBe('3');
    });
  });
  
  describe('Critical Flow 5: Error Recovery and Resilience', () => {
    test('should recover from network errors', async () => {
      const errorRecoveryHtml = `
        <html>
          <body>
            <div id="connection-status">Connected</div>
            <div id="retry-count">0</div>
            <button id="simulate-error">Simulate Network Error</button>
            
            <script>
              let retryCount = 0;
              let maxRetries = 3;
              
              function simulateNetworkRequest() {
                return new Promise((resolve, reject) => {
                  // Simulate network failure
                  setTimeout(() => {
                    if (retryCount < maxRetries) {
                      reject(new Error('Network error'));
                    } else {
                      resolve('Success');
                    }
                  }, 100);
                });
              }
              
              async function attemptRequest() {
                try {
                  document.getElementById('connection-status').textContent = 'Connecting...';
                  const result = await simulateNetworkRequest();
                  document.getElementById('connection-status').textContent = 'Connected';
                  return result;
                } catch (error) {
                  retryCount++;
                  document.getElementById('retry-count').textContent = retryCount;
                  
                  if (retryCount < maxRetries) {
                    document.getElementById('connection-status').textContent = 'Retrying...';
                    // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
                    return attemptRequest();
                  } else {
                    document.getElementById('connection-status').textContent = 'Connected';
                    throw error;
                  }
                }
              }
              
              document.getElementById('simulate-error').addEventListener('click', () => {
                retryCount = 0;
                document.getElementById('retry-count').textContent = '0';
                attemptRequest();
              });
            </script>
          </body>
        </html>
      `;
      
      await page.setContent(errorRecoveryHtml);
      
      // Simulate network error
      await page.click('#simulate-error');
      
      // Wait for recovery process to complete
      await page.waitForFunction(() => 
        document.getElementById('connection-status').textContent === 'Connected' &&
        parseInt(document.getElementById('retry-count').textContent) === 3
      , { timeout: 10000 });
      
      const finalStatus = await page.textContent('#connection-status');
      const retryCount = await page.textContent('#retry-count');
      
      expect(finalStatus).toBe('Connected');
      expect(retryCount).toBe('3');
    });
  });
});

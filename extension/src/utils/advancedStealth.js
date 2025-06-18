// Advanced Stealth Features
// Enhanced anti-detection techniques and fingerprint management

import { StealthScraper } from './stealthScraper.js';
import { StealthUtils } from './stealthUtils.js';

class AdvancedStealth {
  constructor(options = {}) {
    this.config = {
      // Fingerprint randomization
      randomizeFingerprint: options.randomizeFingerprint !== false,
      rotateTimezone: options.rotateTimezone !== false,
      spoofWebGL: options.spoofWebGL !== false,
      spoofCanvas: options.spoofCanvas !== false,
      
      // Advanced behavior patterns
      enableIdleSimulation: options.enableIdleSimulation !== false,
      enableTabSwitchSimulation: options.enableTabSwitchSimulation !== false,
      enableScrollBehaviorVariation: options.enableScrollBehaviorVariation !== false,
      
      // Detection avoidance
      avoidCommonBotPatterns: options.avoidCommonBotPatterns !== false,
      randomizeEventTiming: options.randomizeEventTiming !== false,
      simulateHumanErrors: options.simulateHumanErrors !== false
    };
    
    this.stealth = new StealthScraper(options);
    this.fingerprintData = this.generateFingerprint();
    this.behaviorPatterns = new BehaviorPatterns();
    this.detectionAvoider = new DetectionAvoider();
  }

  // Generate realistic browser fingerprint
  generateFingerprint() {
    const browsers = [
      { name: 'Chrome', versions: ['120.0.0.0', '119.0.0.0', '118.0.0.0'] },
      { name: 'Firefox', versions: ['121.0', '120.0', '119.0'] },
      { name: 'Safari', versions: ['17.1', '17.0', '16.6'] },
      { name: 'Edge', versions: ['120.0.0.0', '119.0.0.0'] }
    ];
    
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const version = browser.versions[Math.floor(Math.random() * browser.versions.length)];
    
    const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    
    const screenResolutions = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 },
      { width: 2560, height: 1440 },
      { width: 1280, height: 720 }
    ];
    
    const screen = screenResolutions[Math.floor(Math.random() * screenResolutions.length)];
    
    const timezones = [
      'America/New_York', 'America/Los_Angeles', 'America/Chicago',
      'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'
    ];
    
    return {
      browser: browser.name,
      version,
      platform,
      screen,
      timezone: timezones[Math.floor(Math.random() * timezones.length)],
      language: this.getRandomLanguage(),
      hardwareConcurrency: Math.pow(2, Math.floor(Math.random() * 4) + 1), // 2, 4, 8, 16
      deviceMemory: [2, 4, 8, 16][Math.floor(Math.random() * 4)],
      colorDepth: [24, 32][Math.floor(Math.random() * 2)],
      pixelDepth: [24, 32][Math.floor(Math.random() * 2)]
    };
  }

  getRandomLanguage() {
    const languages = [
      'en-US,en;q=0.9',
      'en-GB,en;q=0.9',
      'en-US,en;q=0.9,es;q=0.8',
      'en-US,en;q=0.9,fr;q=0.8',
      'en-US,en;q=0.9,de;q=0.8'
    ];
    return languages[Math.floor(Math.random() * languages.length)];
  }

  // Apply fingerprint modifications
  async applyFingerprint() {
    if (!this.config.randomizeFingerprint) return;
    
    try {
      // Modify navigator properties (limited in content scripts)
      if (this.config.spoofWebGL) {
        this.spoofWebGLFingerprint();
      }
      
      if (this.config.spoofCanvas) {
        this.spoofCanvasFingerprint();
      }
      
      if (this.config.rotateTimezone) {
        this.spoofTimezone();
      }
      
    } catch (error) {
      console.warn('AdvancedStealth: Some fingerprint modifications failed:', error);
    }
  }

  // Spoof WebGL fingerprint
  spoofWebGLFingerprint() {
    const getContext = HTMLCanvasElement.prototype.getContext;
    
    HTMLCanvasElement.prototype.getContext = function(contextType, ...args) {
      const context = getContext.apply(this, [contextType, ...args]);
      
      if (contextType === 'webgl' || contextType === 'experimental-webgl') {
        const getParameter = context.getParameter;
        
        context.getParameter = function(parameter) {
          // Randomize common WebGL parameters
          switch (parameter) {
            case context.VENDOR:
              return ['Google Inc.', 'Mozilla', 'WebKit'][Math.floor(Math.random() * 3)];
            case context.RENDERER:
              const renderers = [
                'ANGLE (Intel(R) HD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
                'ANGLE (NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)',
                'ANGLE (AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)'
              ];
              return renderers[Math.floor(Math.random() * renderers.length)];
            default:
              return getParameter.apply(this, arguments);
          }
        };
      }
      
      return context;
    };
  }

  // Spoof Canvas fingerprint
  spoofCanvasFingerprint() {
    const getImageData = CanvasRenderingContext2D.prototype.getImageData;
    
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      const imageData = getImageData.apply(this, args);
      
      // Add minimal noise to canvas data
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (Math.random() < 0.001) { // Very small chance of modification
          imageData.data[i] = Math.min(255, imageData.data[i] + Math.floor(Math.random() * 3) - 1);
        }
      }
      
      return imageData;
    };
  }

  // Spoof timezone
  spoofTimezone() {
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    const timezoneOffsets = {
      'America/New_York': 300,
      'America/Los_Angeles': 480,
      'America/Chicago': 360,
      'Europe/London': 0,
      'Europe/Berlin': -60,
      'Asia/Tokyo': -540,
      'Australia/Sydney': -660
    };
    
    const offset = timezoneOffsets[this.fingerprintData.timezone] || 0;
    
    Date.prototype.getTimezoneOffset = function() {
      return offset;
    };
  }

  // Simulate human-like idle behavior
  async simulateIdleBehavior(duration = 30000) {
    if (!this.config.enableIdleSimulation) return;
    
    const idleActions = [
      () => this.simulateScrollPause(),
      () => this.simulateTabSwitch(),
      () => this.simulateMouseWander(),
      () => this.simulateReading()
    ];
    
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      const action = idleActions[Math.floor(Math.random() * idleActions.length)];
      await action();
      
      // Random idle interval
      await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 10000));
    }
  }

  async simulateScrollPause() {
    // Simulate pausing while scrolling to read
    await this.stealth.simulateScroll(window, { distance: 100, steps: 1 });
    await StealthUtils.readingDelay(150);
    await this.stealth.simulateScroll(window, { direction: 'up', distance: 50, steps: 1 });
  }

  async simulateTabSwitch() {
    if (!this.config.enableTabSwitchSimulation) return;
    
    // Simulate user switching away and back
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 8000));
    document.dispatchEvent(new Event('visibilitychange'));
  }

  async simulateMouseWander() {
    // Random mouse movements across the page
    for (let i = 0; i < 3; i++) {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: x,
        clientY: y,
        bubbles: true
      }));
      
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));
    }
  }

  async simulateReading() {
    // Find text elements and simulate reading them
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, span, div');
    const readableElements = Array.from(textElements)
      .filter(el => el.textContent && el.textContent.trim().length > 20)
      .slice(0, 3);
    
    for (const element of readableElements) {
      await this.stealth.simulateMouseMovement(element);
      await StealthUtils.readingDelay(element.textContent.length);
    }
  }
}

// Advanced behavior pattern simulation
class BehaviorPatterns {
  constructor() {
    this.patterns = {
      jobSeekerBehavior: new JobSeekerBehaviorPattern(),
      casualBrowser: new CasualBrowserPattern(),
      researchMode: new ResearchModePattern()
    };
  }

  async executePattern(patternName, options = {}) {
    const pattern = this.patterns[patternName];
    if (pattern) {
      return pattern.execute(options);
    }
    throw new Error(`Unknown pattern: ${patternName}`);
  }
}

// Job seeker behavior pattern
class JobSeekerBehaviorPattern {
  async execute(options = {}) {
    // Simulate realistic job seeker behavior
    const actions = [
      () => this.browseJobListings(),
      () => this.readCompanyInfo(),
      () => this.checkSalaryInfo(),
      () => this.lookAtRequirements(),
      () => this.compareJobs()
    ];
    
    const actionCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < actionCount; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      await action();
      await StealthUtils.actionDelay();
    }
  }

  async browseJobListings() {
    const jobElements = document.querySelectorAll('[data-job-id], .job-card, .job-listing, .job-result');
    if (jobElements.length > 0) {
      const randomJob = jobElements[Math.floor(Math.random() * Math.min(5, jobElements.length))];
      const stealth = new StealthScraper();
      await stealth.simulateMouseMovement(randomJob);
      await StealthUtils.readingDelay(100);
    }
  }

  async readCompanyInfo() {
    const companyElements = document.querySelectorAll('.company-name, [data-testid*="company"], .employer-name');
    if (companyElements.length > 0) {
      const randomCompany = companyElements[Math.floor(Math.random() * companyElements.length)];
      const stealth = new StealthScraper();
      await stealth.simulateMouseMovement(randomCompany);
      await StealthUtils.readingDelay(80);
    }
  }

  async checkSalaryInfo() {
    const salaryElements = document.querySelectorAll('.salary, [data-testid*="salary"], .compensation');
    if (salaryElements.length > 0) {
      const randomSalary = salaryElements[Math.floor(Math.random() * salaryElements.length)];
      const stealth = new StealthScraper();
      await stealth.simulateMouseMovement(randomSalary);
      await StealthUtils.readingDelay(60);
    }
  }

  async lookAtRequirements() {
    const requirementElements = document.querySelectorAll('.requirements, .job-description, .qualifications');
    if (requirementElements.length > 0) {
      const randomReq = requirementElements[Math.floor(Math.random() * requirementElements.length)];
      const stealth = new StealthScraper();
      await stealth.scrollToElement(randomReq);
      await StealthUtils.readingDelay(200);
    }
  }

  async compareJobs() {
    // Simulate going back to compare jobs
    if (window.history.length > 1 && Math.random() < 0.3) {
      window.history.back();
      await StealthUtils.pageDelay();
    }
  }
}

// Casual browser pattern
class CasualBrowserPattern {
  async execute(options = {}) {
    const actions = [
      () => this.casualScroll(),
      () => this.randomClick(),
      () => this.quickRead()
    ];
    
    const actionCount = 2 + Math.floor(Math.random() * 2);
    
    for (let i = 0; i < actionCount; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      await action();
      await StealthUtils.microDelay();
    }
  }

  async casualScroll() {
    const stealth = new StealthScraper();
    await stealth.simulateScroll(window, { 
      distance: 150 + Math.random() * 300,
      steps: 2
    });
  }

  async randomClick() {
    const clickableElements = document.querySelectorAll('a, button, [role="button"]');
    if (clickableElements.length > 0 && Math.random() < 0.1) {
      const randomElement = clickableElements[Math.floor(Math.random() * clickableElements.length)];
      const stealth = new StealthScraper();
      await stealth.simulateMouseMovement(randomElement);
    }
  }

  async quickRead() {
    const textElements = document.querySelectorAll('h1, h2, h3, .title, .headline');
    if (textElements.length > 0) {
      const randomText = textElements[Math.floor(Math.random() * textElements.length)];
      const stealth = new StealthScraper();
      await stealth.simulateMouseMovement(randomText);
      await StealthUtils.readingDelay(50);
    }
  }
}

// Research mode pattern
class ResearchModePattern {
  async execute(options = {}) {
    // Simulate thorough research behavior
    await this.deepRead();
    await this.takeNotes();
    await this.crossReference();
  }

  async deepRead() {
    const contentElements = document.querySelectorAll('p, .description, .content, article');
    if (contentElements.length > 0) {
      const element = contentElements[Math.floor(Math.random() * contentElements.length)];
      const stealth = new StealthScraper();
      await stealth.scrollToElement(element);
      await StealthUtils.readingDelay(element.textContent?.length || 200);
    }
  }

  async takeNotes() {
    // Simulate copy-paste behavior occasionally
    if (Math.random() < 0.2) {
      document.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'c', 
        ctrlKey: true, 
        bubbles: true 
      }));
      await StealthUtils.microDelay();
    }
  }

  async crossReference() {
    // Simulate opening new tabs for research
    if (Math.random() < 0.1) {
      document.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 't', 
        ctrlKey: true, 
        bubbles: true 
      }));
    }
  }
}

// Advanced detection avoidance
class DetectionAvoider {
  constructor() {
    this.commonBotSignatures = [
      'webdriver',
      'selenium',
      'phantomjs',
      'headless',
      'automation'
    ];
    
    this.suspiciousPatterns = [
      'too_fast_clicking',
      'perfect_timing',
      'no_mouse_movement',
      'identical_sessions'
    ];
  }

  // Check for bot detection scripts
  async detectBotDetection() {
    const detectionMethods = [
      () => this.checkWebDriverProperty(),
      () => this.checkAutomationFlags(),
      () => this.checkTimingAttacks(),
      () => this.checkMouseMovementTracking()
    ];
    
    const results = await Promise.all(detectionMethods.map(method => method()));
    return results.some(detected => detected);
  }

  checkWebDriverProperty() {
    return window.navigator.webdriver === true;
  }

  checkAutomationFlags() {
    return this.commonBotSignatures.some(signature => 
      window.navigator.userAgent.toLowerCase().includes(signature) ||
      window.chrome?.runtime?.id?.includes(signature)
    );
  }

  checkTimingAttacks() {
    // Check for timing-based detection
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      Math.random();
    }
    const duration = performance.now() - start;
    
    // Suspiciously fast execution might indicate automation
    return duration < 0.1;
  }

  checkMouseMovementTracking() {
    // Check if mouse movement is being tracked suspiciously
    return window.mouseTracker !== undefined || 
           document.querySelector('script[src*="mouse-track"]') !== null;
  }

  // Counter bot detection
  async counterBotDetection() {
    // Override webdriver property
    if (window.navigator.webdriver) {
      Object.defineProperty(window.navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
      });
    }
    
    // Add realistic browser properties
    this.addRealisticProperties();
    
    // Simulate human-like entropy
    this.addHumanEntropy();
  }

  addRealisticProperties() {
    // Add properties that real browsers have
    if (!window.chrome) {
      window.chrome = {
        runtime: {
          id: 'mhjfbmdgcfjbbpaeojofohoefgiehjai'
        }
      };
    }
    
    // Add realistic plugin properties
    if (navigator.plugins.length === 0) {
      Object.defineProperty(navigator, 'plugins', {
        get: () => ([
          { name: 'Chrome PDF Plugin', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', description: 'PDF Viewer' }
        ])
      });
    }
  }

  addHumanEntropy() {
    // Add small random delays to various operations
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
      const jitter = Math.random() * 2 - 1; // -1 to +1ms
      return originalSetTimeout(callback, delay + jitter, ...args);
    };
  }
}

export { AdvancedStealth, BehaviorPatterns, DetectionAvoider };

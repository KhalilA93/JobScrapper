// Stealth Scraping Utilities
// Anti-bot detection techniques for natural web scraping

class StealthScraper {
  constructor(options = {}) {
    this.config = {
      // Timing configuration
      minActionDelay: options.minActionDelay || 500,
      maxActionDelay: options.maxActionDelay || 3000,
      minScrollDelay: options.minScrollDelay || 100,
      maxScrollDelay: options.maxScrollDelay || 800,
      
      // Rate limiting
      maxRequestsPerMinute: options.maxRequestsPerMinute || 30,
      backoffMultiplier: options.backoffMultiplier || 2,
      maxBackoffDelay: options.maxBackoffDelay || 30000,
      
      // User agent rotation
      userAgents: options.userAgents || this.getDefaultUserAgents(),
      rotateUserAgent: options.rotateUserAgent !== false,
      
      // Headers
      defaultHeaders: options.defaultHeaders || {},
      
      // Behavioral patterns
      enableMouseSimulation: options.enableMouseSimulation !== false,
      enableScrollSimulation: options.enableScrollSimulation !== false
    };
    
    this.requestHistory = [];
    this.currentUserAgentIndex = 0;
    this.isRateLimited = false;
    this.backoffDelay = 1000;
  }

  // Human-like random delays
  async randomDelay(min = null, max = null) {
    const minDelay = min || this.config.minActionDelay;
    const maxDelay = max || this.config.maxActionDelay;
    
    // Use normal distribution for more human-like timing
    const delay = this.generateNormalizedDelay(minDelay, maxDelay);
    
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Generate human-like timing with normal distribution
  generateNormalizedDelay(min, max) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    // Map to range with slight skew toward faster actions
    const normalized = Math.abs(z0) / 3; // 3 sigma range
    const skewed = Math.pow(normalized, 0.7); // Slight skew toward faster
    
    return Math.floor(min + skewed * (max - min));
  }

  // User agent rotation
  getDefaultUserAgents() {
    return [
      // Chrome on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      
      // Chrome on macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      
      // Firefox on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
      
      // Safari on macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    ];
  }

  // Get next user agent in rotation
  getNextUserAgent() {
    if (!this.config.rotateUserAgent) {
      return this.config.userAgents[0];
    }
    
    const userAgent = this.config.userAgents[this.currentUserAgentIndex];
    this.currentUserAgentIndex = (this.currentUserAgentIndex + 1) % this.config.userAgents.length;
    
    return userAgent;
  }

  // Generate human-like request headers
  generateHeaders(customHeaders = {}) {
    const userAgent = this.getNextUserAgent();
    
    const baseHeaders = {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      ...this.config.defaultHeaders,
      ...customHeaders
    };
    
    // Randomize header order
    return this.shuffleHeaders(baseHeaders);
  }

  // Shuffle headers to avoid detection patterns
  shuffleHeaders(headers) {
    const entries = Object.entries(headers);
    const shuffled = {};
    
    // Keep User-Agent first, then shuffle others
    shuffled['User-Agent'] = headers['User-Agent'];
    
    const otherEntries = entries.filter(([key]) => key !== 'User-Agent');
    this.shuffleArray(otherEntries);
    
    otherEntries.forEach(([key, value]) => {
      shuffled[key] = value;
    });
    
    return shuffled;
  }

  // Fisher-Yates shuffle
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Rate limiting with exponential backoff
  async checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old requests
    this.requestHistory = this.requestHistory.filter(time => time > oneMinuteAgo);
    
    if (this.requestHistory.length >= this.config.maxRequestsPerMinute) {
      this.isRateLimited = true;
      
      console.warn(`StealthScraper: Rate limit exceeded. Backing off for ${this.backoffDelay}ms`);
      await this.exponentialBackoff();
      
      return this.checkRateLimit(); // Recursive check after backoff
    }
    
    this.requestHistory.push(now);
    this.isRateLimited = false;
    
    // Reset backoff delay on successful request
    this.backoffDelay = 1000;
    
    return true;
  }

  // Exponential backoff delay
  async exponentialBackoff() {
    await new Promise(resolve => setTimeout(resolve, this.backoffDelay));
    
    this.backoffDelay = Math.min(
      this.backoffDelay * this.config.backoffMultiplier,
      this.config.maxBackoffDelay
    );
  }

  // Simulate human-like scrolling
  async simulateScroll(element = window, options = {}) {
    const {
      direction = 'down',
      distance = 'random',
      steps = 3,
      smooth = true
    } = options;
    
    const scrollDistance = distance === 'random' 
      ? Math.floor(200 + Math.random() * 600)
      : distance;
    
    const stepSize = scrollDistance / steps;
    const isWindow = element === window;
    
    for (let i = 0; i < steps; i++) {
      const currentStep = stepSize * (i + 1);
      
      if (isWindow) {
        window.scrollBy({
          top: direction === 'down' ? currentStep : -currentStep,
          behavior: smooth ? 'smooth' : 'auto'
        });
      } else {
        element.scrollTop += direction === 'down' ? stepSize : -stepSize;
      }
      
      await this.randomDelay(this.config.minScrollDelay, this.config.maxScrollDelay);
    }
  }

  // Simulate mouse movement and hover
  async simulateMouseMovement(element, options = {}) {
    if (!this.config.enableMouseSimulation) return;
    
    const {
      duration = 500,
      curve = 'bezier'
    } = options;
    
    const rect = element.getBoundingClientRect();
    const targetX = rect.left + rect.width / 2;
    const targetY = rect.top + rect.height / 2;
    
    // Simulate mouse movement path
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;
    
    const steps = 10;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const easedProgress = this.easeInOutCubic(progress);
      
      const currentX = startX + (targetX - startX) * easedProgress;
      const currentY = startY + (targetY - startY) * easedProgress;
      
      // Dispatch mouse events
      element.dispatchEvent(new MouseEvent('mousemove', {
        clientX: currentX,
        clientY: currentY,
        bubbles: true
      }));
      
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
    
    // Final hover
    element.dispatchEvent(new MouseEvent('mouseenter', {
      clientX: targetX,
      clientY: targetY,
      bubbles: true
    }));
    
    await this.randomDelay(100, 300);
  }

  // Cubic easing function
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  // Human-like click simulation
  async simulateClick(element, options = {}) {
    const {
      hover = true,
      scroll = true,
      delay = true
    } = options;
    
    // Scroll element into view if needed
    if (scroll) {
      await this.scrollToElement(element);
    }
    
    // Hover before clicking
    if (hover) {
      await this.simulateMouseMovement(element);
    }
    
    // Random delay before click
    if (delay) {
      await this.randomDelay(100, 500);
    }
    
    // Simulate mouse down, up, and click
    const rect = element.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2 + (Math.random() - 0.5) * 10;
    const clickY = rect.top + rect.height / 2 + (Math.random() - 0.5) * 10;
    
    element.dispatchEvent(new MouseEvent('mousedown', {
      clientX: clickX,
      clientY: clickY,
      bubbles: true
    }));
    
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    element.dispatchEvent(new MouseEvent('mouseup', {
      clientX: clickX,
      clientY: clickY,
      bubbles: true
    }));
    
    element.dispatchEvent(new MouseEvent('click', {
      clientX: clickX,
      clientY: clickY,
      bubbles: true
    }));
    
    await this.randomDelay(200, 800);
  }

  // Scroll element into view naturally
  async scrollToElement(element, options = {}) {
    const {
      offset = 100,
      smooth = true
    } = options;
    
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    
    if (!isVisible) {
      const scrollTop = window.pageYOffset + rect.top - offset;
      
      if (smooth) {
        // Smooth scroll with multiple steps
        const startScrollTop = window.pageYOffset;
        const distance = scrollTop - startScrollTop;
        const steps = Math.ceil(Math.abs(distance) / 100);
        const stepSize = distance / steps;
        
        for (let i = 0; i < steps; i++) {
          window.scrollTo(0, startScrollTop + stepSize * (i + 1));
          await this.randomDelay(50, 150);
        }
      } else {
        window.scrollTo(0, scrollTop);
      }
      
      await this.randomDelay(300, 600);
    }
  }

  // Human-like typing simulation
  async simulateTyping(element, text, options = {}) {
    const {
      minDelay = 50,
      maxDelay = 200,
      mistakes = 0.02 // 2% chance of typos
    } = options;
    
    element.focus();
    await this.randomDelay(100, 300);
    
    element.value = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Simulate typing mistakes
      if (Math.random() < mistakes && i > 0) {
        const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        element.value += wrongChar;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        await this.randomDelay(minDelay, maxDelay);
        
        // Backspace to correct
        element.value = element.value.slice(0, -1);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        
        await this.randomDelay(minDelay, maxDelay);
      }
      
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Vary typing speed
      const delay = char === ' ' ? maxDelay * 0.5 : this.generateNormalizedDelay(minDelay, maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    await this.randomDelay(200, 500);
  }

  // Wait for element with human-like checking
  async waitForElement(selector, options = {}) {
    const {
      timeout = 10000,
      checkInterval = 'random',
      parent = document
    } = options;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const element = parent.querySelector(selector);
      if (element) {
        return element;
      }
      
      // Human-like checking intervals
      const interval = checkInterval === 'random' 
        ? 200 + Math.random() * 800
        : checkInterval;
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Element not found: ${selector}`);
  }

  // Stealth page navigation
  async stealthNavigate(url, options = {}) {
    await this.checkRateLimit();
    
    const headers = this.generateHeaders(options.headers);
    
    // Add referrer spoofing
    if (options.referrer) {
      headers['Referer'] = options.referrer;
    }
    
    // Simulate natural navigation timing
    await this.randomDelay(500, 2000);
    
    // For content scripts, we can't directly navigate, but we can prepare headers
    // This would be used with fetch or XMLHttpRequest
    return {
      url,
      headers,
      timestamp: Date.now()
    };
  }
}

export { StealthScraper };

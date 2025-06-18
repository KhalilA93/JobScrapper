// Performance Optimization Engine for JobScrapper
// Implements efficient DOM querying, memory management, and performance monitoring

/**
 * DOM Query Cache with intelligent caching and invalidation
 */
export class DOMQueryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.selectorUsage = new Map();
    this.mutationObserver = null;
    this.options = {
      maxCacheSize: 1000,
      cacheTimeout: 30000, // 30 seconds
      enableMutationTracking: true,
      performanceMonitoring: true,
      ...options
    };
    
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      invalidations: 0,
      mutationEvents: 0
    };
    
    this.initialize();
  }

  initialize() {
    if (this.options.enableMutationTracking) {
      this.setupMutationObserver();
    }
    
    // Periodic cache cleanup
    setInterval(() => this.cleanupCache(), this.options.cacheTimeout / 2);
    
    // Performance monitoring
    if (this.options.performanceMonitoring) {
      this.setupPerformanceMonitoring();
    }
  }

  /**
   * Efficient DOM querying with intelligent caching
   */
  querySelector(selector, context = document) {
    const cacheKey = this.generateCacheKey(selector, context);
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult && this.isCacheValid(cachedResult)) {
      this.stats.cacheHits++;
      this.trackSelectorUsage(selector, 'hit');
      return cachedResult.element;
    }
    
    // Performance measurement
    const startTime = performance.now();
    const element = context.querySelector(selector);
    const queryTime = performance.now() - startTime;
    
    // Cache the result
    if (element) {
      this.cacheElement(cacheKey, element, selector, queryTime);
    }
    
    this.stats.cacheMisses++;
    this.trackSelectorUsage(selector, 'miss', queryTime);
    
    return element;
  }

  /**
   * Efficient multiple element querying with batching
   */
  querySelectorAll(selector, context = document) {
    const cacheKey = this.generateCacheKey(selector + '_all', context);
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult && this.isCacheValid(cachedResult)) {
      this.stats.cacheHits++;
      return Array.from(cachedResult.elements);
    }
    
    const startTime = performance.now();
    const elements = Array.from(context.querySelectorAll(selector));
    const queryTime = performance.now() - startTime;
    
    if (elements.length > 0) {
      this.cacheElements(cacheKey, elements, selector, queryTime);
    }
    
    this.stats.cacheMisses++;
    this.trackSelectorUsage(selector, 'miss_all', queryTime);
    
    return elements;
  }

  /**
   * Batch DOM queries for efficiency
   */
  async batchQuery(queries) {
    const results = {};
    const startTime = performance.now();
    
    // Group queries by context for efficient processing
    const queryGroups = this.groupQueriesByContext(queries);
    
    for (const [context, contextQueries] of queryGroups) {
      for (const query of contextQueries) {
        const { name, selector, multiple = false } = query;
        
        if (multiple) {
          results[name] = this.querySelectorAll(selector, context);
        } else {
          results[name] = this.querySelector(selector, context);
        }
      }
    }
    
    const totalTime = performance.now() - startTime;
    this.recordBatchPerformance(queries.length, totalTime);
    
    return results;
  }

  /**
   * Intelligent cache invalidation based on DOM mutations
   */
  setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      this.stats.mutationEvents += mutations.length;
      
      for (const mutation of mutations) {
        this.handleMutation(mutation);
      }
    });
    
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-test']
    });
  }

  /**
   * Handle DOM mutations and invalidate relevant cache entries
   */
  handleMutation(mutation) {
    const affectedSelectors = this.getAffectedSelectors(mutation);
    
    for (const selector of affectedSelectors) {
      this.invalidateCacheEntriesForSelector(selector);
    }
  }

  /**
   * Generate optimized cache key
   */
  generateCacheKey(selector, context) {
    const contextKey = context === document ? 'doc' : context.tagName + (context.id || context.className);
    return `${selector}::${contextKey}`;
  }

  /**
   * Cache element with metadata
   */
  cacheElement(cacheKey, element, selector, queryTime) {
    // Implement LRU cache eviction
    if (this.cache.size >= this.options.maxCacheSize) {
      this.evictLRUEntry();
    }
    
    this.cache.set(cacheKey, {
      element,
      selector,
      timestamp: Date.now(),
      queryTime,
      accessCount: 1,
      lastAccess: Date.now()
    });
  }

  /**
   * Track selector usage patterns for optimization
   */
  trackSelectorUsage(selector, type, queryTime = 0) {
    const usage = this.selectorUsage.get(selector) || {
      hits: 0,
      misses: 0,
      totalTime: 0,
      avgTime: 0,
      count: 0
    };
    
    if (type === 'hit') {
      usage.hits++;
    } else {
      usage.misses++;
      usage.totalTime += queryTime;
      usage.count++;
      usage.avgTime = usage.totalTime / usage.count;
    }
    
    this.selectorUsage.set(selector, usage);
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const cacheTotal = this.stats.cacheHits + this.stats.cacheMisses;
    const hitRate = cacheTotal > 0 ? (this.stats.cacheHits / cacheTotal) * 100 : 0;
    
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      topSelectors: this.getTopSelectors(),
      slowestSelectors: this.getSlowestSelectors()
    };
  }

  /**
   * Clear cache and reset stats
   */
  clear() {
    this.cache.clear();
    this.selectorUsage.clear();
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      invalidations: 0,
      mutationEvents: 0
    };
  }

  /**
   * Get top performing selectors
   */
  getTopSelectors(limit = 10) {
    return Array.from(this.selectorUsage.entries())
      .sort(([,a], [,b]) => (b.hits + b.misses) - (a.hits + a.misses))
      .slice(0, limit)
      .map(([selector, stats]) => ({ selector, ...stats }));
  }

  /**
   * Get slowest selectors for optimization
   */
  getSlowestSelectors(limit = 10) {
    return Array.from(this.selectorUsage.entries())
      .filter(([, stats]) => stats.count > 0)
      .sort(([,a], [,b]) => b.avgTime - a.avgTime)
      .slice(0, limit)
      .map(([selector, stats]) => ({ selector, ...stats }));
  }

  // Helper methods
  isCacheValid(cachedResult) {
    const age = Date.now() - cachedResult.timestamp;
    return age < this.options.cacheTimeout && document.contains(cachedResult.element);
  }

  evictLRUEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccess < oldestTime) {
        oldestTime = value.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  cleanupCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.options.cacheTimeout || 
          !document.contains(value.element)) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
    if (expiredKeys.length > 0) {
      this.stats.invalidations += expiredKeys.length;
    }
  }

  groupQueriesByContext(queries) {
    const groups = new Map();
    
    for (const query of queries) {
      const context = query.context || document;
      if (!groups.has(context)) {
        groups.set(context, []);
      }
      groups.get(context).push(query);
    }
    
    return groups;
  }

  getAffectedSelectors(mutation) {
    const selectors = new Set();
    
    // Add selectors that might be affected by this mutation
    if (mutation.type === 'childList') {
      selectors.add('*'); // Broad invalidation for structural changes
    }
    
    if (mutation.type === 'attributes') {
      const attrName = mutation.attributeName;
      if (attrName === 'class') {
        selectors.add(`[class*="${mutation.target.className}"]`);
      } else if (attrName === 'id') {
        selectors.add(`#${mutation.target.id}`);
      }
    }
    
    return selectors;
  }

  invalidateCacheEntriesForSelector(targetSelector) {
    const keysToDelete = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (this.selectorMatches(value.selector, targetSelector)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    this.stats.invalidations += keysToDelete.length;
  }

  selectorMatches(cached, target) {
    // Simple selector matching - can be enhanced
    return cached.includes(target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }

  setupPerformanceMonitoring() {
    // Monitor performance metrics
    setInterval(() => {
      const stats = this.getStats();
      if (stats.hitRate < 50 && stats.cacheSize > 100) {
        console.warn('DOM Cache performance warning: Low hit rate', stats);
      }
    }, 60000);
  }

  recordBatchPerformance(queryCount, totalTime) {
    if (totalTime > 100) { // More than 100ms for batch
      console.warn(`Slow batch query detected: ${queryCount} queries in ${totalTime.toFixed(2)}ms`);
    }
  }
}

/**
 * Memory Management for Long-Running Content Scripts
 */
export class ContentScriptMemoryManager {
  constructor(options = {}) {
    this.options = {
      maxMemoryMB: 50,
      cleanupInterval: 300000, // 5 minutes
      gcThreshold: 0.8,
      monitoringEnabled: true,
      ...options
    };
    
    this.memoryStats = {
      peakUsage: 0,
      currentUsage: 0,
      gcCycles: 0,
      cleanupCycles: 0
    };
    
    this.managedObjects = new Set();
    this.eventListeners = new Map();
    this.intervals = new Set();
    this.timeouts = new Set();
    
    this.initialize();
  }

  initialize() {
    // Periodic memory cleanup
    this.scheduleCleanup();
    
    // Memory monitoring
    if (this.options.monitoringEnabled) {
      this.startMemoryMonitoring();
    }
    
    // Page unload cleanup
    window.addEventListener('beforeunload', () => this.cleanup());
  }

  /**
   * Register objects for memory management
   */
  registerObject(obj, cleanupFn = null) {
    this.managedObjects.add({
      object: obj,
      cleanup: cleanupFn,
      timestamp: Date.now()
    });
  }

  /**
   * Safe event listener management
   */
  addEventListener(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    
    const key = `${element.constructor.name}_${event}_${Date.now()}`;
    this.eventListeners.set(key, {
      element,
      event,
      handler,
      options
    });
    
    return key;
  }

  /**
   * Remove event listener
   */
  removeEventListener(key) {
    const listener = this.eventListeners.get(key);
    if (listener) {
      listener.element.removeEventListener(listener.event, listener.handler, listener.options);
      this.eventListeners.delete(key);
    }
  }

  /**
   * Safe interval management
   */
  setInterval(callback, delay) {
    const intervalId = setInterval(callback, delay);
    this.intervals.add(intervalId);
    return intervalId;
  }

  /**
   * Safe timeout management
   */
  setTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
      callback();
      this.timeouts.delete(timeoutId);
    }, delay);
    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  /**
   * Force garbage collection if available
   */
  forceGC() {
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
      this.memoryStats.gcCycles++;
    }
  }

  /**
   * Comprehensive cleanup
   */
  cleanup() {
    console.log('🧹 Starting memory cleanup...');
    
    // Clear managed objects
    for (const managed of this.managedObjects) {
      try {
        if (managed.cleanup) {
          managed.cleanup(managed.object);
        }
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    }
    this.managedObjects.clear();
    
    // Remove event listeners
    for (const [key, listener] of this.eventListeners) {
      try {
        listener.element.removeEventListener(listener.event, listener.handler, listener.options);
      } catch (error) {
        console.warn('Event listener cleanup error:', error);
      }
    }
    this.eventListeners.clear();
    
    // Clear intervals and timeouts
    this.intervals.forEach(id => clearInterval(id));
    this.timeouts.forEach(id => clearTimeout(id));
    this.intervals.clear();
    this.timeouts.clear();
    
    // Force garbage collection
    this.forceGC();
    
    this.memoryStats.cleanupCycles++;
    console.log('✅ Memory cleanup completed');
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  checkMemoryUsage() {
    if (!performance.memory) return;
    
    const used = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
    const total = performance.memory.totalJSHeapSize / 1024 / 1024; // MB
    
    this.memoryStats.currentUsage = used;
    this.memoryStats.peakUsage = Math.max(this.memoryStats.peakUsage, used);
    
    const usageRatio = used / this.options.maxMemoryMB;
    
    if (usageRatio > this.options.gcThreshold) {
      console.warn(`High memory usage detected: ${used.toFixed(2)}MB`);
      this.cleanup();
      this.forceGC();
    }
    
    return {
      used: Math.round(used * 100) / 100,
      total: Math.round(total * 100) / 100,
      ratio: Math.round(usageRatio * 100) / 100
    };
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    this.setInterval(() => {
      const stats = this.checkMemoryUsage();
      if (stats && stats.ratio > 0.9) {
        console.error('Critical memory usage:', stats);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Schedule periodic cleanup
   */
  scheduleCleanup() {
    this.setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Get memory statistics
   */
  getStats() {
    return {
      ...this.memoryStats,
      managedObjects: this.managedObjects.size,
      eventListeners: this.eventListeners.size,
      intervals: this.intervals.size,
      timeouts: this.timeouts.size,
      currentMemory: this.checkMemoryUsage()
    };
  }
}

/**
 * Rate Limiting Manager for Site Policy Compliance
 */
export class RateLimitManager {
  constructor(options = {}) {
    this.options = {
      defaultRateLimit: 10, // requests per minute
      burstAllowance: 3,
      windowSizeMs: 60000, // 1 minute
      adaptiveRateLimit: true,
      respectRetryAfter: true,
      ...options
    };
    
    this.requestHistory = new Map();
    this.rateLimits = new Map();
    this.blockedUntil = new Map();
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      adaptations: 0
    };
    
    this.initialize();
  }

  initialize() {
    // Set platform-specific rate limits
    this.setupPlatformLimits();
    
    // Periodic cleanup of old request history
    setInterval(() => this.cleanupHistory(), this.options.windowSizeMs / 2);
  }

  /**
   * Setup platform-specific rate limits
   */
  setupPlatformLimits() {
    const platformLimits = {
      'linkedin.com': { limit: 8, window: 60000, burst: 2 },
      'indeed.com': { limit: 12, window: 60000, burst: 3 },
      'glassdoor.com': { limit: 6, window: 60000, burst: 1 },
      'monster.com': { limit: 10, window: 60000, burst: 2 },
      'ziprecruiter.com': { limit: 15, window: 60000, burst: 4 },
      'google.com': { limit: 20, window: 60000, burst: 5 }
    };
    
    for (const [domain, config] of Object.entries(platformLimits)) {
      this.rateLimits.set(domain, config);
    }
  }

  /**
   * Check if request is allowed
   */
  async isRequestAllowed(url, operation = 'default') {
    const domain = this.extractDomain(url);
    const key = `${domain}:${operation}`;
    
    // Check if currently blocked
    if (this.isBlocked(key)) {
      this.stats.blockedRequests++;
      return {
        allowed: false,
        reason: 'rate_limited',
        retryAfter: this.getRetryAfter(key)
      };
    }
    
    // Get rate limit for domain
    const rateLimit = this.getRateLimit(domain);
    const history = this.getRequestHistory(key);
    
    // Check if within rate limit
    const now = Date.now();
    const windowStart = now - rateLimit.window;
    const recentRequests = history.filter(time => time > windowStart);
    
    if (recentRequests.length >= rateLimit.limit) {
      // Check burst allowance
      const veryRecentRequests = history.filter(time => time > now - 10000); // 10 seconds
      
      if (veryRecentRequests.length >= rateLimit.burst) {
        this.blockTemporarily(key, rateLimit.window / rateLimit.limit);
        this.stats.blockedRequests++;
        
        // Adaptive rate limiting
        if (this.options.adaptiveRateLimit) {
          this.adaptRateLimit(domain, 'decrease');
        }
        
        return {
          allowed: false,
          reason: 'rate_exceeded',
          retryAfter: this.getRetryAfter(key)
        };
      }
    }
    
    // Record request
    this.recordRequest(key);
    this.stats.totalRequests++;
    
    return { allowed: true };
  }

  /**
   * Record successful request
   */
  recordRequest(key) {
    const history = this.getRequestHistory(key);
    history.push(Date.now());
    this.requestHistory.set(key, history);
  }

  /**
   * Handle rate limit response from server
   */
  handleRateLimitResponse(url, response) {
    const domain = this.extractDomain(url);
    
    if (response.status === 429) {
      const retryAfter = this.parseRetryAfter(response.headers.get('retry-after'));
      const key = `${domain}:default`;
      
      this.blockTemporarily(key, retryAfter * 1000);
      
      // Adaptive rate limiting
      if (this.options.adaptiveRateLimit) {
        this.adaptRateLimit(domain, 'decrease');
      }
      
      return {
        rateLimited: true,
        retryAfter,
        domain
      };
    }
    
    // Successful request - potentially increase rate limit
    if (response.ok && this.options.adaptiveRateLimit) {
      this.adaptRateLimit(domain, 'increase');
    }
    
    return { rateLimited: false };
  }

  /**
   * Adaptive rate limit adjustment
   */
  adaptRateLimit(domain, direction) {
    const current = this.rateLimits.get(domain) || {
      limit: this.options.defaultRateLimit,
      window: this.options.windowSizeMs,
      burst: this.options.burstAllowance
    };
    
    let newLimit = current.limit;
    
    if (direction === 'decrease') {
      newLimit = Math.max(1, Math.floor(current.limit * 0.8));
    } else if (direction === 'increase') {
      newLimit = Math.min(50, Math.floor(current.limit * 1.1));
    }
    
    if (newLimit !== current.limit) {
      this.rateLimits.set(domain, {
        ...current,
        limit: newLimit
      });
      
      this.stats.adaptations++;
      console.log(`Rate limit adapted for ${domain}: ${current.limit} → ${newLimit}`);
    }
  }

  /**
   * Calculate optimal delay between requests
   */
  calculateOptimalDelay(url) {
    const domain = this.extractDomain(url);
    const rateLimit = this.getRateLimit(domain);
    
    // Base delay to stay within rate limit
    const baseDelay = rateLimit.window / rateLimit.limit;
    
    // Add jitter to prevent synchronized requests
    const jitter = Math.random() * baseDelay * 0.2;
    
    return Math.floor(baseDelay + jitter);
  }

  /**
   * Get rate limit statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.totalRequests > 0 ? 
        (this.stats.totalRequests - this.stats.blockedRequests) / this.stats.totalRequests * 100 : 100,
      activeDomains: this.rateLimits.size,
      currentlyBlocked: Array.from(this.blockedUntil.entries())
        .filter(([, time]) => time > Date.now())
        .map(([key]) => key)
    };
  }

  // Helper methods
  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  getRateLimit(domain) {
    return this.rateLimits.get(domain) || {
      limit: this.options.defaultRateLimit,
      window: this.options.windowSizeMs,
      burst: this.options.burstAllowance
    };
  }

  getRequestHistory(key) {
    return this.requestHistory.get(key) || [];
  }

  isBlocked(key) {
    const blockedUntil = this.blockedUntil.get(key);
    return blockedUntil && Date.now() < blockedUntil;
  }

  blockTemporarily(key, duration) {
    this.blockedUntil.set(key, Date.now() + duration);
  }

  getRetryAfter(key) {
    const blockedUntil = this.blockedUntil.get(key);
    return blockedUntil ? Math.ceil((blockedUntil - Date.now()) / 1000) : 0;
  }

  parseRetryAfter(retryAfterHeader) {
    if (!retryAfterHeader) return 60; // Default 1 minute
    
    const seconds = parseInt(retryAfterHeader, 10);
    return isNaN(seconds) ? 60 : Math.min(seconds, 300); // Max 5 minutes
  }

  cleanupHistory() {
    const cutoff = Date.now() - this.options.windowSizeMs * 2;
    
    for (const [key, history] of this.requestHistory.entries()) {
      const filtered = history.filter(time => time > cutoff);
      if (filtered.length === 0) {
        this.requestHistory.delete(key);
      } else {
        this.requestHistory.set(key, filtered);
      }
    }
    
    // Cleanup expired blocks
    for (const [key, blockedUntil] of this.blockedUntil.entries()) {
      if (Date.now() > blockedUntil) {
        this.blockedUntil.delete(key);
      }
    }
  }
}

// Create singleton instances for global use
export const domCache = new DOMQueryCache({
  maxCacheSize: 1000,
  cacheTimeout: 30000,
  enableMutationTracking: true
});

export const memoryManager = new ContentScriptMemoryManager({
  maxMemoryMB: 50,
  cleanupInterval: 300000,
  monitoringEnabled: true
});

export const rateLimiter = new RateLimitManager({
  defaultRateLimit: 10,
  adaptiveRateLimit: true,
  respectRetryAfter: true
});

export default {
  DOMQueryCache,
  ContentScriptMemoryManager,
  RateLimitManager,
  domCache,
  memoryManager,
  rateLimiter
};

// Performance Monitoring and Analytics for JobScrapper
// Comprehensive performance tracking, metrics collection, and optimization insights

/**
 * Performance Monitor with real-time metrics and optimization insights
 */
export class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableRealTimeMonitoring: true,
      metricsRetentionDays: 7,
      alertThresholds: {
        slowQuery: 100, // ms
        highMemory: 80, // percentage
        lowCacheHit: 50, // percentage
        highErrorRate: 5 // percentage
      },
      reportingInterval: 60000, // 1 minute
      ...options
    };
    
    this.metrics = {
      performance: new Map(),
      errors: new Map(),
      cache: new Map(),
      database: new Map(),
      network: new Map(),
      memory: new Map()
    };
    
    this.alerts = [];
    this.reports = [];
    this.startTime = Date.now();
    
    this.initialize();
  }

  initialize() {
    if (this.options.enableRealTimeMonitoring) {
      this.startRealTimeMonitoring();
    }
    
    // Periodic reporting
    setInterval(() => this.generatePerformanceReport(), this.options.reportingInterval);
    
    // Cleanup old metrics
    setInterval(() => this.cleanupOldMetrics(), 24 * 60 * 60 * 1000); // Daily
    
    console.log('📊 Performance Monitor initialized');
  }

  /**
   * Record performance metrics
   */
  recordMetric(category, metric, value, tags = {}) {
    const timestamp = Date.now();
    const categoryMetrics = this.metrics[category] || new Map();
    const metricData = categoryMetrics.get(metric) || [];
    
    metricData.push({
      value,
      timestamp,
      tags
    });
    
    // Keep only recent data points
    const cutoff = timestamp - (this.options.metricsRetentionDays * 24 * 60 * 60 * 1000);
    const filtered = metricData.filter(point => point.timestamp > cutoff);
    
    categoryMetrics.set(metric, filtered);
    this.metrics[category] = categoryMetrics;
    
    // Check for alerts
    this.checkAlertThresholds(category, metric, value, tags);
  }

  /**
   * Record timing metrics with automatic calculation
   */
  time(category, metric, tags = {}) {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric(category, metric, duration, tags);
        return duration;
      }
    };
  }

  /**
   * Record DOM query performance
   */
  recordDOMQuery(selector, duration, cacheHit = false, context = {}) {
    this.recordMetric('performance', 'dom_query_time', duration, {
      selector,
      cacheHit,
      ...context
    });
    
    if (duration > 50) { // Slow DOM query
      this.recordMetric('performance', 'slow_dom_queries', 1, {
        selector,
        duration
      });
    }
  }

  /**
   * Record network request performance
   */
  recordNetworkRequest(url, method, duration, status, size = 0) {
    const domain = this.extractDomain(url);
    
    this.recordMetric('network', 'request_duration', duration, {
      domain,
      method,
      status
    });
    
    this.recordMetric('network', 'request_size', size, {
      domain,
      method,
      status
    });
    
    if (status >= 400) {
      this.recordMetric('network', 'error_requests', 1, {
        domain,
        status
      });
    }
    
    if (duration > 2000) { // Slow request > 2s
      this.recordMetric('network', 'slow_requests', 1, {
        domain,
        duration
      });
    }
  }

  /**
   * Record database query performance
   */
  recordDatabaseQuery(operation, duration, resultCount = 0, cached = false) {
    this.recordMetric('database', 'query_duration', duration, {
      operation,
      cached,
      resultCount
    });
    
    if (duration > this.options.alertThresholds.slowQuery) {
      this.recordMetric('database', 'slow_queries', 1, {
        operation,
        duration
      });
    }
    
    this.recordMetric('database', 'query_results', resultCount, {
      operation
    });
  }

  /**
   * Record memory usage
   */
  recordMemoryUsage() {
    if (performance.memory) {
      const memory = performance.memory;
      const timestamp = Date.now();
      
      this.recordMetric('memory', 'heap_used', memory.usedJSHeapSize / 1024 / 1024); // MB
      this.recordMetric('memory', 'heap_total', memory.totalJSHeapSize / 1024 / 1024); // MB
      this.recordMetric('memory', 'heap_limit', memory.jsHeapSizeLimit / 1024 / 1024); // MB
      
      const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.recordMetric('memory', 'usage_percent', usagePercent);
    }
  }

  /**
   * Record cache performance
   */
  recordCacheMetrics(type, hits, misses, size) {
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;
    
    this.recordMetric('cache', `${type}_hit_rate`, hitRate);
    this.recordMetric('cache', `${type}_size`, size);
    this.recordMetric('cache', `${type}_requests`, total);
  }

  /**
   * Record error metrics
   */
  recordError(category, error, context = {}) {
    this.recordMetric('errors', category, 1, {
      message: error.message,
      stack: error.stack?.substring(0, 500), // Truncate stack trace
      ...context
    });
  }

  /**
   * Real-time performance monitoring
   */
  startRealTimeMonitoring() {
    // Monitor memory usage
    setInterval(() => this.recordMemoryUsage(), 30000); // Every 30 seconds
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task > 50ms
              this.recordMetric('performance', 'long_tasks', entry.duration, {
                name: entry.name,
                startTime: entry.startTime
              });
            }
          }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('Long task monitoring not supported:', error);
      }
    }
    
    // Monitor navigation timing
    if (performance.navigation) {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.recordMetric('performance', 'page_load_time', navigation.loadEventEnd - navigation.fetchStart);
        this.recordMetric('performance', 'dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
      }
    }
  }

  /**
   * Alert threshold monitoring
   */
  checkAlertThresholds(category, metric, value, tags) {
    const alerts = [];
    
    // Check specific thresholds
    if (category === 'database' && metric === 'query_duration' && value > this.options.alertThresholds.slowQuery) {
      alerts.push({
        level: 'warning',
        message: `Slow database query detected: ${value.toFixed(2)}ms`,
        category,
        metric,
        value,
        tags
      });
    }
    
    if (category === 'memory' && metric === 'usage_percent' && value > this.options.alertThresholds.highMemory) {
      alerts.push({
        level: 'error',
        message: `High memory usage: ${value.toFixed(1)}%`,
        category,
        metric,
        value,
        tags
      });
    }
    
    if (category === 'cache' && metric.includes('hit_rate') && value < this.options.alertThresholds.lowCacheHit) {
      alerts.push({
        level: 'warning',
        message: `Low cache hit rate: ${value.toFixed(1)}%`,
        category,
        metric,
        value,
        tags
      });
    }
    
    // Add alerts to queue
    alerts.forEach(alert => {
      alert.timestamp = Date.now();
      this.alerts.push(alert);
    });
    
    // Limit alert queue size
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      summary: this.generateSummaryMetrics(),
      performance: this.generatePerformanceMetrics(),
      database: this.generateDatabaseMetrics(),
      network: this.generateNetworkMetrics(),
      memory: this.generateMemoryMetrics(),
      cache: this.generateCacheMetrics(),
      errors: this.generateErrorMetrics(),
      recommendations: this.generateRecommendations()
    };
    
    this.reports.push(report);
    
    // Keep only recent reports
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-50);
    }
    
    // Log performance issues
    this.logPerformanceIssues(report);
    
    return report;
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Database optimization recommendations
    const dbMetrics = this.generateDatabaseMetrics();
    if (dbMetrics.avgQueryTime > 100) {
      recommendations.push({
        category: 'database',
        priority: 'high',
        message: 'Consider adding database indexes for slow queries',
        metric: 'avg_query_time',
        value: dbMetrics.avgQueryTime
      });
    }
    
    if (dbMetrics.cacheHitRate < 50) {
      recommendations.push({
        category: 'database',
        priority: 'medium',
        message: 'Increase query cache timeout or size',
        metric: 'cache_hit_rate',
        value: dbMetrics.cacheHitRate
      });
    }
    
    // Memory optimization recommendations
    const memoryMetrics = this.generateMemoryMetrics();
    if (memoryMetrics.avgUsagePercent > 70) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        message: 'High memory usage detected, consider memory cleanup',
        metric: 'usage_percent',
        value: memoryMetrics.avgUsagePercent
      });
    }
    
    // DOM optimization recommendations
    const perfMetrics = this.generatePerformanceMetrics();
    if (perfMetrics.slowDOMQueries > 10) {
      recommendations.push({
        category: 'dom',
        priority: 'medium',
        message: 'Many slow DOM queries detected, optimize selectors',
        metric: 'slow_dom_queries',
        value: perfMetrics.slowDOMQueries
      });
    }
    
    // Network optimization recommendations
    const networkMetrics = this.generateNetworkMetrics();
    if (networkMetrics.errorRate > 5) {
      recommendations.push({
        category: 'network',
        priority: 'high',
        message: 'High network error rate, check connectivity',
        metric: 'error_rate',
        value: networkMetrics.errorRate
      });
    }
    
    return recommendations;
  }

  /**
   * Metric calculation helpers
   */
  generateSummaryMetrics() {
    return {
      uptime: Date.now() - this.startTime,
      totalMetrics: this.getTotalMetricCount(),
      activeAlerts: this.alerts.filter(a => Date.now() - a.timestamp < 300000).length, // 5 minutes
      lastReportTime: this.reports.length > 0 ? this.reports[this.reports.length - 1].timestamp : null
    };
  }

  generatePerformanceMetrics() {
    const performanceData = this.metrics.performance || new Map();
    
    return {
      avgDOMQueryTime: this.calculateAverage('performance', 'dom_query_time'),
      slowDOMQueries: this.getMetricSum('performance', 'slow_dom_queries'),
      longTasks: this.getMetricSum('performance', 'long_tasks'),
      pageLoadTime: this.getLatestMetric('performance', 'page_load_time')
    };
  }

  generateDatabaseMetrics() {
    return {
      avgQueryTime: this.calculateAverage('database', 'query_duration'),
      slowQueries: this.getMetricSum('database', 'slow_queries'),
      totalQueries: this.getMetricSum('database', 'query_results'),
      cacheHitRate: this.calculateAverage('cache', 'database_hit_rate') || 0
    };
  }

  generateNetworkMetrics() {
    const totalRequests = this.getMetricSum('network', 'request_duration', 'count');
    const errorRequests = this.getMetricSum('network', 'error_requests');
    
    return {
      avgRequestTime: this.calculateAverage('network', 'request_duration'),
      totalRequests,
      errorRequests,
      errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      slowRequests: this.getMetricSum('network', 'slow_requests')
    };
  }

  generateMemoryMetrics() {
    return {
      currentHeapUsed: this.getLatestMetric('memory', 'heap_used'),
      currentHeapTotal: this.getLatestMetric('memory', 'heap_total'),
      currentUsagePercent: this.getLatestMetric('memory', 'usage_percent'),
      avgUsagePercent: this.calculateAverage('memory', 'usage_percent'),
      peakUsage: this.getMaxMetric('memory', 'heap_used')
    };
  }

  generateCacheMetrics() {
    const cacheData = this.metrics.cache || new Map();
    const cacheTypes = ['dom', 'database', 'query'];
    
    const cacheMetrics = {};
    
    cacheTypes.forEach(type => {
      cacheMetrics[type] = {
        hitRate: this.getLatestMetric('cache', `${type}_hit_rate`) || 0,
        size: this.getLatestMetric('cache', `${type}_size`) || 0,
        requests: this.getLatestMetric('cache', `${type}_requests`) || 0
      };
    });
    
    return cacheMetrics;
  }

  generateErrorMetrics() {
    const errorData = this.metrics.errors || new Map();
    const errorSummary = {};
    
    for (const [errorType, metrics] of errorData.entries()) {
      errorSummary[errorType] = metrics.length;
    }
    
    return {
      totalErrors: Object.values(errorSummary).reduce((sum, count) => sum + count, 0),
      errorsByType: errorSummary,
      recentErrors: this.getRecentErrors(300000) // 5 minutes
    };
  }

  /**
   * Utility methods for metric calculations
   */
  calculateAverage(category, metric) {
    const data = this.metrics[category]?.get(metric) || [];
    if (data.length === 0) return 0;
    
    const sum = data.reduce((total, point) => total + point.value, 0);
    return sum / data.length;
  }

  getMetricSum(category, metric, type = 'value') {
    const data = this.metrics[category]?.get(metric) || [];
    
    if (type === 'count') {
      return data.length;
    }
    
    return data.reduce((total, point) => total + point.value, 0);
  }

  getLatestMetric(category, metric) {
    const data = this.metrics[category]?.get(metric) || [];
    return data.length > 0 ? data[data.length - 1].value : 0;
  }

  getMaxMetric(category, metric) {
    const data = this.metrics[category]?.get(metric) || [];
    return data.length > 0 ? Math.max(...data.map(p => p.value)) : 0;
  }

  getTotalMetricCount() {
    let total = 0;
    for (const categoryMap of Object.values(this.metrics)) {
      for (const metricData of categoryMap.values()) {
        total += metricData.length;
      }
    }
    return total;
  }

  getRecentErrors(timeWindow) {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = [];
    
    for (const [errorType, metrics] of (this.metrics.errors || new Map()).entries()) {
      const recent = metrics.filter(point => point.timestamp > cutoff);
      if (recent.length > 0) {
        recentErrors.push({
          type: errorType,
          count: recent.length,
          lastOccurrence: Math.max(...recent.map(p => p.timestamp))
        });
      }
    }
    
    return recentErrors;
  }

  cleanupOldMetrics() {
    const cutoff = Date.now() - (this.options.metricsRetentionDays * 24 * 60 * 60 * 1000);
    
    for (const [category, categoryMap] of Object.entries(this.metrics)) {
      for (const [metric, data] of categoryMap.entries()) {
        const filtered = data.filter(point => point.timestamp > cutoff);
        categoryMap.set(metric, filtered);
      }
    }
    
    // Cleanup old alerts
    this.alerts = this.alerts.filter(alert => Date.now() - alert.timestamp < 24 * 60 * 60 * 1000);
  }

  logPerformanceIssues(report) {
    const issues = [];
    
    if (report.database.avgQueryTime > 100) {
      issues.push(`Slow database queries: ${report.database.avgQueryTime.toFixed(2)}ms avg`);
    }
    
    if (report.memory.currentUsagePercent > 80) {
      issues.push(`High memory usage: ${report.memory.currentUsagePercent.toFixed(1)}%`);
    }
    
    if (report.network.errorRate > 5) {
      issues.push(`High network error rate: ${report.network.errorRate.toFixed(1)}%`);
    }
    
    if (issues.length > 0) {
      console.warn('⚠️ Performance Issues Detected:', issues.join(', '));
    }
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Export performance data
   */
  exportMetrics(format = 'json') {
    const data = {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      metrics: Object.fromEntries(
        Object.entries(this.metrics).map(([category, categoryMap]) => [
          category,
          Object.fromEntries(categoryMap)
        ])
      ),
      alerts: this.alerts,
      reports: this.reports.slice(-10) // Last 10 reports
    };
    
    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  convertToCSV(data) {
    // Simple CSV export for metrics
    let csv = 'Category,Metric,Timestamp,Value,Tags\n';
    
    for (const [category, categoryMap] of Object.entries(data.metrics)) {
      for (const [metric, points] of Object.entries(categoryMap)) {
        for (const point of points) {
          const tags = JSON.stringify(point.tags || {});
          csv += `${category},${metric},${point.timestamp},${point.value},"${tags}"\n`;
        }
      }
    }
    
    return csv;
  }

  /**
   * Get current performance status
   */
  getStatus() {
    const latestReport = this.reports[this.reports.length - 1];
    const activeAlerts = this.alerts.filter(a => Date.now() - a.timestamp < 300000);
    
    return {
      healthy: activeAlerts.filter(a => a.level === 'error').length === 0,
      uptime: Date.now() - this.startTime,
      activeAlerts: activeAlerts.length,
      lastReport: latestReport?.timestamp,
      performance: latestReport?.performance || {},
      recommendations: latestReport?.recommendations || []
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor({
  enableRealTimeMonitoring: true,
  metricsRetentionDays: 7,
  reportingInterval: 60000
});

export default {
  PerformanceMonitor,
  performanceMonitor
};

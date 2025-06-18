// Database Query Optimization for JobScrapper Backend
// Implements efficient querying, proper indexing, and performance monitoring

import mongoose from 'mongoose';

/**
 * Database Query Optimizer with intelligent caching and indexing
 */
export class DatabaseQueryOptimizer {
  constructor(options = {}) {
    this.options = {
      enableQueryCache: true,
      cacheTimeout: 300000, // 5 minutes
      maxCacheSize: 1000,
      enableSlowQueryLogging: true,
      slowQueryThreshold: 100, // ms
      enableIndexOptimization: true,
      ...options
    };
    
    this.queryCache = new Map();
    this.queryStats = new Map();
    this.indexSuggestions = new Set();
    
    this.initialize();
  }

  async initialize() {
    // Setup database monitoring
    if (this.options.enableSlowQueryLogging) {
      this.setupSlowQueryLogging();
    }
    
    // Periodic cache cleanup
    setInterval(() => this.cleanupCache(), this.options.cacheTimeout / 2);
    
    // Index optimization analysis
    if (this.options.enableIndexOptimization) {
      this.setupIndexOptimization();
    }
    
    console.log('🚀 Database Query Optimizer initialized');
  }

  /**
   * Optimized job search with intelligent caching and indexing
   */
  async findJobs(query = {}, options = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('findJobs', query, options);
    
    // Check cache first
    if (this.options.enableQueryCache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        this.recordCacheHit('findJobs');
        return cached.data;
      }
    }
    
    // Build optimized query
    const optimizedQuery = this.optimizeJobQuery(query);
    const optimizedOptions = this.optimizeQueryOptions(options);
    
    // Execute query with performance monitoring
    const Job = mongoose.model('Job');
    const result = await this.executeWithMonitoring(
      () => Job.find(optimizedQuery, null, optimizedOptions),
      'findJobs',
      { query: optimizedQuery, options: optimizedOptions }
    );
    
    // Cache result
    if (this.options.enableQueryCache) {
      this.cacheResult(cacheKey, result);
    }
    
    const executionTime = Date.now() - startTime;
    this.recordQueryStats('findJobs', executionTime, result.length);
    
    return result;
  }

  /**
   * Optimized job aggregation with pipeline optimization
   */
  async aggregateJobs(pipeline = [], options = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('aggregateJobs', pipeline, options);
    
    // Check cache
    if (this.options.enableQueryCache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        this.recordCacheHit('aggregateJobs');
        return cached.data;
      }
    }
    
    // Optimize aggregation pipeline
    const optimizedPipeline = this.optimizeAggregationPipeline(pipeline);
    
    // Execute aggregation
    const Job = mongoose.model('Job');
    const result = await this.executeWithMonitoring(
      () => Job.aggregate(optimizedPipeline, options),
      'aggregateJobs',
      { pipeline: optimizedPipeline }
    );
    
    // Cache result
    if (this.options.enableQueryCache) {
      this.cacheResult(cacheKey, result);
    }
    
    const executionTime = Date.now() - startTime;
    this.recordQueryStats('aggregateJobs', executionTime, result.length);
    
    return result;
  }

  /**
   * Optimized application queries with proper joins
   */
  async findApplications(query = {}, options = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey('findApplications', query, options);
    
    // Check cache
    if (this.options.enableQueryCache) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        this.recordCacheHit('findApplications');
        return cached.data;
      }
    }
    
    // Build optimized query with population
    const optimizedQuery = this.optimizeApplicationQuery(query);
    const optimizedOptions = {
      ...this.optimizeQueryOptions(options),
      populate: this.optimizePopulation(options.populate)
    };
    
    // Execute query
    const Application = mongoose.model('Application');
    const result = await this.executeWithMonitoring(
      () => Application.find(optimizedQuery, null, optimizedOptions),
      'findApplications',
      { query: optimizedQuery, options: optimizedOptions }
    );
    
    // Cache result
    if (this.options.enableQueryCache) {
      this.cacheResult(cacheKey, result);
    }
    
    const executionTime = Date.now() - startTime;
    this.recordQueryStats('findApplications', executionTime, result.length);
    
    return result;
  }

  /**
   * Batch operations optimization
   */
  async batchInsert(model, documents, options = {}) {
    const startTime = Date.now();
    
    // Optimize batch size
    const optimizedBatchSize = this.calculateOptimalBatchSize(documents.length);
    const batches = this.chunkArray(documents, optimizedBatchSize);
    
    const results = [];
    const Model = mongoose.model(model);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const batchResult = await Model.insertMany(batch, {
          ordered: false, // Continue on error
          ...options
        });
        results.push(...batchResult);
      } catch (error) {
        console.error(`Batch ${i} insertion failed:`, error);
        // Handle partial failures
        if (error.writeErrors) {
          results.push(...error.insertedDocs);
        }
      }
    }
    
    const executionTime = Date.now() - startTime;
    this.recordQueryStats('batchInsert', executionTime, results.length);
    
    return results;
  }

  /**
   * Optimized duplicate detection queries
   */
  async findDuplicates(model, matchFields, options = {}) {
    const startTime = Date.now();
    
    // Build efficient aggregation pipeline for duplicate detection
    const pipeline = [
      {
        $group: {
          _id: this.buildGroupKey(matchFields),
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      },
      {
        $sort: { count: -1 }
      }
    ];
    
    if (options.limit) {
      pipeline.push({ $limit: options.limit });
    }
    
    const Model = mongoose.model(model);
    const result = await this.executeWithMonitoring(
      () => Model.aggregate(pipeline),
      'findDuplicates',
      { model, matchFields }
    );
    
    const executionTime = Date.now() - startTime;
    this.recordQueryStats('findDuplicates', executionTime, result.length);
    
    return result;
  }

  /**
   * Query optimization methods
   */
  optimizeJobQuery(query) {
    const optimized = { ...query };
    
    // Add index hints for common queries
    if (optimized.platform) {
      // Platform index exists
      optimized.$hint = { platform: 1, createdAt: -1 };
    }
    
    // Optimize text search
    if (optimized.$text) {
      // Ensure text search is efficient
      optimized.$text.$caseSensitive = false;
      optimized.$text.$diacriticSensitive = false;
    }
    
    // Optimize date range queries
    if (optimized.postedDate) {
      if (typeof optimized.postedDate === 'object' && optimized.postedDate.$gte) {
        // Use ISO date for better index usage
        optimized.postedDate.$gte = new Date(optimized.postedDate.$gte);
      }
    }
    
    // Optimize salary range queries
    if (optimized.salary) {
      // Convert to numeric range for index usage
      optimized['salary.min'] = { $lte: optimized.salary };
      optimized['salary.max'] = { $gte: optimized.salary };
      delete optimized.salary;
    }
    
    return optimized;
  }

  optimizeQueryOptions(options) {
    const optimized = { ...options };
    
    // Set reasonable defaults
    if (!optimized.limit) {
      optimized.limit = 100; // Prevent large result sets
    }
    
    // Optimize sorting
    if (optimized.sort) {
      // Add compound sort for better index usage
      if (typeof optimized.sort === 'object') {
        optimized.sort = { ...optimized.sort, _id: 1 }; // Ensure consistent ordering
      }
    } else {
      optimized.sort = { createdAt: -1, _id: 1 }; // Default sort with tie-breaker
    }
    
    // Optimize field selection
    if (!optimized.select) {
      // Select only commonly needed fields by default
      optimized.select = 'title company location salary platform url createdAt';
    }
    
    return optimized;
  }

  optimizeAggregationPipeline(pipeline) {
    const optimized = [...pipeline];
    
    // Move $match stages to the beginning
    const matchStages = optimized.filter(stage => stage.$match);
    const otherStages = optimized.filter(stage => !stage.$match);
    
    // Add index hints to match stages
    matchStages.forEach(stage => {
      if (stage.$match.platform) {
        stage.$hint = { platform: 1 };
      }
    });
    
    // Reorder for efficiency: $match, $sort, $skip, $limit, others
    const reordered = [
      ...matchStages,
      ...otherStages.filter(stage => stage.$sort),
      ...otherStages.filter(stage => stage.$skip),
      ...otherStages.filter(stage => stage.$limit),
      ...otherStages.filter(stage => !stage.$sort && !stage.$skip && !stage.$limit)
    ];
    
    return reordered;
  }

  optimizePopulation(populate) {
    if (!populate) return undefined;
    
    if (Array.isArray(populate)) {
      return populate.map(pop => this.optimizeSinglePopulation(pop));
    }
    
    return this.optimizeSinglePopulation(populate);
  }

  optimizeSinglePopulation(populate) {
    if (typeof populate === 'string') {
      return {
        path: populate,
        select: this.getOptimalFieldsForModel(populate)
      };
    }
    
    return {
      ...populate,
      select: populate.select || this.getOptimalFieldsForModel(populate.path)
    };
  }

  /**
   * Performance monitoring and analysis
   */
  async executeWithMonitoring(queryFn, operation, context = {}) {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const executionTime = Date.now() - startTime;
      
      // Log slow queries
      if (executionTime > this.options.slowQueryThreshold) {
        console.warn(`Slow query detected: ${operation} took ${executionTime}ms`, context);
        this.suggestIndexOptimization(operation, context);
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Query failed: ${operation} after ${executionTime}ms`, error);
      throw error;
    }
  }

  setupSlowQueryLogging() {
    // Enable MongoDB profiler for slow queries
    mongoose.connection.on('connected', async () => {
      try {
        await mongoose.connection.db.command({
          profile: 2,
          slowms: this.options.slowQueryThreshold
        });
        console.log('MongoDB profiler enabled for slow queries');
      } catch (error) {
        console.warn('Failed to enable MongoDB profiler:', error);
      }
    });
  }

  setupIndexOptimization() {
    // Analyze query patterns and suggest indexes
    setInterval(async () => {
      await this.analyzeIndexUsage();
      await this.suggestMissingIndexes();
    }, 3600000); // Every hour
  }

  async analyzeIndexUsage() {
    try {
      const stats = await mongoose.connection.db.collection('jobs').indexStats();
      
      for (const indexStat of stats) {
        if (indexStat.accesses.ops === 0) {
          console.warn(`Unused index detected: ${indexStat.name} on jobs collection`);
        }
      }
    } catch (error) {
      console.error('Index analysis failed:', error);
    }
  }

  async suggestMissingIndexes() {
    const suggestions = Array.from(this.indexSuggestions);
    
    if (suggestions.length > 0) {
      console.log('Index optimization suggestions:', suggestions);
      this.indexSuggestions.clear();
    }
  }

  suggestIndexOptimization(operation, context) {
    const { query } = context;
    
    if (query) {
      // Analyze query patterns and suggest indexes
      const fields = Object.keys(query);
      
      if (fields.length > 1) {
        const compoundIndex = fields.join('_');
        this.indexSuggestions.add(`Compound index suggestion: {${fields.map(f => `${f}: 1`).join(', ')}}`);
      }
      
      // Check for range queries that might benefit from indexes
      fields.forEach(field => {
        if (typeof query[field] === 'object' && (query[field].$gte || query[field].$lte)) {
          this.indexSuggestions.add(`Range query index suggestion: {${field}: 1}`);
        }
      });
    }
  }

  /**
   * Cache management
   */
  generateCacheKey(operation, ...args) {
    const key = JSON.stringify({ operation, args });
    return require('crypto').createHash('md5').update(key).digest('hex');
  }

  cacheResult(key, data) {
    if (this.queryCache.size >= this.options.maxCacheSize) {
      this.evictLRUCache();
    }
    
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    });
  }

  isCacheValid(cached) {
    return Date.now() - cached.timestamp < this.options.cacheTimeout;
  }

  recordCacheHit(operation) {
    const stats = this.queryStats.get(operation) || { hits: 0, misses: 0 };
    stats.hits++;
    this.queryStats.set(operation, stats);
  }

  recordQueryStats(operation, executionTime, resultCount) {
    const stats = this.queryStats.get(operation) || {
      hits: 0,
      misses: 0,
      totalTime: 0,
      avgTime: 0,
      count: 0,
      totalResults: 0
    };
    
    stats.misses++;
    stats.totalTime += executionTime;
    stats.count++;
    stats.avgTime = stats.totalTime / stats.count;
    stats.totalResults += resultCount;
    
    this.queryStats.set(operation, stats);
  }

  cleanupCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, cached] of this.queryCache.entries()) {
      if (now - cached.timestamp > this.options.cacheTimeout) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.queryCache.delete(key));
  }

  evictLRUCache() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, cached] of this.queryCache.entries()) {
      if (cached.timestamp < lruTime) {
        lruTime = cached.timestamp;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.queryCache.delete(lruKey);
    }
  }

  /**
   * Utility methods
   */
  calculateOptimalBatchSize(totalCount) {
    // Calculate based on document size and memory constraints
    if (totalCount < 100) return totalCount;
    if (totalCount < 1000) return 100;
    if (totalCount < 10000) return 500;
    return 1000; // Max batch size
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  buildGroupKey(fields) {
    const groupKey = {};
    fields.forEach(field => {
      groupKey[field] = `$${field}`;
    });
    return groupKey;
  }

  getOptimalFieldsForModel(modelName) {
    const modelFields = {
      'Job': 'title company location salary platform url',
      'Application': 'status appliedDate jobId userId',
      'User': 'email firstName lastName'
    };
    
    return modelFields[modelName] || '';
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const cacheStats = {
      size: this.queryCache.size,
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0
    };
    
    for (const stats of this.queryStats.values()) {
      cacheStats.totalHits += stats.hits;
      cacheStats.totalMisses += stats.misses;
    }
    
    const total = cacheStats.totalHits + cacheStats.totalMisses;
    cacheStats.hitRate = total > 0 ? (cacheStats.totalHits / total) * 100 : 0;
    
    return {
      cache: cacheStats,
      queries: Object.fromEntries(this.queryStats),
      indexSuggestions: Array.from(this.indexSuggestions)
    };
  }
}

/**
 * Database Index Configuration
 */
export class DatabaseIndexManager {
  constructor() {
    this.indexDefinitions = new Map();
    this.setupIndexDefinitions();
  }

  setupIndexDefinitions() {
    // Job collection indexes
    this.indexDefinitions.set('Job', [
      // Single field indexes
      { platform: 1 },
      { company: 1 },
      { createdAt: -1 },
      { updatedAt: -1 },
      { url: 1 },
      
      // Compound indexes for common queries
      { platform: 1, createdAt: -1 },
      { platform: 1, company: 1 },
      { company: 1, createdAt: -1 },
      { location: 1, platform: 1 },
      
      // Text search index
      { 
        title: 'text', 
        description: 'text', 
        company: 'text' 
      },
      
      // Geospatial index for location-based queries
      { locationCoords: '2dsphere' },
      
      // Sparse indexes for optional fields
      { 'salary.min': 1 },
      { 'salary.max': 1 },
      
      // TTL index for old job postings
      { createdAt: 1, expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
    ]);
    
    // Application collection indexes
    this.indexDefinitions.set('Application', [
      { userId: 1 },
      { jobId: 1 },
      { status: 1 },
      { appliedDate: -1 },
      
      // Compound indexes
      { userId: 1, status: 1 },
      { userId: 1, appliedDate: -1 },
      { jobId: 1, userId: 1 }, // Unique constraint
      { platform: 1, status: 1 }
    ]);
    
    // User collection indexes
    this.indexDefinitions.set('User', [
      { email: 1 }, // Unique
      { createdAt: -1 },
      { lastActive: -1 }
    ]);
    
    // Site collection indexes
    this.indexDefinitions.set('Site', [
      { domain: 1 }, // Unique
      { isActive: 1 }
    ]);
  }

  async createIndexes() {
    console.log('🏗️ Creating database indexes...');
    
    for (const [modelName, indexes] of this.indexDefinitions) {
      try {
        const Model = mongoose.model(modelName);
        
        for (const indexDef of indexes) {
          await Model.collection.createIndex(indexDef);
        }
        
        console.log(`✅ Indexes created for ${modelName}`);
      } catch (error) {
        console.error(`❌ Failed to create indexes for ${modelName}:`, error);
      }
    }
    
    console.log('🏗️ Database index creation completed');
  }

  async dropUnusedIndexes() {
    console.log('🧹 Analyzing and dropping unused indexes...');
    
    for (const [modelName] of this.indexDefinitions) {
      try {
        const Model = mongoose.model(modelName);
        const indexStats = await Model.collection.indexStats();
        
        for (const stat of indexStats) {
          if (stat.accesses.ops === 0 && stat.name !== '_id_') {
            console.log(`Dropping unused index: ${stat.name} from ${modelName}`);
            await Model.collection.dropIndex(stat.name);
          }
        }
      } catch (error) {
        console.error(`Failed to analyze indexes for ${modelName}:`, error);
      }
    }
  }
}

// Create singleton instances
export const queryOptimizer = new DatabaseQueryOptimizer();
export const indexManager = new DatabaseIndexManager();

export default {
  DatabaseQueryOptimizer,
  DatabaseIndexManager,
  queryOptimizer,
  indexManager
};

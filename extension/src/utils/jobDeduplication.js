// Intelligent Job Deduplication System
// Advanced duplicate detection using multiple algorithms and machine learning

import { stemWord, removeStopWords } from './textProcessingUtils.js';

/**
 * Core Job Deduplication Engine
 * Implements multiple detection algorithms for accurate duplicate identification
 */
class JobDeduplicationEngine {
  constructor(options = {}) {
    this.options = {
      similarityThreshold: 0.85,
      fuzzyMatchThreshold: 0.8,
      urlSimilarityThreshold: 0.9,
      mlConfidenceThreshold: 0.75,
      maxDatasetSize: 10000,
      ...options
    };
    
    this.jobDatabase = new Map(); // In-memory job storage
    this.urlPatterns = new Map(); // URL pattern cache
    this.companyAliases = new Map(); // Company name variations
    this.titleNormalizations = new Map(); // Job title normalizations
    this.mlModel = null; // Machine learning model
    
    this.initialize();
  }

  async initialize() {
    await this.loadCompanyAliases();
    await this.loadTitleNormalizations();
    await this.initializeMachineLearning();
    console.log('🔍 Job deduplication engine initialized');
  }

  // ============================================================================
  // 1. CONTENT SIMILARITY CHECKING
  // ============================================================================

  /**
   * Analyzes job content similarity using advanced text analysis
   */
  async analyzeContentSimilarity(job1, job2) {
    const features = {
      titleSimilarity: this.calculateTitleSimilarity(job1.title, job2.title),
      descriptionSimilarity: this.calculateDescriptionSimilarity(job1.description, job2.description),
      requirementsSimilarity: this.calculateRequirementsSimilarity(job1.requirements, job2.requirements),
      locationSimilarity: this.calculateLocationSimilarity(job1.location, job2.location),
      semanticSimilarity: await this.calculateSemanticSimilarity(job1, job2)
    };

    const weightedScore = this.calculateWeightedSimilarity(features);
    
    return {
      similarity: weightedScore,
      isDuplicate: weightedScore > this.options.similarityThreshold,
      features,
      confidence: this.calculateConfidence(features)
    };
  }

  /**
   * Advanced job title similarity using multiple techniques
   */
  calculateTitleSimilarity(title1, title2) {
    if (!title1 || !title2) return 0;

    // Normalize titles
    const norm1 = this.normalizeJobTitle(title1);
    const norm2 = this.normalizeJobTitle(title2);

    // Multiple similarity metrics
    const metrics = {
      exact: norm1 === norm2 ? 1.0 : 0.0,
      jaccard: this.jaccardSimilarity(norm1, norm2),
      cosine: this.cosineSimilarity(norm1, norm2),
      levenshtein: this.normalizedLevenshtein(norm1, norm2),
      ngram: this.ngramSimilarity(norm1, norm2, 2),
      semantic: this.semanticTitleSimilarity(norm1, norm2)
    };

    // Weighted combination
    return (
      metrics.exact * 0.3 +
      metrics.jaccard * 0.2 +
      metrics.cosine * 0.2 +
      metrics.levenshtein * 0.1 +
      metrics.ngram * 0.1 +
      metrics.semantic * 0.1
    );
  }

  /**
   * Job description similarity with advanced NLP techniques
   */
  calculateDescriptionSimilarity(desc1, desc2) {
    if (!desc1 || !desc2) return 0;

    // Text preprocessing
    const processed1 = this.preprocessText(desc1);
    const processed2 = this.preprocessText(desc2);

    // Extract key features
    const features1 = this.extractDescriptionFeatures(processed1);
    const features2 = this.extractDescriptionFeatures(processed2);

    // Multiple similarity approaches
    return {
      tfidf: this.tfidfSimilarity(features1.tfidf, features2.tfidf),
      keywordOverlap: this.keywordOverlapSimilarity(features1.keywords, features2.keywords),
      sentenceSimilarity: this.averageSentenceSimilarity(features1.sentences, features2.sentences),
      structuralSimilarity: this.structuralSimilarity(features1.structure, features2.structure)
    };
  }

  /**
   * Requirements and skills similarity analysis
   */
  calculateRequirementsSimilarity(req1, req2) {
    if (!req1 || !req2) return 0;

    const skills1 = this.extractSkills(req1);
    const skills2 = this.extractSkills(req2);
    
    const experience1 = this.extractExperienceLevel(req1);
    const experience2 = this.extractExperienceLevel(req2);

    return {
      skillsOverlap: this.skillsOverlapSimilarity(skills1, skills2),
      experienceSimilarity: this.experienceSimilarity(experience1, experience2),
      educationSimilarity: this.educationSimilarity(req1, req2),
      certificationSimilarity: this.certificationSimilarity(req1, req2)
    };
  }

  /**
   * Advanced text preprocessing for content analysis
   */
  preprocessText(text) {
    if (!text) return '';

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract comprehensive description features
   */
  extractDescriptionFeatures(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const words = removeStopWords(text.split(/\s+/));
    const stems = words.map(word => stemWord(word));

    return {
      sentences,
      words,
      stems,
      keywords: this.extractKeywords(text),
      tfidf: this.calculateTFIDF(words),
      structure: this.analyzeTextStructure(text),
      entities: this.extractNamedEntities(text)
    };
  }

  // ============================================================================
  // 2. COMPANY + TITLE MATCHING WITH FUZZY LOGIC
  // ============================================================================

  /**
   * Fuzzy logic-based company and title matching
   */
  async fuzzyCompanyTitleMatch(job1, job2) {
    const companyMatch = await this.fuzzyCompanyMatch(job1.company, job2.company);
    const titleMatch = await this.fuzzyTitleMatch(job1.title, job2.title);
    
    // Fuzzy logic combination
    const combinedScore = this.fuzzyLogicCombination(companyMatch, titleMatch);
    
    return {
      companyMatch,
      titleMatch,
      combinedScore,
      isDuplicate: combinedScore > this.options.fuzzyMatchThreshold,
      confidence: this.calculateFuzzyConfidence(companyMatch, titleMatch)
    };
  }

  /**
   * Advanced company name matching with alias resolution
   */
  async fuzzyCompanyMatch(company1, company2) {
    if (!company1 || !company2) return 0;

    // Normalize company names
    const norm1 = this.normalizeCompanyName(company1);
    const norm2 = this.normalizeCompanyName(company2);

    // Check for exact match after normalization
    if (norm1 === norm2) return 1.0;

    // Check company aliases
    const aliasMatch = this.checkCompanyAliases(norm1, norm2);
    if (aliasMatch > 0.9) return aliasMatch;

    // Fuzzy matching techniques
    const fuzzyMetrics = {
      soundex: this.soundexSimilarity(norm1, norm2),
      metaphone: this.metaphoneSimilarity(norm1, norm2),
      editDistance: this.normalizedEditDistance(norm1, norm2),
      tokenSort: this.tokenSortSimilarity(norm1, norm2),
      tokenSet: this.tokenSetSimilarity(norm1, norm2),
      partial: this.partialRatioSimilarity(norm1, norm2)
    };

    // Weighted fuzzy score
    return this.calculateWeightedFuzzyScore(fuzzyMetrics);
  }

  /**
   * Fuzzy job title matching with role variations
   */
  async fuzzyTitleMatch(title1, title2) {
    if (!title1 || !title2) return 0;

    // Normalize and standardize titles
    const norm1 = this.normalizeJobTitle(title1);
    const norm2 = this.normalizeJobTitle(title2);

    // Role hierarchy matching
    const hierarchyMatch = this.roleHierarchyMatch(norm1, norm2);
    if (hierarchyMatch > 0.9) return hierarchyMatch;

    // Synonym and variation matching
    const synonymMatch = this.titleSynonymMatch(norm1, norm2);
    
    // Fuzzy string matching
    const fuzzyMatch = this.fuzzyStringMatch(norm1, norm2);

    // Combine all metrics
    return Math.max(hierarchyMatch, synonymMatch, fuzzyMatch);
  }

  /**
   * Fuzzy logic combination using membership functions
   */
  fuzzyLogicCombination(companyScore, titleScore) {
    // Define fuzzy membership functions
    const companyMembership = this.gaussianMembership(companyScore, 0.8, 0.1);
    const titleMembership = this.gaussianMembership(titleScore, 0.7, 0.15);
    
    // Fuzzy AND operation (minimum)
    const fuzzyAnd = Math.min(companyMembership, titleMembership);
    
    // Fuzzy OR operation (maximum) 
    const fuzzyOr = Math.max(companyMembership, titleMembership);
    
    // Weighted combination
    return (fuzzyAnd * 0.6) + (fuzzyOr * 0.4);
  }

  /**
   * Gaussian membership function for fuzzy logic
   */
  gaussianMembership(x, center, sigma) {
    return Math.exp(-0.5 * Math.pow((x - center) / sigma, 2));
  }

  // ============================================================================
  // 3. URL-BASED DUPLICATE DETECTION
  // ============================================================================

  /**
   * Advanced URL-based duplicate detection
   */
  async detectURLDuplicates(job1, job2) {
    if (!job1.url || !job2.url) return { isDuplicate: false, similarity: 0 };

    const urlAnalysis = {
      exact: this.exactURLMatch(job1.url, job2.url),
      normalized: this.normalizedURLMatch(job1.url, job2.url),
      pattern: this.urlPatternMatch(job1.url, job2.url),
      parameter: this.urlParameterMatch(job1.url, job2.url),
      domain: this.domainSimilarity(job1.url, job2.url),
      path: this.pathSimilarity(job1.url, job2.url)
    };

    const similarity = this.calculateURLSimilarity(urlAnalysis);
    
    return {
      similarity,
      isDuplicate: similarity > this.options.urlSimilarityThreshold,
      analysis: urlAnalysis,
      confidence: this.calculateURLConfidence(urlAnalysis)
    };
  }

  /**
   * Normalize URLs for comparison
   */
  normalizeURL(url) {
    try {
      const parsed = new URL(url);
      
      // Remove tracking parameters
      const cleanParams = new URLSearchParams();
      for (const [key, value] of parsed.searchParams) {
        if (!this.isTrackingParameter(key)) {
          cleanParams.set(key, value);
        }
      }
      
      // Normalize path
      const normalizedPath = parsed.pathname
        .replace(/\/+/g, '/') // Remove double slashes
        .replace(/\/$/, '') // Remove trailing slash
        .toLowerCase();
      
      return `${parsed.protocol}//${parsed.host}${normalizedPath}${cleanParams.toString() ? '?' + cleanParams.toString() : ''}`;
    } catch (error) {
      return url.toLowerCase().trim();
    }
  }

  /**
   * Extract URL patterns for intelligent matching
   */
  extractURLPattern(url) {
    try {
      const parsed = new URL(url);
      const pathSegments = parsed.pathname.split('/').filter(Boolean);
      
      // Create pattern by replacing variable segments
      const pattern = pathSegments.map(segment => {
        // Replace numeric IDs
        if (/^\d+$/.test(segment)) return '{id}';
        // Replace UUIDs
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return '{uuid}';
        // Replace hashes
        if (/^[a-f0-9]{32,}$/i.test(segment)) return '{hash}';
        // Keep literal segments
        return segment;
      }).join('/');
      
      return `${parsed.host}/${pattern}`;
    } catch (error) {
      return url;
    }
  }

  /**
   * Intelligent URL parameter matching
   */
  urlParameterMatch(url1, url2) {
    try {
      const params1 = new URL(url1).searchParams;
      const params2 = new URL(url2).searchParams;
      
      // Extract job-specific parameters
      const jobParams1 = this.extractJobParameters(params1);
      const jobParams2 = this.extractJobParameters(params2);
      
      // Calculate parameter similarity
      return this.parameterSimilarity(jobParams1, jobParams2);
    } catch (error) {
      return 0;
    }
  }

  // ============================================================================
  // 4. MACHINE LEARNING APPROACH
  // ============================================================================

  /**
   * Machine learning-based duplicate detection
   */
  async mlDuplicateDetection(job1, job2) {
    // Extract comprehensive feature vector
    const features = await this.extractMLFeatures(job1, job2);
    
    // Apply trained model
    const prediction = await this.predictDuplicate(features);
    
    return {
      isDuplicate: prediction.probability > this.options.mlConfidenceThreshold,
      probability: prediction.probability,
      confidence: prediction.confidence,
      features,
      explanation: prediction.explanation
    };
  }

  /**
   * Extract comprehensive feature vector for ML model
   */
  async extractMLFeatures(job1, job2) {
    const features = {};

    // Text similarity features
    features.titleJaccard = this.jaccardSimilarity(job1.title, job2.title);
    features.titleCosine = this.cosineSimilarity(job1.title, job2.title);
    features.titleLevenshtein = this.normalizedLevenshtein(job1.title, job2.title);
    
    // Company features
    features.companyExact = job1.company === job2.company ? 1 : 0;
    features.companyFuzzy = await this.fuzzyCompanyMatch(job1.company, job2.company);
    
    // Location features
    features.locationMatch = this.locationMatch(job1.location, job2.location);
    features.locationDistance = await this.calculateLocationDistance(job1.location, job2.location);
    
    // Salary features
    features.salaryOverlap = this.salaryRangeOverlap(job1.salary, job2.salary);
    
    // Content features
    features.descriptionSimilarity = this.calculateDescriptionSimilarity(job1.description, job2.description);
    features.requirementsSimilarity = this.calculateRequirementsSimilarity(job1.requirements, job2.requirements);
    
    // URL features
    features.urlSimilarity = (await this.detectURLDuplicates(job1, job2)).similarity;
    
    // Temporal features
    features.timeDifference = Math.abs(new Date(job1.postedDate) - new Date(job2.postedDate)) / (1000 * 60 * 60 * 24);
    
    // Platform features
    features.samePlatform = job1.platform === job2.platform ? 1 : 0;
    
    // Advanced features
    features.skillsOverlap = this.calculateSkillsOverlap(job1, job2);
    features.experienceMatch = this.experienceMatch(job1.experience, job2.experience);
    features.industryMatch = this.industryMatch(job1.industry, job2.industry);

    return features;
  }

  /**
   * Simple neural network for duplicate prediction
   */
  async predictDuplicate(features) {
    if (!this.mlModel) {
      // Use rule-based fallback if model not available
      return this.ruleBasedPrediction(features);
    }

    try {
      // Convert features to input vector
      const inputVector = this.featuresToVector(features);
      
      // Forward pass through neural network
      const prediction = await this.mlModel.predict(inputVector);
      
      return {
        probability: prediction[0],
        confidence: this.calculatePredictionConfidence(prediction),
        explanation: this.generatePredictionExplanation(features, prediction)
      };
    } catch (error) {
      console.error('ML prediction failed:', error);
      return this.ruleBasedPrediction(features);
    }
  }

  /**
   * Rule-based prediction as fallback
   */
  ruleBasedPrediction(features) {
    let score = 0;
    let weight = 0;

    // Weight different features
    const weights = {
      titleJaccard: 0.25,
      companyExact: 0.20,
      companyFuzzy: 0.15,
      urlSimilarity: 0.15,
      locationMatch: 0.10,
      descriptionSimilarity: 0.10,
      timeDifference: 0.05
    };

    // Calculate weighted score
    for (const [feature, featureWeight] of Object.entries(weights)) {
      if (features[feature] !== undefined) {
        if (feature === 'timeDifference') {
          // Inverse relationship for time difference
          score += (1 - Math.min(features[feature] / 30, 1)) * featureWeight;
        } else {
          score += features[feature] * featureWeight;
        }
        weight += featureWeight;
      }
    }

    const probability = weight > 0 ? score / weight : 0;

    return {
      probability,
      confidence: this.calculateRuleBasedConfidence(features),
      explanation: this.generateRuleBasedExplanation(features, probability)
    };
  }

  // ============================================================================
  // EFFICIENT ALGORITHMS FOR LARGE DATASETS
  // ============================================================================

  /**
   * Efficient duplicate detection for large datasets using LSH
   */
  async efficientDeduplication(jobs) {
    console.log(`🔍 Processing ${jobs.length} jobs for deduplication...`);
    
    // Locality Sensitive Hashing for efficient similarity search
    const lshIndex = this.buildLSHIndex(jobs);
    
    const duplicateGroups = [];
    const processed = new Set();

    for (let i = 0; i < jobs.length; i++) {
      if (processed.has(i)) continue;

      const job = jobs[i];
      const candidates = this.getLSHCandidates(lshIndex, job);
      
      const duplicateGroup = [i];
      processed.add(i);

      // Check candidates for duplicates
      for (const candidateIndex of candidates) {
        if (processed.has(candidateIndex) || candidateIndex === i) continue;

        const candidate = jobs[candidateIndex];
        const similarity = await this.fastSimilarityCheck(job, candidate);

        if (similarity.isDuplicate) {
          duplicateGroup.push(candidateIndex);
          processed.add(candidateIndex);
        }
      }

      if (duplicateGroup.length > 1) {
        duplicateGroups.push({
          indices: duplicateGroup,
          jobs: duplicateGroup.map(idx => jobs[idx]),
          representative: this.selectRepresentative(duplicateGroup.map(idx => jobs[idx]))
        });
      }
    }

    return {
      totalJobs: jobs.length,
      duplicateGroups: duplicateGroups.length,
      duplicateJobs: duplicateGroups.reduce((sum, group) => sum + group.indices.length - 1, 0),
      uniqueJobs: jobs.length - duplicateGroups.reduce((sum, group) => sum + group.indices.length - 1, 0),
      groups: duplicateGroups
    };
  }

  /**
   * Build LSH index for efficient similarity search
   */
  buildLSHIndex(jobs) {
    const hashTables = [];
    const numTables = 20;
    const hashSize = 128;

    for (let t = 0; t < numTables; t++) {
      const table = new Map();
      
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const hash = this.calculateLSHHash(job, t, hashSize);
        
        if (!table.has(hash)) {
          table.set(hash, []);
        }
        table.get(hash).push(i);
      }
      
      hashTables.push(table);
    }

    return { hashTables, numTables, hashSize };
  }

  /**
   * Calculate LSH hash for a job
   */
  calculateLSHHash(job, tableIndex, hashSize) {
    // Create feature vector
    const features = this.jobToFeatureVector(job);
    
    // Generate random hyperplanes for this table
    const hyperplanes = this.getHyperplanes(tableIndex, hashSize, features.length);
    
    // Calculate hash
    let hash = 0;
    for (let i = 0; i < hashSize; i++) {
      const dot = this.dotProduct(features, hyperplanes[i]);
      if (dot >= 0) {
        hash |= (1 << i);
      }
    }
    
    return hash;
  }

  /**
   * Fast similarity check for candidate pairs
   */
  async fastSimilarityCheck(job1, job2) {
    // Quick rejection tests
    if (this.quickReject(job1, job2)) {
      return { isDuplicate: false, similarity: 0, confidence: 1.0 };
    }

    // Multi-stage similarity checking
    const stage1 = this.stage1Similarity(job1, job2);
    if (stage1.similarity < 0.3) {
      return { isDuplicate: false, similarity: stage1.similarity, confidence: 0.8 };
    }

    const stage2 = await this.stage2Similarity(job1, job2);
    if (stage2.similarity < 0.6) {
      return { isDuplicate: false, similarity: stage2.similarity, confidence: 0.9 };
    }

    // Full similarity analysis for high-confidence candidates
    return await this.fullSimilarityAnalysis(job1, job2);
  }

  /**
   * Quick rejection based on obvious differences
   */
  quickReject(job1, job2) {
    // Different platforms with very different posting times
    if (job1.platform !== job2.platform) {
      const timeDiff = Math.abs(new Date(job1.postedDate) - new Date(job2.postedDate));
      if (timeDiff > 7 * 24 * 60 * 60 * 1000) return true; // 7 days
    }

    // Very different salary ranges
    if (job1.salary && job2.salary) {
      const overlap = this.salaryRangeOverlap(job1.salary, job2.salary);
      if (overlap < 0.1) return true;
    }

    // Very different job levels
    const level1 = this.extractJobLevel(job1.title);
    const level2 = this.extractJobLevel(job2.title);
    if (Math.abs(level1 - level2) > 2) return true;

    return false;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Jaccard similarity for sets
   */
  jaccardSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const set1 = new Set(text1.toLowerCase().split(/\s+/));
    const set2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Cosine similarity for text
   */
  cosineSimilarity(text1, text2) {
    if (!text1 || !text2) return 0;
    
    const vector1 = this.textToVector(text1);
    const vector2 = this.textToVector(text2);
    
    return this.vectorCosineSimilarity(vector1, vector2);
  }

  /**
   * Normalized Levenshtein distance
   */
  normalizedLevenshtein(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Select representative job from duplicate group
   */
  selectRepresentative(jobs) {
    // Score jobs based on completeness and quality
    const scores = jobs.map(job => this.calculateJobScore(job));
    const maxScore = Math.max(...scores);
    const bestIndex = scores.indexOf(maxScore);
    
    return jobs[bestIndex];
  }

  /**
   * Calculate job quality score
   */
  calculateJobScore(job) {
    let score = 0;
    
    // Completeness score
    if (job.title) score += 10;
    if (job.company) score += 10;
    if (job.description && job.description.length > 100) score += 15;
    if (job.requirements) score += 10;
    if (job.salary) score += 5;
    if (job.location) score += 5;
    
    // Quality indicators
    if (job.description && job.description.length > 500) score += 5;
    if (job.benefits) score += 3;
    if (job.companySize) score += 2;
    
    // Freshness
    const daysOld = (Date.now() - new Date(job.postedDate)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysOld);
    
    return score;
  }

  // Additional utility methods would be implemented here...
  // This includes text processing, ML model handling, etc.
}

// ============================================================================
// EXPORTS
// ============================================================================

export { JobDeduplicationEngine };
export default JobDeduplicationEngine;

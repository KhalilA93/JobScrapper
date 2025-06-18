// Text Processing Utilities for Job Deduplication
// Advanced text analysis and processing functions

/**
 * Porter Stemmer Implementation for word stemming
 */
export function stemWord(word) {
  if (!word || word.length < 3) return word;
  
  word = word.toLowerCase();
  
  // Porter stemmer rules (simplified implementation)
  const rules = [
    // Step 1a
    [/sses$/, 'ss'],
    [/ies$/, 'i'],
    [/ss$/, 'ss'],
    [/s$/, ''],
    
    // Step 1b
    [/(eed)$/, 'ee'],
    [/(ed|ing)$/, ''],
    
    // Step 2
    [/(ational)$/, 'ate'],
    [/(tional)$/, 'tion'],
    [/(enci)$/, 'ence'],
    [/(anci)$/, 'ance'],
    [/(izer)$/, 'ize'],
    [/(alli)$/, 'al'],
    [/(entli)$/, 'ent'],
    [/(eli)$/, 'e'],
    [/(ousli)$/, 'ous'],
    [/(ization)$/, 'ize'],
    [/(ation)$/, 'ate'],
    [/(ator)$/, 'ate'],
    [/(alism)$/, 'al'],
    [/(iveness)$/, 'ive'],
    [/(fulness)$/, 'ful'],
    [/(ousness)$/, 'ous'],
    [/(aliti)$/, 'al'],
    [/(iviti)$/, 'ive'],
    [/(biliti)$/, 'ble'],
    
    // Step 3
    [/(icate)$/, 'ic'],
    [/(ative)$/, ''],
    [/(alize)$/, 'al'],
    [/(iciti)$/, 'ic'],
    [/(ical)$/, 'ic'],
    [/(ful)$/, ''],
    [/(ness)$/, '']
  ];
  
  for (const [pattern, replacement] of rules) {
    if (pattern.test(word)) {
      return word.replace(pattern, replacement);
    }
  }
  
  return word;
}

/**
 * Remove common stop words from text
 */
export function removeStopWords(words) {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
    'have', 'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how',
    'their', 'if', 'up', 'out', 'many', 'then', 'them', 'these', 'so',
    'some', 'her', 'would', 'make', 'like', 'into', 'him', 'has', 'two',
    'more', 'very', 'after', 'words', 'first', 'where', 'much', 'through'
  ]);
  
  return words.filter(word => !stopWords.has(word.toLowerCase()));
}

/**
 * Extract keywords using TF-IDF approach
 */
export function extractKeywords(text, topN = 10) {
  if (!text) return [];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  const cleanWords = removeStopWords(words);
  
  // Calculate term frequency
  const termFreq = {};
  cleanWords.forEach(word => {
    termFreq[word] = (termFreq[word] || 0) + 1;
  });
  
  // Simple keyword extraction (in practice, would use corpus for IDF)
  const keywords = Object.entries(termFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, topN)
    .map(([word]) => word);
  
  return keywords;
}

/**
 * Calculate TF-IDF vectors for text comparison
 */
export function calculateTFIDF(words, corpus = null) {
  if (!words.length) return {};
  
  // Calculate term frequency
  const termFreq = {};
  words.forEach(word => {
    termFreq[word] = (termFreq[word] || 0) + 1;
  });
  
  // Normalize by document length
  const maxFreq = Math.max(...Object.values(termFreq));
  const tfidf = {};
  
  for (const [term, freq] of Object.entries(termFreq)) {
    const tf = freq / maxFreq;
    // Simplified IDF (would use actual corpus in production)
    const idf = Math.log(1000 / (freq + 1));
    tfidf[term] = tf * idf;
  }
  
  return tfidf;
}

/**
 * N-gram generation for text analysis
 */
export function generateNGrams(text, n = 2) {
  if (!text || n < 1) return [];
  
  const words = text.toLowerCase().split(/\s+/);
  const ngrams = [];
  
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  
  return ngrams;
}

/**
 * Phonetic matching using Soundex algorithm
 */
export function soundex(str) {
  if (!str) return '';
  
  str = str.toUpperCase();
  
  // Keep first letter
  let result = str[0];
  
  // Mapping for consonants
  const mapping = {
    'B': '1', 'F': '1', 'P': '1', 'V': '1',
    'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
    'D': '3', 'T': '3',
    'L': '4',
    'M': '5', 'N': '5',
    'R': '6'
  };
  
  // Convert remaining letters
  for (let i = 1; i < str.length && result.length < 4; i++) {
    const char = str[i];
    const code = mapping[char];
    
    if (code && code !== result[result.length - 1]) {
      result += code;
    }
  }
  
  // Pad with zeros or truncate to 4 characters
  return (result + '0000').substring(0, 4);
}

/**
 * Metaphone algorithm for phonetic matching
 */
export function metaphone(str) {
  if (!str) return '';
  
  str = str.toUpperCase().replace(/[^A-Z]/g, '');
  
  if (str.length === 0) return '';
  
  let result = '';
  let pos = 0;
  
  // Handle initial conditions
  if (str.startsWith('KN') || str.startsWith('GN') || str.startsWith('PN') || str.startsWith('AE') || str.startsWith('WR')) {
    pos = 1;
  }
  
  if (str[0] === 'X') {
    result += 'S';
    pos = 1;
  }
  
  // Process remaining characters
  while (pos < str.length && result.length < 4) {
    const char = str[pos];
    
    switch (char) {
      case 'B':
        if (pos === str.length - 1 && str[pos - 1] === 'M') {
          // Silent B at end after M
        } else {
          result += 'B';
        }
        break;
      case 'C':
        if (pos > 0 && str[pos - 1] === 'S' && 'EIY'.includes(str[pos + 1])) {
          // Skip C in SCE, SCI, SCY
        } else if (str.substring(pos, pos + 2) === 'CH') {
          result += 'X';
          pos++;
        } else if (str.substring(pos, pos + 2) === 'CI' || str.substring(pos, pos + 2) === 'CE') {
          result += 'S';
        } else {
          result += 'K';
        }
        break;
      // Add more cases as needed...
      default:
        if ('AEIOU'.includes(char)) {
          if (pos === 0) result += char;
        } else {
          result += char;
        }
    }
    pos++;
  }
  
  return result.substring(0, 4);
}

/**
 * Calculate Jaccard similarity between two sets
 */
export function jaccardSimilarity(set1, set2) {
  if (!set1.size && !set2.size) return 1;
  if (!set1.size || !set2.size) return 0;
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2) return 0;
  
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (const key of keys) {
    const val1 = vec1[key] || 0;
    const val2 = vec2[key] || 0;
    
    dotProduct += val1 * val2;
    norm1 += val1 * val1;
    norm2 += val2 * val2;
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

/**
 * Extract named entities from text (simplified implementation)
 */
export function extractNamedEntities(text) {
  if (!text) return { companies: [], skills: [], locations: [] };
  
  // Predefined patterns for common entities
  const companyPatterns = [
    /\b(inc|corp|corporation|ltd|limited|llc|company|co)\b/gi,
    /\b[A-Z][a-z]+ (?:inc|corp|corporation|ltd|limited|llc|company|co)\b/g
  ];
  
  const skillPatterns = [
    /\b(javascript|python|java|react|angular|vue|node\.?js|sql|mongodb|postgresql|aws|azure|docker|kubernetes|git|machine learning|ai|artificial intelligence)\b/gi
  ];
  
  const locationPatterns = [
    /\b(new york|san francisco|los angeles|chicago|boston|seattle|austin|denver|remote|onsite)\b/gi
  ];
  
  const entities = {
    companies: [],
    skills: [],
    locations: []
  };
  
  // Extract companies
  companyPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    entities.companies.push(...matches);
  });
  
  // Extract skills
  skillPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    entities.skills.push(...matches);
  });
  
  // Extract locations
  locationPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    entities.locations.push(...matches);
  });
  
  // Remove duplicates and normalize
  entities.companies = [...new Set(entities.companies.map(c => c.toLowerCase()))];
  entities.skills = [...new Set(entities.skills.map(s => s.toLowerCase()))];
  entities.locations = [...new Set(entities.locations.map(l => l.toLowerCase()))];
  
  return entities;
}

/**
 * Analyze text structure for similarity comparison
 */
export function analyzeTextStructure(text) {
  if (!text) return {};
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const words = text.split(/\s+/);
  
  // Calculate various metrics
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  const avgParagraphLength = paragraphs.length > 0 ? sentences.length / paragraphs.length : 0;
  
  // Identify lists and bullet points
  const listItems = text.match(/^\s*[•\-\*\d+\.]/gm) || [];
  
  // Count various punctuation and formatting
  const structure = {
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    wordCount: words.length,
    avgSentenceLength,
    avgParagraphLength,
    listItemCount: listItems.length,
    hasLists: listItems.length > 0,
    exclamationCount: (text.match(/!/g) || []).length,
    questionCount: (text.match(/\?/g) || []).length,
    colonCount: (text.match(/:/g) || []).length,
    semicolonCount: (text.match(/;/g) || []).length
  };
  
  return structure;
}

/**
 * Calculate text readability score (simplified Flesch Reading Ease)
 */
export function calculateReadabilityScore(text) {
  if (!text) return 0;
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const words = text.split(/\s+/).length;
  const syllables = countSyllables(text);
  
  if (sentences === 0 || words === 0) return 0;
  
  const avgSentenceLength = words / sentences;
  const avgSyllablesPerWord = syllables / words;
  
  // Flesch Reading Ease formula
  const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Count syllables in text (simplified)
 */
function countSyllables(text) {
  if (!text) return 0;
  
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  let syllableCount = 0;
  
  words.forEach(word => {
    // Simple syllable counting heuristic
    let count = word.match(/[aeiouy]+/g) || [];
    if (word.endsWith('e')) count.pop();
    syllableCount += Math.max(1, count.length);
  });
  
  return syllableCount;
}

/**
 * Normalize company names for comparison
 */
export function normalizeCompanyName(company) {
  if (!company) return '';
  
  return company
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|ltd|limited|llc|company|co)\b\.?/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize job titles for comparison
 */
export function normalizeJobTitle(title) {
  if (!title) return '';
  
  // Common title variations and levels
  const levelMappings = {
    'sr': 'senior',
    'jr': 'junior',
    'lead': 'senior',
    'principal': 'senior',
    'staff': 'senior',
    'associate': 'junior',
    'entry level': 'junior',
    'entry-level': 'junior'
  };
  
  let normalized = title.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Apply level mappings
  Object.entries(levelMappings).forEach(([pattern, replacement]) => {
    normalized = normalized.replace(new RegExp(`\\b${pattern}\\b`, 'g'), replacement);
  });
  
  return normalized;
}

/**
 * Extract skills from job text
 */
export function extractSkills(text) {
  if (!text) return [];
  
  // Comprehensive skill patterns
  const skillPatterns = [
    // Programming languages
    /\b(javascript|typescript|python|java|c\+\+|c#|ruby|go|rust|scala|kotlin|swift|objective-c|php|perl|r|matlab)\b/gi,
    
    // Frameworks and libraries
    /\b(react|angular|vue|svelte|django|flask|spring|express|nestjs|nextjs|nuxt|gatsby|jquery|bootstrap|tailwind)\b/gi,
    
    // Databases
    /\b(mysql|postgresql|mongodb|redis|elasticsearch|cassandra|dynamodb|sqlite|oracle|sql server)\b/gi,
    
    // Cloud and DevOps
    /\b(aws|azure|gcp|google cloud|docker|kubernetes|jenkins|gitlab|github actions|terraform|ansible|puppet)\b/gi,
    
    // Tools and technologies
    /\b(git|jira|confluence|slack|figma|sketch|photoshop|illustrator|after effects|unity|unreal)\b/gi
  ];
  
  const skills = new Set();
  
  skillPatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => skills.add(match.toLowerCase()));
  });
  
  return Array.from(skills);
}

/**
 * Extract experience level from text
 */
export function extractExperienceLevel(text) {
  if (!text) return 0;
  
  const levelPatterns = [
    { pattern: /\b(\d+)\+?\s*years?\s*(?:of\s*)?experience\b/gi, multiplier: 1 },
    { pattern: /\b(\d+)-(\d+)\s*years?\s*(?:of\s*)?experience\b/gi, multiplier: 0.75 },
    { pattern: /\bentry\s*level\b/gi, level: 0 },
    { pattern: /\bjunior\b/gi, level: 1 },
    { pattern: /\bmid\s*level\b/gi, level: 3 },
    { pattern: /\bsenior\b/gi, level: 5 },
    { pattern: /\blead\b/gi, level: 7 },
    { pattern: /\bprincipal\b/gi, level: 8 },
    { pattern: /\bstaff\b/gi, level: 8 }
  ];
  
  let experienceLevel = 0;
  
  levelPatterns.forEach(({ pattern, multiplier, level }) => {
    const matches = text.match(pattern);
    if (matches) {
      if (level !== undefined) {
        experienceLevel = Math.max(experienceLevel, level);
      } else {
        matches.forEach(match => {
          const numbers = match.match(/\d+/g);
          if (numbers) {
            const years = numbers.map(Number);
            experienceLevel = Math.max(experienceLevel, Math.max(...years) * multiplier);
          }
        });
      }
    }
  });
  
  return experienceLevel;
}

export default {
  stemWord,
  removeStopWords,
  extractKeywords,
  calculateTFIDF,
  generateNGrams,
  soundex,
  metaphone,
  jaccardSimilarity,
  cosineSimilarity,
  extractNamedEntities,
  analyzeTextStructure,
  calculateReadabilityScore,
  normalizeCompanyName,
  normalizeJobTitle,
  extractSkills,
  extractExperienceLevel
};

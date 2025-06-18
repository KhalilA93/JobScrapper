// Data Sanitization and Validation Classes
// Clean and validate extracted job data

class DataSanitizer {
  // Clean general text content
  cleanText(text) {
    if (!text || typeof text !== 'string') return null;
    
    return text
      .trim()
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .replace(/[\u00A0\u2000-\u200B]/g, ' ') // Replace non-breaking spaces
      .replace(/[^\w\s\-\.,'()&]/g, '')   // Remove special characters
      .trim();
  }

  // Clean and validate URLs
  cleanUrl(url) {
    if (!url || typeof url !== 'string') return null;
    
    try {
      // Handle relative URLs
      if (url.startsWith('/')) {
        url = window.location.origin + url;
      } else if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      const urlObj = new URL(url);
      return urlObj.href;
    } catch (error) {
      return null;
    }
  }

  // Clean location text
  cleanLocation(location) {
    if (!location) return null;
    
    return this.cleanText(location)
      .replace(/\(.*?\)/g, '')           // Remove parentheses content
      .replace(/\s*[,;]\s*/g, ', ')      // Normalize separators
      .trim();
  }

  // Parse location into components
  parseLocation(locationData) {
    if (!locationData || !locationData.raw) return null;
    
    const cleaned = this.cleanLocation(locationData.raw);
    if (!cleaned) return locationData;

    // Parse city, state, country
    const parts = cleaned.split(',').map(part => part.trim());
    
    return {
      ...locationData,
      formatted: cleaned,
      city: parts[0] || null,
      state: parts[1] || null,
      country: parts[2] || 'US'
    };
  }

  // Parse salary information
  parseSalary(salaryText) {
    if (!salaryText) return null;
    
    const cleaned = salaryText.replace(/[^\d\-\$\,\.KkMm\s]/g, '');
    
    // Extract numbers
    const numbers = cleaned.match(/[\d,]+\.?\d*/g);
    if (!numbers) return { raw: salaryText, min: null, max: null };

    const parseAmount = (str) => {
      let amount = parseFloat(str.replace(/,/g, ''));
      
      // Handle K/M suffixes
      if (str.toLowerCase().includes('k')) amount *= 1000;
      if (str.toLowerCase().includes('m')) amount *= 1000000;
      
      return amount;
    };

    let min = null, max = null, period = 'yearly';
    
    if (numbers.length === 1) {
      const amount = parseAmount(numbers[0]);
      min = amount;
      max = amount;
    } else if (numbers.length >= 2) {
      min = parseAmount(numbers[0]);
      max = parseAmount(numbers[1]);
    }

    // Detect period
    if (salaryText.toLowerCase().includes('hour')) period = 'hourly';
    else if (salaryText.toLowerCase().includes('month')) period = 'monthly';

    return {
      raw: salaryText,
      min,
      max,
      currency: 'USD',
      period,
      isEstimated: salaryText.toLowerCase().includes('estimate')
    };
  }

  // Clean job description
  cleanDescription(description) {
    if (!description) return null;
    
    return description
      .replace(/<[^>]*>/g, '')           // Remove HTML tags
      .replace(/\s+/g, ' ')              // Normalize whitespace
      .replace(/[^\w\s\-\.,'()&:;]/g, '') // Keep basic punctuation
      .trim()
      .substring(0, 5000);               // Limit length
  }

  // Parse date strings
  parseDate(dateText) {
    if (!dateText) return null;
    
    const now = new Date();
    const cleaned = dateText.toLowerCase().trim();
    
    // Handle relative dates
    if (cleaned.includes('today')) {
      return now;
    } else if (cleaned.includes('yesterday')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (cleaned.includes('days ago')) {
      const days = parseInt(cleaned.match(/(\d+)\s*days?/)?.[1] || '0');
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    } else if (cleaned.includes('week')) {
      const weeks = parseInt(cleaned.match(/(\d+)\s*weeks?/)?.[1] || '1');
      return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    } else if (cleaned.includes('month')) {
      const months = parseInt(cleaned.match(/(\d+)\s*months?/)?.[1] || '1');
      return new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    }
    
    // Try to parse as standard date
    try {
      return new Date(dateText);
    } catch (error) {
      return null;
    }
  }

  // Extract numbers from text
  parseNumber(text) {
    if (!text) return null;
    
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  // Extract skills from description
  extractSkills(description) {
    if (!description) return [];
    
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'aws',
      'html', 'css', 'angular', 'vue', 'docker', 'kubernetes', 'git',
      'mongodb', 'postgresql', 'redis', 'graphql', 'typescript', 'go',
      'rust', 'swift', 'kotlin', 'flutter', 'react native', 'django',
      'flask', 'spring', 'express', 'fastapi', 'tensorflow', 'pytorch'
    ];
    
    const foundSkills = [];
    const lowerDesc = description.toLowerCase();
    
    commonSkills.forEach(skill => {
      if (lowerDesc.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });
    
    return [...new Set(foundSkills)]; // Remove duplicates
  }
}

class DataValidator {
  // Validate job title
  isValidTitle(title) {
    if (!title || typeof title !== 'string') return false;
    
    const cleaned = title.trim();
    return cleaned.length >= 3 && 
           cleaned.length <= 200 &&
           /^[a-zA-Z0-9\s\-\.,()&]+$/.test(cleaned);
  }

  // Validate company name
  isValidCompany(company) {
    if (!company || typeof company !== 'string') return false;
    
    const cleaned = company.trim();
    return cleaned.length >= 1 && 
           cleaned.length <= 100 &&
           /^[a-zA-Z0-9\s\-\.,()&]+$/.test(cleaned);
  }

  // Validate location
  isValidLocation(location) {
    if (!location || typeof location !== 'string') return false;
    
    const cleaned = location.trim();
    return cleaned.length >= 2 && 
           cleaned.length <= 100;
  }

  // Validate salary data
  isValidSalary(salary) {
    if (!salary || typeof salary !== 'object') return true; // Optional field
    
    const { min, max, currency, period } = salary;
    
    // Check numbers are valid
    if (min !== null && (typeof min !== 'number' || min < 0)) return false;
    if (max !== null && (typeof max !== 'number' || max < 0)) return false;
    if (min && max && min > max) return false;
    
    // Check currency
    if (currency && typeof currency !== 'string') return false;
    
    // Check period
    const validPeriods = ['hourly', 'daily', 'monthly', 'yearly'];
    if (period && !validPeriods.includes(period)) return false;
    
    return true;
  }

  // Validate description
  isValidDescription(description) {
    if (!description) return true; // Optional field
    
    return typeof description === 'string' && 
           description.length <= 10000;
  }

  // Validate URL
  isValidUrl(url) {
    if (!url) return true; // Optional field
    
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Validate date
  isValidDate(date) {
    if (!date) return true; // Optional field
    
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Validate job ID
  isValidJobId(jobId) {
    if (!jobId) return true; // Optional field
    
    return typeof jobId === 'string' && 
           jobId.length <= 50 &&
           /^[a-zA-Z0-9\-_]+$/.test(jobId);
  }

  // Comprehensive job data validation
  validateJobData(jobData) {
    const errors = [];
    
    if (!this.isValidTitle(jobData.title)) {
      errors.push('Invalid job title');
    }
    
    if (!this.isValidCompany(jobData.company?.name)) {
      errors.push('Invalid company name');
    }
    
    if (!this.isValidLocation(jobData.location?.formatted)) {
      errors.push('Invalid location');
    }
    
    if (!this.isValidSalary(jobData.salary)) {
      errors.push('Invalid salary data');
    }
    
    if (!this.isValidDescription(jobData.description)) {
      errors.push('Invalid description');
    }
    
    if (!this.isValidUrl(jobData.company?.link)) {
      errors.push('Invalid company URL');
    }
    
    if (!this.isValidJobId(jobData.metadata?.jobId)) {
      errors.push('Invalid job ID');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export { DataSanitizer, DataValidator };

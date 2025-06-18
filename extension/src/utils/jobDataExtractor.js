// Job Data Extraction Module
// Generic parser with site-specific adapters for job listings

import { DataSanitizer, DataValidator } from './dataSanitizer.js';

class JobDataExtractor {
  constructor() {
    this.adapters = new Map();
    this.registerDefaultAdapters();
  }

  // Register site-specific adapters
  registerAdapter(siteName, adapter) {
    this.adapters.set(siteName, adapter);
  }

  registerDefaultAdapters() {
    this.registerAdapter('linkedin', new LinkedInAdapter());
    this.registerAdapter('indeed', new IndeedAdapter());
    this.registerAdapter('glassdoor', new GlassdoorAdapter());
  }

  // Extract job data for specific site
  extractJobData(siteName, element = document) {
    const adapter = this.adapters.get(siteName);
    if (!adapter) {
      throw new Error(`No adapter found for site: ${siteName}`);
    }

    try {
      return adapter.extract(element);
    } catch (error) {
      console.error(`JobDataExtractor: Failed to extract data for ${siteName}`, error);
      return null;
    }
  }

  // Extract data from current page based on URL
  extractFromCurrentPage() {
    const hostname = window.location.hostname;
    let siteName = null;

    if (hostname.includes('linkedin.com')) siteName = 'linkedin';
    else if (hostname.includes('indeed.com')) siteName = 'indeed';
    else if (hostname.includes('glassdoor.com')) siteName = 'glassdoor';

    return siteName ? this.extractJobData(siteName) : null;
  }
}

// Base adapter class with common functionality
class BaseJobAdapter {
  constructor(selectors) {
    this.selectors = selectors;
    this.validator = new DataValidator();
    this.sanitizer = new DataSanitizer();
  }

  // Main extraction method
  extract(element = document) {
    const rawData = this.extractRawData(element);
    const sanitizedData = this.sanitizeData(rawData);
    const validatedData = this.validateData(sanitizedData);
    
    return validatedData;
  }

  // Extract raw data using selectors
  extractRawData(element) {
    return {
      title: this.extractText(element, this.selectors.title),
      company: this.extractCompanyData(element),
      location: this.extractLocationData(element),
      salary: this.extractSalaryData(element),
      description: this.extractDescription(element),
      metadata: this.extractMetadata(element)
    };
  }

  // Generic text extraction with fallbacks
  extractText(element, selectors, fallback = null) {
    if (!selectors) return fallback;
    
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorList) {
      try {
        const el = element.querySelector(selector);
        if (el && el.textContent.trim()) {
          return el.textContent.trim();
        }
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
      }
    }
    
    return fallback;
  }

  // Extract company information
  extractCompanyData(element) {
    const name = this.extractText(element, this.selectors.company.name);
    const link = this.extractAttribute(element, this.selectors.company.link, 'href');
    const size = this.extractText(element, this.selectors.company.size);
    const industry = this.extractText(element, this.selectors.company.industry);

    return {
      name,
      link,
      size,
      industry
    };
  }

  // Extract location information
  extractLocationData(element) {
    const rawLocation = this.extractText(element, this.selectors.location);
    const isRemote = this.checkRemoteWork(element);
    
    return {
      raw: rawLocation,
      formatted: this.sanitizer.cleanLocation(rawLocation),
      isRemote,
      city: null, // Will be parsed by sanitizer
      state: null,
      country: null
    };
  }

  // Extract salary information
  extractSalaryData(element) {
    const rawSalary = this.extractText(element, this.selectors.salary);
    if (!rawSalary) return null;

    return {
      raw: rawSalary,
      ...this.sanitizer.parseSalary(rawSalary)
    };
  }

  // Extract job description
  extractDescription(element) {
    const description = this.extractText(element, this.selectors.description);
    return description ? this.sanitizer.cleanDescription(description) : null;
  }

  // Extract metadata
  extractMetadata(element) {
    return {
      jobId: this.extractJobId(element),
      postedDate: this.extractPostedDate(element),
      applicantCount: this.extractApplicantCount(element),
      jobType: this.extractJobType(element),
      experienceLevel: this.extractExperienceLevel(element)
    };
  }

  // Helper methods for specific data types
  extractAttribute(element, selector, attribute) {
    if (!selector) return null;
    
    try {
      const el = element.querySelector(selector);
      return el ? el.getAttribute(attribute) : null;
    } catch (error) {
      return null;
    }
  }

  extractJobId(element) {
    // Try to extract from URL or data attributes
    const urlMatch = window.location.href.match(/(?:job[s]?\/(?:view\/)?|jk=)([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];

    // Try data attributes
    const dataAttrs = ['data-job-id', 'data-jk', 'data-listing-id'];
    for (const attr of dataAttrs) {
      const el = element.querySelector(`[${attr}]`);
      if (el) return el.getAttribute(attr);
    }

    return null;
  }

  extractPostedDate(element) {
    const dateText = this.extractText(element, this.selectors.postedDate);
    return dateText ? this.sanitizer.parseDate(dateText) : null;
  }

  extractApplicantCount(element) {
    const countText = this.extractText(element, this.selectors.applicantCount);
    return countText ? this.sanitizer.parseNumber(countText) : null;
  }

  extractJobType(element) {
    return this.extractText(element, this.selectors.jobType);
  }

  extractExperienceLevel(element) {
    return this.extractText(element, this.selectors.experienceLevel);
  }

  checkRemoteWork(element) {
    const locationText = this.extractText(element, this.selectors.location, '').toLowerCase();
    const remoteKeywords = ['remote', 'work from home', 'wfh', 'anywhere', 'distributed'];
    return remoteKeywords.some(keyword => locationText.includes(keyword));
  }

  // Sanitize extracted data
  sanitizeData(rawData) {
    return {
      title: this.sanitizer.cleanText(rawData.title),
      company: {
        name: this.sanitizer.cleanText(rawData.company.name),
        link: this.sanitizer.cleanUrl(rawData.company.link),
        size: this.sanitizer.cleanText(rawData.company.size),
        industry: this.sanitizer.cleanText(rawData.company.industry)
      },
      location: this.sanitizer.parseLocation(rawData.location),
      salary: rawData.salary,
      description: rawData.description,
      metadata: rawData.metadata
    };
  }

  // Validate extracted data
  validateData(sanitizedData) {
    const errors = [];
    
    if (!this.validator.isValidTitle(sanitizedData.title)) {
      errors.push('Invalid job title');
    }
    
    if (!this.validator.isValidCompany(sanitizedData.company.name)) {
      errors.push('Invalid company name');
    }

    if (errors.length > 0) {
      console.warn('JobDataExtractor: Validation errors:', errors);
    }

    return {
      ...sanitizedData,
      isValid: errors.length === 0,
      validationErrors: errors
    };
  }
}

// LinkedIn-specific adapter
class LinkedInAdapter extends BaseJobAdapter {
  constructor() {
    super({
      title: [
        'h1[data-test-id="job-title"]',
        '.jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__job-title h1'
      ],
      company: {
        name: [
          '.jobs-unified-top-card__company-name a',
          '.job-details-jobs-unified-top-card__company-name a',
          '.jobs-unified-top-card__subtitle-primary-grouping .app-aware-link'
        ],
        link: '.jobs-unified-top-card__company-name a',
        size: '.jobs-unified-top-card__subtitle-secondary-grouping',
        industry: '.jobs-company__industry'
      },
      location: [
        '.jobs-unified-top-card__bullet',
        '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
        '.jobs-unified-top-card__primary-description-container'
      ],
      salary: [
        '.job-details-jobs-unified-top-card__job-insight--highlight',
        '.jobs-unified-top-card__job-insight--highlight'
      ],
      description: [
        '.jobs-description-content__text',
        '.job-details-description-content__text'
      ],
      postedDate: '.jobs-unified-top-card__subtitle-secondary-grouping time',
      jobType: '.jobs-unified-top-card__job-insight',
      applicantCount: '.jobs-unified-top-card__applicant-count'
    });
  }

  extractJobId(element) {
    // LinkedIn job ID from URL
    const urlMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
    if (urlMatch) return urlMatch[1];

    // From data attributes
    const jobCard = element.querySelector('[data-job-id]');
    return jobCard ? jobCard.getAttribute('data-job-id') : super.extractJobId(element);
  }
}

// Indeed-specific adapter
class IndeedAdapter extends BaseJobAdapter {
  constructor() {
    super({
      title: [
        'h1[data-testid="jobsearch-JobInfoHeader-title"]',
        '.jobsearch-JobInfoHeader-title'
      ],
      company: {
        name: [
          '[data-testid="inlineHeader-companyName"] a',
          '.jobsearch-InlineCompanyRating .css-1ioi40n'
        ],
        link: '[data-testid="inlineHeader-companyName"] a',
        size: '[data-testid="inlineHeader-companyName"] + div',
        industry: '.jobsearch-CompanyInfoWithoutHeaderImage .css-1w0iwyp'
      },
      location: [
        '[data-testid="job-location"]',
        '.jobsearch-JobInfoHeader-subtitle div'
      ],
      salary: [
        '.salary-snippet',
        '[data-testid="job-salary"]',
        '.jobsearch-JobMetadataHeader-item'
      ],
      description: '#jobDescriptionText',
      postedDate: '.jobsearch-JobMetadataFooter .date',
      jobType: '[data-testid="job-type-label"]',
      applicantCount: '.jobsearch-JobMetadataHeader-item'
    });
  }

  extractJobId(element) {
    // Indeed job key from URL
    const urlParams = new URLSearchParams(window.location.search);
    const jk = urlParams.get('jk');
    if (jk) return jk;

    return super.extractJobId(element);
  }
}

// Glassdoor-specific adapter
class GlassdoorAdapter extends BaseJobAdapter {
  constructor() {
    super({
      title: [
        '[data-test="job-title"]',
        '.job-details-header h1'
      ],
      company: {
        name: '[data-test="employer-name"]',
        link: '[data-test="employer-name"] a',
        size: '[data-test="employer-size"]',
        industry: '[data-test="employer-industry"]'
      },
      location: [
        '[data-test="job-location"]',
        '.job-details-header .location'
      ],
      salary: [
        '[data-test="pay-range"]',
        '.salary-estimate'
      ],
      description: '[data-test="jobDescriptionContainer"]',
      postedDate: '[data-test="job-age"]',
      jobType: '[data-test="job-type"]'
    });
  }
}

export { JobDataExtractor, BaseJobAdapter, LinkedInAdapter, IndeedAdapter, GlassdoorAdapter };

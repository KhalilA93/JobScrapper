# Job Data Extraction Module

A comprehensive, OOP-based job data extraction system with site-specific adapters for parsing job listings from DOM elements.

## Architecture

### Core Components

1. **JobDataExtractor** - Main extractor class with adapter management
2. **BaseJobAdapter** - Generic adapter with common extraction logic
3. **Site-Specific Adapters** - LinkedIn, Indeed, Glassdoor implementations
4. **DataSanitizer** - Clean and normalize extracted data
5. **DataValidator** - Validate extracted data integrity

## Features

### ✅ Generic Parser Class
- **Adapter Pattern**: Pluggable site-specific parsers
- **Unified API**: Consistent extraction interface
- **Error Handling**: Graceful failures with logging
- **Extensibility**: Easy to add new job sites

### ✅ Site-Specific Configuration
```javascript
// LinkedIn Configuration Example
{
  title: ['h1[data-test-id="job-title"]', '.jobs-unified-top-card__job-title h1'],
  company: {
    name: '.jobs-unified-top-card__company-name a',
    link: '.jobs-unified-top-card__company-name a',
    size: '.jobs-unified-top-card__subtitle-secondary-grouping'
  },
  location: ['.jobs-unified-top-card__bullet', '.tvm__text'],
  salary: '.job-details-jobs-unified-top-card__job-insight--highlight',
  description: '.jobs-description-content__text'
}
```

### ✅ Data Sanitization & Validation
- **Text Cleaning**: Normalize whitespace, remove special characters
- **URL Validation**: Handle relative URLs, validate format
- **Salary Parsing**: Extract min/max, detect currency/period
- **Location Parsing**: Split city/state/country components
- **Date Parsing**: Handle relative dates ("2 days ago")
- **Skills Extraction**: Identify common technical skills

### ✅ Extraction Methods
- **Title**: Job position with fallback selectors
- **Company**: Name, website, size, industry
- **Location**: City, state, remote detection
- **Salary**: Range, currency, period (hourly/yearly)
- **Description**: Full job description with HTML cleaning
- **Metadata**: Job ID, posted date, applicant count

## Usage

### Basic Extraction
```javascript
import { JobDataExtractor } from './jobDataExtractor.js';

const extractor = new JobDataExtractor();

// Extract from current page
const jobData = extractor.extractFromCurrentPage();
console.log(jobData);

// Extract from specific site
const linkedinJob = extractor.extractJobData('linkedin');
console.log(linkedinJob);
```

### Advanced Usage
```javascript
// Extract from specific element
const jobCard = document.querySelector('[data-job-id]');
const cardData = extractor.extractJobData('linkedin', jobCard);

// Bulk extraction
const allJobs = [];
document.querySelectorAll('[data-job-id]').forEach(card => {
  const data = extractor.extractJobData('linkedin', card);
  if (data && data.isValid) {
    allJobs.push(data);
  }
});

// Custom adapter
class CustomAdapter extends BaseJobAdapter {
  constructor() {
    super({
      title: '.custom-title',
      company: { name: '.custom-company' }
    });
  }
}

extractor.registerAdapter('custom', new CustomAdapter());
```

## Data Structure

### Extracted Job Object
```javascript
{
  title: "Senior Software Engineer",
  company: {
    name: "Tech Corp",
    link: "https://techcorp.com",
    size: "1000+ employees",
    industry: "Technology"
  },
  location: {
    raw: "San Francisco, CA",
    formatted: "San Francisco, CA",
    city: "San Francisco",
    state: "CA",
    country: "US",
    isRemote: false
  },
  salary: {
    raw: "$120k - $180k",
    min: 120000,
    max: 180000,
    currency: "USD",
    period: "yearly",
    isEstimated: false
  },
  description: "We are looking for...",
  metadata: {
    jobId: "12345",
    postedDate: Date,
    applicantCount: 25,
    jobType: "Full-time",
    experienceLevel: "Senior"
  },
  isValid: true,
  validationErrors: []
}
```

## Supported Job Sites

### LinkedIn
- **Job Pages**: `/jobs/view/`, `/jobs/search/`
- **Features**: Easy Apply detection, detailed metadata
- **Selectors**: Data attributes, unified top card

### Indeed  
- **Job Pages**: `/viewjob?jk=`, `/jobs?`
- **Features**: Salary data, company ratings
- **Selectors**: Test IDs, job info headers

### Glassdoor
- **Job Pages**: `/job-listing/`, `/Jobs/`
- **Features**: Pay ranges, employer data
- **Selectors**: Data test attributes

## Error Handling

### Graceful Failures
- **Invalid Selectors**: Warn and continue
- **Missing Elements**: Return null values
- **Validation Errors**: Log and mark invalid
- **Adapter Errors**: Fallback to legacy extraction

### Logging
```javascript
// Automatic error logging
console.error('JobDataExtractor: Failed to extract data for linkedin', error);
console.warn('JobDataExtractor: Validation errors:', errors);
```

## Data Validation

### Validation Rules
- **Title**: 3-200 characters, alphanumeric + basic punctuation
- **Company**: 1-100 characters, required field
- **Location**: 2-100 characters, optional
- **Salary**: Valid numbers, logical min/max
- **URL**: Valid URL format
- **Date**: Valid date object

### Validation Response
```javascript
{
  isValid: true,
  validationErrors: []
}
```

## Performance Optimizations

### Efficient Extraction
- **Selector Caching**: Reuse compiled selectors
- **Minimal DOM Queries**: Single query per element
- **Lazy Loading**: Only extract requested fields
- **Batch Processing**: Handle multiple elements efficiently

### Memory Management
- **Clean References**: No circular references
- **Garbage Collection**: Proper cleanup
- **Minimal Footprint**: Lightweight objects

## Extension Integration

### Content Script Usage
```javascript
// In content script
import { jobScrapers } from '@utils/scrapers';

// Modern extraction
const currentJob = jobScrapers.extractCurrentJob();

// Legacy fallback
const linkedinJobs = await jobScrapers.linkedin.extractJobs();
```

### Background Script
```javascript
// Send extracted data to backend
chrome.runtime.sendMessage({
  type: 'JOB_EXTRACTED',
  data: jobData
});
```

## Testing

### Unit Tests
```javascript
// Test extraction
const mockElement = createMockJobElement();
const result = extractor.extractJobData('linkedin', mockElement);
expect(result.title).toBe('Software Engineer');
expect(result.isValid).toBe(true);
```

### Integration Tests
```javascript
// Test with real DOM
document.body.innerHTML = linkedinJobHTML;
const result = extractor.extractFromCurrentPage();
expect(result).toBeTruthy();
```

## Future Enhancements

- [ ] Machine learning for dynamic selector detection
- [ ] Support for more job sites (ZipRecruiter, Monster)
- [ ] Skills taxonomy and normalization
- [ ] Company data enrichment
- [ ] Location geocoding
- [ ] Salary benchmarking

---

## Clean OOP Principles Applied

✅ **Single Responsibility**: Each class has one clear purpose  
✅ **Open/Closed**: Easy to extend with new adapters  
✅ **Liskov Substitution**: All adapters implement same interface  
✅ **Interface Segregation**: Minimal, focused interfaces  
✅ **Dependency Inversion**: Depends on abstractions, not concretions  

The extraction module is **production-ready** with robust error handling, comprehensive validation, and clean separation of concerns.

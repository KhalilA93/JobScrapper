// Unit Tests for JobScrapper Data Parsing and Validation Functions
import { 
  mockLinkedInResponse, 
  mockIndeedResponse, 
  mockGlassdoorResponse,
  generateMockJobs 
} from '@tests/mocks/jobSiteMocks';

// Import the modules to test
import { JobSiteDetector } from '@/content/jobSiteDetector';
import { JobDataExtractor } from '@/utils/jobDataExtractor';
import { DataSanitizer } from '@/utils/dataSanitizer';
import { JobDeduplication } from '@/utils/jobDeduplication';

describe('JobSiteDetector', () => {
  let detector;
  
  beforeEach(() => {
    detector = new JobSiteDetector();
  });
  
  describe('platform detection', () => {
    test('should detect LinkedIn job pages', () => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: 'https://www.linkedin.com/jobs/view/3456789' },
        writable: true
      });
      
      const result = detector.detectCurrentSite();
      expect(result.platform).toBe('linkedin');
      expect(result.isJobPage).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
    
    test('should detect Indeed job pages', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://www.indeed.com/viewjob?jk=abc123def456' },
        writable: true
      });
      
      const result = detector.detectCurrentSite();
      expect(result.platform).toBe('indeed');
      expect(result.isJobPage).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
    
    test('should detect Glassdoor job pages', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://www.glassdoor.com/job-listing/frontend-developer-glassdoor-JV_IC1147401_KO0,18_KE19,28.htm?jl=4567890' },
        writable: true
      });
      
      const result = detector.detectCurrentSite();
      expect(result.platform).toBe('glassdoor');
      expect(result.isJobPage).toBe(true);
    });
    
    test('should return null for non-job sites', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://www.google.com' },
        writable: true
      });
      
      const result = detector.detectCurrentSite();
      expect(result).toBeNull();
    });
    
    test('should detect job listing pages vs individual job pages', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'https://www.linkedin.com/jobs/search/' },
        writable: true
      });
      
      const result = detector.detectCurrentSite();
      expect(result.platform).toBe('linkedin');
      expect(result.isJobPage).toBe(false);
      expect(result.isListingPage).toBe(true);
    });
  });
  
  describe('DOM structure analysis', () => {
    test('should analyze page structure for job elements', () => {
      // Create mock DOM structure
      document.body.innerHTML = mockLinkedInResponse.html;
      
      Object.defineProperty(window, 'location', {
        value: { href: mockLinkedInResponse.url },
        writable: true
      });
      
      const result = detector.analyzePageStructure();
      expect(result.hasJobElements).toBe(true);
      expect(result.jobElementsCount).toBeGreaterThan(0);
      expect(result.platform).toBe('linkedin');
    });
    
    test('should identify apply buttons', () => {
      document.body.innerHTML = mockLinkedInResponse.html;
      
      const result = detector.analyzePageStructure();
      expect(result.hasApplyButton).toBe(true);
      expect(result.applyButtonType).toBe('easy_apply');
    });
  });
});

describe('JobDataExtractor', () => {
  let extractor;
  
  beforeEach(() => {
    extractor = new JobDataExtractor();
  });
  
  describe('LinkedIn extraction', () => {
    test('should extract job data from LinkedIn page', () => {
      document.body.innerHTML = mockLinkedInResponse.html;
      
      const result = extractor.extractJobData('linkedin');
      expect(result).toBeValidJobData();
      expect(result.title).toBe(mockLinkedInResponse.expectedData.title);
      expect(result.company).toBe(mockLinkedInResponse.expectedData.company);
      expect(result.location).toBe(mockLinkedInResponse.expectedData.location);
      expect(result.hasEasyApply).toBe(true);
    });
    
    test('should handle missing elements gracefully', () => {
      document.body.innerHTML = '<div class="incomplete-job-listing"><h3>Incomplete Job</h3></div>';
      
      const result = extractor.extractJobData('linkedin');
      expect(result.title).toBe('Incomplete Job');
      expect(result.company).toBe('');
      expect(result.location).toBe('');
      expect(result.hasEasyApply).toBe(false);
    });
  });
  
  describe('Indeed extraction', () => {
    test('should extract job data from Indeed page', () => {
      document.body.innerHTML = mockIndeedResponse.html;
      
      const result = extractor.extractJobData('indeed');
      expect(result).toBeValidJobData();
      expect(result.title).toBe(mockIndeedResponse.expectedData.title);
      expect(result.company).toBe(mockIndeedResponse.expectedData.company);
      expect(result.salary).toBe(mockIndeedResponse.expectedData.salary);
    });
    
    test('should extract salary information', () => {
      document.body.innerHTML = mockIndeedResponse.html;
      
      const result = extractor.extractJobData('indeed');
      expect(result.salary).toContain('$80,000 - $120,000');
    });
  });
  
  describe('Glassdoor extraction', () => {
    test('should extract job data from Glassdoor page', () => {
      document.body.innerHTML = mockGlassdoorResponse.html;
      
      const result = extractor.extractJobData('glassdoor');
      expect(result).toBeValidJobData();
      expect(result.title).toBe(mockGlassdoorResponse.expectedData.title);
      expect(result.company).toBe(mockGlassdoorResponse.expectedData.company);
    });
  });
  
  describe('error handling', () => {
    test('should handle invalid platform', () => {
      const result = extractor.extractJobData('invalid-platform');
      expect(result).toBeNull();
    });
    
    test('should handle DOM parsing errors', () => {
      document.body.innerHTML = '<div>Invalid HTML structure</div>';
      
      expect(() => {
        extractor.extractJobData('linkedin');
      }).not.toThrow();
    });
  });
});

describe('DataSanitizer', () => {
  let sanitizer;
  
  beforeEach(() => {
    sanitizer = new DataSanitizer();
  });
  
  describe('job data sanitization', () => {
    test('should sanitize job titles', () => {
      const dirtyTitle = '  Senior Software Engineer - Full Stack Development!!!  ';
      const cleaned = sanitizer.sanitizeJobTitle(dirtyTitle);
      
      expect(cleaned).toBe('Senior Software Engineer - Full Stack Development');
      expect(cleaned).not.toMatch(/^\s+|\s+$/); // No leading/trailing whitespace
      expect(cleaned).not.toMatch(/[!]{2,}/); // No excessive punctuation
    });
    
    test('should sanitize company names', () => {
      const dirtyCompany = 'TECH CORP INC. (Remote First Company)';
      const cleaned = sanitizer.sanitizeCompanyName(dirtyCompany);
      
      expect(cleaned).toBe('Tech Corp Inc.');
      expect(cleaned).not.toContain('(Remote First Company)');
    });
    
    test('should sanitize locations', () => {
      const dirtyLocation = 'San Francisco, CA, USA (Remote Possible)';
      const cleaned = sanitizer.sanitizeLocation(dirtyLocation);
      
      expect(cleaned).toBe('San Francisco, CA');
      expect(cleaned).not.toContain('(Remote Possible)');
    });
    
    test('should sanitize salary information', () => {
      const dirtySalary = '$80,000.00 - $120,000.00 per year (DOE)';
      const cleaned = sanitizer.sanitizeSalary(dirtySalary);
      
      expect(cleaned).toBe('$80,000 - $120,000 per year');
      expect(cleaned).not.toContain('(DOE)');
    });
    
    test('should sanitize job descriptions', () => {
      const dirtyDescription = `
        Join our amazing team!!! 
        We are looking for a ROCKSTAR developer who can work with:
        - JavaScript
        - React
        - Node.js
        
        Apply now!!!!!
      `;
      
      const cleaned = sanitizer.sanitizeDescription(dirtyDescription);
      
      expect(cleaned).not.toMatch(/!{2,}/); // No excessive exclamation marks
      expect(cleaned).not.toContain('ROCKSTAR'); // No buzzwords
      expect(cleaned.length).toBeGreaterThan(0);
    });
  });
  
  describe('data validation', () => {
    test('should validate complete job data', () => {
      const validJob = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        url: 'https://example.com/job/123'
      };
      
      const result = sanitizer.validateJobData(validJob);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('should detect missing required fields', () => {
      const invalidJob = {
        title: 'Software Engineer',
        // Missing company, location, url
      };
      
      const result = sanitizer.validateJobData(invalidJob);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company is required');
      expect(result.errors).toContain('Location is required');
      expect(result.errors).toContain('URL is required');
    });
    
    test('should validate URL format', () => {
      const jobWithInvalidUrl = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        url: 'not-a-valid-url'
      };
      
      const result = sanitizer.validateJobData(jobWithInvalidUrl);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });
  });
  
  describe('XSS prevention', () => {
    test('should remove script tags from job data', () => {
      const maliciousTitle = '<script>alert("xss")</script>Software Engineer';
      const cleaned = sanitizer.sanitizeJobTitle(maliciousTitle);
      
      expect(cleaned).toBe('Software Engineer');
      expect(cleaned).not.toContain('<script>');
    });
    
    test('should sanitize HTML entities', () => {
      const titleWithEntities = 'Senior Developer &amp; Team Lead';
      const cleaned = sanitizer.sanitizeJobTitle(titleWithEntities);
      
      expect(cleaned).toBe('Senior Developer & Team Lead');
    });
  });
});

describe('JobDeduplication', () => {
  let deduplicator;
  
  beforeEach(() => {
    deduplicator = new JobDeduplication();
  });
  
  describe('duplicate detection', () => {
    test('should detect exact duplicates', () => {
      const job1 = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA'
      };
      
      const job2 = { ...job1 };
      
      const isDuplicate = deduplicator.isDuplicate(job1, job2);
      expect(isDuplicate).toBe(true);
    });
    
    test('should detect near duplicates with fuzzy matching', () => {
      const job1 = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA'
      };
      
      const job2 = {
        title: 'Software Engineer - Full Stack',
        company: 'Tech Corp Inc.',
        location: 'San Francisco, California'
      };
      
      const isDuplicate = deduplicator.isDuplicate(job1, job2);
      expect(isDuplicate).toBe(true);
    });
    
    test('should not flag different jobs as duplicates', () => {
      const job1 = {
        title: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA'
      };
      
      const job2 = {
        title: 'Data Scientist',
        company: 'Data Analytics Inc',
        location: 'New York, NY'
      };
      
      const isDuplicate = deduplicator.isDuplicate(job1, job2);
      expect(isDuplicate).toBe(false);
    });
  });
  
  describe('similarity scoring', () => {
    test('should calculate title similarity', () => {
      const title1 = 'Senior Software Engineer';
      const title2 = 'Software Engineer - Senior Level';
      
      const similarity = deduplicator.calculateTitleSimilarity(title1, title2);
      expect(similarity).toBeGreaterThan(0.8);
    });
    
    test('should calculate company similarity', () => {
      const company1 = 'Tech Corp';
      const company2 = 'Tech Corp Inc.';
      
      const similarity = deduplicator.calculateCompanySimilarity(company1, company2);
      expect(similarity).toBeGreaterThan(0.9);
    });
  });
  
  describe('batch deduplication', () => {
    test('should remove duplicates from job list', () => {
      const jobs = [
        { title: 'Software Engineer', company: 'Tech Corp', location: 'SF' },
        { title: 'Software Engineer', company: 'Tech Corp', location: 'SF' }, // Duplicate
        { title: 'Data Scientist', company: 'Data Inc', location: 'NY' },
        { title: 'Software Engineer - Senior', company: 'Tech Corp Inc.', location: 'San Francisco' }, // Near duplicate
      ];
      
      const deduplicated = deduplicator.removeDuplicates(jobs);
      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].title).toBe('Software Engineer');
      expect(deduplicated[1].title).toBe('Data Scientist');
    });
    
    test('should handle large datasets efficiently', () => {
      const largeJobSet = generateMockJobs(1000);
      
      const startTime = performance.now();
      const deduplicated = deduplicator.removeDuplicates(largeJobSet);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(deduplicated.length).toBeLessThanOrEqual(largeJobSet.length);
    });
  });
});

describe('Integration - Full Data Processing Pipeline', () => {
  test('should process job data through complete pipeline', async () => {
    // Mock DOM with LinkedIn job
    document.body.innerHTML = mockLinkedInResponse.html;
    Object.defineProperty(window, 'location', {
      value: { href: mockLinkedInResponse.url },
      writable: true
    });
    
    // Initialize components
    const detector = new JobSiteDetector();
    const extractor = new JobDataExtractor();
    const sanitizer = new DataSanitizer();
    const deduplicator = new JobDeduplication();
    
    // Step 1: Detect site
    const siteInfo = detector.detectCurrentSite();
    expect(siteInfo.platform).toBe('linkedin');
    
    // Step 2: Extract data
    const rawData = extractor.extractJobData(siteInfo.platform);
    expect(rawData).toBeValidJobData();
    
    // Step 3: Sanitize data
    const sanitizedData = {
      title: sanitizer.sanitizeJobTitle(rawData.title),
      company: sanitizer.sanitizeCompanyName(rawData.company),
      location: sanitizer.sanitizeLocation(rawData.location),
      url: rawData.url
    };
    
    // Step 4: Validate data
    const validation = sanitizer.validateJobData(sanitizedData);
    expect(validation.isValid).toBe(true);
    
    // Step 5: Check for duplicates (simulate existing job)
    const existingJobs = [sanitizedData];
    const duplicatedJobs = [...existingJobs, sanitizedData];
    const deduplicated = deduplicator.removeDuplicates(duplicatedJobs);
    
    expect(deduplicated).toHaveLength(1);
  });
});

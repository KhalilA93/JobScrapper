// Job Data Extraction Usage Example

import { JobDataExtractor } from './jobDataExtractor.js';

// Initialize the extractor
const extractor = new JobDataExtractor();

// Example 1: Extract from current page
const jobData = extractor.extractFromCurrentPage();
if (jobData && jobData.isValid) {
  console.log('Extracted job data:', {
    title: jobData.title,
    company: jobData.company.name,
    location: jobData.location.formatted,
    salary: jobData.salary?.raw,
    isRemote: jobData.location.isRemote
  });
}

// Example 2: Extract from specific site
const linkedinData = extractor.extractJobData('linkedin');
console.log('LinkedIn job:', linkedinData);

// Example 3: Extract from specific element
const jobCard = document.querySelector('[data-job-id]');
if (jobCard) {
  const cardData = extractor.extractJobData('linkedin', jobCard);
  console.log('Job card data:', cardData);
}

// Example 4: Custom adapter registration
class CustomAdapter extends BaseJobAdapter {
  constructor() {
    super({
      title: '.custom-job-title',
      company: { name: '.custom-company' },
      location: '.custom-location'
    });
  }
}

extractor.registerAdapter('custom', new CustomAdapter());
const customData = extractor.extractJobData('custom');

// Example 5: Bulk extraction for job listings page
function extractAllJobsOnPage() {
  const jobCards = document.querySelectorAll('[data-job-id]');
  const allJobs = [];
  
  jobCards.forEach(card => {
    const jobData = extractor.extractJobData('linkedin', card);
    if (jobData && jobData.isValid) {
      allJobs.push(jobData);
    }
  });
  
  return allJobs;
}

export { extractor as jobDataExtractor };

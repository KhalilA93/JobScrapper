// Job site detection utilities
export const jobDetector = {
  // Detect if current URL is a supported job site
  detectJobSite(url) {
    if (!url) return null;

    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('indeed.com')) return 'indeed';
    if (hostname.includes('glassdoor.com')) return 'glassdoor';
    if (hostname.includes('jobs.google.com')) return 'google';
    if (hostname.includes('ziprecruiter.com')) return 'ziprecruiter';
    if (hostname.includes('monster.com')) return 'monster';
    
    return null;
  },

  // Check if current page is a job listing page
  isJobListingPage(url, platform) {
    const urlPath = new URL(url).pathname.toLowerCase();
    
    switch (platform) {
      case 'linkedin':
        return urlPath.includes('/jobs/') || urlPath.includes('/jobs/search');
      case 'indeed':
        return urlPath.includes('/jobs') || urlPath.includes('/viewjob');
      case 'glassdoor':
        return urlPath.includes('/job') || urlPath.includes('/jobs');
      case 'google':
        return urlPath.includes('/search') && url.includes('q=');
      case 'ziprecruiter':
        return urlPath.includes('/jobs') || urlPath.includes('/job/');
      case 'monster':
        return urlPath.includes('/jobs') || urlPath.includes('/job-openings');
      default:
        return false;
    }
  },

  // Check if current page is a single job detail page
  isJobDetailPage(url, platform) {
    const urlPath = new URL(url).pathname.toLowerCase();
    
    switch (platform) {
      case 'linkedin':
        return urlPath.includes('/jobs/view/');
      case 'indeed':
        return urlPath.includes('/viewjob?jk=');
      case 'glassdoor':
        return urlPath.includes('/job-listing/');
      case 'ziprecruiter':
        return urlPath.includes('/job/') && !urlPath.includes('/jobs');
      case 'monster':
        return urlPath.includes('/job-openings/') && urlPath.split('/').length > 3;
      default:
        return false;
    }
  },

  // Get supported job sites list
  getSupportedSites() {
    return [
      { name: 'LinkedIn', domain: 'linkedin.com', key: 'linkedin' },
      { name: 'Indeed', domain: 'indeed.com', key: 'indeed' },
      { name: 'Glassdoor', domain: 'glassdoor.com', key: 'glassdoor' },
      { name: 'Google Jobs', domain: 'jobs.google.com', key: 'google' },
      { name: 'ZipRecruiter', domain: 'ziprecruiter.com', key: 'ziprecruiter' },
      { name: 'Monster', domain: 'monster.com', key: 'monster' }
    ];
  }
};

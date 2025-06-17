// Job scraping utilities for different platforms
export const jobScrapers = {
  // LinkedIn job scraper
  linkedin: {
    async extractJobs() {
      const jobs = [];
      const jobCards = document.querySelectorAll('.job-search-card, .jobs-search__results-list li');
      
      for (const card of jobCards) {
        try {
          const job = {
            title: this.getTextContent(card, 'h3 a, .job-search-card__title a'),
            company: this.getTextContent(card, '.job-search-card__subtitle-primary a, h4 a'),
            location: this.getTextContent(card, '.job-search-card__subtitle-secondary, .job-search-card__location'),
            url: this.getHref(card, 'h3 a, .job-search-card__title a'),
            description: this.getTextContent(card, '.job-search-card__snippet'),
            postedDate: this.getTextContent(card, 'time'),
            salary: null // LinkedIn rarely shows salary in search results
          };
          
          if (job.title && job.company) {
            jobs.push(job);
          }
        } catch (error) {
          console.warn('Error extracting LinkedIn job:', error);
        }
      }
      
      return jobs;
    },

    async extractCurrentJob() {
      return {
        title: this.getTextContent(document, 'h1.jobs-unified-top-card__job-title'),
        company: this.getTextContent(document, '.jobs-unified-top-card__company-name a'),
        location: this.getTextContent(document, '.jobs-unified-top-card__bullet'),
        description: this.getTextContent(document, '.jobs-description__content'),
        requirements: this.getTextContent(document, '.jobs-box__content'),
        url: window.location.href
      };
    },

    getTextContent(parent, selector) {
      const element = parent.querySelector(selector);
      return element ? element.textContent.trim() : null;
    },

    getHref(parent, selector) {
      const element = parent.querySelector(selector);
      return element ? element.href : null;
    }
  },

  // Indeed job scraper
  indeed: {
    async extractJobs() {
      const jobs = [];
      const jobCards = document.querySelectorAll('[data-jk], .job_seen_beacon');
      
      for (const card of jobCards) {
        try {
          const job = {
            title: this.getTextContent(card, 'h2 a span, .jobTitle a span'),
            company: this.getTextContent(card, '.companyName, [data-testid="company-name"]'),
            location: this.getTextContent(card, '.companyLocation, [data-testid="job-location"]'),
            url: this.getHref(card, 'h2 a, .jobTitle a'),
            description: this.getTextContent(card, '.job-snippet, [data-testid="job-snippet"]'),
            salary: this.getTextContent(card, '.salary-snippet, .estimated-salary'),
            postedDate: this.getTextContent(card, '.date, [data-testid="myJobsStateDate"]')
          };
          
          if (job.title && job.company) {
            jobs.push(job);
          }
        } catch (error) {
          console.warn('Error extracting Indeed job:', error);
        }
      }
      
      return jobs;
    },

    async extractCurrentJob() {
      return {
        title: this.getTextContent(document, 'h1.jobsearch-JobInfoHeader-title'),
        company: this.getTextContent(document, '.jobsearch-InlineCompanyRating a'),
        location: this.getTextContent(document, '.jobsearch-JobInfoHeader-subtitle div'),
        description: this.getTextContent(document, '#jobDescriptionText'),
        salary: this.getTextContent(document, '.jobsearch-JobMetadataHeader-item'),
        url: window.location.href
      };
    },

    getTextContent(parent, selector) {
      const element = parent.querySelector(selector);
      return element ? element.textContent.trim() : null;
    },

    getHref(parent, selector) {
      const element = parent.querySelector(selector);
      return element ? new URL(element.href, window.location.origin).href : null;
    }
  },

  // Generic scraper for other platforms
  generic: {
    async extractJobs() {
      // Basic generic extraction - looks for common job listing patterns
      const jobs = [];
      const possibleJobElements = document.querySelectorAll(
        '[class*="job"], [class*="position"], [class*="listing"], [data-job], [data-position]'
      );
      
      for (const element of possibleJobElements) {
        try {
          const job = this.extractJobFromElement(element);
          if (job.title && job.company) {
            jobs.push(job);
          }
        } catch (error) {
          console.warn('Error in generic job extraction:', error);
        }
      }
      
      return jobs;
    },

    extractJobFromElement(element) {
      return {
        title: this.findText(element, ['title', 'job-title', 'position']),
        company: this.findText(element, ['company', 'employer', 'organization']),
        location: this.findText(element, ['location', 'city', 'address']),
        description: this.findText(element, ['description', 'summary', 'snippet']),
        url: this.findLink(element) || window.location.href
      };
    },

    findText(parent, keywords) {
      for (const keyword of keywords) {
        const selectors = [
          `[class*="${keyword}"]`,
          `[id*="${keyword}"]`,
          `[data-${keyword}]`
        ];
        
        for (const selector of selectors) {
          const element = parent.querySelector(selector);
          if (element && element.textContent.trim()) {
            return element.textContent.trim();
          }
        }
      }
      return null;
    },

    findLink(parent) {
      const link = parent.querySelector('a[href]');
      return link ? link.href : null;
    }
  }
};

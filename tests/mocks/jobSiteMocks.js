// Mock Job Site Responses for JobScrapper Testing Framework
// Provides realistic mock data and responses for different job platforms

/**
 * Mock LinkedIn Job Response
 */
export const mockLinkedInResponse = {
  url: 'https://www.linkedin.com/jobs/view/3456789',
  html: `
    <div class="jobs-search__results-list">
      <div class="job-card-container">
        <div class="job-card-container__link">
          <h3 class="job-card-list__title">
            <span class="sr-only">Senior Software Engineer</span>
            Senior Software Engineer
          </h3>
          <h4 class="job-card-container__company-name">
            Tech Innovations Inc
          </h4>
          <div class="job-card-container__metadata-wrapper">
            <span class="job-card-container__location">
              San Francisco, CA
            </span>
            <time class="job-card-container__listed-time">
              2 days ago
            </time>
          </div>
          <div class="job-card-list__easy-apply">
            <button class="jobs-apply-button" data-job-id="3456789">
              Easy Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  expectedData: {
    title: 'Senior Software Engineer',
    company: 'Tech Innovations Inc',
    location: 'San Francisco, CA',
    url: 'https://www.linkedin.com/jobs/view/3456789',
    platform: 'linkedin',
    salary: null,
    postedDate: '2 days ago',
    hasEasyApply: true,
    jobId: '3456789'
  }
};

/**
 * Mock Indeed Job Response
 */
export const mockIndeedResponse = {
  url: 'https://www.indeed.com/viewjob?jk=abc123def456',
  html: `
    <div class="jobsearch-SerpJobCard">
      <h2 class="title">
        <a data-jk="abc123def456" href="/viewjob?jk=abc123def456">
          <span title="Full Stack Developer">Full Stack Developer</span>
        </a>
      </h2>
      <span class="company">
        <a href="/cmp/StartupCorp">StartupCorp</a>
      </span>
      <div class="location">
        New York, NY 10001
      </div>
      <div class="salary-snippet">
        <span class="salaryText">$80,000 - $120,000 a year</span>
      </div>
      <div class="summary">
        <span>Join our dynamic team as a Full Stack Developer...</span>
      </div>
      <div class="jobsearch-SerpJobCard-footer">
        <span class="date">5 days ago</span>
      </div>
    </div>
  `,
  expectedData: {
    title: 'Full Stack Developer',
    company: 'StartupCorp',
    location: 'New York, NY 10001',
    url: 'https://www.indeed.com/viewjob?jk=abc123def456',
    platform: 'indeed',
    salary: '$80,000 - $120,000 a year',
    postedDate: '5 days ago',
    hasEasyApply: false,
    jobId: 'abc123def456'
  }
};

/**
 * Mock Glassdoor Job Response
 */
export const mockGlassdoorResponse = {
  url: 'https://www.glassdoor.com/job-listing/frontend-developer-glassdoor-JV_IC1147401_KO0,18_KE19,28.htm?jl=4567890',
  html: `
    <div class="react-job-listing">
      <div class="jobHeader">
        <h1 class="jobTitle strong">Frontend Developer</h1>
        <div class="employerName strong">
          <span>Glassdoor</span>
        </div>
        <div class="jobLocation">
          <span>Mill Valley, CA</span>
        </div>
      </div>
      <div class="jobSalary">
        <span class="gray salary">$70K-$90K (Glassdoor est.)</span>
      </div>
      <div class="jobDescription">
        <p>We are looking for a talented Frontend Developer...</p>
      </div>
      <div class="jobAge">
        <span>1d</span>
      </div>
      <button class="gd-btn gd-btn-primary" data-test="apply-btn">
        Apply Now
      </button>
    </div>
  `,
  expectedData: {
    title: 'Frontend Developer',
    company: 'Glassdoor',
    location: 'Mill Valley, CA',
    url: 'https://www.glassdoor.com/job-listing/frontend-developer-glassdoor-JV_IC1147401_KO0,18_KE19,28.htm?jl=4567890',
    platform: 'glassdoor',
    salary: '$70K-$90K (Glassdoor est.)',
    postedDate: '1d',
    hasEasyApply: false,
    jobId: '4567890'
  }
};

/**
 * Mock ZipRecruiter Job Response
 */
export const mockZipRecruiterResponse = {
  url: 'https://www.ziprecruiter.com/jobs/backend-engineer-xyz789',
  html: `
    <div class="job_content">
      <h1 class="job_title">Backend Engineer</h1>
      <div class="company_name">
        <a href="/company/tech-solutions">Tech Solutions LLC</a>
      </div>
      <div class="location_name">
        Austin, TX
      </div>
      <div class="job_salary">
        <span>$85,000 - $110,000</span>
      </div>
      <div class="job_age">
        <time>3 days ago</time>
      </div>
      <button class="apply_button" data-job-id="xyz789">
        Apply Now
      </button>
    </div>
  `,
  expectedData: {
    title: 'Backend Engineer',
    company: 'Tech Solutions LLC',
    location: 'Austin, TX',
    url: 'https://www.ziprecruiter.com/jobs/backend-engineer-xyz789',
    platform: 'ziprecruiter',
    salary: '$85,000 - $110,000',
    postedDate: '3 days ago',
    hasEasyApply: false,
    jobId: 'xyz789'
  }
};

/**
 * Mock Monster Job Response
 */
export const mockMonsterResponse = {
  url: 'https://www.monster.com/job-openings/devops-engineer-seattle-wa--monster123',
  html: `
    <div class="job-container">
      <header class="job-header">
        <h1 class="job-title">DevOps Engineer</h1>
        <div class="company">
          <span class="name">Cloud Systems Inc</span>
        </div>
        <div class="location">
          <span>Seattle, WA</span>
        </div>
      </header>
      <div class="job-specs">
        <div class="salary">
          <span>$95,000 - $130,000</span>
        </div>
        <div class="posted-date">
          <span>Posted 1 week ago</span>
        </div>
      </div>
      <button class="apply-btn" data-job-id="monster123">
        Apply for this job
      </button>
    </div>
  `,
  expectedData: {
    title: 'DevOps Engineer',
    company: 'Cloud Systems Inc',
    location: 'Seattle, WA',
    url: 'https://www.monster.com/job-openings/devops-engineer-seattle-wa--monster123',
    platform: 'monster',
    salary: '$95,000 - $130,000',
    postedDate: 'Posted 1 week ago',
    hasEasyApply: false,
    jobId: 'monster123'
  }
};

/**
 * Mock API Responses for Backend Testing
 */
export const mockApiResponses = {
  // GET /api/jobs
  jobs: {
    success: true,
    data: {
      jobs: [
        mockLinkedInResponse.expectedData,
        mockIndeedResponse.expectedData,
        mockGlassdoorResponse.expectedData
      ],
      total: 3,
      page: 1,
      limit: 10
    }
  },
  
  // POST /api/jobs
  createJob: {
    success: true,
    data: {
      id: 'job_12345',
      ...mockLinkedInResponse.expectedData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  
  // GET /api/applications
  applications: {
    success: true,
    data: {
      applications: [
        {
          id: 'app_001',
          jobId: 'job_12345',
          status: 'applied',
          appliedAt: new Date().toISOString(),
          job: mockLinkedInResponse.expectedData
        }
      ],
      total: 1,
      page: 1,
      limit: 10
    }
  },
  
  // POST /api/applications
  createApplication: {
    success: true,
    data: {
      id: 'app_002',
      jobId: 'job_12345',
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  },
  
  // GET /api/analytics
  analytics: {
    success: true,
    data: {
      totalJobs: 150,
      totalApplications: 45,
      successRate: 0.3,
      averageResponseTime: '5 days',
      topPlatforms: [
        { platform: 'linkedin', count: 67 },
        { platform: 'indeed', count: 45 },
        { platform: 'glassdoor', count: 23 }
      ],
      recentActivity: [
        {
          type: 'application_submitted',
          jobId: 'job_12345',
          timestamp: new Date().toISOString()
        }
      ]
    }
  }
};

/**
 * Mock Error Responses
 */
export const mockErrorResponses = {
  unauthorized: {
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      statusCode: 401
    }
  },
  
  rateLimited: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      statusCode: 429,
      retryAfter: 60
    }
  },
  
  validationError: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      statusCode: 400,
      details: [
        { field: 'title', message: 'Job title is required' },
        { field: 'company', message: 'Company name is required' }
      ]
    }
  },
  
  serverError: {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500
    }
  }
};

/**
 * Mock Chrome Extension Messages
 */
export const mockChromeMessages = {
  jobDetected: {
    type: 'JOB_DETECTED',
    payload: {
      url: mockLinkedInResponse.url,
      platform: 'linkedin',
      jobData: mockLinkedInResponse.expectedData
    }
  },
  
  startScraping: {
    type: 'START_SCRAPING',
    payload: {
      platforms: ['linkedin', 'indeed'],
      filters: {
        location: 'San Francisco',
        keywords: ['software engineer']
      }
    }
  },
  
  scrapingProgress: {
    type: 'SCRAPING_PROGRESS',
    payload: {
      total: 100,
      completed: 25,
      currentPlatform: 'linkedin',
      status: 'in_progress'
    }
  },
  
  scrapingComplete: {
    type: 'SCRAPING_COMPLETE',
    payload: {
      totalFound: 150,
      totalApplied: 45,
      platforms: ['linkedin', 'indeed'],
      duration: 1800000 // 30 minutes in ms
    }
  }
};

/**
 * Mock DOM Events for Testing
 */
export const mockDomEvents = {
  createJobListingElement: (jobData = mockLinkedInResponse.expectedData) => {
    const element = document.createElement('div');
    element.className = 'job-listing-test';
    element.innerHTML = `
      <h3 class="job-title">${jobData.title}</h3>
      <div class="company-name">${jobData.company}</div>
      <div class="job-location">${jobData.location}</div>
      <a href="${jobData.url}" class="job-link">View Job</a>
      ${jobData.hasEasyApply ? '<button class="easy-apply-btn">Easy Apply</button>' : ''}
    `;
    return element;
  },
  
  simulateClick: (element) => {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  },
  
  simulateFormSubmit: (form) => {
    const event = new Event('submit', {
      bubbles: true,
      cancelable: true
    });
    form.dispatchEvent(event);
  }
};

/**
 * Test Data Generators
 */
export const generateMockJobs = (count = 10) => {
  const platforms = ['linkedin', 'indeed', 'glassdoor', 'ziprecruiter', 'monster'];
  const titles = ['Software Engineer', 'Frontend Developer', 'Backend Engineer', 'Full Stack Developer', 'DevOps Engineer'];
  const companies = ['Tech Corp', 'StartupCo', 'BigTech Inc', 'InnovateLabs', 'DevSolutions'];
  const locations = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Remote'];
  
  return Array.from({ length: count }, (_, index) => ({
    id: `job_${index + 1}`,
    title: titles[index % titles.length],
    company: companies[index % companies.length],
    location: locations[index % locations.length],
    url: `https://example.com/job/${index + 1}`,
    platform: platforms[index % platforms.length],
    salary: `$${(Math.random() * 50000 + 70000).toFixed(0)} - $${(Math.random() * 50000 + 120000).toFixed(0)}`,
    postedDate: `${Math.floor(Math.random() * 7) + 1} days ago`,
    hasEasyApply: Math.random() > 0.5,
    jobId: `${index + 1}`
  }));
};

export default {
  mockLinkedInResponse,
  mockIndeedResponse,
  mockGlassdoorResponse,
  mockZipRecruiterResponse,
  mockMonsterResponse,
  mockApiResponses,
  mockErrorResponses,
  mockChromeMessages,
  mockDomEvents,
  generateMockJobs
};

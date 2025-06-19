# MongoDB Models Documentation

This directory contains clean, normalized, and indexed Mongoose schemas for the JobScraper Chrome extension backend.

## Models Overview

### 1. User Model (`User.js`)
**Purpose**: Manages user profiles, preferences, and application settings.

**Key Features**:
- Complete user profile with validation
- Job search preferences and filtering criteria
- Application automation settings
- Usage statistics and performance tracking
- Comprehensive indexing for performance

**Relationships**: 
- One-to-many with Applications
- Referenced in Application tracking

### 2. Job Model (`Job.js`)
**Purpose**: Stores and manages job listings scraped from various platforms.

**Key Features**:
- Normalized company and location data
- Comprehensive salary and compensation tracking
- Skills categorization (required vs preferred)
- Match scoring algorithm integration
- Advanced search capabilities with text indexing
- Deduplication via compound unique indexes

**Relationships**:
- Many-to-one with Site (platform configuration)
- One-to-many with Applications
- Referenced by match scoring algorithms

### 3. Application Model (`Application.js`) 
**Purpose**: Tracks job applications, communications, and interview processes.

**Key Features**:
- Complete application lifecycle tracking
- Communication history with employers
- Interview scheduling and feedback
- Offer negotiation tracking
- Error logging and retry mechanisms
- Advanced analytics and reporting

**Relationships**:
- Many-to-one with User
- Many-to-one with Job
- Unique constraint to prevent duplicate applications

### 4. Site Model (`Site.js`)
**Purpose**: Manages job platform configurations, scraping rules, and health monitoring.

**Key Features**:
- Platform-specific scraping configurations
- Rate limiting and request management
- Health monitoring and error tracking
- Feature capability tracking
- Performance analytics

**Relationships**:
- One-to-many with Jobs
- Referenced for scraping configuration

## Schema Design Principles

### 1. Normalization
- Eliminated data duplication across models
- Proper relationships using ObjectId references
- Structured nested objects for related data

### 2. Validation
- Input validation with custom validators
- Enum constraints for controlled vocabularies
- Required field enforcement
- Data type and format validation

### 3. Indexing Strategy
- Compound indexes for query optimization
- Text search indexes for job searching
- Performance indexes on frequently queried fields
- Unique constraints for data integrity

### 4. Data Integrity
- Unique constraints prevent duplicates
- Referential integrity through population
- Pre-save middleware for data consistency
- Virtual fields for computed values

## Performance Optimizations

### Indexes
```javascript
// Job Model
{ platform: 1, jobId: 1 } // Unique compound index
{ title: 'text', description: 'text' } // Full-text search
{ 'metrics.matchScore': -1 } // Match score queries

// Application Model  
{ user: 1, status: 1 } // User application queries
{ job: 1, user: 1 } // Unique constraint
{ submittedAt: -1 } // Timeline queries

// User Model
{ email: 1 } // Login and uniqueness
{ 'preferences.locations': 1 } // Location filtering

// Site Model
{ name: 1 } // Platform lookups
{ status: 1, priority: -1 } // Active site queries
```

### Virtual Fields
- Computed values without storage overhead
- Dynamic relationships and calculations
- Enhanced API responses with derived data

## Usage Examples

### Creating a Job Application
```javascript
const application = new Application({
  user: userId,
  job: jobId,
  jobDetails: {
    title: job.title,
    company: job.company.name,
    platform: job.platform
  },
  applicationMethod: 'easy_apply',
  isAutomated: true
});

await application.save();
```

### Searching Jobs with Match Scoring
```javascript
const jobs = await Job.searchJobs('software engineer', {
  platform: 'linkedin',
  isRemote: true,
  minSalary: 80000,
  skills: ['javascript', 'react']
});

// Calculate match scores
jobs.forEach(job => {
  job.calculateMatchScore(user.preferences);
});
```

### Analytics and Reporting
```javascript
// Get application statistics
const stats = await Application.getStatusStats(userId);
const trends = await Application.getApplicationTrends(30, userId);
const platformStats = await Application.getPlatformStats(userId);
```

## Migration Considerations

When updating existing data:

1. **Data Migration Scripts**: Create scripts to migrate existing data to new schema format
2. **Backward Compatibility**: Maintain compatibility during transition period
3. **Index Creation**: Create indexes gradually in production to avoid downtime
4. **Validation**: Run validation scripts to ensure data integrity

## Best Practices

### 1. Error Handling
- Use try-catch blocks for database operations
- Implement proper error logging
- Handle validation errors gracefully

### 2. Query Optimization
- Use lean() queries when virtual fields aren't needed
- Implement pagination for large result sets
- Use aggregation pipelines for complex analytics

### 3. Data Consistency
- Use transactions for multi-document operations
- Implement proper retry logic for failed operations
- Regular data cleanup and maintenance

### 4. Security
- Validate all input data
- Use proper access control
- Sanitize data before storage
- Implement rate limiting

## Environment Variables

Required environment variables for database connection:
```
MONGODB_URI=mongodb://localhost:27017/jobscraper
MONGODB_DB_NAME=jobscraper
```

## Testing

Run model tests:
```bash
npm test -- --grep "Models"
```

Individual model testing:
```bash
npm test -- --grep "User Model"
npm test -- --grep "Job Model"  
npm test -- --grep "Application Model"
npm test -- --grep "Site Model"
```

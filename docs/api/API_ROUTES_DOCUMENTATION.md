# JobScrapper API Routes Documentation

## Overview
Clean RESTful API implementation for the JobScrapper backend with proper middleware, validation, and error handling following Express.js best practices.

## Base URL
```
http://localhost:5000/api
```

## Common Features
- ✅ **Joi Validation** - Request/query parameter validation
- ✅ **Error Handling** - Comprehensive error responses with proper status codes
- ✅ **Pagination** - Standardized pagination for list endpoints
- ✅ **Rate Limiting** - 100 requests per 15 minutes per IP
- ✅ **CORS** - Chrome extension and localhost support
- ✅ **Security** - Helmet.js security headers

---

## 1. POST /api/jobs
**Store scraped job data with intelligent deduplication**

### Request Body
```json
{
  "jobId": "string (required)",
  "title": "string (required)",
  "company": "string (required)", 
  "location": "string (optional)",
  "description": "string (optional)",
  "requirements": ["string array"],
  "employmentType": "full-time|part-time|contract|internship",
  "experienceLevel": "entry|mid|senior|executive",
  "salary": {
    "min": "number",
    "max": "number", 
    "currency": "string (default: USD)"
  },
  "platform": "linkedin|indeed|glassdoor|google|ziprecruiter|monster",
  "originalUrl": "string (required, valid URI)",
  "applyUrl": "string (optional, valid URI)",
  "skills": ["string array"],
  "postedDate": "ISO date string"
}
```

### Response
```json
{
  "success": true,
  "message": "Job stored successfully",
  "job": { /* job object */ },
  "action": "created|updated",
  "timestamp": "2025-06-18T..."
}
```

### Deduplication Logic
- Checks for existing jobs by `jobId + platform` combination
- Falls back to `title + company + platform + originalUrl` matching
- Updates existing jobs with incremented `scrapedCount`
- Creates new jobs with `scrapedCount: 1`

---

## 2. GET /api/applications
**Retrieve application history with filtering and pagination**

### Query Parameters
```
?page=1&limit=20&status=applied&platform=linkedin&company=Google&sortBy=appliedAt&sortOrder=desc
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (min: 1) |
| `limit` | integer | 20 | Items per page (min: 1, max: 100) |
| `status` | string | - | Filter by application status |
| `platform` | string | - | Filter by job platform |
| `company` | string | - | Filter by company name (case-insensitive) |
| `sortBy` | string | appliedAt | Field to sort by |
| `sortOrder` | string | desc | Sort direction (asc/desc) |

### Response
```json
{
  "success": true,
  "applications": [
    {
      "_id": "...",
      "jobTitle": "Software Engineer",
      "company": "Google",
      "status": "applied",
      "platform": "linkedin",
      "appliedAt": "2025-06-18T...",
      "jobDetails": { /* populated job data */ }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 87,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  },
  "summary": {
    "statusBreakdown": {
      "applied": 45,
      "interview": 12,
      "rejected": 30
    },
    "totalApplications": 87
  },
  "timestamp": "2025-06-18T..."
}
```

---

## 3. PUT /api/user/profile
**Update user application data and auto-fill settings**

### Request Headers
```
X-User-ID: user_id_string
```
*Alternative: JWT authentication or user ID in request body*

### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "location": "San Francisco, CA",
  "linkedinProfile": "https://linkedin.com/in/johndoe",
  "resumeUrl": "https://example.com/resume.pdf",
  "skills": ["JavaScript", "React", "Node.js"],
  "experienceLevel": "mid",
  "preferredRoles": ["Frontend Developer", "Full Stack Developer"],
  "coverLetterTemplate": "I am excited to apply...",
  "applicationData": {
    "firstName": "John",
    "lastName": "Doe", 
    "phone": "+1-555-0123",
    "email": "john@example.com",
    "customAnswers": {
      "sponsorship": "No",
      "remote": "Yes"
    }
  }
}
```

### Response
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { /* updated user object without password */ },
  "updatedFields": ["name", "email", "phone", "skills"],
  "timestamp": "2025-06-18T..."
}
```

### Side Effects
- Updates `profile.lastUpdated` timestamp
- Enables `applicationSettings.autoFillEnabled`
- Updates `applicationSettings.dataVersion`
- Syncs user data to existing applications

---

## 4. GET /api/stats
**Application success metrics and analytics**

### Query Parameters
```
?days=30&userId=user_id_optional
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | 30 | Analysis period (min: 1, max: 365) |
| `userId` | string | - | Filter by specific user (optional) |

### Response
```json
{
  "success": true,
  "period": {
    "days": 30,
    "from": "2025-05-19T...",
    "to": "2025-06-18T..."
  },
  "overview": {
    "totalApplications": 87,
    "successfulApplications": 12,
    "successRate": 13.79,
    "automationRate": 85.06,
    "responseRate": 24.14,
    "averageProcessingTime": 45,
    "averageMatchScore": 78
  },
  "platformBreakdown": [
    {
      "platform": "linkedin",
      "applications": 45,
      "successRate": "15.56",
      "responseRate": "28.89", 
      "averageMatchScore": 82
    },
    {
      "platform": "indeed",
      "applications": 28,
      "successRate": "10.71",
      "responseRate": "17.86",
      "averageMatchScore": 73
    }
  ],
  "dailyTrend": [
    {
      "date": "2025-06-01",
      "applications": 3,
      "successCount": 1,
      "successRate": "33.33"
    }
  ],
  "timestamp": "2025-06-18T..."
}
```

### Metrics Definitions
- **Success Rate**: % of applications resulting in interview/offer/acceptance
- **Automation Rate**: % of applications submitted automatically
- **Response Rate**: % of applications receiving any response
- **Average Processing Time**: Time in seconds per application
- **Average Match Score**: Compatibility score (0-100)

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "must be a valid email",
      "value": "invalid-email"
    }
  ],
  "timestamp": "2025-06-18T..."
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Please provide user identification",
  "timestamp": "2025-06-18T..."
}
```

### Not Found Error (404)
```json
{
  "success": false,
  "error": "User not found",
  "message": "User profile could not be located",
  "timestamp": "2025-06-18T..."
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Database connection failed",
  "timestamp": "2025-06-18T..."
}
```

---

## Rate Limiting
- **Limit**: 100 requests per 15 minutes per IP address
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Response**: 429 Too Many Requests

## JobScrapper Project Compliance
- ✅ **RESTful Design** - Proper HTTP methods and status codes
- ✅ **Express.js Best Practices** - Middleware, validation, error handling
- ✅ **MongoDB Integration** - Aggregation pipelines, proper indexing
- ✅ **Security** - Rate limiting, input validation, CORS configuration
- ✅ **Educational Purpose** - Comprehensive documentation and examples

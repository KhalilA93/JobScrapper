<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# JobScrapper Chrome Extension Project

This is a Chrome extension project for automated job scraping and application with a MERN stack backend.

## Project Structure
- `extension/` - Chrome extension files (Manifest V3)
- `backend/` - Node.js/Express.js API server
- `frontend/` - React.js dashboard application

## Technology Stack
- **Extension**: Vanilla JavaScript, Chrome Extension APIs
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React.js, Material-UI, React Query
- **Build**: Webpack, Babel

## Key Features
1. **Web Page Detection & Parsing** - Detects job sites and extracts listings
2. **Job Listing Scraping** - Collects job data from multiple platforms
3. **Auto-Fill Forms** - Automatically fills application forms
4. **Button Simulation** - Simulates clicks for form submission
5. **Error Handling & Retry Logic** - Robust error handling
6. **Logging/Tracking** - Comprehensive application tracking

## Supported Platforms
- LinkedIn (Easy Apply)
- Indeed
- Glassdoor
- Google Jobs
- ZipRecruiter
- Monster

## Development Guidelines

### Chrome Extension Development
- Use Manifest V3 specifications
- Implement proper content script isolation
- Handle cross-origin requests appropriately
- Follow Chrome Web Store policies
- Implement proper error handling for DOM interactions

### Backend Development
- Use RESTful API design principles
- Implement proper validation with Joi
- Use MongoDB aggregation for analytics
- Implement rate limiting and security measures
- Follow Express.js best practices

### Frontend Development
- Use Material-UI components consistently
- Implement proper loading states
- Use React Query for data fetching
- Follow React best practices and hooks
- Implement responsive design

### Security Considerations
- Validate all user inputs
- Implement CORS properly
- Use environment variables for sensitive data
- Follow Chrome extension security guidelines
- Implement proper authentication if needed

### Code Style
- Use consistent indentation (2 spaces)
- Use descriptive variable and function names
- Implement proper error handling
- Add comments for complex logic
- Follow JavaScript/React best practices

## API Endpoints
- `/api/jobs` - Job management
- `/api/applications` - Application tracking
- `/api/analytics` - Performance analytics
- `/api/users` - User management

## Important Notes
- This tool is for educational purposes
- Users must comply with platform terms of service
- Implement rate limiting to avoid being blocked
- Always respect website robots.txt files
- Use responsibly and ethically

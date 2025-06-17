# JobScrapper - Automated Job Application Chrome Extension

A comprehensive Chrome extension with MERN stack backend for automated job scraping and application submission across multiple job platforms.

## 🚀 Features

### Core Functionality
- **Web Page Detection & Parsing**: Automatically detects supported job sites and parses job listings
- **Job Listing Scraping**: Extracts job details including title, company, location, description, and requirements
- **Auto-Fill Forms**: Automatically fills application forms using stored user profile data
- **Button Simulation**: Simulates clicks on apply buttons and form submissions
- **Error Handling & Retry Logic**: Robust error handling with retry mechanisms
- **Logging/Tracking**: Comprehensive logging and application tracking

### Supported Platforms
- LinkedIn (Easy Apply)
- Indeed
- Glassdoor
- Google Jobs
- ZipRecruiter
- Monster

### Technology Stack
- **Frontend**: React.js with Material-UI
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Extension**: Chrome Extension (Manifest V3)
- **Build Tools**: Webpack, Babel

## 📁 Project Structure

```
JobScrapper/
├── extension/                 # Chrome Extension files
│   ├── manifest.json         # Extension manifest
│   ├── background.js         # Background service worker
│   ├── content.js           # Content script
│   ├── popup.html           # Extension popup UI
│   ├── popup.js             # Popup JavaScript
│   ├── popup.css            # Popup styles
│   └── icons/               # Extension icons
├── backend/                  # Node.js backend
│   ├── models/              # MongoDB models
│   ├── routes/              # API routes
│   ├── middleware/          # Custom middleware
│   ├── services/            # Business logic
│   └── server.js            # Entry point
├── frontend/                 # React dashboard
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
├── package.json             # Root package.json
├── webpack.config.js        # Webpack configuration
└── README.md               # This file
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- Chrome browser

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/jobscrapper.git
cd jobscrapper
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (root, backend, and frontend)
npm run install:all
```

### 3. Environment Setup

Create `.env` file in the backend directory:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jobscrapper
JWT_SECRET=your_jwt_secret_here
```

### 4. Start Development Servers
```bash
# Start all services (backend, frontend, and extension build)
npm run dev
```

Or start services individually:
```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Build extension for development
npm run build:extension:watch
```

### 5. Load Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `dist` folder in your project directory
5. The extension should now be loaded and active

## 🎯 Usage

### Dashboard Access
- Backend API: `http://localhost:5000`
- Frontend Dashboard: `http://localhost:3000`

### Extension Usage
1. Navigate to a supported job site (LinkedIn, Indeed, etc.)
2. Click the JobScrapper extension icon
3. Configure your settings in the popup:
   - Set up your profile information
   - Configure job filters
   - Set automation preferences
4. Use the "Scan Jobs" button to find available positions
5. Use "Auto Apply" to start automated applications

### Features Overview

#### Extension Popup
- **Dashboard Tab**: View stats, current site status, and quick actions
- **Settings Tab**: Configure automation settings and job filters
- **Profile Tab**: Set up personal information and application materials

#### Web Dashboard
- **Dashboard**: Overview of applications, statistics, and trends
- **Jobs**: Browse and manage scraped job listings
- **Applications**: Track and manage submitted applications
- **Analytics**: Detailed insights and performance metrics
- **Settings**: Advanced configuration options

## 🔧 Configuration

### Automation Settings
- Maximum applications per day
- Delay between applications
- Working hours restrictions
- Auto-scroll functionality

### Job Filters
- Target positions (keywords)
- Exclude keywords
- Preferred locations
- Salary range
- Experience level

### User Profile
- Personal information
- Professional details
- Resume and cover letter templates
- Custom question answers

## 📊 API Endpoints

### Jobs
- `GET /api/jobs` - Get all jobs with filtering
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/:id` - Update job
- `DELETE /api/jobs/:id` - Delete job
- `POST /api/jobs/scrape` - Bulk create from scraping

### Applications
- `GET /api/applications` - Get all applications
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id/status` - Update status
- `POST /api/applications/:id/response` - Add response
- `GET /api/applications/stats/overview` - Get statistics

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/analytics/trends` - Get trend data
- `GET /api/analytics/platforms` - Platform statistics

## 🧪 Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run all tests
npm test
```

## 📦 Building for Production

```bash
# Build all components
npm run build

# Build extension only
npm run build:extension

# Build frontend only
cd frontend && npm run build

# Build backend (if applicable)
cd backend && npm run build
```

## 🚀 Deployment

### Backend Deployment
1. Deploy to your preferred cloud provider (Heroku, AWS, DigitalOcean)
2. Set up MongoDB database
3. Configure environment variables
4. Update API URLs in frontend and extension

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, S3)
3. Update API base URL

### Extension Distribution
1. Build for production: `npm run build:extension`
2. Zip the `dist` folder
3. Upload to Chrome Web Store

## ⚠️ Legal & Ethical Considerations

**Important**: This tool is for educational and personal use only. Please ensure you:

- Comply with the terms of service of job platforms
- Respect rate limits and don't overload servers
- Use responsibly and ethically
- Don't spam employers or submit low-quality applications
- Always review and customize applications before submission

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- LinkedIn may detect automated behavior - use with caution
- Some job sites may have CAPTCHA protection
- Rate limiting may affect scraping speed

## 🔮 Future Enhancements

- AI-powered job matching
- Resume optimization suggestions
- Interview scheduling automation
- Integration with more job platforms
- Mobile app companion
- Advanced analytics and reporting

## 📞 Support

For support, email support@jobscrapper.com or create an issue on GitHub.

## ⭐ Acknowledgments

- Chrome Extension documentation
- React and Material-UI communities
- MongoDB and Express.js documentation
- Open source contributors

---

**Disclaimer**: This software is provided as-is for educational purposes. Users are responsible for ensuring compliance with platform terms of service and applicable laws.

## 🛠️ VS Code Development Setup

This project includes pre-configured VS Code tasks and launch configurations for an optimal development experience.

### Available VS Code Tasks

Access tasks via `Ctrl+Shift+P` → `Tasks: Run Task`:

- **Start Development Environment**: Starts all services (backend, frontend, extension build)
- **Build Extension**: Builds extension for production
- **Build Extension (Watch)**: Builds extension in watch mode for development
- **Start Backend Only**: Starts only the backend server
- **Start Frontend Only**: Starts only the frontend development server
- **Install All Dependencies**: Installs dependencies for all packages
- **Build All**: Builds all components for production
- **Test Backend**: Runs backend tests

### Debug Configurations

Use the debug panel (F5) to start debugging:

- **Debug Backend**: Debug the Node.js backend server
- **Debug Backend Tests**: Debug Jest tests

### Recommended VS Code Extensions

Install these extensions for the best development experience:

```bash
# Chrome extension development
code --install-extension formulahendry.auto-rename-tag
code --install-extension ms-vscode.vscode-json

# React/JavaScript development
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next

# Node.js development
code --install-extension ms-vscode.vscode-node-extension-pack
code --install-extension christian-kohler.path-intellisense

# MongoDB
code --install-extension mongodb.mongodb-vscode

# Git
code --install-extension eamodio.gitlens
```

### Quick Start with VS Code

1. **Clone and open**: `git clone [repository] && code JobScrapper`
2. **Install dependencies**: Press `Ctrl+Shift+P` → `Tasks: Run Task` → `Install All Dependencies`
3. **Start development**: Press `Ctrl+Shift+P` → `Tasks: Run Task` → `Start Development Environment`
4. **Load extension**: Follow the Chrome extension loading steps above
5. **Debug**: Use F5 to start debugging the backend

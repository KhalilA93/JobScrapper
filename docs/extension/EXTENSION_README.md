# JobScrapper Chrome Extension

A clean, minimal Chrome extension for automated job scraping and application using MERN stack principles.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Build Extension
```bash
npm run build          # Production build
npm run dev             # Development build with watch
```

### 3. Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" 
4. Select the `dist/` folder

## 📁 Project Structure

```
extension/
├── src/
│   ├── background/         # Service worker
│   │   └── index.js
│   ├── content/           # Content scripts
│   │   ├── index.js
│   │   └── content.css
│   ├── popup/             # Extension popup
│   │   ├── index.js
│   │   ├── popup.html
│   │   └── popup.css
│   └── utils/             # Shared utilities
│       ├── storage.js     # Chrome storage management
│       ├── jobDetector.js # Job site detection
│       ├── apiClient.js   # Backend API communication
│       ├── scrapers.js    # Platform-specific scrapers
│       ├── formFiller.js  # Form auto-fill utilities
│       └── domUtils.js    # DOM manipulation helpers
├── icons/                 # Extension icons
├── dist/                  # Built extension (generated)
├── manifest.json          # Extension manifest (Manifest V3)
├── webpack.config.js      # Build configuration
├── package.json           # Dependencies and scripts
├── .eslintrc.json         # ESLint configuration
└── .prettierrc           # Prettier configuration
```

## 🎯 Features

### Core Functionality
- **Job Site Detection**: Automatically detects supported platforms
- **Job Scraping**: Extracts job listings with structured data
- **Auto-Fill Forms**: Fills application forms using user profile
- **Smart Automation**: Intelligent job application workflow
- **Error Handling**: Robust retry logic and error recovery

### Supported Platforms
- LinkedIn (Easy Apply)
- Indeed
- Glassdoor
- Google Jobs
- ZipRecruiter
- Monster

### Architecture Highlights
- **Manifest V3**: Latest Chrome extension standard
- **Modular Design**: Clean separation of concerns
- **Modern JavaScript**: ES2022+ with webpack bundling
- **Code Quality**: ESLint + Prettier configuration
- **MERN Integration**: Ready for backend API communication

## 🛠️ Development

### Available Scripts
```bash
npm run build      # Production build
npm run dev        # Development build with watch
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run format     # Format code with Prettier
```

### Code Quality
- **ESLint**: Airbnb base configuration with Chrome extension globals
- **Prettier**: Consistent code formatting
- **Modern Standards**: ES2022+ syntax with proper module imports

### Development Workflow
1. Make changes to source files in `src/`
2. Run `npm run dev` for live rebuilding
3. Reload extension in Chrome (chrome://extensions/)
4. Test functionality on supported job sites

## 🔧 Configuration

### Key Files
- `manifest.json`: Extension permissions and configuration
- `webpack.config.js`: Build process and module bundling
- `.eslintrc.json`: Code quality rules
- `src/utils/storage.js`: User settings and data management

### Customization
- Add new job platforms in `src/utils/scrapers.js`
- Extend form filling logic in `src/utils/formFiller.js`
- Modify UI in `src/popup/` directory
- Update API endpoints in `src/utils/apiClient.js`

## 📋 Technical Specifications

### Permissions
- `activeTab`: Access current tab for job site detection
- `storage`: Local data storage for user settings
- `scripting`: Dynamic content script injection
- `notifications`: User notifications for application status

### Host Permissions
- LinkedIn, Indeed, Glassdoor, Google Jobs, ZipRecruiter, Monster domains

### Security
- Content Security Policy compliant
- Secure API communication patterns
- Safe DOM manipulation practices
- User data protection measures

## 🚀 Next Steps

### Integration with MERN Backend
1. Configure API endpoints in `src/utils/apiClient.js`
2. Update storage management for cloud sync
3. Implement user authentication flow
4. Add real-time dashboard communication

### Production Deployment
1. Replace placeholder icons with high-quality PNG files
2. Configure production API endpoints
3. Add error reporting and analytics
4. Prepare for Chrome Web Store submission

## 📄 License

MIT License - Use responsibly and comply with job platform terms of service.

---

**Note**: This tool is for educational purposes. Users must comply with platform terms of service and use responsibly.

@echo off
REM JobScrapper Extension Build Script for Windows
REM Builds the React popup component and extension

echo 🚀 Building JobScrapper Extension...

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Build with webpack
echo 🔨 Building with webpack...
call npm run build

if errorlevel 1 (
    echo ❌ Build failed!
    pause
    exit /b 1
) else (
    echo ✅ Build completed successfully!
    echo 📁 Extension files are in the 'dist' directory
    echo 🔧 To load in Chrome:
    echo    1. Open chrome://extensions/
    echo    2. Enable Developer mode
    echo    3. Click 'Load unpacked'
    echo    4. Select the 'dist' folder
    pause
)

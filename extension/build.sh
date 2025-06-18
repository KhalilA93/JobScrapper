#!/bin/bash

# JobScrapper Extension Build Script
# Builds the React popup component and extension

echo "🚀 Building JobScrapper Extension..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build with webpack
echo "🔨 Building with webpack..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Extension files are in the 'dist' directory"
    echo "🔧 To load in Chrome:"
    echo "   1. Open chrome://extensions/"
    echo "   2. Enable Developer mode"
    echo "   3. Click 'Load unpacked'"
    echo "   4. Select the 'dist' folder"
else
    echo "❌ Build failed!"
    exit 1
fi

// This script creates basic SVG icons for the Chrome extension
// Run with: node create-icons.js

const fs = require('fs');
const path = require('path');

// Create SVG icon content
const createSVGIcon = (size, color = '#2196F3') => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size/8}" fill="${color}"/>
  <g fill="white" transform="translate(${size/8}, ${size/8})">
    <!-- Job/Work icon -->
    <rect x="${size/6}" y="${size/4}" width="${size/2}" height="${size/3}" rx="2" fill="white" opacity="0.9"/>
    <rect x="${size/4}" y="${size/3}" width="${size/3}" height="2" fill="${color}"/>
    <rect x="${size/4}" y="${size/2.5}" width="${size/4}" height="2" fill="${color}"/>
    <rect x="${size/4}" y="${size/2}" width="${size/3}" height="2" fill="${color}"/>
    <!-- Robot/Automation indicator -->
    <circle cx="${size * 0.75}" cy="${size * 0.25}" r="${size/12}" fill="white"/>
    <rect x="${size * 0.7}" y="${size * 0.3}" width="${size/10}" height="${size/15}" fill="white"/>
  </g>
</svg>`;
};

// Convert SVG to base64 data URL for manifest
const svgToDataUrl = (svg) => {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

// Icon sizes needed for Chrome extension
const sizes = [16, 32, 48, 128];
const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icons
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `icon${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`Created ${filename}`);
});

// Create a master icon.svg
const masterSvg = createSVGIcon(128);
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), masterSvg);
console.log('Created icon.svg');

// Create icon manifest for easy reference
const iconManifest = {
  "16": "icons/icon16.svg",
  "32": "icons/icon32.svg", 
  "48": "icons/icon48.svg",
  "128": "icons/icon128.svg"
};

fs.writeFileSync(
  path.join(iconsDir, 'manifest.json'), 
  JSON.stringify(iconManifest, null, 2)
);
console.log('Created icons/manifest.json');

console.log('All icons created successfully!');
console.log('Note: For production, consider converting SVG to PNG for better browser compatibility.');

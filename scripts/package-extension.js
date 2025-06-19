// Chrome Extension Packaging Script for JobScrapper
// Packages the extension for Chrome Web Store submission
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

class ExtensionPackager {
  constructor() {
    this.projectRoot = process.cwd();
    this.distPath = path.join(this.projectRoot, 'dist', 'extension');
    this.packagesPath = path.join(this.projectRoot, 'packages');
    this.environment = process.env.NODE_ENV || 'development';
  }

  async packageExtension() {
    console.log(`📦 Packaging JobScrapper Extension for ${this.environment}...`);
    
    try {
      // Ensure packages directory exists
      if (!fs.existsSync(this.packagesPath)) {
        fs.mkdirSync(this.packagesPath, { recursive: true });
      }

      // Read package.json for version
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.projectRoot, 'package.json'), 'utf8')
      );
      
      // Read built manifest for extension info
      const manifestPath = path.join(this.distPath, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        throw new Error('Extension not built. Run build command first.');
      }
      
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Generate package filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const packageName = `jobscrapper-extension-${this.environment}-v${manifest.version}-${timestamp}.zip`;
      const packagePath = path.join(this.packagesPath, packageName);

      // Create ZIP archive
      await this.createZipArchive(packagePath);
      
      // Generate Chrome Web Store package (production only)
      if (this.environment === 'production') {
        await this.createWebStorePackage(manifest.version);
      }
      
      // Generate package info
      await this.generatePackageInfo(packageName, manifest);
      
      console.log(`✅ Extension packaged successfully:`);
      console.log(`   📁 Package: ${packageName}`);
      console.log(`   📍 Location: ${packagePath}`);
      console.log(`   🔢 Version: ${manifest.version}`);
      console.log(`   🌍 Environment: ${this.environment}`);
      
      return packagePath;
      
    } catch (error) {
      console.error('❌ Extension packaging failed:', error.message);
      process.exit(1);
    }
  }

  async createZipArchive(packagePath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(packagePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        console.log(`📊 Archive size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);

      // Add extension files
      archive.directory(this.distPath, false, (entry) => {
        // Exclude development files in production
        if (this.environment === 'production') {
          if (entry.name.includes('.map') || 
              entry.name.includes('test') || 
              entry.name.includes('spec')) {
            return false;
          }
        }
        return entry;
      });

      archive.finalize();
    });
  }

  async createWebStorePackage(version) {
    console.log('🏪 Creating Chrome Web Store package...');
    
    const webStorePackageName = `jobscrapper-webstore-v${version}.zip`;
    const webStorePackagePath = path.join(this.packagesPath, webStorePackageName);
    
    // Create optimized package for Web Store
    const output = fs.createWriteStream(webStorePackagePath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    return new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      
      // Add only necessary files for Web Store
      const webStoreFiles = [
        'manifest.json',
        'background/',
        'content/',
        'popup/',
        'icons/',
        '_locales/',
        'styles/'
      ];
      
      webStoreFiles.forEach(file => {
        const filePath = path.join(this.distPath, file);
        if (fs.existsSync(filePath)) {
          if (fs.statSync(filePath).isDirectory()) {
            archive.directory(filePath, file);
          } else {
            archive.file(filePath, { name: file });
          }
        }
      });
      
      archive.finalize();
    });
  }

  async generatePackageInfo(packageName, manifest) {
    const packageInfo = {
      name: 'JobScrapper Chrome Extension',
      version: manifest.version,
      environment: this.environment,
      packageName,
      buildDate: new Date().toISOString(),
      buildHash: this.getBuildHash(),
      manifest: {
        name: manifest.name,
        version: manifest.version,
        manifestVersion: manifest.manifest_version,
        permissions: manifest.permissions,
        hostPermissions: manifest.host_permissions
      },
      files: this.getFileList(),
      size: this.getPackageSize(path.join(this.packagesPath, packageName)),
      checksums: await this.generateChecksums(packageName)
    };

    const infoPath = path.join(this.packagesPath, `${packageName}.info.json`);
    fs.writeFileSync(infoPath, JSON.stringify(packageInfo, null, 2));
    
    console.log(`📋 Package info generated: ${packageName}.info.json`);
  }

  getBuildHash() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  getFileList() {
    const files = [];
    const scan = (dir, prefix = '') => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const relativePath = path.join(prefix, item);
        
        if (fs.statSync(itemPath).isDirectory()) {
          scan(itemPath, relativePath);
        } else {
          files.push({
            path: relativePath,
            size: fs.statSync(itemPath).size
          });
        }
      });
    };
    
    scan(this.distPath);
    return files;
  }

  getPackageSize(packagePath) {
    try {
      const stats = fs.statSync(packagePath);
      return {
        bytes: stats.size,
        mb: (stats.size / 1024 / 1024).toFixed(2)
      };
    } catch {
      return { bytes: 0, mb: '0.00' };
    }
  }

  async generateChecksums(packageName) {
    const crypto = require('crypto');
    const packagePath = path.join(this.packagesPath, packageName);
    
    try {
      const fileBuffer = fs.readFileSync(packagePath);
      return {
        md5: crypto.createHash('md5').update(fileBuffer).digest('hex'),
        sha256: crypto.createHash('sha256').update(fileBuffer).digest('hex')
      };
    } catch {
      return { md5: '', sha256: '' };
    }
  }

  // Validate extension before packaging
  validateExtension() {
    console.log('🔍 Validating extension...');
    
    const requiredFiles = [
      'manifest.json',
      'background/index.js',
      'content/index.js',
      'popup/popup.js',
      'icons/icon16.png',
      'icons/icon48.png',
      'icons/icon128.png'
    ];

    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(this.distPath, file))
    );

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    // Validate manifest
    const manifest = JSON.parse(
      fs.readFileSync(path.join(this.distPath, 'manifest.json'), 'utf8')
    );

    if (manifest.manifest_version !== 3) {
      throw new Error('Extension must use Manifest V3');
    }

    if (!manifest.permissions || !Array.isArray(manifest.permissions)) {
      throw new Error('Extension manifest must declare permissions');
    }

    console.log('✅ Extension validation passed');
  }
}

// Chrome Web Store Upload Helper
class WebStoreUploader {
  constructor(clientId, clientSecret, refreshToken, extensionId) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
    this.extensionId = extensionId;
    this.accessToken = null;
  }

  async authenticate() {
    console.log('🔐 Authenticating with Chrome Web Store...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    this.accessToken = data.access_token;
    
    if (!this.accessToken) {
      throw new Error('Failed to authenticate with Chrome Web Store');
    }
    
    console.log('✅ Authentication successful');
  }

  async uploadExtension(packagePath) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    console.log('⬆️ Uploading extension to Chrome Web Store...');

    const packageData = fs.readFileSync(packagePath);
    
    const response = await fetch(
      `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${this.extensionId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-goog-api-version': '2',
        },
        body: packageData,
      }
    );

    const result = await response.json();
    
    if (result.uploadState === 'SUCCESS') {
      console.log('✅ Extension uploaded successfully');
      return result;
    } else {
      throw new Error(`Upload failed: ${JSON.stringify(result)}`);
    }
  }

  async publishExtension(target = 'default') {
    console.log(`🚀 Publishing extension to ${target}...`);

    const response = await fetch(
      `https://www.googleapis.com/chromewebstore/v1.1/items/${this.extensionId}/publish`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'x-goog-api-version': '2',
        },
        body: JSON.stringify({ target }),
      }
    );

    const result = await response.json();
    
    if (result.status && result.status.includes('OK')) {
      console.log('✅ Extension published successfully');
      return result;
    } else {
      throw new Error(`Publish failed: ${JSON.stringify(result)}`);
    }
  }
}

// Main execution
async function main() {
  const packager = new ExtensionPackager();
  
  // Validate extension first
  packager.validateExtension();
  
  // Package extension
  const packagePath = await packager.packageExtension();
  
  // Upload to Chrome Web Store (production only)
  if (process.env.NODE_ENV === 'production' && process.env.CHROME_WEBSTORE_UPLOAD === 'true') {
    const uploader = new WebStoreUploader(
      process.env.CHROME_CLIENT_ID,
      process.env.CHROME_CLIENT_SECRET,
      process.env.CHROME_REFRESH_TOKEN,
      process.env.CHROME_EXTENSION_ID
    );
    
    try {
      await uploader.uploadExtension(packagePath);
      
      if (process.env.CHROME_AUTO_PUBLISH === 'true') {
        await uploader.publishExtension();
      }
    } catch (error) {
      console.error('❌ Chrome Web Store upload failed:', error.message);
      console.log('📦 Extension package created locally, manual upload required');
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ExtensionPackager, WebStoreUploader };

// Webpack Configuration for JobScrapper Chrome Extension Deployment
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { DefinePlugin } = require('webpack');

// Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// API endpoints based on environment
const getApiEndpoint = () => {
  switch (process.env.NODE_ENV) {
    case 'development':
      return 'http://localhost:3001/api';
    case 'staging':
      return 'https://staging-api.jobscrapper.com/api';
    case 'production':
      return 'https://api.jobscrapper.com/api';
    default:
      return 'http://localhost:3001/api';
  }
};

module.exports = {
  mode: isProduction ? 'production' : 'development',
  
  entry: {
    // Content scripts
    'content/index': './extension/src/content/index.js',
    
    // Background script (Service Worker)
    'background/index': './extension/src/background/index.js',
    
    // Popup
    'popup/popup': './extension/src/popup/popup.js'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist/extension'),
    filename: '[name].js',
    clean: true,
    publicPath: ''
  },
  
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: isProduction, // Remove console.log in production
            drop_debugger: isProduction,
          },
          mangle: {
            reserved: ['chrome'] // Don't mangle Chrome API names
          }
        },
        extractComments: false,
      }),
    ]
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '88' // Minimum Chrome version for Manifest V3
                }
              }]
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-transform-runtime'
            ]
          }
        }
      },
      
      {
        test: /\.jsx$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: '88'
                }
              }],
              '@babel/preset-react'
            ]
          }
        }
      },
      
      {
        test: /\.css$/,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'postcss-loader'
        ]
      },
      
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]'
        }
      }
    ]
  },
  
  plugins: [
    new CleanWebpackPlugin(),
    
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.API_ENDPOINT': JSON.stringify(getApiEndpoint()),
      'process.env.VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
      'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
      '__DEV__': JSON.stringify(isDevelopment)
    }),
    
    ...(isProduction ? [
      new MiniCssExtractPlugin({
        filename: 'styles/[name].css'
      })
    ] : []),
    
    new CopyPlugin({
      patterns: [
        // Copy manifest.json with environment-specific modifications
        {
          from: 'extension/manifest.json',
          to: 'manifest.json',
          transform(content) {
            const manifest = JSON.parse(content.toString());
            
            // Environment-specific manifest modifications
            if (isDevelopment) {
              manifest.name += ' (Development)';
              manifest.version = '0.0.1';
            } else if (process.env.NODE_ENV === 'staging') {
              manifest.name += ' (Staging)';
            }
            
            // Set content security policy based on environment
            if (isDevelopment) {
              manifest.content_security_policy = {
                extension_pages: "script-src 'self' 'unsafe-eval'; object-src 'self'"
              };
            }
            
            return JSON.stringify(manifest, null, 2);
          }
        },
        
        // Copy HTML files
        {
          from: 'extension/src/popup/popup.html',
          to: 'popup/popup.html',
          noErrorOnMissing: true
        },
        
        // Copy icons
        {
          from: 'extension/icons',
          to: 'icons'
        },
        
        // Copy localization files
        {
          from: 'extension/_locales',
          to: '_locales',
          noErrorOnMissing: true
        }
      ]
    })
  ],
  
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'extension/src'),
      '@utils': path.resolve(__dirname, 'extension/src/utils'),
      '@content': path.resolve(__dirname, 'extension/src/content'),
      '@background': path.resolve(__dirname, 'extension/src/background'),
      '@popup': path.resolve(__dirname, 'extension/src/popup')
    }
  },
  
  devtool: isDevelopment ? 'source-map' : false,
  
  stats: {
    colors: true,
    modules: false,
    chunks: false,
    chunkModules: false
  },
  
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  }
};

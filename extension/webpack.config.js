const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    background: './src/background/index.js',
    content: './src/content/index.js',
    popup: './src/popup/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'src/popup/popup.html', to: 'popup.html' },
        { from: 'icons', to: 'icons' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@content': path.resolve(__dirname, 'src/content'),
      '@background': path.resolve(__dirname, 'src/background'),
      '@popup': path.resolve(__dirname, 'src/popup')
    }
  },
  optimization: {
    minimize: true
  }
};

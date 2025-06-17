const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    background: './extension/background.js',
    content: './extension/content.js',
    popup: './extension/popup.js'
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
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'extension/manifest.json', to: 'manifest.json' },
        { from: 'extension/popup.html', to: 'popup.html' },
        { from: 'extension/popup.css', to: 'popup.css' },
        { from: 'extension/content.css', to: 'content.css' },
        { from: 'extension/icons', to: 'icons', noErrorOnMissing: true }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.json']
  },
  devtool: 'source-map'
};

const path = require('path');

module.exports = {
  entry: './js/index.js',
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, '../static/js'),
    clean: true
  },
  mode: 'production',
  module: {
    rules: [
      // 如需 babel-loader、css-loader 可於此擴充
    ]
  },
  resolve: {
    extensions: ['.js']
  }
};

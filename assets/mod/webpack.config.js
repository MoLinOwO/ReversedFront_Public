const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './js/index.js',
  output: {
    filename: 'main.bundle.js',
    path: path.resolve(__dirname, 'js'),
    clean: false,
    publicPath: './mod/js/'
  },
  mode: 'production',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
          },
          mangle: {
            toplevel: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
  module: {
    rules: [
      // 如需 babel-loader、css-loader 可於此擴充
    ]
  },
  resolve: {
    extensions: ['.js']
  }
};

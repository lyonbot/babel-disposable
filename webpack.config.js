import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { EsbuildPlugin } from 'esbuild-loader';
import { VueLoaderPlugin } from 'vue-loader';

const IS_DEV = !process.argv.includes('production')

export default {
  entry: './src/main.ts',
  output: {
    path: path.resolve(process.cwd(), './dist'),
    // filename: 'index_bundle.js',
  },
  mode: IS_DEV ? 'development' : 'production',
  devtool: IS_DEV ? 'eval-cheap-source-map' : false,
  devServer: {
    static: './dist',
    hot: IS_DEV,
  },
  performance: {
    // hints: false,
  },
  target: 'web',
  resolve: {
    fallback: {
      "assert": false,
      "fs": false,
      "module": false,
      "path": 'path-browserify',
    }
  },
  module: {
    rules: [
      {
        test: /\.vue?$/,
        loader: 'vue-loader',
        options: {}
      },
      {
        test: /\.[jt]sx?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'ts',
          target: 'es2020'
        }
      },
      {
        test: /\.css$/i,
        use: [
          // 'style-loader',
          'vue-style-loader',
          // MiniCssExtractPlugin.loader,
          'css-loader',
          { loader: 'esbuild-loader', options: { loader: 'css', minify: true } }
        ]
      }
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin(),
    new webpack.DefinePlugin({
      '__VUE_PROD_DEVTOOLS__': 'true',
      '__VUE_OPTIONS_API__': 'true',
    }),
    new webpack.ProvidePlugin({
      'Buffer': 'buffer',
      process: 'process/browser',
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
    minimizer: [
      new EsbuildPlugin({ target: 'es2020', css: true })
    ]
  },
}
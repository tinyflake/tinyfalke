const path = require('path')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { ProgressPlugin, DefinePlugin, HotModuleReplacementPlugin } = require('webpack')

/**
 * 1. npm i cross-env -g
 * 2. 修改 package.json (自己去看 - -...)
 *    注意: webpack serve 命令是启动 devServer 的
 *         cross-env NODE_ENV=xxx 是设置环境变量的
 * 3. npm run dev
 * 
 * 然后通过 node 的全局变量 process 中的 env 属性, 你能拿到你使用 cross-env 设置的环境变量
 */
const isDev = process.env.NODE_ENV === 'dev'
const isProd = process.env.NODE_ENV === 'prod'

const config = {
  entry: './src/index.js', // 打包的入口文件
  output: { // 打包后的输出配置
    /**
     * 打包后要输出到哪个文件夹?
     * 这里最好给绝对路径, 使用 node 的 path 模块来获取决定路径
     * __dirname 是 node 的一个全局变量, 指向当前所在文件的路径
     */
    path: path.resolve(__dirname, 'dist'),
    filename: isDev ? 'app.js' : 'app.[contenthash:10].js', // 打包后的文件命名 (js文件)
    chunkFilename: isDev ? '[name].chunk.js' : '[name].[contenthash:10].chunk.js',
    publicPath: isDev ? '/' : './'
  },
  module: {
    /**
     * 配置 loader 的地方
     * webpack 默认只能解析 js 与 json 文件, 如果要打包 样式, 图片, 字体之类的文件, 需要配置对应的 loader 来处理
     * webpack 的 loader 解析机制是从 "右" 到 "左" 解析的
     */
    rules: [{
      /**
       * oneOf: 告诉 webpack, 每个文件只匹配一次, 匹配到了就不需要继续匹配
       * 对应的可配置项与 rules 相同
      */
      oneOf: [
        {
          /** 如果你是 vue 的话 */
          test: /\.vue$/,
          loader: 'vue-loader'
        },
        {
          // 重点来了, 配置 js | jsx | ts | tsx 的解析
          // ps: 如果你不用 react 不用 ts, 那你配这玩意干嘛 - -.... 直接用默认的就好了
          test: /\.(j|t)sx?$/,
          loader: 'babel-loader', // 单个 loader 的配置就不需要使用 use 了
          options: {
            presets: [ // babel 的预设包
              [ // 如果要给预设包配置一些东西, 要使用数组的形式
                '@babel/preset-env',
                { // 这里配置一些预设包的东西
                  useBuiltIns: 'usage', // 告诉预设包我们需要自定义
                  corejs: 3 // 配置 corejs 的版本
                }
              ],
              '@babel/preset-react', // react 的预设包, 如果你不用 react 就不需要配置
              '@babel/preset-typescript' // ts 的预设包, 如果你不用 ts 就不需要配置
            ]
          },
          plugins: [
            // 这个是 react 热更新的插件, 配合 webpack-hot-middleware 使用的
            // 当然, 如果你使用 devServer, 那请跳过, 因为 webpack-dev-server 这个包已经帮你处理了
            // ps: 生产环境不要配这个, 开发环境配置就好
            // 还有一点, 装这个包的时候装的是 react-refresh   不是 react-refresh/babel, 装错了报错别找我 emmm.....
            isDev && 'react-refresh/babel',
          ].filter(Boolean)
        },
        {
          /**
           * test: 这里配置正则表达式, 也可以给一个函数
           * 意思是匹配文件, webpack 在遇到无法解析的文件时, 会来这边查找有没有对应的 loader 进行解析
           * 而匹配的条件就是 test 的配置
           */
          test: /\.css$/,
          use: [
            /** 配置loader, 如果需要配置多个 loader 来解析, 则需要使用 use */
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              // 如果要给 loader 传递一些参数, 需要以这种对象写法
              loader: 'css-loader',
              options: {
                // 要传递给 css-loader 的配置
                importLoaders: 1 // 告诉 css-loader, 在他之前经过了几个 loader 的解析, loader 的解析机制是从左到右 (或者说从下到上)  这点很重要!!!
              }
            },
            'postcss-loader'
          ]
        },
        {
          test: /\.s(c|a)ss$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 2
              }
            },
            'postcss-loader',
            {
              loader: 'sass-loader',
              options: {
                sassOptions: { // 传给 sass 的配置
                  javaScriptEnabled: true
                }
              }
            }
          ]
        },
        {
          /** test 可以是一个函数, 返回布尔值, 如果是 true 则代表匹配 */
          test: (value) => value.split('.').pop() === 'less',
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 2
              }
            },
            'postcss-loader',
            {
              loader: 'less-loader',
              options: {
                lessOptions: { // 传给 less 的配置
                  javaScriptEnabled: true
                }
              }
            }
          ]
        },
        {
          /** 打包图片文件 */
          test: /\.(png|jpe?g|gif|svg|webp)$/,
          // webpack5 版本开始, 内置了一些选项, webpack5 以前的版本, 请使用 url-loader
          type: 'asset', // 具体可配置项和规则看官方文档 (我不记得了😒)
          generator: {
            /** 这里可以是一个路径, 会与 output 配置项的 path 拼接到一起, 最终输出到这个路径下 */
            /** [name]: 类型一个变量, 代表原文件名 */
            /** [hash:8]: 类型一个变量, 代表打包后到 hash 截取 8 位就好 */
            /** 
             * [ext]: 类型一个变量, 代表原文件的后缀
             * webpack5 开始, 会自动拼接上 . 
             * 如果是 webpack5 之前的版本, 要自己加上 . 
             * 也就是 images/[name].[hash:8].[ext]
            */
            filename: 'images/[name].[hash:8][ext]'
          },
          parser: {
            dataUrlCondition: {
              /**
               * 告诉 webpack 如果将要打包的图片大小小于 8 * 1024
               * 则生成 base64,  不进行打包
               */
              maxSize: 8 * 1024
            }
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash:8][ext]'
          }
        }
      ]
    }]
  },
  plugins: [
    /**
     * 配置 webpack 插件的地方
     * 有时候 loader 无法满足一些需求, 这时候就需要功能更强大的插件来处理
     */
    new CleanWebpackPlugin({
      // 每次打包前都清除上一次打包的东西
      cleanOnceBeforeBuildPatterns: [config.path]
    }),
    // 显示打包进度
    new ProgressPlugin(),
    // 定义全局的变量, webpack 在打包时, 会将对应的变量直接替换为这里配置的值
    /**
     * 例子: 在这里配置了一个 NODE_ENV: 'abcd'
     */
    new DefinePlugin({
      NODE_ENV: process.env.NODE_ENV
    }),
    new HtmlWebpackPlugin({
      // 这里可以传配置, 也可以不传
      template: path.resolve(__dirname, 'index.html'), // 指定模版, 这里要绝对路径
      title: '这是html的标题',
      favicon: '', // 网页图标的路径
      minify: {
        // 这是打包环境的一些压缩配置之类的, 比如删除注释....
      }
    }),
    /** react 热更新的插件, 配置 devServer 的话, 忽略 */
    new ReactRefreshPlugin({overlay: { sockIntegration: 'whm' }}),
    new HotModuleReplacementPlugin(),

    /** 生产环境, 提取样式文件作为单独的文件 */
    isProd && new MiniCssExtractPlugin({
      filename: '[name].[contenthash:10].css',
      chunkFilename: '[name].[contenthash:10].chunk.css'
    })
  ].filter(Boolean),
  // webpack 的运行环境, 能配置的就 3 个, 开发模式(development), 生产模式(production) 以及 无(none)
  mode: 'development',
  /**
   * 配置 sourceMap, sourceMap 就是一个帮助你定位到源码的东西
   * 我们打包后的代码会被 webpack 添加一些其他的东西, 或者被插件压缩
   * 但是我们在运行的时候也需要排查错误, 这时候压缩过的代码不方便我排查
   * 我们需要 sourceMap 来帮助我们定位到源码
   * sourceMap 可配置项自行参考官网 (我也记不住😒)
   */
  devtool: isDev ? 'cheap-module-source-map' : 'hidden-source-map',
  resolve: {
    /** 这里配置一些东西....(不知道咋说) */

    /**
     * 配置可以忽略的后缀名, 默认是 .js .json
     * 例子(引入 ts 文件):
     *   不配置的话: import xx from 'xx.ts'
     *   配置后: import xx from 'xx'
     *
     * 注意: 最好不要配置样式文件的后缀, 不好区分
     */
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    alias: { // 配置路径别名
      '@': path.resolve(__dirname, 'src') // 这里要求绝对路径
    },
    fallback: {
      // 这个我还不太了解, 当是有时候不配置会导致一些报错 (看这些包的名称, 可能跟客户端有关的)
      crypto: require.resolve('crypto-browserify'),
      url: require.resolve('url'),
      buffer: require.resolve('buffer'),
      stream: require.resolve('stream-browserify'),
      fs: false,
      path: require.resolve('path-browserify')
    }
  },
  optimization: {
    // 生产环境的优化配置
    minimize: isProd, // 是否启用, 一般是根据运行环境来区分的
    minimizer: [], // 使用的优化插件
    splitChunks: { // 文件拆分的规则配置
      chunks: 'all',
      maxSize: 1000000,
      minSize: 500000
    }
  },
  /** 可能用到, 但也可能不用, 根据情况决定 */
  /** 需要安装 webpack-dev-server */
}

if (isDev) {
  config.devServer = {
    port: 8080,
    host: 'localhost',
    proxy: {
      // 代理配置
    }
  }
}

module.exports = config

/** es6 模块化语法 */
// export default
// export

/** node 模块化语法 */
// module.exports
// exports
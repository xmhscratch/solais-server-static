const ASSET_PATH_NAME = 'asset'
const BUILD_PATH_NAME = 'public'
const DEFAULT_WEBPACK_HOSTNAME = '0.0.0.0'
const DEFAULT_WEBPACK_PORT = 6969

const makeWebpackConfig = require('./make-webpack-config')

class Server extends System.Module {

    static get $ID() {
        return 'server-static'
    }

    static get ASSET_PATH_NAME() {
        return ASSET_PATH_NAME
    }

    static get BUILD_PATH_NAME() {
        return BUILD_PATH_NAME
    }

    static get DEFAULT_WEBPACK_HOSTNAME() {
        return DEFAULT_WEBPACK_HOSTNAME
    }

    static get DEFAULT_WEBPACK_PORT() {
        return DEFAULT_WEBPACK_PORT
    }

    static get Webpack() {
        return require('webpack')
    }

    static get WebpackDevServer() {
        return require('webpack-dev-server')
    }

    static get WebpackHotMiddleware() {
        return require('webpack-hot-middleware')
    }

    static get WebpackDevMiddleware() {
        return require('webpack-dev-middleware')
    }

    get compiler() {
        return this._compiler
    }

    get assetPath() {
        return this._assetPath
    }

    get buildPath() {
        return this._buildPath
    }

    constructor() {
        super()
    }

    initialize(done) {
        this._assetPath = this.getAssetPath()
        this._buildPath = this.getBuildPath()

        return this.setup(done)
    }

    setup(done) {
        const defaultConfig = {
            baseUrl: `http://${DEFAULT_WEBPACK_HOSTNAME}:${DEFAULT_WEBPACK_PORT}/`,
            hostname: DEFAULT_WEBPACK_HOSTNAME,
            port: DEFAULT_WEBPACK_PORT,
            debug: true,
            minimize: false,
            browser: {
                entry: {
                    hotMiddleware: [
                        'webpack-hot-middleware/client?reload=true',
                        'webpack/hot/only-dev-server',
                    ]
                },
                devtool: 'eval',
                module: {
                    rules: [{
                        enforce: 'pre',
                        test: /\.(js|jsx)$/,
                        exclude: /(node_modules)/,
                        loader: 'jshint-loader'
                    }, {
                        test: /\.(js|jsx)$/,
                        exclude: /(node_modules)/,
                        loader: 'babel-loader',
                        options: {
                            presets: ['es2015', 'stage-1'],
                            compact: false,
                            plugins: [
                                'transform-es2015-arrow-functions',
                                'transform-decorators-legacy',
                                'check-es2015-constants',
                                'transform-es2015-block-scoping'
                            ]
                        },
                    }]
                },
                resolve: {
                    extensions: ['.js', '.jsx']
                },
                plugins: []
            }
        }
        const globalConfig = config('webpack', {})
        globalConfig.browser = config('webpack.browser', {})
        _.defaultsDeep(globalConfig, defaultConfig)

        this.config = globalConfig
        this.config.browser = makeWebpackConfig(globalConfig)

        this._compiler = Server.Webpack(globalConfig.browser)

        if (config('system.development', true)) {
            // Step 1: Attach the dev middleware to the compiler & the server
            this.attachDevMiddleware()

            // Step 2: Attach the hot middleware to the compiler & the server
            this.attachHotMiddleware()

            // Step 3: Create the development server
            this.createDevServer()
        } else {
            const express = System.Server.App.Express

            this.compiler.run((error, stats) => {
                if (error) throw new Error(error)

                var jsonStats = stats.toJson()

                if (jsonStats.errors.length > 0) {
                    return console.error(jsonStats.errors)
                }

                if (jsonStats.warnings.length > 0) {
                    console.warn(jsonStats.warnings)
                }
            })

            $appl.use(express.static(this.buildPath))
        }

        this.printSuccess()
        return done()
    }

    printSuccess() {
        const { hostname, port } = this.config

        return console.log(
            `webpack server listening on ${hostname}:${port}`
        )
    }

    attachDevMiddleware() {
        return $appl.use(
            Server.WebpackDevMiddleware(this.compiler, {
                noInfo: false,
                publicPath: this.config.browser.output.publicPath,
                stats: {
                    colors: true,
                    hash: false,
                    timings: true,
                    chunks: false,
                    chunkModules: false,
                    modules: false
                }
            })
        )
    }

    attachHotMiddleware() {
        return $appl.use(
            Server.WebpackHotMiddleware(this.compiler, {
                log: console.log,
                path: '/__webpack_hmr',
                heartbeat: 10 * 1000
            })
        )
    }

    createDevServer() {
        return new Server.WebpackDevServer(
            this.compiler,
            this.config.browser.devServer
        ).listen(
            this.config.port,
            this.config.hostname
        )
    }

    getAssetPath() {
        return fs(
            this.basePath,
            ASSET_PATH_NAME
        ).root
    }

    getBuildPath() {
        return fs(
            this.basePath,
            BUILD_PATH_NAME
        ).root
    }
}

module.exports = Server

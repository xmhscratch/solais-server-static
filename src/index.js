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
        return require("webpack-dev-server")
    }

    static get WebpackHotMiddleware() {
        return require("webpack-hot-middleware")
    }

    static get WebpackDevMiddleware() {
        return require("webpack-dev-middleware")
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
        const globalConfig = config('webpack', {
            hostname: DEFAULT_WEBPACK_HOSTNAME,
            port: DEFAULT_WEBPACK_PORT
        })

        globalConfig.options = config('webpack.options', {
            entry: {
                hotMiddware: 'webpack-hot-middleware/client?reload=true'
            },
            devtool: "eval",
            module: { rules: [] },
            resolve: {},
            plugins: []
        })

        this.global = globalConfig
        this.config = makeWebpackConfig(globalConfig)

        this._compiler = Server.Webpack(globalConfig.options)

        if (config('system.development', true)) {
            // Step 1: Attach the dev middleware to the compiler & the server
            this.attachDevMiddleware()

            // Step 2: Attach the hot middleware to the compiler & the server
            this.attachHotMiddleware()

            // Step 3: Create the development server
            this.createDevServer()

            return this.printSuccess()
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

                return this.printSuccess()
            })

            $appl.use(express.static(this.buildPath))
        }

        return done()
    }

    printSuccess() {
        const { hostname, port } = this.global

        return console.log(
            `webpack server listening on ${hostname}:${port}`
        )
    }

    attachDevMiddleware() {
        return $appl.use(
            Server.WebpackDevMiddleware(this.compiler, {
                noInfo: false,
                publicPath: this.config.output.publicPath,
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
        return new Server.WebpackDevServer(this.compiler, {
            host: this.global.hostname,
            port: this.global.port,
            contentBase: this.assetPath,
            hot: false,
            historyApiFallback: false,
            inline: true,
            quiet: false,
            noInfo: false,
            lazy: true,
            filename: "main.js",
            watchOptions: {
                aggregateTimeout: 300,
                poll: 1000
            },
            publicPath: this.config.output.publicPath,
            stats: {
                colors: true
            }
        }).listen(
            this.global.port,
            this.global.hostname
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

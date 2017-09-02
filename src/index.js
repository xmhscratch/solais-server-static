class Server extends system.server {

    static get ASSET_PATH_NAME() {
        return 'asset'
    }

    static get BUILD_PATH_NAME() {
        return 'public'
    }

    static get DEFAULT_WEBPACK_HOSTNAME() {
        return '0.0.0.0'
    }

    static get DEFAULT_WEBPACK_PORT() {
        return 6969
    }

    static get webpack() {
        return require('webpack')
    }

    static get webpack_dev_server() {
        return require("webpack-dev-server")
    }

    static get webpack_hot_middleware() {
        return require("webpack-hot-middleware")
    }

    static get webpack_dev_middleware() {
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

        this._assetPath = this.getAssetPath()
        this._buildPath = this.getBuildPath()

        return this
    }

    setup() {
        super.setup.apply(this, arguments)

        var config = _.defaults(appl.config.get('webpack'), {
            hostname: server.DEFAULT_WEBPACK_HOSTNAME,
            port: server.DEFAULT_WEBPACK_PORT
        })

        var makeWebpackConfig = require('./make-webpack-config')
        appl.config.set('webpack.options', makeWebpackConfig(config))
        this._compiler = server.webpack(appl.config.get('webpack.options'))

        if (_.isEqual(appl.config.get('system.development'), true)) {
            // Step 1: Attach the dev middleware to the compiler & the server
            this.attachDevMiddleware()

            // Step 2: Attach the hot middleware to the compiler & the server
            this.attachHotMiddleware()

            // Step 3: Create the development server
            this.createDevServer()

            return this.printSuccess()
        } else {
            var express = system.server.app.express
            this.app.engine.use(express.static(this.buildPath))

            return this.compiler.run((error, stats) => {
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
        }
    }

    printSuccess() {
        return console.log([
            "webpack server listening on ",
            appl.config.get('webpack.hostname') + ":" + appl.config.get('webpack.port'),
        ].join(""))
    }

    attachDevMiddleware() {
        var webpackDevMiddleware = server.webpack_dev_middleware(this.compiler, {
            noInfo: false,
            publicPath: appl.config.get('webpack.output.publicPath'),
            stats: {
                colors: true,
                hash: false,
                timings: true,
                chunks: false,
                chunkModules: false,
                modules: false
            }
        })
        return this.app.engine.use(webpackDevMiddleware)
    }

    attachHotMiddleware() {
        var webpackHotMiddleware = server.webpack_hot_middleware(this.compiler, {
            log: console.log,
            path: '/__webpack_hmr',
            heartbeat: 10 * 1000
        })
        return this.app.engine.use(webpackHotMiddleware)
    }

    createDevServer() {
        return new server.webpack_dev_server(this.compiler, {
            host: appl.config.get('webpack.hostname'),
            port: appl.config.get('webpack.port'),
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
            publicPath: appl.config.get('webpack.output.publicPath'),
            stats: {
                colors: true
            }
        }).listen(
            appl.config.get('webpack.port'),
            appl.config.get('webpack.hostname')
        )
    }

    getAssetPath() {
        return __(
            this.basePath,
            server.ASSET_PATH_NAME
        ).root
    }

    getBuildPath() {
        return __(
            this.basePath,
            server.BUILD_PATH_NAME
        ).root
    }
}

module.exports = Server

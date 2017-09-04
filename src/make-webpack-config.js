const webpack = require('webpack')
const ExtractTextPlugin = require("extract-text-webpack-plugin")
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const loadersByExtension = require("./loaders-by-extension")

module.exports = function(globalConfig) {
    const { options } = globalConfig

    var entry = {}
    var rules = {
        "json": "json-loader",
        "json5": "json5-loader",
        "txt": "raw-loader",
        "png|jpg|jpeg|gif|svg": "url-loader?limit=10000",
        "woff|woff2": "url-loader?limit=100000",
        "ttf|eot": "file-loader",
        "wav|mp3": "file-loader",
        "html": "html-loader"
    }
    var cssLoader = globalConfig.minimize ?
        "css-loader?module&localIdentName=[local]" :
        "css-loader?module&localIdentName=[local]"
    var stylesheetLoaders = {
        "css": cssLoader,
        "scss|sass": [cssLoader, "sass-loader"]
    }

    var additionalLoaders = []
    var alias = {
        system: fs('./asset/index.js').root,
    }
    var aliasLoader = {}
    var externals = []

    var modulesDirectories = ["node_modules"]
    var extensions = [".js"]
    var output = {
        path: fs('./public').root,
        publicPath: globalConfig.baseUrl ? globalConfig.baseUrl : "/",
        filename: "[name].js" + (globalConfig.longTermCaching ? "?[chunkhash]" : ""),
        chunkFilename: (options.devServer ? "[id].js" : "[name].js") + (globalConfig.longTermCaching ? "?[chunkhash]" : ""),
        sourceMapFilename: "debugging/[file].map",
        libraryTarget: 'var',
        pathinfo: globalConfig.debug
    }

    var excludeFromStats = []
    var plugins = []

    plugins.push(
        new BundleAnalyzerPlugin({
            // Can be `server`, `static` or `disabled`.
            // In `server` mode analyzer will start HTTP server to show bundle report.
            // In `static` mode single HTML file with bundle report will be generated.
            // In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
            analyzerMode: 'disabled',
            // // Host that will be used in `server` mode to start HTTP server.
            // analyzerHost: '127.0.0.1',
            // // Port that will be used in `server` mode to start HTTP server.
            // analyzerPort: 8888,
            // Path to bundle report file that will be generated in `static` mode.
            // Relative to bundles output directory.
            // reportFilename: 'report.html',
            // Module sizes to show in report by default.
            // Should be one of `stat`, `parsed` or `gzip`.
            // See "Definitions" section for more information.
            // defaultSizes: 'parsed',
            // Automatically open report in default browser
            // openAnalyzer: true,
            // If `true`, Webpack Stats JSON file will be generated in bundles output directory
            generateStatsFile: false,
            // Name of Webpack Stats JSON file that will be generated if `generateStatsFile` is `true`.
            // Relative to bundles output directory.
            // statsFilename: 'stats.json',
            // Options for `stats.toJson()` method.
            // For example you can exclude sources of your modules from stats file with `source: false` option.
            // See more options here: https://github.com/webpack/webpack/blob/webpack-1/lib/Stats.js#L21
            statsOptions: null,
            // Log level. Can be 'info', 'warn', 'error' or 'silent'.
            logLevel: 'info'
        })
    )

    if (globalConfig.debug) {
        plugins.push(new webpack.LoaderOptionsPlugin({
            minimize: globalConfig.minimize,
            debug: globalConfig.debug
        }))
    }

    if (globalConfig.commonsChunk) {
        plugins.push(new webpack.optimize.CommonsChunkPlugin("commons", "commons.js" + (globalConfig.longTermCaching ? "?[chunkhash]" : "")))
    }

    Object.keys(stylesheetLoaders).forEach(function(ext) {
        var stylesheetLoader = stylesheetLoaders[ext]
        if (Array.isArray(stylesheetLoader)) stylesheetLoader = stylesheetLoader.join("!")
        if (globalConfig.separateStylesheet) {
            stylesheetLoaders[ext] = ExtractTextPlugin.extract("style-loader", stylesheetLoader)
        } else {
            stylesheetLoaders[ext] = "style-loader!" + stylesheetLoader
        }
    })
    if (globalConfig.separateStylesheet) {
        plugins.push(new ExtractTextPlugin("[name].css" + (globalConfig.longTermCaching ? "?[contenthash]" : "")))
    }

    if (globalConfig.minimize) {
        plugins.push(
            new webpack.optimize.UglifyJsPlugin({
                sourceMap: options.devtool && (options.devtool.indexOf("sourcemap") >= 0 || options.devtool.indexOf("source-map") >= 0),
                compressor: {
                    warnings: false
                },
                beautify: false,
                mangle: {
                    screw_ie8: true,
                    keep_fnames: true
                },
                compress: {
                    screw_ie8: true
                },
                comments: false
            }),
            new webpack.DefinePlugin({
                "process.env": {
                    NODE_ENV: JSON.stringify("production")
                }
            }),
            new webpack.NoEmitOnErrorsPlugin()
        )
    }

    return _.defaultsDeep({
        context: fs('./asset').root,
        entry: _.extend(entry, (options.entry || {})),
        output: output,
        target: "web",
        module: {
            rules: []
                .concat(loadersByExtension(rules))
                .concat(loadersByExtension(stylesheetLoaders))
                .concat(additionalLoaders)
                .concat(options.module.rules || [])
        },
        devtool: options.devtool || "eval",
        resolveLoader: options.resolveLoader || {},
        externals: externals.concat(options.externals || []),
        resolve: {
            modules: _.concat([fs('./asset').root], modulesDirectories),
            extensions: extensions.concat(options.resolve.extensions || []),
            alias: _.extend(alias, options.resolve.alias || {})
        },
        plugins: plugins.concat(options.plugins || []),
        devServer: _.extend({
            stats: {
                cached: false,
                exclude: excludeFromStats
            }
        }, (options.devServer || {}))
    }, options)
}

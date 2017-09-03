const webpack = require('webpack')
const ExtractTextPlugin = require("extract-text-webpack-plugin")
const StatsPlugin = require("stats-webpack-plugin")

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
        system: __('./asset/index.js').root,
    }
    var aliasLoader = {}
    var externals = []

    var modulesDirectories = ["node_modules"]
    var extensions = [".js"]
    var output = {
        path: __('./public').root,
        publicPath: globalConfig.baseUrl ? globalConfig.baseUrl : "/",
        filename: "[name].js" + (globalConfig.longTermCaching ? "?[chunkhash]" : ""),
        chunkFilename: (options.devServer ? "[id].js" : "[name].js") + (globalConfig.longTermCaching ? "?[chunkhash]" : ""),
        sourceMapFilename: "debugging/[file].map",
        libraryTarget: 'var',
        pathinfo: globalConfig.debug
    }

    var excludeFromStats = []
    var plugins = []

    // plugins.push(new StatsPlugin(__('./public/stats.json').root, {
    //     chunkModules: true,
    //     exclude: excludeFromStats
    // }))

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
        context: __('./asset').root,
        entry: _.extend(entry, (options.entry || [])),
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
            modules: _.concat([__('./asset').root], modulesDirectories),
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
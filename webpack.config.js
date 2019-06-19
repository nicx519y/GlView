const path = require('path')
const join = path.join
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin')

let entry = [
    `webpack-dev-server/client?http://localhost:9090`,
    'webpack/hot/only-dev-server',
    `./example/index.ts`
]

module.exports = {
    mode: 'development',
    entry: {
        index: entry
    },
    module: {
        rules: [{
            test: /\.ts$/,
            use: "ts-loader"
        }]
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    plugins: [
        new HtmlWebpackPlugin({
            inject: true,
            title: 'abc',
            filename: 'index.html',
            template: join(__dirname, './example/index.html'),
            hash: true,
            chunks: ['common', 'index']
        })
    ],
    devServer: {
        hot: true,
        contentBase:  path.resolve(__dirname),
        watchContentBase: true,
        port: 9090,
        publicPath: '/'
    },
};

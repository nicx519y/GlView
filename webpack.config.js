const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'development',

    entry: './src/index.ts',
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist')
    },

    module: {
        rules: [{
            test: /\.ts$/,
            use: "ts-loader"
        }]
    },
    resolve: {
        extensions: [
            '.ts', '.js', '.html',
        ]
    },

	devServer: {
		port: '9090',
		inline: true,
        hot: true,
        contentBase: './',
    },
};
const presets = [['@babel/flow', { targets: { node: 6 } }]]

const plugins = [
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-modules-commonjs'
]

module.exports = {
    presets,
    plugins,
    ignore: ['**/*.test.js']
}

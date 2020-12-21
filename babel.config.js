const presets = ['@babel/preset-flow']

const plugins = [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-modules-commonjs',
]

module.exports = {
    presets,
    plugins,
    // ignore: ['**/*.test.js', '**/fixtures']
}

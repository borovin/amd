const babel = require('babel-core')
const fs = require('fs-extra')
const globule = require('globule')
const cwd = process.cwd()
const detective = require('detective-amd')
const path = require('path')
const _ = require('lodash')
const config = _.merge({
  srcDir: 'src',
  srcFiles: '**/*.js',
  outDir: 'build',
  staticDir: '.',
  babel: {},
  baseUrl: '/'
}, fs.existsSync('multipack.config.js') ? require(`${cwd}/multipack.config.js`) : {})

const outDir = path.resolve(config.outDir)
const srcDir = path.resolve(config.srcDir)
const staticDir = path.resolve(config.staticDir)
const srcFiles = globule.find(config.srcFiles, {srcBase: srcDir, prefixBase: true})
const loaderFilePath = path.resolve(__dirname, 'loader.min.js')
const multipackFilePath = path.resolve(config.outDir, 'multipack.js')
const depTree = {}
const amdRegEx = /(?:^\s*|[}{\(\);,\n\?\&]\s*)define\s*\(\s*("[^"]+"\s*,\s*|'[^']+'\s*,\s*)?\s*(\[(\s*(("[^"]+"|'[^']+')\s*,|\/\/.*\n|\/\*(.|\s)*?\*\/))*(\s*("[^"]+"|'[^']+')\s*,?\s*)?(\s*(\/\/.*\n|\/\*(.|\s)*?\*\/)\s*)*\]|function\s*|{|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*\))/

function builder () {
  srcFiles && srcFiles.forEach(trace)

  fs.outputFileSync(multipackFilePath, `//this file was generated automatically, do not edit it manually\n`)

  console.log(`-> ${multipackFilePath}`)

  fs.appendFileSync(multipackFilePath, fs.readFileSync(loaderFilePath, 'utf8'))
  fs.appendFileSync(multipackFilePath, `multipack.config({"baseUrl": "${config.baseUrl}", "tree": ${JSON.stringify(depTree)}});`)
}

function transformFileSync (srcFilePath, outFilePath) {
  const srcFileContent = fs.readFileSync(srcFilePath, 'utf8')
  const babelConfig = _.merge({plugins: []}, config.babel)

  if (!amdRegEx.test(srcFileContent)) {
    babelConfig.plugins.push('transform-es2015-modules-amd')
  }

  const result = babel.transform(srcFileContent, babelConfig)

  fs.outputFileSync(outFilePath, result.code)

  console.log(`${srcFilePath} -> ${outFilePath}`)
}

function trace (absFilePath) {
  const relativeSrcFilePath = path.relative(srcDir, absFilePath)
  const absOutFilePath = absFilePath.indexOf(srcDir) === 0 ? absFilePath.replace(srcDir, outDir) : absFilePath.replace(cwd, outDir)
  const staticDirFilePath = path.relative(staticDir, absOutFilePath)

  console.log(`tracing ${relativeSrcFilePath}...`)

  if (depTree[staticDirFilePath]) {
    return
  }

  transformFileSync(absFilePath, absOutFilePath)

  const fileContent = fs.readFileSync(absOutFilePath, 'utf8')
  const fileDeps = detective(fileContent)

  depTree[staticDirFilePath] = {}

  fileDeps.forEach(depId => {
    if (depId === 'module' || depId === 'exports') {
      return
    }

    let depPath = depId

    if (depPath.indexOf('.') === 0) {
      depPath = path.resolve(path.dirname(absFilePath), depPath)
    }

    const absDepPath = require.resolve(depPath)
    const absDepOutPath = absDepPath.indexOf(srcDir) === 0 ? absDepPath.replace(srcDir, outDir) : absDepPath.replace(cwd, outDir)

    depTree[staticDirFilePath][depId] = path.relative(staticDir, absDepOutPath)

    trace(absDepPath)
  })
}

module.exports = builder

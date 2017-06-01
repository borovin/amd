const babel = require('babel-core')
const fs = require('fs-extra')
const globby = require('globby')
const cwd = process.cwd()
const detective = require('detective-amd')
const path = require('path')
const _ = require('lodash')

const defaultConfig = _.merge({
  srcDir: 'src',
  srcFiles: '**/*.js',
  outDir: 'build',
  babel: {
    extends: path.resolve(cwd, '.babelrc')
  },
  baseUrl: '/build',
  main: 'index.js'
}, fs.existsSync('multipack.config.js') ? require(`${cwd}/multipack.config.js`) : {})

const loaderFilePath = path.resolve(__dirname, 'loader.min.js')

class Multipack {
  constructor (config) {
    this.config = _.merge({}, defaultConfig, config)
    this._depTree = {}
  }

  get outDir () {
    return path.resolve(this.config.outDir)
  }

  get srcDir () {
    return path.resolve(this.config.srcDir)
  }

  get srcFiles () {
    return globby.sync(this.config.srcFiles, {cwd: this.srcDir, absolute: true})
  }

  get multipackFilePath () {
    return path.resolve(this.config.outDir, 'multipack.js')
  }

  build () {
    this.srcFiles.forEach(absFilePath => this.buildFile(absFilePath))
    this._writeMultipackFile()
  }

  buildFile (absFilePath) {
    const absOutFilePath = this._getAbsOutFilePath(absFilePath)
    const outFilePath = absOutFilePath.replace(this.outDir, '')

    if (this._shouldFileTransform(absFilePath)) {
      this._transformFile(absFilePath)
    }

    const fileContent = fs.readFileSync(absOutFilePath, 'utf8')
    const fileDeps = detective(fileContent)
    const depTree = {}

    fileDeps.forEach(depId => {
      if (depId === 'module' || depId === 'exports') {
        return
      }

      let depPath = depId

      if (depPath.indexOf('.') === 0) {
        depPath = path.resolve(path.dirname(absFilePath), depPath)
      }

      const absDepPath = require.resolve(depPath)
      const absDepOutPath = this._getAbsOutFilePath(absDepPath)

      depTree[depId] = absDepOutPath.replace(this.outDir, '')

      this.buildFile(absDepPath)
    })

    this._depTree[outFilePath] = depTree
  }

  _writeMultipackFile () {
    fs.outputFileSync(this.multipackFilePath, `//this file was generated automatically, do not edit it manually\n`)
    fs.appendFileSync(this.multipackFilePath, fs.readFileSync(loaderFilePath, 'utf8'))
    fs.appendFileSync(this.multipackFilePath, `multipack.config({"baseUrl": "${this.config.baseUrl}", "tree": ${JSON.stringify(this._depTree)}});`)

    this.config.main && fs.appendFileSync(this.multipackFilePath, `multipack.import('/${this.config.main}')`)

    console.log(`Your multipack is ready: ${this.multipackFilePath.replace(cwd, '')}`)
  }

  _transformFile (absFilePath) {
    const fileContent = fs.readFileSync(absFilePath, 'utf8')
    const babelOptions = _.merge({
      plugins: []
    }, this.config.babel)

    const absOutFilePath = this._getAbsOutFilePath(absFilePath)

    if (fileContent.indexOf('define(') === -1) {
      babelOptions.plugins.push('transform-es2015-modules-amd')
    }

    const result = babel.transform(fileContent, babelOptions)

    fs.outputFileSync(absOutFilePath, result.code)

    console.log(`${absFilePath.replace(cwd, '')} -> ${absOutFilePath.replace(cwd, '')}`)

    return result
  }

  _getAbsOutFilePath (absSrcFilePath) {
    return absSrcFilePath.indexOf(this.srcDir) === 0 ? absSrcFilePath.replace(this.srcDir, this.outDir) : absSrcFilePath.replace(cwd, this.outDir)
  }

  _shouldFileTransform (absFilePath) {
    const absOutFilePath = this._getAbsOutFilePath(absFilePath)

    if (!fs.existsSync(absOutFilePath)) {
      return true
    }

    const srcFileMtime = new Date(fs.statSync(absFilePath).mtime).getTime()
    const outFileMtime = new Date(fs.statSync(absOutFilePath).mtime).getTime()

    return srcFileMtime > outFileMtime
  }
}

module.exports = Multipack

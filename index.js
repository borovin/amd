const babel = require('babel-core')
const fs = require('fs-extra')
const globby = require('globby')
const cwd = process.cwd()
const detective = require('detective-amd')
const path = require('path')
const _ = require('lodash')
const minimatch = require('minimatch')
const chokidar = require('chokidar')
const resolveFrom = require('resolve-from')

const defaultConfig = _.merge({
  srcDir: 'src',
  srcFiles: '**/*.js',
  outDir: 'build',
  babel: {
    extends: fs.existsSync('.babelrc') ? path.resolve(cwd, '.babelrc') : null
  },
  baseUrl: '/build',
  main: 'index.js',
  transformations: {}
}, fs.existsSync('multipack.config.js') ? require(`${cwd}/multipack.config.js`) : {})

const loaderFilePath = path.resolve(__dirname, 'loader.min.js')

function isExternalUrl (url) {
  return (url.indexOf('http') === 0) || (url.indexOf('//') === 0)
}

class Multipack {
  constructor (config) {
    this.config = _.merge({}, defaultConfig, config)
    this._tree = {}
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

  get _multipackFilePath () {
    return path.resolve(this.config.outDir, 'multipack.js')
  }

  build () {
    this.srcFiles.forEach(absFilePath => this.buildFile(absFilePath))
    this._writeMultipackFile()
  }

  watch () {
    this.build()

    const srcWatcher = chokidar.watch(this.config.srcFiles, {
      cwd: this.config.srcDir,
      ignoreInitial: true
    })

    srcWatcher
      .on('change', srcFile => {
        console.log(`Changes detected in ${srcFile}`)
        this.buildFile(path.resolve(this.srcDir, srcFile))
        this._writeMultipackFile()
      })
      .on('add', srcFile => {
        console.log(`New source file: ${srcFile}`)
        this.buildFile(path.resolve(this.srcDir, srcFile))
        this._writeMultipackFile()
      })

    console.log('Waiting for changes in source files...')
  }

  buildFile (filePath) {
    let absFilePath = filePath

    if (isExternalUrl(absFilePath)) {
      return
    }

    if (absFilePath.indexOf(cwd) < 0) {
      absFilePath = path.join(this.srcDir, absFilePath)
    }

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

      const absDepPath = this._resolveDependencyPath(absFilePath, depId) || depId
      const absDepOutPath = this._getAbsOutFilePath(absDepPath)

      depTree[depId] = absDepOutPath.replace(this.outDir, '')

      this.buildFile(absDepPath)
    })

    this._tree[outFilePath] = depTree
  }

  _writeMultipackFile () {
    fs.outputFileSync(this._multipackFilePath, `//this file was generated automatically, do not edit it manually\n`)
    fs.appendFileSync(this._multipackFilePath, fs.readFileSync(loaderFilePath, 'utf8'))
    fs.appendFileSync(this._multipackFilePath, `multipack.config({"baseUrl": "${this.config.baseUrl}", "tree": ${JSON.stringify(this._tree)}});`)

    this.config.main && fs.appendFileSync(this._multipackFilePath, `multipack.import('/${this.config.main}')`)

    console.log(`multipack is ready: ${this._multipackFilePath.replace(cwd, '')}`)
  }

  _transformFile (absFilePath) {
    const babelOptions = _.merge({
      plugins: []
    }, this.config.babel)

    const absOutFilePath = this._getAbsOutFilePath(absFilePath)

    const fileContent = _.reduce(this.config.transformations, (result, transform, pattern) => {
      if (!minimatch(absFilePath.replace(this.srcDir, ''), pattern)) {
        return result
      }

      if (typeof transform === 'function') {
        return transform(result)
      }

      return result
    }, fs.readFileSync(absFilePath, 'utf8'))

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

  _resolveDependencyPath (absRootPath, depId) {
    if (isExternalUrl(depId)) {
      return depId
    }

    if (depId.indexOf('/') === 0) {
      return resolveFrom.silent(this.srcDir, `.${depId}`)
    }

    return resolveFrom.silent(path.dirname(absRootPath), depId)
  }
}

module.exports = Multipack

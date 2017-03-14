const babel = require('babel-core');
const fs = require('fs-extra');
const globule = require('globule');
const cwd = process.cwd();
const detective = require('detective-amd');
const path = require('path');
const resolveCwd = require('resolve-cwd');
const _ = require('lodash');
const config = _.merge({
    srcFiles: 'src/**/*.js',
    outDir: 'build',
    staticDir: '.',
    babel: {},
    baseUrl: '/'
}, require(`${cwd}/amd.config.js`));

const outDir = path.resolve(config.outDir);
const staticDir = path.resolve(config.staticDir);
const srcFiles = globule.find(config.srcFiles);
const amdLoaderFilePath = path.resolve(__dirname, 'loader.min.js');
const amdFilePath = path.resolve(config.outDir, 'amd.js');
const amdTree = {};
const amdRegEx = /(?:^\s*|[}{\(\);,\n\?\&]\s*)define\s*\(\s*("[^"]+"\s*,\s*|'[^']+'\s*,\s*)?\s*(\[(\s*(("[^"]+"|'[^']+')\s*,|\/\/.*\n|\/\*(.|\s)*?\*\/))*(\s*("[^"]+"|'[^']+')\s*,?\s*)?(\s*(\/\/.*\n|\/\*(.|\s)*?\*\/)\s*)*\]|function\s*|{|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*\))/;

function builder() {
    srcFiles && srcFiles.forEach(trace);

    fs.outputFileSync(amdFilePath, `//this file was generated automatically, do not edit it manually\n`);

    console.log(`-> ${amdFilePath}`);

    fs.appendFileSync(amdFilePath, fs.readFileSync(amdLoaderFilePath, 'utf8'));
    fs.appendFileSync(amdFilePath, `amd.config({"baseUrl": "${config.baseUrl}", "tree": ${JSON.stringify(amdTree)}});`);
}

function transformFileSync(srcFilePath, outFilePath) {
    const srcFileContent = fs.readFileSync(srcFilePath, 'utf8');
    const babelConfig = _.merge({plugins: []}, config.babel);

    if (!amdRegEx.test(srcFileContent)) {
        babelConfig.plugins.push('transform-es2015-modules-amd');
    }

    const result = babel.transform(srcFileContent, babelConfig);

    fs.outputFileSync(outFilePath, result.code, 'utf8');

    console.log(`${srcFilePath} -> ${outFilePath}`);
}

function trace(absFilePath) {
    const cwdFilePath = path.relative(cwd, absFilePath);
    const absOutFilePath = path.resolve(config.outDir, cwdFilePath);
    const staticDirFilePath = path.relative(staticDir, absOutFilePath);

    console.log(`tracing ${cwdFilePath}...`);

    if (amdTree[staticDirFilePath]) {
        return;
    }

    transformFileSync(absFilePath, absOutFilePath);

    const fileContent = fs.readFileSync(absOutFilePath, 'utf8');
    const fileDeps = detective(fileContent);

    amdTree[staticDirFilePath] = {};

    fileDeps.forEach(depId => {
        if (depId === 'module' || depId === 'exports') {
            return;
        }

        let depPath = depId;

        if (depPath.indexOf('.') === 0) {
            depPath = path.resolve(path.dirname(cwdFilePath), depPath);
        }

        const absDepPath = resolveCwd(depPath);
        const absDepOutPath = absDepPath.replace(cwd, outDir);

        amdTree[staticDirFilePath][depId] = path.relative(staticDir, absDepOutPath);

        trace(absDepPath);
    });
}

module.exports = builder;

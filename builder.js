const babel = require('babel-core');
const fs = require('fs-extra');
const globule = require('globule');
const cwd = process.cwd();
const detective = require('detective-amd');
const path = require('path');
const _ = require('lodash');
const config = _.merge({
    srcDir: 'src',
    srcFiles: '**/*.js',
    outDir: 'build',
    staticDir: '.',
    babel: {}
}, require(`${cwd}/amd.config.js`));

const amdConfigFile = `${config.outDir}/amd.tree.js`;
const tree = {};

const amdRegEx = /(?:^\s*|[}{\(\);,\n\?\&]\s*)define\s*\(\s*("[^"]+"\s*,\s*|'[^']+'\s*,\s*)?\s*(\[(\s*(("[^"]+"|'[^']+')\s*,|\/\/.*\n|\/\*(.|\s)*?\*\/))*(\s*("[^"]+"|'[^']+')\s*,?\s*)?(\s*(\/\/.*\n|\/\*(.|\s)*?\*\/)\s*)*\]|function\s*|{|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*\))/;

const srcFiles = globule.find(`${config.srcDir}/${config.srcFiles}`);

srcFiles && srcFiles.forEach(srcFileName => {
    const outFileName = srcFileName.replace(config.srcDir, config.outDir);
    transformFileSync(srcFileName, outFileName);
});

const outFiles = globule.find(`${config.outDir}/**/*.js`);

outFiles && outFiles.forEach(outFileName => {
    trace(outFileName);
});

fs.outputFileSync(amdConfigFile, `//this file generated automatically 
//do not edit it manually

amd.config({"tree": ${JSON.stringify(tree)}});`);

console.log(`-> ${amdConfigFile}`);

function transformFileSync(srcFileName, outFileName) {
    const srcFileContent = fs.readFileSync(srcFileName, 'utf8');
    const babelConfig = _.merge({plugins: []}, config.babel);

    if (!amdRegEx.test(srcFileContent)) {
        babelConfig.plugins.push('transform-es2015-modules-amd');
    }

    const result = babel.transform(srcFileContent, babelConfig);

    fs.outputFileSync(outFileName, result.code, 'utf8');

    console.log(`${srcFileName} -> ${outFileName}`);
}

function trace(fileName) {
    let fileUrl = fileName;

    if (fileUrl.indexOf('node_modules/') >= 0) {
        fileUrl = fileName.replace('node_modules', `${config.outDir}/browser_modules`);
    }

    fileUrl = _.trimStart(fileUrl, `${config.staticDir}/`);

    if (tree[fileUrl]) {
        return;
    }

    const fileContent = fs.readFileSync(fileUrl, 'utf8');
    const fileDeps = detective(fileContent);

    tree[fileUrl] = {};

    fileDeps.forEach(depId => {
        if (depId === 'module' || depId === 'exports') {
            return;
        }

        let depPath = depId;
        let depUrl;

        if (depId.indexOf('.') === 0) {
            depPath = path.resolve(path.dirname(fileName), depId);
        }

        depUrl = depPath = require.resolve(depPath).replace(`${cwd}/`, '');

        if (depPath.indexOf('node_modules/') >= 0) {
            depUrl = depPath.replace('node_modules', `${config.outDir}/browser_modules`);
            transformFileSync(depPath, depUrl);
        }

        tree[fileUrl][depId] = _.trimStart(depUrl, `${config.staticDir}/`);

        trace(depPath);
    });
}


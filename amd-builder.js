const babel = require('babel-core');
const fs = require('fs-extra');
const globule = require('globule');
const cwd = process.cwd();
const detective = require('detective-amd');
const path = require('path');

const srcDir = 'tests/src';
const outDir = 'tests/build';
const amdConfigFile = `${outDir}/amd-tree.js`;
const tree = {};

const amdRegEx = /(?:^\s*|[}{\(\);,\n\?\&]\s*)define\s*\(\s*("[^"]+"\s*,\s*|'[^']+'\s*,\s*)?\s*(\[(\s*(("[^"]+"|'[^']+')\s*,|\/\/.*\n|\/\*(.|\s)*?\*\/))*(\s*("[^"]+"|'[^']+')\s*,?\s*)?(\s*(\/\/.*\n|\/\*(.|\s)*?\*\/)\s*)*\]|function\s*|{|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*\))/;

const srcFiles = globule.find(`${srcDir}/**/*.js`);

srcFiles && srcFiles.forEach(srcFileName => {
    const outFileName = srcFileName.replace(srcDir, outDir);
    transformFileSync(srcFileName, outFileName);
});

const outFiles = globule.find(`${outDir}/**/*.js`);

outFiles && outFiles.forEach(outFileName => {
    trace(outFileName);
});

fs.outputFileSync(amdConfigFile, `//this file generated automatically 
//do not edit it manually

amd.config({"tree": ${JSON.stringify(tree)}});`);

console.log(`-> ${amdConfigFile}`);

function transformFileSync(srcFileName, outFileName) {
    const srcFileContent = fs.readFileSync(srcFileName, 'utf8');
    const babelPlugins = [];

    if (!amdRegEx.test(srcFileContent)) {
        babelPlugins.push('transform-es2015-modules-amd');
    }

    const result = babel.transform(srcFileContent, {
        "plugins": babelPlugins
    });

    fs.outputFileSync(outFileName, result.code, 'utf8');

    console.log(`${srcFileName} -> ${outFileName}`);
}

function trace(fileName) {
    const fileContent = fs.readFileSync(fileName, 'utf8');
    const fileDeps = detective(fileContent);

    if (tree[fileName]) {
        return;
    }

    tree[fileName] = {};

    fileDeps.forEach(depId => {
        if (depId === 'module' || depId === 'exports') {
            return;
        }

        let moduleId = depId;

        if (depId.indexOf('.') === 0) {
            moduleId = path.resolve(path.dirname(fileName), depId);
        }

        const depPath = require.resolve(moduleId).replace(`${cwd}/`, '');

        if (depPath.indexOf('node_modules/') >= 0) {
            const browserModulePath = depPath.replace('node_modules', `${outDir}/browser_modules`);
            transformFileSync(depPath, browserModulePath);
            tree[fileName][depId] = browserModulePath;
        } else {
            tree[fileName][depId] = depPath;
        }

        trace(depPath);
    });
}


#!/usr/bin/env node

const program = require('commander');
const packageJson = require('../package.json');
const builder = require('../builder');

program
    .version(packageJson.version);

program
    .command('build')
    .description('build all source files into output folder')
    .action(builder);

program.parse(process.argv);
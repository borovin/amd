const b = require('./b');
const _template = require('lodash/template');
const template = _template('a<%- b %>');

module.exports = template({b: b});
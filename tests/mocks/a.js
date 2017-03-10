const b = require('./b');
const _template = require('lodash/template');
const template = _template('a<%- b %><%- d %>');
const d = require('../d');

module.exports = template({
    b: b,
    d: d
});
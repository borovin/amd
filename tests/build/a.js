define(['module', './b'], function (module, b) {
  'use strict';

  const string = `a${b}`;
  module.exports = string;
});
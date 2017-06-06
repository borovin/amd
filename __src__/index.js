import a from './a'
import template from 'lodash/template'
import html from './text.html'

const data = {a, html}

document.body.innerHTML = template('Index_<%- a %>_<%= html %>')(data)

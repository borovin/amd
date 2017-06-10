import a from './a'
import b from './b'
import c from '/c'
import html from './text.html'

import template from 'lodash/template'
import $ from '//unpkg.com/jquery@3.2.1'

const data = {a, b, c, html, jquery: $.fn.jquery}

document.body.innerHTML = template('<h1><%- a %>_<%- b %>_<%- c %>_<%= html %>_jquery:<%- jquery %></h1>')(data)

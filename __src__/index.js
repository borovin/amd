import a from './a'
import c from '/c'
import template from 'lodash/template'
import html from './text.html'
import $ from '//unpkg.com/jquery@3.2.1'

const data = {a, html, jquery: $.fn.jquery, c}

document.body.innerHTML = template('Index_<%- a %>_<%= html %>_<%- jquery %>_<%- c %>')(data)

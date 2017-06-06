import b from './b'
import template from 'lodash/template'
import text from './text.html'

const data = {b, text}

document.body.innerHTML = template('a<%- b %><%= text %>')(data)

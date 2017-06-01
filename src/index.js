import b from './b'
import template from 'lodash/template'

const data = {b}

document.body.innerHTML = template('a<%- b %>')(data)

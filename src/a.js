import b from './b'
import template from 'lodash/template'

const render = template('a<%- b %>')

export default render({
  b: b
})
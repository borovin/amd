const _ = require('lodash')

function transformHtml (content) {
  const template = _.template(content)({color: 'red'})

  return `export default '${template}'`
}

module.exports = {
  transformations: {
    '**/*.html': transformHtml
  }
}

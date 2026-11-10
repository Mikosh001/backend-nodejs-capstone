const pino = require('pino')

const options = {
  redact: ['req.headers.authorization', 'req.headers.cookie']
}

if (process.env.NODE_ENV !== 'production') {
  options.level = 'debug'
  options.transport = { target: 'pino-pretty' }
}

module.exports = pino(options)

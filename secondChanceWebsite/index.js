const http = require('node:http')
const path = require('node:path')
const express = require('express')

const app = express()
const build = path.join(__dirname, 'build')
const backend = new URL(process.env.BACKEND_URL || 'http://localhost:3060')
const upstream = backend.protocol === 'https:' ? require('node:https') : http

app.use(['/api', '/images', '/uploads'], (req, res) => {
  const request = upstream.request(new URL(req.originalUrl, backend), {
    method: req.method,
    headers: { ...req.headers, host: backend.host }
  }, response => {
    res.writeHead(response.statusCode, response.headers)
    response.pipe(res)
  })
  request.on('error', () => {
    if (!res.headersSent) res.status(502).json({ error: 'Backend unavailable' })
    else res.end()
  })
  req.pipe(request)
})

app.get('/', (req, res) => res.sendFile(path.join(build, 'home.html')))
app.use(express.static(build))
app.get('/app*', (req, res) => res.sendFile(path.join(build, 'index.html')))
app.listen(Number(process.env.PORT || 8080))

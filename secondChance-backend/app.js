require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('node:path')
const pinoHttp = require('pino-http')
const logger = require('./logger')
const connectToDatabase = require('./models/db')
const authRoutes = require('./routes/authRoutes')
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes')
const searchRoutes = require('./routes/searchRoutes')

const app = express()
const port = Number(process.env.PORT || 3060)

app.use(cors())
app.use(express.json())
app.use(pinoHttp({ logger }))
app.use('/images', express.static(path.join(__dirname, 'public', 'images')))
app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, 'public', 'uploads')))
app.use('/api/auth', authRoutes)
app.use('/api/secondchance/items', secondChanceItemsRoutes)
app.use('/api/secondchance/search', searchRoutes)

app.get('/health', async (req, res, next) => {
  try {
    const db = await connectToDatabase()
    await db.command({ ping: 1 })
    res.json({ status: 'ok' })
  } catch (error) {
    next(error)
  }
})

app.get('/', (req, res) => res.json({ service: 'SecondChance API' }))

app.use((error, req, res, next) => {
  req.log.error({ err: error })
  const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : error.status || 500
  res.status(status).json({ error: status === 500 ? 'Internal server error' : error.message })
})

if (require.main === module) {
  app.listen(port, () => logger.info(`SecondChance API listening on ${port}`))
}

module.exports = app

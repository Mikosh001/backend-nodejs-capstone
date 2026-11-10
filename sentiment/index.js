require('dotenv').config()
const express = require('express')
const natural = require('natural')
const logger = require('./logger')

const app = express()
const port = process.env.PORT || 3000
const analyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn')

app.use(express.json())
app.use(require('express-pino-logger')({ logger }))

app.post('/sentiment', (req, res) => {
  const { sentence } = req.body || {}
  if (typeof sentence !== 'string' || !sentence.trim()) {
    return res.status(400).json({ error: 'No sentence provided' })
  }

  try {
    const analysisResult = analyzer.getSentiment(sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [])
    let sentiment = 'neutral'
    if (analysisResult < 0) sentiment = 'negative'
    if (analysisResult > 0.33) sentiment = 'positive'
    return res.status(200).json({ sentimentScore: analysisResult, sentiment })
  } catch (error) {
    logger.error({ err: error }, 'Error performing sentiment analysis')
    return res.status(500).json({ message: 'Error performing sentiment analysis' })
  }
})

app.listen(port, () => logger.info(`Sentiment API listening on ${port}`))

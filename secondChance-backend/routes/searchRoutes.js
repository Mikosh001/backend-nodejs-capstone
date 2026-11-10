const express = require('express')
const connectToDatabase = require('../models/db')

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const { name, category, condition, age_years: age } = req.query
    if ([name, category, condition, age].some(value => value !== undefined && typeof value !== 'string')) {
      return res.status(400).json({ error: 'Search filters must be strings' })
    }
    const query = {}
    if (name?.trim()) {
      const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.name = { $regex: escaped, $options: 'i' }
    }
    if (category?.trim()) query.category = category.trim()
    if (condition?.trim()) query.condition = condition.trim()
    if (age?.trim()) {
      const years = Number(age)
      if (!Number.isFinite(years) || years < 0) {
        return res.status(400).json({ error: 'age_years must be a non-negative number' })
      }
      query.age_years = { $lte: years }
    }
    const db = await connectToDatabase()
    const gifts = await db.collection('secondChanceItems').find(query).toArray()
    return res.json(gifts)
  } catch (error) {
    next(error)
  }
})

module.exports = router

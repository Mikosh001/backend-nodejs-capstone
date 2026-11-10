const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { ObjectId } = require('mongodb')
const { body, validationResult } = require('express-validator')
const connectToDatabase = require('../models/db')
const requireAuth = require('../middleware/auth')
const logger = require('../logger')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET
const emailInput = body('email').isEmail().trim().toLowerCase()
const passwordInput = body('password').isString().custom(value => Buffer.byteLength(value) <= 72)
const nameInput = field => body(field).isString().bail().trim().isLength({ min: 1, max: 80 })

function validate (req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid ' + errors.array()[0].path })
  next()
}

function tokenFor (id) {
  return jwt.sign({ user: { id: id.toString() } }, JWT_SECRET, { expiresIn: '1h' })
}

let userIndex
async function users () {
  const db = await connectToDatabase()
  const collection = db.collection('users')
  if (!userIndex) {
    userIndex = collection.createIndex({ email: 1 }, { unique: true }).catch(error => {
      userIndex = undefined
      throw error
    })
  }
  await userIndex
  return collection
}

router.post('/register', [nameInput('firstName'), nameInput('lastName'), emailInput, passwordInput, body('password').isLength({ min: 8 })], validate, async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body
    const collection = await users()
    if (await collection.findOne({ email })) return res.status(409).json({ error: 'Email is already in use' })
    const hash = await bcrypt.hash(password, 12)
    const id = new ObjectId()
    const authtoken = tokenFor(id)
    await collection.insertOne({ _id: id, firstName, lastName, email, password: hash })
    return res.status(201).json({ authtoken, email, userName: firstName })
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Email is already in use' })
    next(error)
  }
})

router.post('/login', [emailInput, passwordInput], validate, async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await (await users()).findOne({ email })
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (!await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid password' })
    }
    logger.info('User logged in successfully')
    return res.status(200).json({ authtoken: tokenFor(user._id), userName: user.firstName, userEmail: user.email })
  } catch (error) {
    next(error)
  }
})

router.put('/update', requireAuth, [nameInput('name')], validate, async (req, res, next) => {
  try {
    const email = req.get('Email')?.trim().toLowerCase()
    if (!email) return res.status(400).json({ error: 'Email header is required' })
    const collection = await users()
    const user = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.userId), email },
      { $set: { firstName: req.body.name } },
      { returnDocument: 'after' }
    )
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json({ name: user.firstName, email: user.email, authtoken: tokenFor(user._id) })
  } catch (error) {
    next(error)
  }
})

module.exports = router

const express = require('express')
const multer = require('multer')
const path = require('node:path')
const fs = require('node:fs/promises')
const { randomUUID } = require('node:crypto')
const { ObjectId } = require('mongodb')
const connectToDatabase = require('../models/db')
const requireAuth = require('../middleware/auth')

const router = express.Router()
const directoryPath = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'public', 'uploads')
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif' }
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 12 },
  fileFilter (req, file, callback) {
    if (!Object.hasOwn(extensions, file.mimetype)) {
      return callback(Object.assign(new Error('Upload a JPG, PNG, or GIF image'), { status: 400 }))
    }
    callback(null, true)
  }
})

async function items () {
  const db = await connectToDatabase()
  return db.collection('secondChanceItems')
}

function itemFilter (id) {
  return ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id }
}

function itemFields (body) {
  const fields = {}
  for (const key of ['name', 'category', 'condition', 'zipcode', 'description']) {
    if (typeof body[key] === 'string') fields[key] = body[key].trim()
  }
  if (body.age_days !== undefined && String(body.age_days).trim() !== '') {
    const age = Number(body.age_days)
    if (Number.isInteger(age) && age >= 0) {
      fields.age_days = age
      fields.age_years = Number((age / 365).toFixed(2))
    }
  }
  return fields
}

router.get('/', async (req, res, next) => {
  try {
    const collection = await items()
    const secondChanceItems = await collection.find({}).toArray()
    res.json(secondChanceItems)
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const item = await (await items()).findOne(itemFilter(req.params.id))
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json(item)
  } catch (error) {
    next(error)
  }
})

router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  let storedFile
  try {
    const fields = itemFields(req.body)
    if (!fields.name || !fields.category || !fields.condition || !fields.description) {
      return res.status(400).json({ error: 'Name, category, condition and description are required' })
    }
    const id = new ObjectId()
    const item = {
      age_days: 0,
      age_years: 0,
      ...fields,
      _id: id,
      id: id.toHexString(),
      posted_by: req.userId,
      date_added: Math.floor(Date.now() / 1000),
      image: '',
      comments: []
    }
    if (req.file) {
      const name = randomUUID() + extensions[req.file.mimetype]
      await fs.mkdir(directoryPath, { recursive: true })
      const filename = path.join(directoryPath, name)
      await fs.writeFile(filename, req.file.buffer, { flag: 'wx' })
      storedFile = filename
      item.image = '/uploads/' + name
    }
    await (await items()).insertOne(item)
    res.status(201).json(item)
  } catch (error) {
    if (storedFile) await fs.unlink(storedFile).catch(() => {})
    next(error)
  }
})

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const fields = itemFields(req.body)
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'No supported fields supplied' })
    const item = await (await items()).findOneAndUpdate(
      { ...itemFilter(req.params.id), posted_by: req.userId },
      { $set: fields },
      { returnDocument: 'after' }
    )
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json(item)
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const item = await (await items()).findOneAndDelete({ ...itemFilter(req.params.id), posted_by: req.userId })
    if (!item) return res.status(404).json({ error: 'Item not found' })
    if (item.image?.startsWith('/uploads/')) {
      await fs.unlink(path.join(directoryPath, path.basename(item.image))).catch(error => req.log.warn({ err: error }))
    }
    res.sendStatus(204)
  } catch (error) {
    next(error)
  }
})

module.exports = router

require('dotenv').config()
const { MongoClient } = require('mongodb')
const { docs } = require('./secondChanceItems.json')

async function loadData () {
  const client = new MongoClient(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017')
  try {
    await client.connect()
    const db = client.db(process.env.MONGO_DB || 'secondChance')
    const collection = db.collection(process.env.MONGO_COLLECTION || 'secondChanceItems')
    await collection.createIndex({ id: 1 }, { unique: true })
    const result = await collection.bulkWrite(docs.map(item => ({
      updateOne: { filter: { id: item.id }, update: { $setOnInsert: item }, upsert: true }
    })))
    console.log('Inserted documents:', result.upsertedCount)
    return result.upsertedCount
  } finally {
    await client.close()
  }
}

if (require.main === module) {
  loadData().catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = { loadData }

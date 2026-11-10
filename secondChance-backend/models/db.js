const { MongoClient } = require('mongodb')

let connection

async function connectToDatabase () {
  if (!connection) {
    const client = new MongoClient(process.env.MONGO_URL || 'mongodb://127.0.0.1:27017')
    connection = (async () => {
      await client.connect()
      return client.db(process.env.MONGO_DB || 'secondChance')
    })().catch(async error => {
      await client.close().catch(() => {})
      connection = undefined
      throw error
    })
  }
  return connection
}

module.exports = connectToDatabase

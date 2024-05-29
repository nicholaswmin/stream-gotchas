import knex from 'knex'

const DATABASE_URL = process.env.DATABASE_URL || (() => {
  throw new Error('DATABASE_URL env. var is required')
})()
const name = DATABASE_URL.split('/')[3]
const isLocalDB = DATABASE_URL.includes('@localhost')
const adminURL = DATABASE_URL.replace(name, '')
const userURL = DATABASE_URL

if (isLocalDB) {
  const admin = knex({
    client: 'pg',
    connection: {
      connectionString: adminURL,
      ssl: isLocalDB ? false : { rejectUnauthorized: false }
    }
  })

  await admin.raw('DROP DATABASE IF EXISTS ?? WITH (FORCE);', [ name ])
  await admin.raw('CREATE DATABASE ??;', [ name ])
  await admin.destroy()
}

const user = knex({
  client: 'pg',
  connection: {
    connectionString: userURL,
    ssl: isLocalDB ? false : { rejectUnauthorized: false }
  }
})

await user.schema.dropTableIfExists('messages')
await user.schema.createTable('messages', t => {
  t.increments('id_message').primary()
  t.text('text')
})
// 25000 * `{ text: '7306668' }` totals 1 MB; this is tested in tests
const messageSizeKB = 50
await user.batchInsert('messages', Array(2500).fill({
  text: 'bar'.repeat(350 * messageSizeKB)
}))
await user.destroy()

console.log('Done! DB ready')

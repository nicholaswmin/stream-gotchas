import knex from 'knex'

const { DATABASE_URL } = process.env
const name = DATABASE_URL.split('/')[3]
const isLocalDB = DATABASE_URL.includes('@localhost')
const adminURL = DATABASE_URL.replace(name, '')
const userURL = DATABASE_URL
const sslOpts = isLocalDB ? false : { rejectUnauthorized: false }

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
// 25000 * `{ text: 'foo bar' }` totals 1 MB; this is tested in tests
await user.batchInsert('messages', Array(25000).fill({ text: 'foo bar' }))
await user.destroy()

console.log('Done! DB ready')

import knex from 'knex'

const { DATABASE_URL } = process.env
const name = DATABASE_URL.split('/')[3]

const adminURL = DATABASE_URL.replace(name, '')
const userURL = DATABASE_URL

const [ admin, db ] = [
  knex({ client: 'pg', connection: { connectionString: adminURL } }),
  knex({ client: 'pg', connection: { connectionString: userURL } })
]

await admin.raw('DROP DATABASE IF EXISTS ?? WITH (FORCE);', [ name ])
await admin.raw('CREATE DATABASE ??;', [ name ])

await db.schema.dropTableIfExists('messages')
await db.schema.createTable('messages', t => {
  t.increments('id').primary()
  t.text('txt')
})

await db.batchInsert('messages', Array(100).fill({ txt: 'foo' }))
await Promise.all([ admin.destroy(), db.destroy() ])

console.log('Done! DB ready')

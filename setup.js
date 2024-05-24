import knex from 'knex'

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ?
      false : { rejectUnauthorized: false }
  }
})

await db.schema.createTable('messages', t => {
  t.increments('id').primary()
  t.text('txt')
})

await db.batchInsert('messages', Array(100).fill({ txt: 'foo' }))
await db.destroy()

console.log('Done! DB ready')

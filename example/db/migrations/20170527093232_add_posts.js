exports.up = function (knex) {
  return knex.schema.createTable('posts', table => {
    table.increments('id').primary()
    table.string('title').notNullable()
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('posts')
}

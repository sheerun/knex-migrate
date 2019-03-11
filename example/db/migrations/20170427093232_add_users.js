exports.up = function (knex) {
  return knex.schema.createTable('users', table => {
    table.increments('id').primary()
    table.string('name').notNullable()
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('users')
}

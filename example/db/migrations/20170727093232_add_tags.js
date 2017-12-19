exports.up = function (knex) {
  return knex.schema.createTable('tags', table => {
    table.increments('id').primary()
    table.string('key').notNullable()
    table.string('value').notNullable()
  })
}

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('tags')
}

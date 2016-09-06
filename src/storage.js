import invariant from 'invariant'
import { get } from 'lodash'

function isString(s) {
  return typeof s === 'string'
}

function tableDoesNotExist(err, table) {
  return new RegExp(`relation "${table}" does not exist`).test(err.message) ||
         new RegExp(`no such table: ${table}`).test(err.message)
}

module.exports = class KnexStorage {
  constructor(options) {
    this.knex = options.storageOptions.connection
    this.tableName = get(this.knex, 'client.config.migrations.tableName', 'knex_migrations')
    invariant(isString(this.tableName), 'The option \'options.storageOptions.tableName\' is required.')
    invariant(this.knex, 'The option \'options.storageOptions.connection\' is required.')
  }

  ensureTable() {
    return this.knex(this.tableName).count('id').catch(err => {
      if (tableDoesNotExist(err, this.tableName)) {
        return this.knex.schema.createTable(this.tableName, table => {
          table.increments()
          table.string('name')
          table.integer('batch')
          table.dateTime('migration_time')
        })
      }

      throw err
    })
  }

  async logMigration(migrationName) {
    if (typeof this.currentBatch === 'undefined') {
      this.currentBatch = this.getCurrentBatch()
    }

    const currentBatch = await this.currentBatch

    return this.knex(this.tableName).insert({
      name: migrationName,
      batch: currentBatch + 1,
      migration_time: new Date() // eslint-disable-line camelcase
    })
  }

  unlogMigration(migrationName) {
    return this.knex(this.tableName).where('name', migrationName).del()
  }

  migrations() {
    return this
      .knex(this.tableName)
      .select()
      .orderBy('migration_time', 'asc')
  }

  executed() {
    return this
      .knex(this.tableName)
      .orderBy('migration_time', 'asc')
      .pluck('name')
  }

  getCurrentBatch() {
    return this.knex(this.tableName)
      .max('batch as max_batch')
      .then(obj => (obj[0].max_batch || 0))
  }
}

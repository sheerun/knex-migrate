#!/usr/bin/env node

import {resolve, dirname, isAbsolute} from 'path'
import {existsSync} from 'fs'
import reqFrom from 'req-from'
import Umzug from 'umzug'
import {maxBy, minBy, filter, omitBy, isNil} from 'lodash'
import * as prettyjson from 'prettyjson'
import Promise from 'bluebird'

function normalizeFlags (flags) {
  if (isAbsolute(flags.knexfile || '') && !flags.cwd) {
    flags.cwd = dirname(flags.knexfile)
  }

  if (isAbsolute(flags.migrations || '') && !flags.cwd) {
    flags.cwd = dirname(flags.migrations)
  }

  flags.cwd = flags.cwd || process.cwd()
  flags.knexfile = flags.knexfile || 'knexfile.js'

  flags.knexfile = resolve(flags.cwd, flags.knexfile)

  flags.env =
    flags.env || process.env.KNEX_ENV || process.env.NODE_ENV || 'development'
}

function knexInit (flags) {
  normalizeFlags(flags)

  const knex = reqFrom.silent(flags.cwd, 'knex')

  if (isNil(knex)) {
    console.error(`Knex not found in '${flags.cwd}'`)
    console.error(
      "Please install it as local dependency with 'npm install --save knex'"
    )
    process.exit(1)
  }

  let config

  try {
    config = require(flags.knexfile)
  } catch (err) {
    if (/Cannot find module/.test(err.message)) {
      console.error(`No knexfile at '${flags.knexfile}'`)
      console.error("Please create one or bootstrap using 'knex init'")
      process.exit(1)
    }

    throw err
  }

  if (config[flags.env] && config[flags.env]) {
    config = config[flags.env]
  }

  if (typeof config !== 'object') {
    console.error(`Malformed knexfile.js:`)
    console.error(JSON.stringify(config, null, 2))
    process.exit(1)
  }

  flags.migrations =
    flags.migrations ||
    (config.migrations && config.migrations.directory) ||
    'migrations'
  flags.migrations = resolve(flags.cwd, flags.migrations)

  if (!existsSync(flags.migrations)) {
    console.error(`No migrations directory at '${flags.migrations}'`)
    console.error(
      "Please create your first migration with 'knex migrate:make <name>'"
    )
    process.exit(1)
  }

  if (flags.verbose) {
    const environment = Object.assign({}, flags, {config})
    console.error(prettyjson.render(environment, {noColor: true}))
  }

  if (config.client === 'sqlite3') {
    config.useNullAsDefault = true
  }

  config.pool = {max: 1, min: 0, idleTimeoutMillis: 1000}

  return knex(config)
}

function umzugKnex (flags, connection) {
  return new Umzug({
    storage: resolve(__dirname, 'storage'),
    storageOptions: {connection},
    migrations: {
      params: [connection, Promise],
      path: flags.migrations,
      pattern: /^\d+[\w-_]+\.js$/,
      wrap: fn => (knex, Promise) =>
        knex.transaction(tx => Promise.resolve(fn(tx, Promise)))
    }
  })
}

async function umzugOptions (command, flags, umzug) {
  if (isNil(flags.to) && isNil(flags.from) && !isNil(flags.only)) {
    return flags.only
  }

  if (flags.to === '0') {
    flags.to = 0
  }

  if (flags.from === '0') {
    flags.from = 0
  }

  const opts = omitBy({to: flags.to, from: flags.from}, isNil)

  if (!isNil(flags.step)) {
    await applyStepOption(command, umzug, opts, flags.step)
  }

  return opts
}

async function applyStepOption (command, umzug, opts, steps) {
  // Default to 1 step if no number is provided
  if (steps === '') {
    steps = 1
  }

  // Use the list of pending or executed migrations to determine what would happen without --step
  let migrations =
    command === 'up'
      ? await umzug.pending()
      : await umzug.executed().then(m => m.reverse())

  // Remove migrations prior to the one used in --from
  // If it isn't in the list, the --from option has no effect
  if (opts.from) {
    const limit = migrations.find(m => m.file.startsWith(opts.to))
    migrations = migrations.slice(Math.min(0, migrations.indexOf(limit)))
  }

  // Remove migrations after the one used in --to
  // If it isn't in the list, we remove everything, causing a 'migration not pending' notice to show
  if (opts.to) {
    const limit = migrations.find(m => m.file.startsWith(opts.to))
    migrations = migrations.slice(0, migrations.indexOf(limit) + 1)
  }

  // Limit to the number of migrations available
  steps = Math.min(migrations.length, steps)

  // Override the --to option to limit the number of steps taken
  if (steps > 0) {
    opts.to = migrations[steps - 1].file
  }
}

async function knexMigrate (command, flags, progress) {
  flags = flags || {}
  progress = progress || function () {}

  const umzug = umzugKnex(flags, knexInit(flags))

  const debug = action => migration => {
    progress({action, migration})
  }

  umzug
    .on('migrating', debug('migrate'))
    .on('reverting', debug('revert'))
    .on('debug', debug('debug'))

  const api = {
    list: async () => {
      const migrations = await umzug.executed()
      return migrations.map(m => m.file.split('.')[0])
    },
    pending: async () => {
      const migrations = await umzug.pending()
      return migrations.map(m => m.file.split('.')[0])
    },
    rollback: async () => {
      const migrations = await umzug.storage.migrations()

      if (migrations.length === 0) {
        return
      }

      const maxBatch = maxBy(migrations, 'batch').batch
      const lastBatch = filter(migrations, {batch: maxBatch})
      const firstFromBatch = minBy(lastBatch, 'migration_time')

      return umzug.down({to: firstFromBatch.name})
    },
    redo: async () => {
      const history = await umzug.executed()
      const args = {}
      if (history.length > 0) {
        args.to = history[history.length - 1].file
      }
      await knexMigrate('rollback', {}, progress)
      await knexMigrate('up', args, progress)
    },
    up: async () => {
      const opts = await umzugOptions('up', flags, umzug)
      await umzug.storage.ensureTable()
      return umzug.up(opts)
    },
    down: async () => {
      const opts = await umzugOptions('down', flags, umzug)
      await umzug.storage.ensureTable()
      return umzug.down(opts)
    }
  }

  if (!(command in api)) {
    throw new Error('Unknown command: ' + command)
  }

  try {
    return await api[command].apply(null, flags)
  } finally {
    umzug.storage.knex.destroy()
  }
}

export default knexMigrate

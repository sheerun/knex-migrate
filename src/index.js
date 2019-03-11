#!/usr/bin/env node

const { resolve, dirname, isAbsolute, relative } = require('path')
const { existsSync } = require('fs')
const reqFrom = require('req-from')
const Umzug = require('umzug')
const fs = require('fs')
const {
  maxBy,
  minBy,
  filter,
  omitBy,
  pick,
  isNil,
  template
} = require('lodash')
const prettyjson = require('prettyjson')
const Promise = require('bluebird')

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

  if (flags.config) {
    config = flags.config
  } else {
    try {
      config = require(flags.knexfile)
    } catch (err) {
      console.error('asdfa')
      if (/Cannot find module/.test(err.message)) {
        console.error(`No knexfile at '${flags.knexfile}'`)
        console.error("Please create one or bootstrap using 'knex init'")
        process.exit(1)
      }

      throw err
    }
  }

  if (config[flags.env] && config[flags.env]) {
    config = config[flags.env]
  }

  if (typeof config !== 'object') {
    console.error(`Malformed knex config:`)
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
    const environment = Object.assign({}, flags, { config })
    let oldConnection = null
    if (environment.config && environment.config.connection) {
      oldConnection = environment.config.connection
      environment.config.connection = '<REDACTED>'
    }
    console.error(prettyjson.render(environment, { noColor: true }))
    if (oldConnection) {
      environment.config.connection = oldConnection
    }
  }

  if (config.client === 'sqlite3') {
    config.useNullAsDefault = true
  }

  config.pool = { max: 1, min: 0, idleTimeoutMillis: 1000 }

  return knex(config)
}

function umzugKnex (flags, connection) {
  return new Umzug({
    storage: resolve(__dirname, 'storage'),
    storageOptions: { connection },
    migrations: {
      params: [connection, Promise],
      path: flags.migrations,
      pattern: /^\d+_.+\.[j|t]s$/,
      wrap: fn => (knex, Promise) => {
        if (flags.raw) {
          return Promise.resolve(fn(knex, Promise))
        } else {
          return knex.transaction(tx => Promise.resolve(fn(tx, Promise)))
        }
      }
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

  const opts = omitBy({ to: flags.to, from: flags.from }, isNil)

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

function _ensureFolder (dir) {
  return Promise.promisify(fs.stat, { context: fs })(dir).catch(() =>
    Promise.promisify(mkdirp)(dir)
  )
}

function _generateStubTemplate (flags) {
  const stubPath = flags.stub || resolve(__dirname, 'stub', 'js.stub')
  return Promise.promisify(fs.readFile, { context: fs })(stubPath).then(stub =>
    template(stub.toString(), { variable: 'd' })
  )
}

function _writeNewMigration (dir, name, tmpl) {
  if (name[0] === '-') name = name.slice(1)
  const filename = yyyymmddhhmmss() + '_' + name + '.js'
  const variables = {}
  if (name.indexOf('create_') === 0) {
    console.log(name)
    variables.tableName = name.slice(7)
  }
  return Promise.promisify(fs.writeFile, { context: fs })(
    resolve(dir, filename),
    tmpl(variables)
  ).return(resolve(dir, filename))
}

function padDate (segment) {
  segment = segment.toString()
  return segment[1] ? segment : `0${segment}`
}

function yyyymmddhhmmss () {
  const d = new Date()
  return (
    d.getFullYear().toString() +
    padDate(d.getMonth() + 1) +
    padDate(d.getDate()) +
    padDate(d.getHours()) +
    padDate(d.getMinutes()) +
    padDate(d.getSeconds())
  )
}

async function knexMigrate (command, flags, progress) {
  flags = flags || {}
  progress = progress || function () {}

  const umzug = umzugKnex(flags, knexInit(flags))

  const debug = action => migration => {
    progress({
      action,
      migration: relative(flags.cwd, resolve(flags.migrations, migration))
    })
  }

  umzug
    .on('migrating', debug('migrate'))
    .on('reverting', debug('revert'))
    .on('debug', debug('debug'))

  const api = {
    generate: async () => {
      if (!flags.name) {
        throw new Error('A name must be specified for the generated migration')
      }

      const migrationsPath = umzug.options.migrations.path

      const val = await _ensureFolder(migrationsPath)
      const template = await _generateStubTemplate(flags)
      const name = await _writeNewMigration(
        migrationsPath,
        flags.name,
        template
      )

      return relative(flags.cwd, name)
    },
    list: async () => {
      const migrations = await umzug.executed()
      return migrations.map(m =>
        relative(flags.cwd, resolve(flags.migrations, m.file))
      )
    },
    pending: async () => {
      const migrations = await umzug.pending()
      return migrations.map(m =>
        relative(flags.cwd, resolve(flags.migrations, m.file))
      )
    },
    rollback: async () => {
      const migrations = await umzug.storage.migrations()

      if (migrations.length === 0) {
        return
      }

      const maxBatch = maxBy(migrations, 'batch').batch
      const lastBatch = filter(migrations, { batch: maxBatch })
      const firstFromBatch = minBy(lastBatch, 'migration_time')

      return umzug.down({ to: firstFromBatch.name })
    },
    redo: async () => {
      const history = await umzug.executed()
      const args = Object.assign({}, flags)
      if (history.length > 0) {
        args.to = history[history.length - 1].file
      }
      await knexMigrate('rollback', args, progress)
      await knexMigrate('up', flags, progress)
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

module.exports = knexMigrate
module.exports.default = knexMigrate

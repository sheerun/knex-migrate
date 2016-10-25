#!/usr/bin/env node

import { resolve, dirname, isAbsolute } from 'path'
import { existsSync } from 'fs'
import reqFrom from 'req-from'
import meow from 'meow'
import Umzug from 'umzug'
import { maxBy, minBy, filter, omitBy, isNil } from 'lodash'
import * as prettyjson from 'prettyjson'
import Promise from 'bluebird'

const cli = meow(`
  Usage
    $ knex-migrate <command> [options]

  Commands
    pending   Lists all pending migrations
    list      Lists all executed migrations
    up        Performs all pending migrations
    down      Rollbacks last migration
    rollback  Rollbacks last batch of migrations
    redo      Rollbacks last batch and performs all migrations

  Options for "up" and "down":
    --to, -t    Migrate upto (downto) specific version
    --from, -f  Start migration from specific version
    --only, -o  Migrate only specific version

  Global options:
    --cwd         Specify the working directory
    --knexfile    Specify the knexfile path ($cwd/knexfile.js)
    --migrations  Specify migrations path ($cwd/migrations)
    --env         Specify environment ($KNEX_ENV || $NODE_ENV || 'development')
    --verbose     Be more verbose

  As a convenience, you can skip --to flag, and just provide migration name.

  Examples
    $ knex-migrate up                  # migrate everytings
    $ knex-migrate up 20160905         # migrate upto given migration name
    $ knex-migrate up --to 20160905    # the same as above
    $ knex-migrate up --only 201609085 # migrate up single migration
    $ knex-migrate down --to 0         # rollback all migrations
    $ knex-migrate down                # rollback single migration
    $ knex-migrate rollback            # rollback previous "up"
    $ knex-migrate redo --verbose      # rollback and migrate everything
 `, {
   alias: {
     to: 't',
     from: 'f',
     only: 'o'
   },
   string: ['to', 'from', 'only']
 })

function normalizeFlags(flags) {
  if (isAbsolute(flags.knexfile || '') && !flags.cwd) {
    flags.cwd = dirname(flags.knexfile)
  }

  if (isAbsolute(flags.migrations || '') && !flags.cwd) {
    flags.cwd = dirname(flags.migrations)
  }

  flags.cwd = flags.cwd || process.cwd()
  flags.knexfile = flags.knexfile || 'knexfile.js'
  flags.migrations = flags.migrations || 'migrations'

  flags.knexfile = resolve(flags.cwd, flags.knexfile)
  flags.migrations = resolve(flags.cwd, flags.migrations)

  flags.env = flags.env || process.env.KNEX_ENV || process.env.NODE_ENV || 'development'
}

function knexInit(flags) {
  normalizeFlags(flags)

  const knex = reqFrom.silent(flags.cwd, 'knex')

  if (isNil(knex)) {
    console.error(`Knex not found in '${flags.cwd}'`)
    console.error('Please install it as local dependency with \'npm install --save knex\'')
    process.exit(1)
  }

  let config

  try {
    config = require(flags.knexfile)
  } catch (err) {
    if (/Cannot find module/.test(err.message)) {
      console.error(`No knexfile at '${flags.knexfile}'`)
      console.error('Please create one or bootstrap using \'knex init\'')
      process.exit(1)
    }

    throw err
  }

  if (!existsSync(flags.migrations)) {
    console.error(`No migrations directory at '${flags.migrations}'`)
    console.error('Please create your first migration with \'knex migrate:make <name>\'')
    process.exit(1)
  }

  if (config[flags.env] && config[flags.env]) {
    config = config[flags.env]
  }

  if (typeof config !== 'object') {
    console.log(`Malformed knexfile.js:`)
    console.log(JSON.stringify(config, null, 2))
    process.exit(1)
  }

  if (flags.verbose) {
    const environment = Object.assign({}, flags, { config })
    console.log(prettyjson.render(environment, { noColor: true }))
  }

  return knex(config)
}

function umzugKnex(connection) {
  return new Umzug({
    storage: resolve(__dirname, 'storage'),
    storageOptions: { connection },
    migrations: {
      params: [connection, Promise],
      path: cli.flags.migrations,
      pattern: /^\d+[\w-_]+\.js$/,
      wrap: fn => (knex, Promise) => knex.transaction(tx => Promise.resolve(fn(tx, Promise)))
    }
  })
}

function help() {
  console.log(cli.help)
  process.exit(1)
}

function umzugOptions() {
  if (isNil(cli.flags.to) && !isNil(cli.input[1])) {
    cli.flags.to = cli.input[1]
  }

  if (isNil(cli.flags.to) && isNil(cli.flags.from)) {
    if (isNil(cli.flags.only)) {
      return {}
    }

    return cli.flags.only
  }

  if (cli.flags.to === '0') {
    cli.flags.to = 0
  }

  if (cli.flags.from === '0') {
    cli.flags.from = 0
  }

  return omitBy({ to: cli.flags.to, from: cli.flags.from }, isNil)
}

async function main() {
  if (cli.input.length < 1 && !cli.flags.list) {
    help()
  }

  const umzug = umzugKnex(knexInit(cli.flags))

  await umzug.storage.ensureTable()

  const api = createApi(process.stdout, umzug)

  const command = cli.input[0]

  switch (command) {
    case 'list':
      await api.history()
      break
    case 'pending':
      await api.pending()
      break
    case 'down':
      await api.down(umzugOptions())
      break
    case 'up':
      await api.up(umzugOptions())
      break
    case 'rollback':
      await api.rollback()
      break
    case 'redo':
      await api.redo()
      break
    default:
      console.log(cli.help)
  }
}

function createApi(stdout, umzug) {
  const debug = createDebug(stdout)

  umzug
    .on('migrating', debug('migrate'))
    .on('reverting', debug('revert'))
    .on('debug', debug('debug'))

  const api = {
    history: () => {
      return umzug.storage.executed().then(lines => {
        stdout.write(`${lines.join('\n')}\n`)
      })
    },
    pending: () => {
      return umzug.pending().then(migrations => {
        stdout.write(`${migrations.map(mig => mig.file).join('\n')}\n`)
      })
    },
    rollback: async () => {
      return umzug.storage.migrations().then(async migrations => {
        if (migrations.length === 0) {
          return
        }

        const maxBatch = maxBy(migrations, 'batch').batch
        const lastBatch = filter(migrations, { batch: maxBatch })
        const firstFromBatch = minBy(lastBatch, 'migration_time')

        return updown(stdout, umzug, 'down')({ to: firstFromBatch.name })
      })
    },
    redo: async () => {
      await api.rollback()
      await api.up()
    },
    up: updown(stdout, umzug, 'up'),
    down: updown(stdout, umzug, 'down'),
    execute: updown(stdout, umzug, 'execute')
  }

  return api
}

function updown(stdout, umzug, type) {
  return opts => {
    return umzug[type](opts)
  }
}

function createDebug(stdout) {
  return function debug(type) {
    return function (message) {
      if (type === 'migrate') {
        stdout.write(`↑ ${message}...\n`)
      } else if (type === 'revert') {
        stdout.write(`↓ ${message}...\n`)
      } else {
        stdout.write(`${message}\n`)
      }
    }
  }
}

main().then(() => {
  process.exit(0)
}, err => {
  if (cli.flags.verbose) {
    console.error(err.stack)
  } else {
    console.error(err.message)
  }
  process.exit(1)
})

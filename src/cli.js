#!/usr/bin/env node

import { join } from 'path'
import { existsSync } from 'fs'
import reqCwd from 'req-cwd'
import meow from 'meow'
import Umzug from 'umzug'
import { maxBy, minBy, filter, omitBy, isNil } from 'lodash'

const knex = reqCwd('knex')

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

  As a convenience, you can skip --to flag, and just provide migration name.

  Examples
    $ knex-migrate up                  # migrate everytings
    $ knex-migrate up 20160905         # migrate upto given migration name
    $ knex-migrate up --to 20160905    # the same as above
    $ knex-migrate up --only 201609085 # migrate up single migration
    $ knex-migrate down --to 0         # rollback all migrations
    $ knex-migrate down                # rollback single migration
    $ knex-migrate rollback            # rollback previous "up"
    $ knex-migrate redo                # rollback and migrate everything
`, {
  alias: {
    to: 't',
    from: 'f',
    only: 'o'
  },
  string: ['to', 'from', 'only']
})

function config() {
  const knexPath = join(process.cwd(), 'knexfile.js')

  let environments

  try {
    environments = require(knexPath)
  } catch (err) {
    if (/Cannot find module/.test(err.message)) {
      console.error(`No knexfile at '${knexPath}'`)
      console.error('Please create one or bootstrap using \'knex init\'')
      process.exit(1)
    }

    throw err
  }

  const migrationsPath = join(process.cwd(), 'migrations')

  if (!existsSync(migrationsPath)) {
    console.error(`No migrations directory at '${migrationsPath}'`)
    console.error('Please create your first migration with \'knex migrate:make <name>\'')
    process.exit(1)
  }

  if (process.env.NODE_ENV) {
    return environments[process.env.NODE_ENV]
  }

  return environments.development
}

function umzugKnex(connection) {
  return new Umzug({
    storage: join(__dirname, 'storage'),
    storageOptions: {
      tableName: 'migrations',
      connection
    },
    migrations: {
      params: [connection, Promise],
      path: 'migrations',
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
  try {
    if (cli.input.length < 1 && !cli.flags.list) {
      help()
    }

    const umzug = umzugKnex(knex(config()))

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

    process.exit(0)
  } catch (err) {
    console.error(err.message)
    process.exit(1)
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

main()

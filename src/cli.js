#!/usr/bin/env node

const minimist = require('minimist')
const { isNil } = require('lodash')
const knexMigrate = require('./')

const cliHelp = `
Usage
  $ knex-migrate <command> [options]

Commands
  generate  Generate migration
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
  --step, -s  Limit the number of migrations to apply

Global options:
  --cwd         Specify the working directory
  --knexfile    Specify the knexfile path ($cwd/knexfile.js)
  --migrations  Specify migrations path ($cwd/migrations)
  --env         Specify environment ($KNEX_ENV || $NODE_ENV || 'development')
  --raw         Disable transactions
  --verbose     Be more verbose

As a convenience, you can skip --to flag, and just provide migration name.

Examples
  $ knex-migrate up                    # migrate to the latest version
  $ knex-migrate up 20160905           # migrate to a specific version
  $ knex-migrate up --to 20160905      # the same as above
  $ knex-migrate up --only 201609085   # apply a single migration
  $ knex-migrate up --step             # apply only the next migration
  $ knex-migrate up --step 2           # apply only the next two migrations
  $ knex-migrate down --to 0           # rollback all migrations
  $ knex-migrate down                  # rollback single migration
  $ knex-migrate down --step 2         # rollback the previous two migrations
  $ knex-migrate rollback              # rollback previous "up"
  $ knex-migrate redo --verbose        # rollback and migrate everything
  $ knex-migrate generate create_users # generate migration creating users table
`

const options = {
  alias: {
    to: 't',
    from: 'f',
    only: 'o',
    step: 's'
  },
  string: ['to', 'from', 'only', 'step']
}

function help () {
  console.log(cliHelp)
  process.exit(1)
}

async function main () {
  const flags = require('minimist')(process.argv.slice(2), options)
  const input = flags._

  if (input.length < 1 && !flags.list) {
    help()
  }

  const command = input[0]

  if (command === 'generate') {
    if (isNil(flags.name) && !isNil(input[1])) {
      flags.name = input[1]
    }
  } else {
    if (isNil(flags.to) && !isNil(input[1])) {
      flags.to = input[1]
    }
  }

  try {
    const result = await knexMigrate(
      command,
      flags,
      consoleDebug(process.stdout)
    )

    if (Array.isArray(result) && typeof result[0] === 'string') {
      console.log(result.join('\n'))
    }
    if (typeof result === 'string') {
      console.log(result)
    }
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}

function consoleDebug (stdout) {
  return ({ action, migration }) => {
    if (action === 'migrate') {
      stdout.write(`↑ ${migration}\n`)
    } else if (action === 'revert') {
      stdout.write(`↓ ${migration}\n`)
    } else {
      stdout.write(`${migration}\n`)
    }
  }
}

main().then(
  () => {},
  err => {
    if (flags.verbose) {
      console.error(err.stack)
    } else {
      console.error(err.message)
    }
    process.exit(1)
  }
)

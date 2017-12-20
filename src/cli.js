#!/usr/bin/env node

import meow from 'meow'
import {isNil} from 'lodash'
import knexMigrate from './'

const cli = meow(
  `
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
    $ knex-migrate up                  # migrate to the latest version
    $ knex-migrate up 20160905         # migrate to a specific version
    $ knex-migrate up --to 20160905    # the same as above
    $ knex-migrate up --only 201609085 # apply a single migration, skipping prior migrations
    $ knex-migrate up --step           # apply only the next migration
    $ knex-migrate up --step 2         # apply only the next two migrations
    $ knex-migrate down --to 0         # rollback all migrations
    $ knex-migrate down                # rollback single migration
    $ knex-migrate down --step 2       # rollback the previous two migrations
    $ knex-migrate rollback            # rollback previous "up"
    $ knex-migrate redo --verbose      # rollback and migrate everything
 `,
  {
    alias: {
      to: 't',
      from: 'f',
      only: 'o',
      step: 's'
    },
    string: ['to', 'from', 'only', 'step']
  }
)

function help () {
  console.log(cli.help)
  process.exit(1)
}

async function main () {
  if (cli.input.length < 1 && !cli.flags.list) {
    help()
  }

  if (isNil(cli.flags.to) && !isNil(cli.input[1])) {
    cli.flags.to = cli.input[1]
  }

  try {
    const result = await knexMigrate(
      cli.input[0],
      cli.flags,
      consoleDebug(process.stdout)
    )

    if (Array.isArray(result) && typeof result[0] === 'string') {
      console.log(result.join('\n'))
    }
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}

function consoleDebug (stdout) {
  return ({type, migration}) => {
    if (type === 'migrate') {
      stdout.write(`↑ ${migration}...\n`)
    } else if (type === 'revert') {
      stdout.write(`↓ ${migration}...\n`)
    } else {
      stdout.write(`${migration}\n`)
    }
  }
}

main().then(
  () => {},
  err => {
    if (cli.flags.verbose) {
      console.error(err.stack)
    } else {
      console.error(err.message)
    }
    process.exit(1)
  }
)

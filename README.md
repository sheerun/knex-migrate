![Knex Migrate](http://i.imgur.com/MMWMf5T.png)

[![Unix CI](https://img.shields.io/travis/sheerun/knex-migrate/master.svg)](https://travis-ci.org/sheerun/knex-migrate)
[![Windows CI](https://img.shields.io/appveyor/ci/sheerun/knex-migrate/master.svg)](https://ci.appveyor.com/project/sheerun/knex-migrate)
[![Modern Node](https://img.shields.io/badge/modern-node-9BB48F.svg)](https://github.com/sheerun/modern-node)

> Modern migration toolkit for knex.js

## Features

- [x] 100% compatible with knex.js [migrations cli](http://knexjs.org/#Migrations)
- [x] can migrate upto and downto any migration
- [x] able to run individual migrations
- [x] quickly rollback recent migrations
- [x] redo feature: rollback and migrate again for quick testing
- [x] runs migrations in transactions
- [x] friendly ui 🌹

## Installation

```
npm install --save knex-migrate
```

You should also install `knex` as it's a peer dependency of this package.

## Usage

First, init project with `knex init`, and then:

```
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
```

## Programmatic API

```es6
import knexMigrate from 'knex-migrate'

// It has following signature:
// knexMigrate(command: String, flags: Object, progress: Function)

async function run() {
  // Action can be: migrate, revert. Migration is migration name. For example:
  // Doing migrate on 20170427093232_add_users
  // Doing revert on 20170427093232_add_users
  const log = ({ action, migration }) =>
    console.log('Doing ' + action + ' on ' + migration)

  await knexMigrate('up', { to: '20170727093232' }, log)
  await knexMigrate('down', { step: 2 }, log)
  await knexMigrate('down', { to: 0 }, log)
  await knexMigrate('up', {}, log)
  await knexMigrate('redo', {}, log)
  await knexMigrate('rollback', {}, log)
  await knexMigrate('redo', {}, log)
  await knexMigrate('down', { to: 0 }, log)
}

run()
```

## Thank you

- [@marcbachmann](https://github.com/marcbachmann) for inspiration and starting point ([knex-umzug](https://github.com/marcbachmann/knex-umzug) and [umzug-cli](https://github.com/marcbachmann/umzug-cli))
- [@carlbennettnz](https://github.com/carlbennettnz) for suggesting and implementing `--step` option
- [@chadxz](https://github.com/chadxz) for suggesting and implementing various improvements

## License

MIT

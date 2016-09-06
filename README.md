![Modern Node Boilerplate](http://i.imgur.com/MMWMf5T.png)

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

First, init project with `knex init`, add migrations with `knex migrate:make`, and then:

```
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
```

## License

MIT

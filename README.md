![Modern Node Boilerplate](http://i.imgur.com/MMWMf5T.png)

[![Modern Node](https://img.shields.io/badge/modern-node-9BB48F.svg)](https://github.com/sheerun/modern-node)

> Modern migration toolkit for knex.js

## Features

- [x] 100% compatible with knex.js migration toolkit
- [x] can migrate upto and downto any migration
- [x] able to run individual migrations
- [x] quickly rollback recent migrations
- [x] redo feature: rollback and migrate again for quick testing

## Installation

```
npm install --save knex-migrate
```

## Usage

First, init project with `knex init`, and migrations with `knex migrate:make`, and:

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

Examples
  $ knex-migrate up                  # migrate everytings
  $ knex-migrate up --to 20160905    # migrate upto given migration
  $ knex-migrate up --only 201609085 # migrate up single migration
  $ knex-migrate down --to 0         # rollback all migrations
  $ knex-migrate down                # rollback single migration
  $ knex-migrate rollback            # rollback previous "up"
  $ knex-migrate redo                # rollback and migrate previous batch
```

## License

MIT

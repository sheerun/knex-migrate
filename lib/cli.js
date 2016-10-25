#!/usr/bin/env node
'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var main = function () {
  var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
    var umzug, api, command;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;

            if (cli.input.length < 1 && !cli.flags.list) {
              help();
            }

            umzug = umzugKnex(knex(config()));
            _context.next = 5;
            return umzug.storage.ensureTable();

          case 5:
            api = createApi(process.stdout, umzug);
            command = cli.input[0];
            _context.t0 = command;
            _context.next = _context.t0 === 'list' ? 10 : _context.t0 === 'pending' ? 13 : _context.t0 === 'down' ? 16 : _context.t0 === 'up' ? 19 : _context.t0 === 'rollback' ? 22 : _context.t0 === 'redo' ? 25 : 28;
            break;

          case 10:
            _context.next = 12;
            return api.history();

          case 12:
            return _context.abrupt('break', 29);

          case 13:
            _context.next = 15;
            return api.pending();

          case 15:
            return _context.abrupt('break', 29);

          case 16:
            _context.next = 18;
            return api.down(umzugOptions());

          case 18:
            return _context.abrupt('break', 29);

          case 19:
            _context.next = 21;
            return api.up(umzugOptions());

          case 21:
            return _context.abrupt('break', 29);

          case 22:
            _context.next = 24;
            return api.rollback();

          case 24:
            return _context.abrupt('break', 29);

          case 25:
            _context.next = 27;
            return api.redo();

          case 27:
            return _context.abrupt('break', 29);

          case 28:
            console.log(cli.help);

          case 29:

            process.exit(0);
            _context.next = 36;
            break;

          case 32:
            _context.prev = 32;
            _context.t1 = _context['catch'](0);

            console.error(_context.t1.message);
            process.exit(1);

          case 36:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[0, 32]]);
  }));

  return function main() {
    return _ref.apply(this, arguments);
  };
}();

var _path = require('path');

var _fs = require('fs');

var _reqFrom = require('req-from');

var _reqFrom2 = _interopRequireDefault(_reqFrom);

var _meow = require('meow');

var _meow2 = _interopRequireDefault(_meow);

var _umzug = require('umzug');

var _umzug2 = _interopRequireDefault(_umzug);

var _lodash = require('lodash');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var knex = _reqFrom2.default.silent(process.cwd(), 'knex');

if ((0, _lodash.isNil)(knex)) {
  console.error('Knex not found in \'' + process.cwd() + '\'');
  console.error('Please install it as local dependency with \'npm install --save knex\'');
  process.exit(1);
}

var cli = (0, _meow2.default)('\n  Usage\n    $ knex-migrate <command> [options]\n\n  Commands\n    pending   Lists all pending migrations\n    list      Lists all executed migrations\n    up        Performs all pending migrations\n    down      Rollbacks last migration\n    rollback  Rollbacks last batch of migrations\n    redo      Rollbacks last batch and performs all migrations\n\n  Options for "up" and "down":\n    --to, -t    Migrate upto (downto) specific version\n    --from, -f  Start migration from specific version\n    --only, -o  Migrate only specific version\n\n  As a convenience, you can skip --to flag, and just provide migration name.\n\n  Examples\n    $ knex-migrate up                  # migrate everytings\n    $ knex-migrate up 20160905         # migrate upto given migration name\n    $ knex-migrate up --to 20160905    # the same as above\n    $ knex-migrate up --only 201609085 # migrate up single migration\n    $ knex-migrate down --to 0         # rollback all migrations\n    $ knex-migrate down                # rollback single migration\n    $ knex-migrate rollback            # rollback previous "up"\n    $ knex-migrate redo                # rollback and migrate everything\n', {
  alias: {
    to: 't',
    from: 'f',
    only: 'o'
  },
  string: ['to', 'from', 'only']
});

function config() {
  var knexPath = (0, _path.join)(process.cwd(), 'knexfile.js');

  var environments = void 0;

  try {
    environments = require(knexPath);
  } catch (err) {
    if (/Cannot find module/.test(err.message)) {
      console.error('No knexfile at \'' + knexPath + '\'');
      console.error('Please create one or bootstrap using \'knex init\'');
      process.exit(1);
    }

    throw err;
  }

  var migrationsPath = (0, _path.join)(process.cwd(), 'migrations');

  if (!(0, _fs.existsSync)(migrationsPath)) {
    console.error('No migrations directory at \'' + migrationsPath + '\'');
    console.error('Please create your first migration with \'knex migrate:make <name>\'');
    process.exit(1);
  }

  if (process.env.NODE_ENV) {
    return environments[process.env.NODE_ENV];
  }

  return environments.development;
}

function umzugKnex(connection) {
  return new _umzug2.default({
    storage: (0, _path.join)(__dirname, 'storage'),
    storageOptions: {
      tableName: 'migrations',
      connection: connection
    },
    migrations: {
      params: [connection, _bluebird2.default],
      path: 'migrations',
      pattern: /^\d+[\w-_]+\.js$/,
      wrap: function wrap(fn) {
        return function (knex, Promise) {
          return knex.transaction(function (tx) {
            return Promise.resolve(fn(tx, Promise));
          });
        };
      }
    }
  });
}

function help() {
  console.log(cli.help);
  process.exit(1);
}

function umzugOptions() {
  if ((0, _lodash.isNil)(cli.flags.to) && !(0, _lodash.isNil)(cli.input[1])) {
    cli.flags.to = cli.input[1];
  }

  if ((0, _lodash.isNil)(cli.flags.to) && (0, _lodash.isNil)(cli.flags.from)) {
    if ((0, _lodash.isNil)(cli.flags.only)) {
      return {};
    }

    return cli.flags.only;
  }

  if (cli.flags.to === '0') {
    cli.flags.to = 0;
  }

  if (cli.flags.from === '0') {
    cli.flags.from = 0;
  }

  return (0, _lodash.omitBy)({ to: cli.flags.to, from: cli.flags.from }, _lodash.isNil);
}

function createApi(stdout, umzug) {
  var _this = this;

  var debug = createDebug(stdout);

  umzug.on('migrating', debug('migrate')).on('reverting', debug('revert')).on('debug', debug('debug'));

  var api = {
    history: function history() {
      return umzug.storage.executed().then(function (lines) {
        stdout.write(lines.join('\n') + '\n');
      });
    },
    pending: function pending() {
      return umzug.pending().then(function (migrations) {
        stdout.write(migrations.map(function (mig) {
          return mig.file;
        }).join('\n') + '\n');
      });
    },
    rollback: function () {
      var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                return _context3.abrupt('return', umzug.storage.migrations().then(function () {
                  var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(migrations) {
                    var maxBatch, lastBatch, firstFromBatch;
                    return _regenerator2.default.wrap(function _callee2$(_context2) {
                      while (1) {
                        switch (_context2.prev = _context2.next) {
                          case 0:
                            if (!(migrations.length === 0)) {
                              _context2.next = 2;
                              break;
                            }

                            return _context2.abrupt('return');

                          case 2:
                            maxBatch = (0, _lodash.maxBy)(migrations, 'batch').batch;
                            lastBatch = (0, _lodash.filter)(migrations, { batch: maxBatch });
                            firstFromBatch = (0, _lodash.minBy)(lastBatch, 'migration_time');
                            return _context2.abrupt('return', updown(stdout, umzug, 'down')({ to: firstFromBatch.name }));

                          case 6:
                          case 'end':
                            return _context2.stop();
                        }
                      }
                    }, _callee2, _this);
                  }));

                  return function (_x) {
                    return _ref3.apply(this, arguments);
                  };
                }()));

              case 1:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, _this);
      }));

      return function rollback() {
        return _ref2.apply(this, arguments);
      };
    }(),
    redo: function () {
      var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.next = 2;
                return api.rollback();

              case 2:
                _context4.next = 4;
                return api.up();

              case 4:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, _this);
      }));

      return function redo() {
        return _ref4.apply(this, arguments);
      };
    }(),
    up: updown(stdout, umzug, 'up'),
    down: updown(stdout, umzug, 'down'),
    execute: updown(stdout, umzug, 'execute')
  };

  return api;
}

function updown(stdout, umzug, type) {
  return function (opts) {
    return umzug[type](opts);
  };
}

function createDebug(stdout) {
  return function debug(type) {
    return function (message) {
      if (type === 'migrate') {
        stdout.write('\u2191 ' + message + '...\n');
      } else if (type === 'revert') {
        stdout.write('\u2193 ' + message + '...\n');
      } else {
        stdout.write(message + '\n');
      }
    };
  };
}

main();
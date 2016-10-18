'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function isString(s) {
  return typeof s === 'string';
}

function tableDoesNotExist(err, table) {
  return new RegExp('relation "' + table + '" does not exist').test(err.message) || new RegExp('no such table: ' + table).test(err.message);
}

module.exports = function () {
  function KnexStorage(options) {
    (0, _classCallCheck3.default)(this, KnexStorage);

    this.knex = options.storageOptions.connection;
    this.tableName = (0, _lodash.get)(this.knex, 'client.config.migrations.tableName', 'knex_migrations');
    (0, _invariant2.default)(isString(this.tableName), 'The option \'options.storageOptions.tableName\' is required.');
    (0, _invariant2.default)(this.knex, 'The option \'options.storageOptions.connection\' is required.');
  }

  (0, _createClass3.default)(KnexStorage, [{
    key: 'ensureTable',
    value: function ensureTable() {
      var _this = this;

      return this.knex(this.tableName).count('id').catch(function (err) {
        if (tableDoesNotExist(err, _this.tableName)) {
          return _this.knex.schema.createTable(_this.tableName, function (table) {
            table.increments();
            table.string('name');
            table.integer('batch');
            table.dateTime('migration_time');
          });
        }

        throw err;
      });
    }
  }, {
    key: 'logMigration',
    value: function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(migrationName) {
        var currentBatch;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (typeof this.currentBatch === 'undefined') {
                  this.currentBatch = this.getCurrentBatch();
                }

                _context.next = 3;
                return this.currentBatch;

              case 3:
                currentBatch = _context.sent;
                return _context.abrupt('return', this.knex(this.tableName).insert({
                  name: migrationName,
                  batch: currentBatch + 1,
                  migration_time: new Date() // eslint-disable-line camelcase
                }));

              case 5:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function logMigration(_x) {
        return _ref.apply(this, arguments);
      }

      return logMigration;
    }()
  }, {
    key: 'unlogMigration',
    value: function unlogMigration(migrationName) {
      return this.knex(this.tableName).where('name', migrationName).del();
    }
  }, {
    key: 'migrations',
    value: function migrations() {
      return this.knex(this.tableName).select().orderBy('migration_time', 'asc');
    }
  }, {
    key: 'executed',
    value: function executed() {
      return this.knex(this.tableName).orderBy('migration_time', 'asc').pluck('name');
    }
  }, {
    key: 'getCurrentBatch',
    value: function getCurrentBatch() {
      return this.knex(this.tableName).max('batch as max_batch').then(function (obj) {
        return obj[0].max_batch || 0;
      });
    }
  }]);
  return KnexStorage;
}();
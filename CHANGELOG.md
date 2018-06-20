# Change Log

# 1.6.0

### Added

- Allow for specify config programatically with `config` argument

# Change Log

# 1.5.1

### Fixed

- Include js.stub file in release

# 1.5.0

### Changed

- Add programmatic API
- Ability to disable transactions with --raw flag
- Redact connection string in verbose mode (to not leak password)
- Support for generating migrations

### Fixed

- Gracefully destroy connection pool
- Limit connection pool to one connection

# 1.4.0

### Changed

- Add ability to migrate in steps (--step flag)

## 1.3.1

### Fixed

- Properly create initial migrations table, #10

## 1.3.0

### Changed

- Use migrations path in knexfile.js when available, fixes #4
- Order migrations by id instead of created_at, fixes #6

## 1.2.0

### Changed

- compatibility: Use Bluebird promise library instead of native one
- compatibility: Respect knexfile configuration without environment namespaces

### Added

- `cwd`, `knexfile`, `migrations`, `table`, `env`, and `verbose` flags

## 1.1.2

First truly public version

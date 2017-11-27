# Change Log

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

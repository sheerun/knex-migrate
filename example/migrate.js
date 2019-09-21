#!/usr/bin/env node

const knexMigrate = require('../src')

// It has following signature:
// knexMigrate(command: String, flags: Object, progress: Function)

async function run () {
  const log = ({ action, migration }) =>
    console.log('Doing ' + action + ' on ' + migration)

  const knexfile = 'knexfile-custom.js'
  await knexMigrate('up', { to: '20170727093232', knexfile }, log)
  await knexMigrate('down', { step: 2, knexfile }, log)
  await knexMigrate('down', { to: 0, knexfile }, log)
  await knexMigrate('up', { knexfile }, log)
  await knexMigrate('redo', { knexfile }, log)
  await knexMigrate('rollback', { knexfile }, log)
  await knexMigrate('redo', { knexfile }, log)
  await knexMigrate('down', { to: 0, knexfile }, log)
}

run().then(
  () => {},
  err => {
    console.error(err.message)
    process.exit(1)
  }
)

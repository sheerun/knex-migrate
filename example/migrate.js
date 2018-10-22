#!/usr/bin/env node

const knexMigrate = require('../src')

// It has following signature:
// knexMigrate(command: String, flags: Object, progress: Function)

async function run () {
  const log = ({ action, migration }) =>
    console.log('Doing ' + action + ' on ' + migration)

  await knexMigrate('down')
  await knexMigrate('up', { to: '20170727093232' }, log)
  await knexMigrate('down', { step: 2 }, log)
  await knexMigrate('down', { to: 0 }, log)
  await knexMigrate('up', {}, log)
  await knexMigrate('redo', {}, log)
  await knexMigrate('rollback', {}, log)
  await knexMigrate('redo', {}, log)
  await knexMigrate('down', { to: 0 }, log)

  await knexMigrate('up', {}, log, umzug => {
    umzug.on('migrated', (name, migration) => {
      console.log('Umzug "migrated" event:', name, migration)
    })
  })
}

run().then(
  () => {},
  err => {
    console.error(err.message)
    process.exit(1)
  }
)

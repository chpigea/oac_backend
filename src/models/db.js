const knex = require('knex');
const config = require('../config')

const db = knex({
  client: 'pg', 
  connection: config.database,
  pool: { min: 2, max: 10 }
});

module.exports = { db, schema: config.schema || 'public' };
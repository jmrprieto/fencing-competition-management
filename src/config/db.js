const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Optional SSL config (needed for many cloud providers)
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,

  // Pool tuning (safe defaults for low-resource environments)
  max: 10, // max number of connections
  idleTimeoutMillis: 30000, // close idle clients after 30s
  connectionTimeoutMillis: 2000 // return error after 2s if cannot connect
});


// Optional: test connection at startup
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
}


// Helper for queries (optional but recommended)
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    // Optional logging (can be removed in production)
    if (process.env.DB_LOG === 'true') {
      console.log('executed query', { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (err) {
    console.error('Query error:', err.message);
    throw err;
  }
}


// Export everything needed
module.exports = {
  pool,
  query,
  testConnection
};

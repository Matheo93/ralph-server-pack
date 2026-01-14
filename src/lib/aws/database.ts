import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

// Create connection pool
const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err)
})

// Query helper with typed results
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now()
  try {
    const result: QueryResult<T> = await pool.query<T>(text, params)
    const duration = Date.now() - start
    if (process.env['NODE_ENV'] === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount })
    }
    return result.rows
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Query that returns a single row or null
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

// Insert helper that returns the inserted row
export async function insert<T extends QueryResultRow = QueryResultRow>(
  table: string,
  data: Record<string, unknown>
): Promise<T | null> {
  const keys = Object.keys(data)
  const values = Object.values(data)
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
  const columns = keys.join(', ')

  const text = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`
  return queryOne<T>(text, values)
}

// Update helper
export async function update<T extends QueryResultRow = QueryResultRow>(
  table: string,
  id: string,
  data: Record<string, unknown>,
  idColumn: string = 'id'
): Promise<T | null> {
  const keys = Object.keys(data)
  const values = Object.values(data)
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')

  const text = `UPDATE ${table} SET ${setClause} WHERE ${idColumn} = $${keys.length + 1} RETURNING *`
  return queryOne<T>(text, [...values, id])
}

// Delete helper
export async function remove(
  table: string,
  id: string,
  idColumn: string = 'id'
): Promise<boolean> {
  const text = `DELETE FROM ${table} WHERE ${idColumn} = $1`
  const result = await pool.query(text, [id])
  return (result.rowCount ?? 0) > 0
}

// Transaction helper
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Set current user for RLS (call at beginning of each request)
export async function setCurrentUser(userId: string): Promise<void> {
  await query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId])
}

// Get pool for advanced usage
export function getPool(): Pool {
  return pool
}

// Close pool (for graceful shutdown)
export async function closePool(): Promise<void> {
  await pool.end()
}

// Health check
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1')
    return true
  } catch {
    return false
  }
}

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator'
import { ulidFactory } from "ulid-workers";
import { toCSV, parseFilter, filterNulls } from './utils';
import { Constituent, QueryParams, ConstituentParams } from './types';


// Setup

const app: Hono<{ Bindings: Bindings }> = new Hono<{ Bindings: Bindings }>();

const ulid = ulidFactory();


// Routes

/**
 * GET /constituents
 * 
 * This route returns a list of constituents from the database.
 * It accepts query parameters for pagination, validated with zod.
 * 
 * Examples:
 * - GET /constituents
 * - GET /constituents?limit=10&offset=0
 * - GET /constituents?format=csv&created_at=>2024-11-13T00:00:00Z
 * 
 * Parameters:
 * - limit: The number of records to return (default: 25)
 * - offset: The number of records to skip (default: 0)
 * - sort: The column to sort by (default: created_at)
 * - order: The sort order (asc, desc) (default: asc)
 * - format: The response format (json, csv) (default: json)
 * - created_at: A datetime filter for the created_at column
 */
app.get('/constituents', zValidator('query', QueryParams), async (c) => {
  const { limit, offset, sort, order, format, created_at } = c.req.valid('query');

  try {
    // in order to meet the requirements using a `format=*` query parameter, exporting the whole table as CSV with a filter,
    // we need to handle the CSV query differently from the JSON query. so we will fork the logic here.

    // handle CSV case
    if (format === 'csv') {
      // if a created_at filter is provided, we need to parse it into a WHERE clause,
      const { query, value } = parseFilter(created_at);
      const whereQuery = created_at ? `WHERE ${query} ?2` : ''; 

      const { results } = await c.env.DB.prepare(
        `SELECT * FROM constituents ${whereQuery} ORDER BY ?1`
      )
      .bind(...filterNulls([`${sort} ${order}`, value]))
      .all<Constituent>();

      // convert the results to CSV and return it
      const csv = toCSV(results);
      c.header('Content-Type', 'text/csv');
      c.status(200);
      return c.body(csv);
    
    // handle JSON case
    } else {
      const { results }: { results: Constituent[] } = await c.env.DB.prepare(
        "SELECT * FROM constituents ORDER BY ?1 LIMIT ?2 OFFSET ?3"
      )
        .bind(`${sort} ${order}`, limit, offset)
        .all<Constituent>();
      
      return c.json(results);
    }
  } catch (e: any) {
    return c.json({ err: e.message }, 500);
  }
})


/**
 * POST /constituents
 * 
 * This route creates a new constituent in the database.
 * If a constituent with the same email already exists, it updates the existing record.
 * Parameters are validated with zod using the zValidator middleware.
 */
app.post('/constituents', zValidator('json', ConstituentParams), async (c) => {
  // we want to differentiate here between the request body parameter validation, and the constituent object
  // that interacts with our database
  const constituentParams: ConstituentParams = c.req.valid('json');
  const constituent = Constituent.parse({
    ...constituentParams,
    id: ulid(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  try {
    /**
     * The following SQL query:
     * 1. Tries to insert a new constituent into the database
     * 2. If the constituent already exists, it updates the existing record
     * 3. Returns the updated record
     */
    const { results } = await c.env.DB.prepare(
        `INSERT INTO constituents (id, email, name, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      + `  ON CONFLICT(email) DO UPDATE SET`
      + `    name = excluded.name,`
      + `    phone = excluded.phone,`
      + `    address = excluded.address,`
      + `    updated_at = excluded.updated_at`
      + `  RETURNING *`
    )
      .bind(
        constituent.id,
        constituent.email,
        constituent.name ?? null,    // if name, phone, or address are not provided, set them to null
        constituent.phone ?? null,   // NOTE: this isn't ideal, but SQLite doesn't support UPSERT like other databases
        constituent.address ?? null, // so for the sake of time on this take-home project I'll make the tradeoff
        constituent.created_at,
        constituent.updated_at,
      )
      .run();
    
    // safely select the first row from the result array
    const row = results?.[0];
    return c.json(row, 201);
  } catch (e: any) {
    return c.json({ err: e.message }, 500);
  }
});

// Export

export default app;

import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function main() {
  console.log('Applying SQL fix: Adding parcelWeightGrams to Order table...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    await client.query('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "parcelWeightGrams" INTEGER;');
    client.release();
    console.log('SUCCESS: Column added (or already exists).');
  } catch (error) {
    console.error('FAILED to apply SQL fix:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

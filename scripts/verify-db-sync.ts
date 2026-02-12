import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function main() {
  console.log('Verifying orders list functionality...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const orders = await prisma.order.findMany({
      take: 1,
      include: { items: true },
    });
    console.log('SUCCESS: List orders works.');
    console.log('Sample order object structure:', JSON.stringify(Object.keys(orders[0] || {})));

    if (orders.length > 0 && 'parcelWeightGrams' in orders[0]) {
      console.log('SUCCESS: parcelWeightGrams present in result.');
    } else if (orders.length > 0) {
      console.warn(
        'WARNING: parcelWeightGrams NOT present in result keys. Prisma Client Might need refresh.'
      );
    }
  } catch (error) {
    console.error('FAILED to list orders:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

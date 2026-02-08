import 'dotenv/config';
import { jsonDb } from '../src/lib/db-json';
import { sqlDb } from '../src/lib/db-sql';
import { EntityType } from '../src/lib/db/types';

async function verify() {
  console.log('--- STARTING SQL PARITY CHECK ---');

  const entities: EntityType[] = [
    'ingredients',
    'recipes',
    'orders',
    'packs',
    'suppliers',
    'movements',
  ];

  let allMatch = true;

  for (const entity of entities) {
    console.log(`Checking ${entity}...`);
    const jsonItems = await jsonDb.readAll(entity, 'org-1');
    const sqlItems = await sqlDb.readAll(entity, 'org-1');

    console.log(`  JSON: ${jsonItems.length}`);
    console.log(`  SQL:  ${sqlItems.length}`);

    if (jsonItems.length !== sqlItems.length) {
      console.error(`❌ Count mismatch for ${entity}!`);
      allMatch = false;
    } else {
      console.log(`✅ Count matches.`);
    }

    // Verify a random sample
    if (jsonItems.length > 0) {
      const randomIdx = Math.floor(Math.random() * jsonItems.length);
      const jItem = jsonItems[randomIdx] as any;
      const sItem = (await sqlDb.getById(entity, jItem.id, 'org-1')) as any;

      if (!sItem) {
        console.error(`❌ Sample item ${jItem.id} not found in SQL!`);
        allMatch = false;
      } else {
        // Compare keys (shallow)
        let sampleMatch = true;
        // Check a few critical keys
        const criticalKeys = ['id', 'name', 'status', 'totalCost', 'price', 'quantity'];
        for (const key of criticalKeys) {
          if (jItem[key] !== undefined && sItem[key] !== undefined) {
            if (jItem[key] != sItem[key]) {
              // Loose equality for numbers/strings?
              // Handle Date objects vs strings?
              // Json DB likely returns strings for dates, Prisma might return Date objects.
              // Skipping date comparison for simple check
              if (key === 'totalCost' || key === 'price') {
                if (Math.abs(jItem[key] - sItem[key]) > 0.01) {
                  console.error(
                    `Mismatch on ${entity} ${jItem.id} key ${key}: JSON ${jItem[key]} vs SQL ${sItem[key]}`
                  );
                  sampleMatch = false;
                }
              } else {
                if (String(jItem[key]) !== String(sItem[key])) {
                  console.error(
                    `Mismatch on ${entity} ${jItem.id} key ${key}: JSON ${jItem[key]} vs SQL ${sItem[key]}`
                  );
                  sampleMatch = false;
                }
              }
            }
          }
        }
        if (sampleMatch) console.log(`✅ Sample ${jItem.id} matches.`);
        else {
          allMatch = false;
          console.error(`❌ Sample ${jItem.id} data mismatch.`);
        }
      }
    }
  }

  if (allMatch) {
    console.log('--- VERIFICATION SUCCESS ---');
    process.exit(0);
  } else {
    console.error('--- VERIFICATION FAILED ---');
    process.exit(1);
  }
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});

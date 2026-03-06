import { sqlDb } from '../src/lib/db-sql';

async function verify() {
  const packs = await sqlDb.readAll<any>('packs', 'org-1');
  const target = packs.find(p => p.name.includes("Local Test Pack"));
  if (target) {
     console.log('PACK FOUND:', target.id);
     console.log('ITEMS IN DB:');
     console.log(JSON.stringify(target.items, null, 2));
  } else {
     console.log('NO PACK FOUND');
  }
}

verify().catch(console.error);

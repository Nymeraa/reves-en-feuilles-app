import { jsonDb } from '../src/lib/db-json';
import { sqlDb } from '../src/lib/db-sql';

console.log('JSON DB Loaded:', !!jsonDb);
console.log('SQL DB Loaded:', !!sqlDb);

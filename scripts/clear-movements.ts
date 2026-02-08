
import { readData, writeData, DATA_DIR } from '../src/lib/db-json';
import fs from 'fs';
import path from 'path';

const MOVEMENTS_FILE = 'movements.json';

function clearMovements() {
    const movements = readData<any[]>(MOVEMENTS_FILE, []);
    console.log(`Current movement count: ${movements.length}`);

    // Backup
    const backupPath = path.join(DATA_DIR, `movements.backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(movements, null, 2));
    console.log(`✅ Backup created at: ${backupPath}`);

    // Clear
    writeData(MOVEMENTS_FILE, []);
    console.log('✅ Stock movements history cleared!');
}

clearMovements();

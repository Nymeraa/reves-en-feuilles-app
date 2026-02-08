const net = require('net');
const { URL } = require('url');

const poolerUrl =
  'postgresql://postgres.xsnasjtxcmqktutjvlfp:Sebastienbigbossreves2025@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const directUrl =
  'postgresql://postgres:Sebastienbigbossreves2025@db.xsnasjtxcmqktutjvlfp.supabase.co:5432/postgres';

async function checkPort(connectionString, label) {
  return new Promise((resolve) => {
    try {
      const u = new URL(connectionString);
      const host = u.hostname;
      const port = u.port || 5432;

      console.log(`Checking ${label} (${host}:${port})...`);
      const socket = new net.Socket();
      socket.setTimeout(5000);

      socket.on('connect', () => {
        console.log(`✅ ${label}: Connected!`);
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        console.log(`❌ ${label}: Timeout (Firewall?)`);
        socket.destroy();
        resolve(false);
      });

      socket.on('error', (err) => {
        console.log(`❌ ${label}: Error - ${err.message}`);
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    } catch (e) {
      console.log(`❌ ${label}: Invalid URL - ${e.message}`);
      resolve(false);
    }
  });
}

(async () => {
  console.log('--- NETWORK DEBUG ---');
  await checkPort(poolerUrl, 'POOLER (6543)');
  await checkPort(directUrl, 'DIRECT (5432)');
  console.log('---------------------');
})();

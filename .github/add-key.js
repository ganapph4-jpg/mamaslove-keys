// Adds one activation key to keys.json using the SECRET from GitHub Actions.
// The SECRET lives in the repo's encrypted secrets — never in this code.
const fs = require('fs');

const SECRET = process.env.MLLP_SECRET || '';
const DEVICE_CODE = process.env.DEVICE_CODE || '';
const CUSTOMER_NAME = process.env.CUSTOMER_NAME || '';

if (!SECRET) { console.error('MLLP_SECRET not set'); process.exit(1); }
if (!DEVICE_CODE) { console.error('device_code input missing'); process.exit(1); }

const normalize = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return h >>> 0;
}
function sdbm(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + (h << 6) + (h << 16) - h;
  }
  return h >>> 0;
}
function keyFor(device) {
  const dev = normalize(device);
  const h1 = djb2(SECRET + '|' + dev).toString(36).toUpperCase();
  const h2 = sdbm(dev + '|' + SECRET).toString(36).toUpperCase();
  const raw = (h1 + h2 + 'FFFFFFFF').replace(/[^A-Z0-9]/g, '').slice(0, 15);
  return raw.slice(0, 5) + '-' + raw.slice(5, 10) + '-' + raw.slice(10, 15);
}

const file = 'keys.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!data.keys) data.keys = {};
const dev = normalize(DEVICE_CODE);

if (data.keys[dev]) {
  console.log('::notice::Device ' + dev + ' was already on the list — keeping its existing key.');
} else {
  data.keys[dev] = keyFor(dev);
  data.updated = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

// Mask every key in the log so they never appear in public Actions history.
for (const k of Object.values(data.keys)) {
  console.log('::add-mask::' + k);
}

console.log('::notice::Device ' + dev + ' is now on the key list' + (CUSTOMER_NAME ? ' (' + CUSTOMER_NAME + ')' : '') + '. It can activate as soon as Pages updates (~1 minute).');

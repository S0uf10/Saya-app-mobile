const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(width, height, r, g, b) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw scanlines
  const rowBytes = 1 + width * 3;
  const raw = Buffer.allocUnsafe(height * rowBytes);
  for (let y = 0; y < height; y++) {
    raw[y * rowBytes] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const off = y * rowBytes + 1 + x * 3;
      raw[off] = r; raw[off+1] = g; raw[off+2] = b;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 1 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Purple: rgb(76, 29, 149)
const R = 76, G = 29, B = 149;
const dir = __dirname + '/assets';

console.log('Création des assets...');
fs.writeFileSync(`${dir}/icon.png`, makePNG(1024, 1024, R, G, B));
console.log('✓ icon.png (1024×1024)');
fs.writeFileSync(`${dir}/adaptive-icon.png`, makePNG(1024, 1024, R, G, B));
console.log('✓ adaptive-icon.png (1024×1024)');
fs.writeFileSync(`${dir}/splash.png`, makePNG(1284, 2778, R, G, B));
console.log('✓ splash.png (1284×2778)');
fs.writeFileSync(`${dir}/favicon.png`, makePNG(32, 32, R, G, B));
console.log('✓ favicon.png (32×32)');
console.log('\nAssets créés avec succès !');

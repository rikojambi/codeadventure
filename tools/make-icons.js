/* Pembuat ikon PWA PNG tanpa dependency (node tools/make-icons.js) */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(size, file) {
  const raw = Buffer.alloc(size * (size * 4 + 1), 0);
  const px = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const row = y * (size * 4 + 1) + 1;
    const i = row + x * 4;
    raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a == null ? 255 : a;
  };
  const rect = (x, y, w, h, r, g, b) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, r, g, b);
  };
  const S = size / 16;
  const R = (x, y, w, h, c) => rect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S), c[0], c[1], c[2]);
  // Latar belakang gradasi blok
  rect(0, 0, size, size, 13, 27, 62);
  R(0, 0, 16, 3, [27, 48, 107]);
  R(0, 13, 16, 3, [18, 33, 78]);
  // Kepala robot
  R(3, 3, 10, 9, [13, 22, 38]);
  R(4, 4, 8, 7, [125, 211, 252]);
  R(5, 5, 6, 5, [37, 99, 235]);
  // Mata
  R(6, 6, 1, 2, [255, 255, 255]);
  R(9, 6, 1, 2, [255, 255, 255]);
  R(6, 6, 1, 1, [34, 211, 238]);
  R(9, 6, 1, 1, [34, 211, 238]);
  // Antena
  R(7.5, 1.5, 1, 1.5, [250, 204, 21]);
  R(7, 1, 2, 1, [250, 204, 21]);
  // Kaki
  R(4.5, 12, 2, 1, [17, 24, 39]);
  R(9.5, 12, 2, 1, [17, 24, 39]);
  // Koin kecil
  R(13, 11, 2, 2, [255, 213, 74]);
  R(13.3, 11.3, 0.6, 1.4, [255, 236, 154]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  const out = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))
  ]);
  fs.writeFileSync(path.join(OUT, file), out);
  console.log('Dibuat:', file, size + 'x' + size, out.length + ' bytes');
}
png(192, 'icon-192.png');
png(512, 'icon-512.png');

#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const dataBytes = Buffer.from(data);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(dataBytes.length, 0);
  const crcInput = Buffer.concat([typeBytes, dataBytes]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, dataBytes, crcBuf]);
}

function createPNG(size, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const rowLen = 1 + size * 3;
  const rawData = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const offset = y * rowLen;
    rawData[offset] = 0;
    for (let x = 0; x < size; x++) {
      const px = offset + 1 + x * 3;
      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const ihdr = pngChunk("IHDR", ihdrData);
  const idat = pngChunk("IDAT", compressed);
  const iend = pngChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

const PURPLE = { r: 0x7C, g: 0x5C, b: 0xFC };
const sizes = [16, 48, 128];
const outDir = __dirname;

for (const sz of sizes) {
  const png = createPNG(sz, PURPLE.r, PURPLE.g, PURPLE.b);
  const filename = "icon" + sz + ".png";
  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, png);
  console.log("Created " + filename + "  (" + sz + "x" + sz + ", " + png.length + " bytes)");
}

console.log("All icons generated successfully.");
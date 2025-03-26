import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const filePath = process.argv[2];

if (!filePath) {
  process.exit(1);
}

const fullPath = path.resolve(filePath);
const writeStream = fs.createWriteStream(fullPath);

(async () => {
  try {
    await pipeline(process.stdin, writeStream);
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
})();

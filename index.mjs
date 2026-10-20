import { readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

let files = 0;
let directories = 0;
let size = 0n;
const pending = ['/data'];

while (pending.length > 0) {
  const directory = pending.pop();
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stats = lstatSync(path, { bigint: true });
    if (stats.isFile()) {
      files++;
      size += stats.size;
    } else if (stats.isDirectory()) {
      directories++;
      pending.push(path);
    }
  }
}

console.log(`312519-${files}-${directories}-${size}`);

import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, linkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const image = process.argv[2] ?? 'student-fs';
const root = mkdtempSync(join(tmpdir(), 'fs-component-test-'));

function check(name, setup, expected) {
  const data = join(root, name);
  mkdirSync(data);
  setup(data);
  const result = spawnSync('docker', [
    'run', '--rm', '--network', 'none',
    '--mount', `type=bind,source=${data},target=/data,readonly`, image,
  ], { encoding: 'utf8', timeout: 30000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, `312519-${expected}\n`);
  console.log(`PASS ${name}: ${result.stdout.trim()}`);
}

try {
  check('empty', () => {}, '0-0-0');
  check('files', (p) => {
    writeFileSync(join(p, 'a.txt'), 'abc');
    writeFileSync(join(p, 'zero'), '');
    writeFileSync(join(p, 'file with spaces.txt'), '12345');
  }, '3-0-8');
  check('directories', (p) => {
    mkdirSync(join(p, 'one', 'two'), { recursive: true });
    mkdirSync(join(p, 'empty'));
  }, '0-3-0');
  check('handout-example', (p) => {
    mkdirSync(join(p, 'docs', 'old'), { recursive: true });
    mkdirSync(join(p, 'empty'));
    for (const [name, length] of [['a.txt', 100], ['b.txt', 500], ['docs/c.txt', 200], ['docs/old/d.txt', 50]]) {
      writeFileSync(join(p, name), Buffer.alloc(length));
    }
  }, '4-3-850');
  check('unicode-hidden-binary', (p) => {
    mkdirSync(join(p, '.hidden'));
    writeFileSync(join(p, '.hidden', 'данные с пробелами.txt'), 'Привет');
    writeFileSync(join(p, 'binary'), Buffer.from([0, 255, 10, 13]));
  }, '2-1-16');
  check('links-and-special-files', (p) => {
    mkdirSync(join(p, 'folder'));
    writeFileSync(join(p, 'original'), 'abc');
    linkSync(join(p, 'original'), join(p, 'hard-link'));
    symlinkSync('original', join(p, 'file-link'));
    symlinkSync('folder', join(p, 'directory-link'));
    symlinkSync('.', join(p, 'cycle'));
    symlinkSync('missing', join(p, 'broken-link'));
    const fifo = spawnSync('mkfifo', [join(p, 'pipe')]);
    assert.equal(fifo.status, 0);
  }, '2-1-6');
  check('deep', (p) => {
    const nested = join(p, ...Array(150).fill('d'));
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, 'end'), 'done');
  }, '1-150-4');
  console.log('ALL_TESTS_PASSED');
} finally {
  rmSync(root, { recursive: true, force: true });
}

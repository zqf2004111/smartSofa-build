import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function git(cmd) {
  try {
    return execSync(cmd, { cwd: join(__dirname, '..'), encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

const sha = git('git rev-parse --short HEAD');
const branch = git('git rev-parse --abbrev-ref HEAD');
const time = new Date().toISOString();

const info = { sha, branch, time, source: 'smartSofa-private' };
writeFileSync(join(__dirname, '..', 'src', 'build-info.json'), JSON.stringify(info, null, 2));
console.log('[build-info]', JSON.stringify(info));

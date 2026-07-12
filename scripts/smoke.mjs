// Build + serve + fetch smoke check.
//
// Catches the "blank page" deploy class we hit repeatedly: a base-path mismatch
// makes /<base>/assets/*.js fall through to the index.html SPA fallback, so the
// module script is served as text/html and never parses. This builds with the
// deploy base, serves the dist, and asserts the page loads and the referenced JS
// asset is served as JavaScript. No browser dependency.

import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = '/build-a-stew/';
const PORT = 4178;
const origin = `http://localhost:${PORT}`;

function build() {
  console.log('[smoke] building with base', BASE);
  const result = spawnSync(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'build', `--base=${BASE}`],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const res = await fetch(`${origin}${BASE}`);
      if (res.ok) return true;
    } catch {
      // not up yet
    }
  }
  return false;
}

async function main() {
  build();

  console.log('[smoke] starting preview on', PORT);
  const preview = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--base', BASE, '--port', String(PORT)],
    { stdio: 'ignore' },
  );

  let failure = null;
  try {
    if (!(await waitForServer())) {
      throw new Error('preview server did not start');
    }

    const page = await fetch(`${origin}${BASE}`);
    if (!page.ok) throw new Error(`page returned HTTP ${page.status}`);
    const html = await page.text();
    if (!html.includes('<div id="root">')) throw new Error('root element missing from index.html');

    const match = html.match(/src="([^"]+\.js)"/);
    if (!match) throw new Error('no module script found in index.html');
    const assetUrl = `${origin}${match[1]}`;
    const asset = await fetch(assetUrl);
    if (!asset.ok) throw new Error(`JS asset returned HTTP ${asset.status}`);
    const type = asset.headers.get('content-type') ?? '';
    if (!type.includes('javascript')) {
      throw new Error(`JS asset served as "${type}" — base-path mismatch would blank the page`);
    }

    console.log(`[smoke] OK — page + JS asset (${match[1]}) serve correctly at base ${BASE}`);
  } catch (error) {
    failure = error;
    console.error('[smoke] FAIL:', error instanceof Error ? error.message : error);
  } finally {
    preview.kill();
  }

  process.exit(failure ? 1 : 0);
}

main();

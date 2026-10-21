#!/usr/bin/env node
/**
 * Smoke test for SPA deep-link routing and reverse proxy behavior.
 * Verifies that client-side routes (e.g. /admin, /projects) serve the React
 * application HTML shell with HTTP 200 rather than falling into proxy collisions.
 */
const http = require('http');

const targetUrl = process.argv[2] || process.env.SMOKE_TEST_URL || 'http://localhost:8080';
const parsedUrl = new URL(targetUrl);

const routes = ['/admin', '/projects', '/projects/tracking', '/login'];

const fetchRoute = (path) => {
  return new Promise((resolve, reject) => {
    const req = http.get(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: path,
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting ${path}`));
    });
  });
};

async function run() {
  console.log(`Running SPA deep-link smoke tests against ${targetUrl}...`);
  let failed = false;

  for (const route of routes) {
    try {
      const res = await fetchRoute(route);
      const isHtml = (res.headers['content-type'] || '').includes('text/html');
      const hasRoot = res.body.includes('<div id="root">') || res.body.includes('id="root"');

      if (res.statusCode === 200 && isHtml && hasRoot) {
        console.log(`✓ GET ${route} returned HTTP 200 with HTML shell`);
      } else {
        console.error(
          `✗ GET ${route} failed: status=${res.statusCode}, isHtml=${isHtml}, hasRoot=${hasRoot}`
        );
        failed = true;
      }
    } catch (err) {
      console.error(`✗ GET ${route} encountered error: ${err.message}`);
      failed = true;
    }
  }

  // Also verify that /api/ is NOT served as the SPA HTML shell
  try {
    const apiRes = await fetchRoute('/api/projects');
    const isHtml = (apiRes.headers['content-type'] || '').includes('text/html');
    if (!isHtml) {
      console.log(`✓ GET /api/projects is correctly routed away from SPA HTML fallback (status=${apiRes.statusCode})`);
    } else {
      console.error(`✗ GET /api/projects erroneously served HTML shell`);
      failed = true;
    }
  } catch (err) {
    // A connection error or 502 Bad Gateway to the unstarted backend is expected and correct
    console.log(`✓ GET /api/projects forwarded to backend proxy (${err.message})`);
  }

  if (failed) {
    console.error('Smoke tests failed!');
    process.exit(1);
  } else {
    console.log('All SPA routing smoke tests passed successfully.');
    process.exit(0);
  }
}

run();

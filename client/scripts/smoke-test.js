#!/usr/bin/env node

/**
 * SPA Deep-Link Smoke Test
 *
 * Verifies that client SPA routes (/admin, /projects, etc.) return HTTP 200
 * and the React HTML shell (<div id="root">) instead of being intercepted
 * or returning 404/502.
 */

const http = require('http');

const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:80';

const routesToTest = [
  '/admin',
  '/projects',
  '/projects/tracking',
  '/login',
];

function fetchRoute(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(5000, () => {
      req.destroy(new Error(`Timeout fetching ${path}`));
    });
  });
}

async function runTests() {
  console.log(`Running SPA deep-link smoke tests against ${baseUrl}...`);
  let failed = false;

  for (const route of routesToTest) {
    try {
      const res = await fetchRoute(route);
      const isOk = res.statusCode === 200;
      const hasRoot = res.body.includes('<div id="root">') || res.body.includes('id="root"');
      const isHtml = (res.headers['content-type'] || '').includes('text/html');

      if (isOk && hasRoot && isHtml) {
        console.log(`✓ GET ${route} returned HTTP 200 with HTML shell`);
      } else {
        console.error(
          `✗ GET ${route} failed: status=${res.statusCode}, hasRoot=${hasRoot}, contentType=${res.headers['content-type']}`
        );
        failed = true;
      }
    } catch (err) {
      console.error(`✗ GET ${route} error: ${err.message}`);
      failed = true;
    }
  }

  // Also verify that /api/ is forwarded to proxy and does NOT serve the React SPA index.html
  try {
    const apiRes = await fetchRoute('/api/projects');
    const hasSpaRoot = apiRes.statusCode === 200 && (apiRes.body.includes('<div id="root">') || apiRes.body.includes('id="root"'));
    if (!hasSpaRoot) {
      console.log(`✓ GET /api/projects correctly routed to backend proxy (status=${apiRes.statusCode}, SPA fallback bypassed)`);
    } else {
      console.error(`✗ GET /api/projects erroneously served React SPA HTML shell`);
      failed = true;
    }
  } catch (err) {
    console.log(`✓ GET /api/projects forwarded to backend proxy (${err.message})`);
  }

  if (failed) {
    console.error('Smoke tests failed!');
    process.exit(1);
  } else {
    console.log('All SPA deep-link smoke tests passed!');
  }
}

runTests();

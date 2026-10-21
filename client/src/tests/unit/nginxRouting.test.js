/**
 * @jest-environment node
 */
const fs = require('fs');
const path = require('path');

describe('Nginx Configuration & SPA Deep-Link Routing', () => {
  const nginxConfPath = path.resolve(__dirname, '../../../nginx.conf');
  const nginxConf = fs.readFileSync(nginxConfPath, 'utf8');

  test('does not route SPA frontend routes into backend regex proxy', () => {
    // Regex matching frontend SPA routes like /admin or /projects is prohibited
    expect(nginxConf).not.toMatch(/location\s+~\s+\^\/\(auth\|admin/);
    expect(nginxConf).not.toMatch(/location\s+~\s+.*projects/);
    expect(nginxConf).not.toMatch(/location\s+~\s+.*admin/);
  });

  test('configures dedicated ^~ /api/ and ^~ /auth/ proxy blocks', () => {
    expect(nginxConf).toMatch(/location\s+\^~\s+\/api\//);
    expect(nginxConf).toMatch(/location\s+\^~\s+\/auth\//);
    expect(nginxConf).toMatch(/proxy_pass\s+http:\/\/server:8080;/);
  });

  test('retains SPA fallback try_files directive', () => {
    expect(nginxConf).toMatch(/try_files\s+\$uri\s+\$uri\/\s+\/index\.html;/);
  });
});

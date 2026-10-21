import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('REST, uploads and sockets use the same backend in dev, preview and production', () => {
    const source = readFileSync(new URL('../src/config/apiBaseUrl.js', import.meta.url), 'utf8')
        .replace(/export const /g, 'const ').replaceAll('import.meta.env', 'env');
    for (const [host, dev] of [['localhost', true], ['127.0.0.1', true], ['localhost', false], ['adeebtechhub.online', false]]) {
        const context = { window: { location: { hostname: host } }, env: { DEV: dev, PROD: !dev, VITE_API_URL: 'https://different.invalid/api' } };
        const result = vm.runInNewContext(source + '\n({api:getApiBaseUrl(),uploads:getBackendOrigin(),socket:getSocketURL()})', context);
        assert.equal(result.uploads, result.socket);
        if (host !== 'adeebtechhub.online') {
            assert.equal(result.uploads, 'http://localhost:5000');
            assert.equal(result.api, dev ? '/api' : 'http://localhost:5000/api');
        } else {
            assert.equal(result.api, result.uploads + '/api');
            assert.match(result.api, /^https:/);
        }
    }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { createApiClient, waitForRetry } from '../src/services/createApiClient.js';

const setup = () => {
    let token = 'account-one';
    let logouts = 0;
    const delays = [];
    const api = createApiClient({
        getBaseURL: () => 'http://localhost:5000/api', getToken: () => token,
        onUnauthorized: () => { logouts++; }, wait: async delay => { delays.push(delay); },
    });
    return { api, delays, setToken: value => { token = value; }, logouts: () => logouts };
};
const failure = (config, status, code = 'ERR_BAD_RESPONSE') => new axios.AxiosError('test error', code, config, null,
    status ? { status, headers: { 'retry-after': '3' }, data: {} } : undefined);
const success = config => ({ status: 200, statusText: 'OK', config, headers: {}, data: { ok: true } });

for (const status of [502, 503, 504, undefined]) {
    test(`GET recovers after ${status || 'network timeout'} without logout`, async () => {
        const state = setup();
        let calls = 0;
        state.api.defaults.adapter = async config => {
            if (++calls === 1) throw failure(config, status, status ? 'ERR_BAD_RESPONSE' : 'ECONNABORTED');
            return success(config);
        };
        assert.equal((await state.api.get('/courses')).data.ok, true);
        assert.equal(calls, 2);
        assert.equal(state.logouts(), 0);
        if (status) assert.ok(state.delays[0] >= 3000);
    });
}
test('GET retries are bounded and writes never replay', async () => {
    for (const method of ['get', 'post', 'put', 'delete']) {
        const { api } = setup();
        let calls = 0;
        api.defaults.adapter = async config => { calls++; throw failure(config, 503); };
        await assert.rejects(api.request({ url: '/attendance', method }));
        assert.equal(calls, method === 'get' ? 3 : 1);
    }
});
test('403 and application errors are not retried', async () => {
    for (const status of [400, 401, 403, 404, 422, 429, 500]) {
        const { api, delays } = setup();
        api.defaults.adapter = async config => { throw failure(config, status); };
        await assert.rejects(api.get('/test'));
        assert.equal(delays.length, 0);
    }
});
test('cancellation never causes a retry', async () => {
    const { api, delays } = setup();
    api.defaults.adapter = async config => { throw new axios.CanceledError('cancelled', config); };
    await assert.rejects(api.get('/test'), error => axios.isCancel(error));
    assert.equal(delays.length, 0);
    const controller = new AbortController();
    const waiting = waitForRetry(10000, controller.signal);
    controller.abort();
    await assert.rejects(waiting, error => axios.isCancel(error));
});
test('old account failures cannot replay or log out a new session', async () => {
    for (const status of [401, 503]) {
        const state = setup();
        let calls = 0;
        state.api.defaults.adapter = async config => {
            calls++; state.setToken('account-two'); throw failure(config, status);
        };
        await assert.rejects(state.api.get('/private-data'));
        assert.equal(calls, 1);
        assert.equal(state.logouts(), 0);
    }
});
test('only authenticated current-account 401 triggers logout; login 401 does not', async () => {
    const state = setup();
    state.api.defaults.adapter = async config => { throw failure(config, 401); };
    await assert.rejects(state.api.post('/auth/login'));
    assert.equal(state.logouts(), 0);
    await assert.rejects(state.api.get('/auth/me'));
    assert.equal(state.logouts(), 1);
});
test('request timeouts and multipart boundaries are configured for slow connections', async () => {
    const { api } = setup();
    const configs = [];
    api.defaults.adapter = async config => { configs.push(config); return success(config); };
    await api.get('/courses');
    await api.post('/upload', new FormData(), { headers: { 'Content-Type': 'multipart/form-data' } });
    await api.post('/upload', new FormData(), { timeout: 90000 });
    assert.deepEqual(configs.map(c => c.timeout), [45000, 180000, 90000]);
    assert.ok(!String(configs[1].headers.get('Content-Type')).includes('multipart/form-data'));
});
test('a real delayed HTTP response recovers from one timeout', async () => {
    const http = await import('node:http');
    let requests = 0;
    const server = http.createServer((req, res) => {
        const current = ++requests;
        setTimeout(() => { res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}'); }, current === 1 ? 150 : 0);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const api = createApiClient({ getBaseURL: () => `http://127.0.0.1:${server.address().port}`, getToken: () => null, onUnauthorized: () => assert.fail(), wait: async () => {} });
        const result = await api.get('/slow', { timeout: 75, proxy: false });
        assert.equal(result.data.ok, true);
        assert.equal(requests, 2);
    } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { connectWithRetry } = require('../utils/databaseConnection');
const tick = () => new Promise(resolve => setImmediate(resolve));
const log = { log() {}, error() {} };

test('initial DNS failures retry with backoff and stop retrying after success', async () => {
    const scheduled = [];
    let attempts = 0;
    const stop = connectWithRetry({ log, connect: async () => { if (++attempts <= 2) throw Object.assign(new Error(), { code: 'ETIMEOUT' }); }, schedule: (fn, delay) => { scheduled.push({ fn, delay }); } });
    await tick();
    assert.equal(scheduled[0].delay, 1000);
    await scheduled[0].fn();
    assert.equal(scheduled[1].delay, 2000);
    await scheduled[1].fn();
    assert.equal(attempts, 3);
    assert.equal(scheduled.length, 2);
    stop();
});
test('retry delay is bounded and stopped connection does not restart', async () => {
    const scheduled = [];
    let attempts = 0;
    const stop = connectWithRetry({ log, connect: async () => { attempts++; throw new Error('unavailable'); }, schedule: (fn, delay) => { scheduled.push({ fn, delay }); } });
    await tick();
    for (let index = 0; index < 8; index++) await scheduled[index].fn();
    assert.equal(Math.max(...scheduled.map(item => item.delay)), 30000);
    stop();
    const before = attempts;
    await scheduled.at(-1).fn();
    assert.equal(attempts, before);
});

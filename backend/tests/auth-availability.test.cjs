const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../middleware/auth.js'), 'utf8');

const setup = ({ verifyError, lookupError, presenceError } = {}) => {
    let writes = 0;
    let broadcasts = 0;
    let completePresence;
    const user = () => ({ _id: 'user-one', name: 'Example', role: 'teacher', isVerified: true, lastSeen: null, getPasswordFingerprint: () => 'fingerprint' });
    const User = {
        findById: () => ({ select: async () => { if (lookupError) throw lookupError; return user(); } }),
        findOneAndUpdate: () => {
            writes++;
            return { select: () => presenceError ? Promise.reject(presenceError) : new Promise(resolve => { completePresence = () => resolve({ _id: 'user-one', lastSeen: new Date() }); }) };
        },
    };
    const module = { exports: {} };
    vm.runInNewContext(source, {
        module, require: name => name === 'jsonwebtoken' ? { verify: () => { if (verifyError) throw verifyError; return { id: 'user-one', passwordFingerprint: 'fingerprint' }; } } : name === 'crypto' ? crypto : User,
        process: { env: { NODE_ENV: 'production', JWT_SECRET: 'test' } }, console: { log() {}, error() {} }, Buffer, Date, Set, Promise,
    });
    const invoke = async () => {
        const result = { headers: {} };
        const req = { headers: { authorization: 'Bearer test' }, app: { get: () => ({ emit: () => { broadcasts++; } }) } };
        const res = { set: (key, value) => { result.headers[key] = value; }, status: status => { result.status = status; return res; }, json: body => { result.body = body; } };
        await module.exports.protect(req, res, error => { result.next = true; result.error = error; });
        return result;
    };
    return { invoke, writes: () => writes, broadcasts: () => broadcasts, finish: () => completePresence() };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

test('database failures return retryable 503, never a false invalid-token 401', async () => {
    const error = Object.assign(new Error('database timeout'), { name: 'MongoServerSelectionError' });
    const result = await setup({ lookupError: error }).invoke();
    assert.equal(result.status, 503);
    assert.equal(result.headers['Retry-After'], '3');
    assert.equal(result.body.code, 'DATABASE_UNAVAILABLE');
});
test('real JWT errors still reject authentication', async () => {
    for (const name of ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError']) {
        const result = await setup({ verifyError: Object.assign(new Error(), { name }) }).invoke();
        assert.equal(result.status, 401);
        assert.equal(result.next, undefined);
    }
});
test('unexpected failures reach Express error handler without logging the user out', async () => {
    const error = new Error('unexpected');
    const result = await setup({ lookupError: error }).invoke();
    assert.equal(result.error, error);
    assert.equal(result.status, undefined);
});
test('100 simultaneous authenticated requests produce one presence write and broadcast', async () => {
    const state = setup();
    const results = await Promise.all(Array.from({ length: 100 }, () => state.invoke()));
    assert.ok(results.every(result => result.next && !result.error));
    assert.equal(state.writes(), 1);
    state.finish();
    await tick();
    assert.equal(state.broadcasts(), 1);
});
test('presence failures never prevent authenticated requests or leave a stuck lock', async () => {
    const state = setup({ presenceError: new Error('write unavailable') });
    assert.equal((await state.invoke()).next, true);
    await tick();
    assert.equal((await state.invoke()).next, true);
    await tick();
    assert.equal(state.writes(), 2);
});

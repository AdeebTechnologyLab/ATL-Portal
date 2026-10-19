const assert = require('node:assert/strict');
const cp = require('node:child_process');
const path = require('node:path');
const root = process.cwd();
if (process.argv[2] === 'glob-child') {
    const mod = require(process.argv[3]);
    const mm = typeof mod === 'function' ? mod : mod.minimatch;
    const mode = process.argv[4];
    const start = performance.now();
    if (mode === 'globstar') assert.equal(mm(Array(30).fill('a').join('/'), Array(11).fill('**/a').join('/') + '/b'), false);
    if (mode === 'extglob') for (const pattern of ['*(*(*(a|b)))', '+(+(+(a|b)))']) assert.equal(mm('a'.repeat(19) + 'z', pattern), false);
    if (mode === 'stars') assert.equal(mm('a'.repeat(30) + 'z', '*'.repeat(34) + 'X***'), false);
    assert.equal(mm('src/app.js', '**/*.js'), true);
    console.log(mode + ': ' + (performance.now() - start).toFixed(1) + 'ms');
    process.exit();
}
if (process.argv[2] === 'globs') {
    const paths = cp.execSync('npm ls minimatch --parseable --all', { encoding: 'utf8' }).trim().split(/\r?\n/);
    for (const location of paths) {
        console.log('minimatch ' + require(path.join(location, 'package.json')).version);
        for (const mode of ['globstar', 'extglob', 'stars']) {
            const result = cp.spawnSync(process.execPath, [__filename, 'glob-child', location, mode], { encoding: 'utf8', timeout: 3000 });
            console.log(result.error ? mode + ': TIMEOUT' : result.stdout.trim() || result.stderr);
            if (result.status !== 0) process.exitCode = 1;
        }
    }
} else {
    const load = name => require(require.resolve(name, { paths: [root] }));
    const uuid = load('uuid');
    for (const fn of [uuid.v3, uuid.v5]) {
        for (const offset of [-1, 4, 20]) assert.throws(() => fn('x', uuid.v5.DNS, new Uint8Array(8), offset), RangeError);
        const buf = new Uint8Array(20).fill(170);
        assert.equal(fn('x', uuid.v5.DNS, buf, 4), buf);
        assert.deepEqual(Array.from(buf.slice(0, 4)), [170, 170, 170, 170]);
    }
    assert.throws(() => uuid.v6({}, new Uint8Array(8), 4), RangeError);
    const task = load('node-cron').schedule('* * * * *', () => {}, { scheduled: false });
    assert.equal(uuid.validate(task.options.name), true);
    task.start(); task.stop();
    console.log('UUID bounds and node-cron compatibility passed');
    const re = load('path-to-regexp')('/:a-:b-:c', []);
    assert.equal(re.test('/one-two-three'), true);
    const start = performance.now();
    re.test('/' + 'a-'.repeat(10000) + 'a/');
    assert.ok(performance.now() - start < 1000);
    console.log('Route matching and long failing path passed');
    const { Decoder, Encoder, PacketType } = load('socket.io-parser');
    for (const count of [0, 11, 999999]) assert.throws(() => new Decoder().add('5' + count + '-["event"]'));
    const decoder = new Decoder();
    let received = false;
    decoder.on('decoded', packet => { assert.equal(packet.data[1].toString(), 'ok'); received = true; });
    new Encoder().encode({ type: PacketType.EVENT, nsp: '/', data: ['event', Buffer.from('ok')] }).forEach(p => decoder.add(p));
    assert.equal(received, true);
    console.log('Binary attachment limits and valid round-trip passed');
}

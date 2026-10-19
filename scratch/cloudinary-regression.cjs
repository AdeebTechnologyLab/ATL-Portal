const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const config = require('../backend/config/cloudinary');
const sdk = config.cloudinary;
const originalUpload = sdk.uploader.upload_stream;
const originalDestroy = sdk.uploader.destroy;
let optionsSeen;
sdk.uploader.upload_stream = (options, callback) => {
    optionsSeen = options;
    const parts = [];
    return new Writable({
        write(chunk, encoding, done) { parts.push(chunk); done(); },
        final(done) {
            callback(null, { secure_url: 'https://example.invalid/file', bytes: Buffer.concat(parts).length, public_id: 'test/file' });
            done();
        },
    });
};
const upload = (middleware, req = {}, fieldname = 'file') => new Promise((resolve, reject) => {
    middleware.storage._handleFile(req, { fieldname, originalname: 'test.png', stream: Readable.from(Buffer.from('test')) }, (error, result) => error ? reject(error) : resolve(result));
});
(async () => {
    try {
        for (const [name, folder] of [['uploadPhoto', 'lms/photos'], ['uploadReceipt', 'lms/receipts'], ['uploadSubmission', 'lms/submissions'], ['uploadCourse', 'lms/courses'], ['uploadChatFiles', 'lms/chat']]) {
            const result = await upload(config[name], { user: { id: 'example' } });
            assert.equal(result.size, 4);
            assert.equal(result.filename, 'test/file');
            assert.equal(optionsSeen.folder, folder);
            if (name === 'uploadPhoto') {
                assert.equal(optionsSeen.public_id, 'user_example');
                assert.equal(optionsSeen.overwrite, true);
            }
        }
        for (const [field, folder] of [['photo', 'lms/photos'], ['feeScreenshot', 'lms/receipts'], ['other', 'lms/others']]) {
            await upload(config.uploadRegistration, {}, field);
            assert.equal(optionsSeen.folder, folder);
        }
        sdk.uploader.destroy = (filename, options, callback) => {
            assert.equal(filename, 'test/file');
            assert.equal(options.invalidate, true);
            callback(null, { result: 'ok' });
        };
        await new Promise((resolve, reject) => config.uploadPhoto.storage._removeFile({}, { filename: 'test/file' }, error => error ? reject(error) : resolve()));
        sdk.uploader.upload_stream = (options, callback) => new Writable({ write(chunk, encoding, done) { done(new Error('upload failed')); } });
        await assert.rejects(upload(config.uploadPhoto), /upload failed/);
        console.log('All six upload configurations, registration branches, result mapping, delete cleanup and stream errors passed; no remote uploads/deletions');
    } finally {
        sdk.uploader.upload_stream = originalUpload;
        sdk.uploader.destroy = originalDestroy;
    }
})().catch(error => { console.error(error); process.exitCode = 1; });

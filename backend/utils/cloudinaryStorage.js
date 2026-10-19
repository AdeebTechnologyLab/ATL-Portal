// Multer storage engine for the Cloudinary v2 SDK.
class CloudinaryStorage {
    constructor({ cloudinary, params = {} }) {
        this.cloudinary = cloudinary;
        this.params = params;
    }

    _handleFile(req, file, callback) {
        let finished = false;
        const done = (error, result) => {
            if (finished) return;
            finished = true;
            callback(error, result);
        };
        const upload = async () => {
            const options = typeof this.params === 'function'
                ? await this.params(req, file)
                : Object.fromEntries(await Promise.all(Object.entries(this.params).map(async ([key, value]) => [
                    key, typeof value === 'function' ? await value(req, file) : value,
                ])));
            const stream = this.cloudinary.uploader.upload_stream(options, (error, result) => {
                if (error) return done(error);
                if (!result) return done(new Error('Cloudinary returned no upload result'));
                done(null, { path: result.secure_url, size: result.bytes, filename: result.public_id });
            });
            stream.once('error', done);
            file.stream.once('error', error => {
                stream.destroy();
                done(error);
            });
            file.stream.pipe(stream);
        };
        upload().catch(done);
    }

    _removeFile(req, file, callback) {
        this.cloudinary.uploader.destroy(file.filename, { invalidate: true }, callback);
    }
}

module.exports = { CloudinaryStorage };

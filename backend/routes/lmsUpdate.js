const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const SystemSetting = require('../models/SystemSetting');

const router = express.Router();

const LOADING_DIR = path.join(__dirname, '..', 'public', 'loading gif');
fs.mkdirSync(LOADING_DIR, { recursive: true });

const ACTIVE_GIF_KEY = 'loading_gif';
const SOCIAL_LINKS_KEY = 'social_link_groups';
const CURSOR_KEY = 'custom_cursor';
const CURSORS_LIST_KEY = 'custom_cursors_list';

// Cursor-set sites size variant wale CSS URL deti hain (-128/-64/-32).
// Default cursor size ke liye hamesha -32 variant use karo.
const normalizeCursorSize = (cssUrl) => String(cssUrl || '').replace(
    /-(?:16|24|48|64|80|96|128|160|192|256)\.css/gi,
    '-32.css'
);

const sanitizeCursor = (input) => {
    const cssUrl = String(input?.cssUrl || '').trim().slice(0, 500);
    if (!cssUrl) return { name: '', cssUrl: '' };
    let parsed;
    try {
        parsed = new URL(cssUrl);
    } catch {
        throw new Error('Valid CSS URL daalein.');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        throw new Error('Sirf http/https URL allowed hai.');
    }
    if (!/\.css(\?|#|$)/i.test(parsed.pathname + parsed.search)) {
        throw new Error('Ye CSS file ka URL nahi hai (.css ending chahiye).');
    }
    const name = String(input?.name || '').trim().slice(0, 80) || 'Custom Cursor';
    return { name, cssUrl: normalizeCursorSize(parsed.toString()) };
};

const SOCIAL_PLATFORMS = new Set([
    'website', 'email', 'whatsapp', 'facebook', 'instagram', 'linkedin', 'x',
    'youtube', 'tiktok', 'threads', 'github', 'snapchat', 'pinterest'
]);

const sanitizeGroups = (input) => {
    if (!Array.isArray(input)) throw new Error('Groups array required.');
    return input.slice(0, 10).map((group) => ({
        id: String(group?.id || '').trim().slice(0, 64),
        title: String(group?.title || '').trim().slice(0, 80),
        ...(group?.badge ? { badge: String(group.badge).trim().slice(0, 20) } : {}),
        links: (Array.isArray(group?.links) ? group.links : []).slice(0, 50).map((link) => ({
            platform: SOCIAL_PLATFORMS.has(link?.platform) ? link.platform : 'website',
            label: String(link?.label || '').trim().slice(0, 40),
            href: String(link?.href || '').trim().slice(0, 500)
        })).filter((link) => link.href)
    })).filter((group) => group.id && group.title);
};

const ALLOWED_EXT = new Set(['.gif', '.png', '.webp', '.svg', '.apng', '.jpg', '.jpeg']);
const MAX_SIZE = 20 * 1024 * 1024;

const sanitizeStem = (originalName) => {
    const ext = path.extname(originalName || '');
    const stem = path.basename(originalName || '', ext)
        .replace(/[^\w\- ]+/g, '')
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '');
    return stem || 'loading';
};

const uniqueFilename = (originalName) => {
    const ext = path.extname(originalName || '').toLowerCase();
    const stem = sanitizeStem(originalName);
    let name = `${stem}${ext}`;
    let counter = 1;
    while (fs.existsSync(path.join(LOADING_DIR, name))) {
        name = `${stem}-${counter}${ext}`;
        counter += 1;
    }
    return name;
};

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, LOADING_DIR),
        filename: (req, file, cb) => cb(null, uniqueFilename(file.originalname))
    }),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (req, file, cb) => cb(null, ALLOWED_EXT.has(path.extname(file.originalname || '').toLowerCase()))
});

const getOrigin = (req) => {
    const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
    const host = String(req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
    return `${proto}://${host}`;
};

const toPublicFile = (name, req) => ({
    name,
    url: `${getOrigin(req)}${req.baseUrl}/files/${encodeURIComponent(name)}`
});

// Public: serve uploaded files (used as <img> src, no auth header possible)
router.use('/files', express.static(LOADING_DIR, { index: false, maxAge: '1h' }));

// Public: custom mouse cursor (applied for every user)
router.get('/cursor', async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: CURSOR_KEY });
        const value = setting?.value;
        if (value && typeof value === 'object' && value.cssUrl) {
            return res.json({ success: true, data: { name: value.name || 'Custom Cursor', cssUrl: normalizeCursorSize(value.cssUrl) } });
        }
        res.json({ success: true, data: null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: list saved cursor sets (library)
router.get('/cursors', protect, authorize('admin'), async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: CURSORS_LIST_KEY });
        res.json({ success: true, data: Array.isArray(setting?.value) ? setting.value : [] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: add a cursor set to the library
router.post('/cursors', protect, authorize('admin'), async (req, res) => {
    try {
        const cursor = sanitizeCursor(req.body || {});
        if (!cursor.cssUrl) return res.status(400).json({ success: false, message: 'CSS URL required.' });
        const setting = await SystemSetting.findOne({ key: CURSORS_LIST_KEY });
        const list = Array.isArray(setting?.value) ? setting.value : [];
        if (list.some(item => item?.cssUrl === cursor.cssUrl)) {
            return res.json({ success: true, data: list });
        }
        const next = [...list, cursor].slice(0, 30);
        await SystemSetting.findOneAndUpdate(
            { key: CURSORS_LIST_KEY },
            { value: next, updatedBy: req.user.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.status(201).json({ success: true, data: next });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Admin: remove a cursor set from the library
router.delete('/cursors', protect, authorize('admin'), async (req, res) => {
    try {
        const cssUrl = String(req.query.cssUrl || '').trim();
        const setting = await SystemSetting.findOne({ key: CURSORS_LIST_KEY });
        const list = Array.isArray(setting?.value) ? setting.value : [];
        const next = list.filter(item => item?.cssUrl !== cssUrl);
        await SystemSetting.findOneAndUpdate(
            { key: CURSORS_LIST_KEY },
            { value: next, updatedBy: req.user.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const activeSetting = await SystemSetting.findOne({ key: CURSOR_KEY });
        if (normalizeCursorSize(activeSetting?.value?.cssUrl) === cssUrl) {
            await SystemSetting.findOneAndUpdate(
                { key: CURSOR_KEY },
                { value: { name: '', cssUrl: '' }, updatedBy: req.user.id },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        }
        res.json({ success: true, data: next });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: set / update / reset the custom cursor (cssUrl: '' resets)
router.put('/cursor', protect, authorize('admin'), async (req, res) => {
    try {
        const cursor = sanitizeCursor(req.body || {});
        await SystemSetting.findOneAndUpdate(
            { key: CURSOR_KEY },
            { value: cursor, updatedBy: req.user.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, data: cursor.cssUrl ? cursor : null });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Public: social link groups (sidebar widget for every user)
router.get('/social-links', async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: SOCIAL_LINKS_KEY });
        res.json({ success: true, data: Array.isArray(setting?.value) ? setting.value : null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: save social link groups (add / update / remove icons)
router.put('/social-links', protect, authorize('admin'), async (req, res) => {
    try {
        const groups = sanitizeGroups(req.body?.groups);
        await SystemSetting.findOneAndUpdate(
            { key: SOCIAL_LINKS_KEY },
            { value: groups, updatedBy: req.user.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        res.json({ success: true, data: groups });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// Public: currently selected loading gif (used by every user's Loader)
router.get('/active', async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: ACTIVE_GIF_KEY });
        const name = setting?.value;
        if (typeof name === 'string' && name && fs.existsSync(path.join(LOADING_DIR, path.basename(name)))) {
            return res.json({ success: true, data: toPublicFile(path.basename(name), req) });
        }
        res.json({ success: true, data: null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: list all files
router.get('/loading-gifs', protect, authorize('admin'), async (req, res) => {
    try {
        const setting = await SystemSetting.findOne({ key: ACTIVE_GIF_KEY });
        const activeName = typeof setting?.value === 'string' ? setting.value : null;
        const entries = await fs.promises.readdir(LOADING_DIR);
        const files = [];
        for (const name of entries) {
            const full = path.join(LOADING_DIR, name);
            const stat = await fs.promises.stat(full);
            if (!stat.isFile() || !ALLOWED_EXT.has(path.extname(name).toLowerCase())) continue;
                files.push({
                    ...toPublicFile(name, req),
                size: stat.size,
                modifiedAt: stat.mtime,
                isActive: name === activeName
            });
        }
        files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
        res.json({ success: true, data: files, active: activeName });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: select the gif that everyone sees as the loading animation
router.post('/loading-gifs/active', protect, authorize('admin'), async (req, res) => {
    try {
        const name = path.basename(req.body?.name || '');
        if (!name || !ALLOWED_EXT.has(path.extname(name).toLowerCase()) || !fs.existsSync(path.join(LOADING_DIR, name))) {
            return res.status(400).json({ success: false, message: 'File not found.' });
        }
        await SystemSetting.findOneAndUpdate(
            { key: ACTIVE_GIF_KEY },
            { value: name, updatedBy: req.user.id },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const io = req.app.get('io');
        if (io) io.emit('loading_gif_updated', toPublicFile(name, req));
        res.json({ success: true, data: toPublicFile(name, req) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: upload a new file
router.post('/loading-gifs', protect, authorize('admin'), (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, message: err.message });
        if (!req.file) return res.status(400).json({ success: false, message: 'Sirf GIF ya image file upload ho sakti hai.' });
        res.status(201).json({ success: true, data: toPublicFile(req.file.filename, req) });
    });
});

// Admin: delete a file
router.delete('/loading-gifs/:filename', protect, authorize('admin'), async (req, res) => {
    try {
        const name = path.basename(req.params.filename || '');
        if (!name || name !== req.params.filename || !ALLOWED_EXT.has(path.extname(name).toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Invalid file name.' });
        }
        const target = path.join(LOADING_DIR, name);
        if (!target.startsWith(LOADING_DIR + path.sep)) {
            return res.status(400).json({ success: false, message: 'Invalid file path.' });
        }
        if (!fs.existsSync(target)) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }
        await fs.promises.unlink(target);
        const setting = await SystemSetting.findOne({ key: ACTIVE_GIF_KEY });
        if (setting?.value === name) await SystemSetting.deleteOne({ key: ACTIVE_GIF_KEY });
        res.json({ success: true, message: 'File deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

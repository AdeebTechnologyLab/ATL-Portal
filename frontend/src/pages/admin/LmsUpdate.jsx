import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Upload, Trash2, Film, AlertCircle, CheckCircle2, Plus, Save, MousePointerClick, ChevronDown } from 'lucide-react';
import PageHeader from '../../components/shared/PageHeader';
import Loader from '../../components/ui/Loader';
import SocialIcon from '../../components/shared/SocialIcon';
import { PLATFORM_HOVER } from '../../constants/socialLinks';
import { lmsUpdateAPI } from '../../services/api';
import { refreshLoadingGifUrl } from '../../services/loadingGif';
import { refreshSocialLinkGroups } from '../../services/socialLinks';
import { refreshCustomCursor } from '../../services/customCursor';
import { showToast } from '../../utils/customToast';

const PLATFORM_OPTIONS = [
    'website', 'email', 'whatsapp', 'facebook', 'instagram', 'linkedin', 'x',
    'youtube', 'tiktok', 'threads', 'github', 'snapchat', 'pinterest'
];

const CURSOR_PRESET = {
    name: 'Azure Chrome Aura - Handwriting',
    cssUrl: 'https://cdn.cursors-4u.net/cursors/animated/azure-chrome-aura-cursor-set-handwriting-73fda32f-32.css'
};

// Default cursor size ke liye size-variant URL ko -32 par normalize karo (backend jaisa)
const normalizeCursorSize = (cssUrl) => String(cssUrl || '').replace(
    /-(?:16|24|48|64|80|96|128|160|192|256)\.css/gi,
    '-32.css'
);

// Library card ke andar live cursor preview ke liye mini document
const previewDoc = (cssUrl) => `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
@import url("${cssUrl}");
html, body { margin: 0; height: 100%; background: #ffffff; font-family: system-ui, -apple-system, sans-serif; }
body { padding: 10px; color: #334155; }
.label { font-size: 9px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; color: #94a3b8; margin-bottom: 7px; }
.row { display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 700; flex-wrap: wrap; }
.pill { display: inline-block; padding: 2px 9px; border-radius: 999px; background: #f1f5f9; border: 1px solid #e2e8f0; }
.link { color: #2563eb; text-decoration: underline; }
</style>
</head>
<body>
<div class="label">Hover here — live cursor</div>
<div class="row">
<span class="pill">Normal</span>
<span class="link">Link text</span>
<span class="pill">Button</span>
</div>
</body>
</html>`;

const formatSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (value) => {
    try {
        return new Date(value).toLocaleString(undefined, {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return '';
    }
};

const LmsUpdate = () => {
    const [files, setFiles] = useState([]);
    const [activeName, setActiveName] = useState('');
    const [selectingName, setSelectingName] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [deletingName, setDeletingName] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [socialDraft, setSocialDraft] = useState(null);
    const [socialSaving, setSocialSaving] = useState(false);
    const [cursorActive, setCursorActive] = useState(null);
    const [cursorDraft, setCursorDraft] = useState({ name: '', cssUrl: '' });
    const [cursorSaving, setCursorSaving] = useState(false);
    const [cursorLibrary, setCursorLibrary] = useState([]);
    const [selectingCursor, setSelectingCursor] = useState('');
    const [deletingCursor, setDeletingCursor] = useState('');
    const [openLoading, setOpenLoading] = useState(false);
    const [openSocial, setOpenSocial] = useState(false);
    const [openCursor, setOpenCursor] = useState(false);
    const inputRef = useRef(null);

    const loadFiles = useCallback(async () => {
        try {
            const res = await lmsUpdateAPI.listGifs();
            setFiles(res.data?.data || []);
            setActiveName(res.data?.active || '');
        } catch (error) {
            showToast.error('Load Failed', error.response?.data?.message || 'GIF list load nahi ho saki.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFiles(); }, [loadFiles]);

    const loadSocial = useCallback(async () => {
        const list = await refreshSocialLinkGroups();
        setSocialDraft(JSON.parse(JSON.stringify(list)));
    }, []);

    useEffect(() => { loadSocial(); }, [loadSocial]);

    const loadCursor = useCallback(async () => {
        const active = await refreshCustomCursor();
        setCursorActive(active);
        setCursorDraft(active ? { name: active.name || '', cssUrl: active.cssUrl } : { name: '', cssUrl: '' });
    }, []);

    useEffect(() => { loadCursor(); }, [loadCursor]);

    const loadCursorLibrary = useCallback(async () => {
        try {
            const res = await lmsUpdateAPI.listCursors();
            setCursorLibrary(Array.isArray(res.data?.data) ? res.data.data : []);
        } catch {
            setCursorLibrary([]);
        }
    }, []);

    useEffect(() => { loadCursorLibrary(); }, [loadCursorLibrary]);

    const extractCssUrl = (value) => {
        const trimmed = (value || '').trim();
        const match = trimmed.match(/href\s*=\s*["']([^"']+)["']/i);
        return normalizeCursorSize((match ? match[1] : trimmed).trim());
    };

    const addAndApplyCursor = async () => {
        const cssUrl = extractCssUrl(cursorDraft.cssUrl);
        if (!cssUrl) {
            showToast.error('URL Required', 'Cursor ka CSS URL ya <link> code paste karein.');
            return;
        }
        const name = cursorDraft.name.trim() || CURSOR_PRESET.name;
        setCursorSaving(true);
        try {
            await lmsUpdateAPI.addCursor({ name, cssUrl });
            const res = await lmsUpdateAPI.saveCursor({ name, cssUrl });
            await refreshCustomCursor();
            setCursorActive(res.data?.data || null);
            setCursorDraft({ name, cssUrl });
            await loadCursorLibrary();
            showToast.success('Added!', 'Cursor library me save ho gaya aur apply bhi ho gaya.');
        } catch (error) {
            showToast.error('Failed', error.response?.data?.message || 'Cursor save nahi ho saka.');
        } finally {
            setCursorSaving(false);
        }
    };

    const resetCursor = async () => {
        setCursorSaving(true);
        try {
            await lmsUpdateAPI.saveCursor({ name: '', cssUrl: '' });
            await refreshCustomCursor();
            setCursorActive(null);
            setCursorDraft({ name: '', cssUrl: '' });
            showToast.success('Reset!', 'Default browser cursor restore ho gaya.');
        } catch (error) {
            showToast.error('Failed', error.response?.data?.message || 'Cursor reset nahi ho saka.');
        } finally {
            setCursorSaving(false);
        }
    };

    const selectCursor = async (item) => {
        if (!item?.cssUrl || cursorSaving || selectingCursor) return;
        if (cursorActive?.cssUrl === item.cssUrl) return;
        setSelectingCursor(item.cssUrl);
        try {
            const res = await lmsUpdateAPI.saveCursor({ name: item.name, cssUrl: item.cssUrl });
            await refreshCustomCursor();
            setCursorActive(res.data?.data || null);
            setCursorDraft({ name: item.name || '', cssUrl: item.cssUrl });
            showToast.success('Applied!', 'Ye cursor ab sab users ko dikhega.');
        } catch (error) {
            showToast.error('Select Failed', error.response?.data?.message || 'Cursor apply nahi ho saka.');
        } finally {
            setSelectingCursor('');
        }
    };

    const removeCursorItem = async (item) => {
        if (!item?.cssUrl || deletingCursor) return;
        if (!window.confirm(`"${item.name || item.cssUrl}" delete karna hai?`)) return;
        setDeletingCursor(item.cssUrl);
        try {
            const res = await lmsUpdateAPI.removeCursor(item.cssUrl);
            setCursorLibrary(Array.isArray(res.data?.data) ? res.data.data : []);
            if (cursorActive?.cssUrl === item.cssUrl) {
                await refreshCustomCursor();
                setCursorActive(null);
                setCursorDraft({ name: '', cssUrl: '' });
            }
            showToast.success('Deleted', 'Cursor library se remove ho gaya.');
        } catch (error) {
            showToast.error('Delete Failed', error.response?.data?.message || 'Cursor delete nahi ho saka.');
        } finally {
            setDeletingCursor('');
        }
    };

    const updateGroup = (groupId, updater) => {
        setSocialDraft(previous => previous.map(group => group.id === groupId ? updater(group) : group));
    };

    const updateLink = (groupId, index, patch) => {
        updateGroup(groupId, group => ({
            ...group,
            links: group.links.map((link, linkIndex) => linkIndex === index ? { ...link, ...patch } : link)
        }));
    };

    const addLink = (groupId) => {
        updateGroup(groupId, group => ({
            ...group,
            links: [...group.links, { platform: 'facebook', label: 'Facebook', href: 'https://' }]
        }));
    };

    const removeLink = (groupId, index) => {
        updateGroup(groupId, group => ({
            ...group,
            links: group.links.filter((_, linkIndex) => linkIndex !== index)
        }));
    };

    const saveSocial = async () => {
        if (!socialDraft) return;
        setSocialSaving(true);
        try {
            const cleaned = socialDraft.map(group => ({
                ...group,
                title: group.title.trim(),
                links: group.links
                    .map(link => ({ ...link, label: (link.label || '').trim() || link.platform, href: (link.href || '').trim() }))
                    .filter(link => link.href)
            })).filter(group => group.id && group.title);
            await lmsUpdateAPI.saveSocialLinks(cleaned);
            await refreshSocialLinkGroups();
            window.dispatchEvent(new Event('social-links-updated'));
            showToast.success('Saved!', 'Social media links update ho gayi.');
        } catch (error) {
            showToast.error('Save Failed', error.response?.data?.message || 'Links save nahi ho sake.');
        } finally {
            setSocialSaving(false);
        }
    };

    const handleSelect = async (name) => {
        if (!name || name === activeName || selectingName) return;
        setSelectingName(name);
        try {
            await lmsUpdateAPI.setActiveGif(name);
            setActiveName(name);
            refreshLoadingGifUrl();
            showToast.success('Selected!', 'Ye GIF ab sab users ko loading me dikhegi.');
        } catch (error) {
            showToast.error('Select Failed', error.response?.data?.message || 'GIF select nahi ho saki.');
        } finally {
            setSelectingName('');
        }
    };

    const uploadFiles = async (fileList) => {
        const selected = Array.from(fileList || []);
        if (!selected.length) return;
        setUploading(true);
        let done = 0;
        try {
            for (const file of selected) {
                const formData = new FormData();
                formData.append('file', file);
                await lmsUpdateAPI.uploadGif(formData);
                done += 1;
            }
            showToast.success('Uploaded!', `${done} file(s) library me add ho gayi.`);
            await loadFiles();
        } catch (error) {
            showToast.error('Upload Failed', error.response?.data?.message || 'File upload nahi ho saki.');
        } finally {
            setUploading(false);
        }
    };

    const handleInputChange = (event) => {
        uploadFiles(event.target.files);
        event.target.value = '';
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setDragActive(false);
        if (uploading) return;
        uploadFiles(event.dataTransfer.files);
    };

    const handleDelete = async (name) => {
        if (!window.confirm(`"${name}" delete karna hai?`)) return;
        setDeletingName(name);
        try {
            await lmsUpdateAPI.deleteGif(name);
            showToast.success('Deleted', `${name} remove ho gaya.`);
            setFiles(previous => previous.filter(file => file.name !== name));
        } catch (error) {
            showToast.error('Delete Failed', error.response?.data?.message || 'File delete nahi ho saki.');
        } finally {
            setDeletingName(null);
        }
    };

    if (loading) return <Loader message="Loading GIF library..." />;

    return (
        <div className="space-y-4 sm:space-y-6">
            <PageHeader
                title="LMS Update"
                subtitle="Loading GIF library — frontend/public/loading gif folder ke animations yahan manage karein."
                icon={RefreshCw}
            />

            <input
                ref={inputRef}
                type="file"
                accept="image/gif,image/png,image/webp,image/svg+xml,image/apng,image/jpeg"
                multiple
                className="hidden"
                onChange={handleInputChange}
            />

            {/* ── Loading Animation (GIF) ── */}
            <div className="rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                <button
                    onClick={() => setOpenLoading(o => !o)}
                    className="w-full flex items-center gap-3 p-3 sm:p-5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <Film className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight flex-1 text-left">Loading Animation (GIF)</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openLoading ? 'rotate-180' : ''}`} />
                </button>
                {openLoading && (
                    <div className="px-3 sm:px-5 pb-4 sm:pb-5 space-y-4">
                        {/* Drop zone */}
                        <div
                            onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => !uploading && inputRef.current?.click()}
                            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all ${dragActive
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-primary/[0.03] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary/40'}`}
                        >
                            <Film className="h-6 w-6 text-primary" />
                            <p className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-200">
                                GIF yahan drop karein ya click karke file choose karein
                            </p>
                            <p className="text-[10px] sm:text-[11px] font-bold text-gray-400">
                                GIF, PNG, WEBP, SVG, APNG, JPG • Max 20 MB per file
                            </p>
                        </div>

                        {files.length > 0 && (
                            <p className="text-[11px] font-bold text-gray-400">
                                <span className="font-black text-emerald-600">✓ Active</span> wali GIF sab users ko loading me dikhti hai —
                                kisi bhi card par click karke use set kar sakte hain.
                            </p>
                        )}

                        {files.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                                <Film className="h-8 w-8 text-gray-300" />
                                <p className="text-sm font-bold text-gray-400">Abhi tak koi GIF upload nahi hui.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {files.map(file => {
                                    const isActive = file.name === activeName;
                                    const isSelecting = selectingName === file.name;
                                    return (
                                        <div
                                            key={file.name}
                                            onClick={() => handleSelect(file.name)}
                                            title={isActive ? 'Active loading GIF' : 'Is GIF ko loading me set karein'}
                                            className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${isActive
                                                ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                                                : 'border-gray-100 hover:border-primary/30 dark:border-slate-700'}`}
                                        >
                                            <div className="relative flex aspect-video items-center justify-center bg-gray-50 p-2 dark:bg-slate-800">
                                                <img
                                                    src={file.url}
                                                    alt={file.name}
                                                    loading="lazy"
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                                {isActive && (
                                                    <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Active
                                                    </span>
                                                )}
                                                {isSelecting && (
                                                    <span className="absolute inset-0 flex items-center justify-center rounded-t-2xl bg-white/60 dark:bg-slate-900/60">
                                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(event) => { event.stopPropagation(); handleDelete(file.name); }}
                                                    disabled={deletingName === file.name || uploading}
                                                    title="Delete file"
                                                    className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-rose-500 opacity-0 shadow-sm transition-all hover:bg-rose-500 hover:text-white group-hover:opacity-100 disabled:opacity-40 dark:bg-slate-800/90"
                                                >
                                                    {deletingName === file.name
                                                        ? <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                                                        : <Trash2 className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between gap-1.5 border-t border-gray-100 p-2.5 dark:border-slate-700">
                                                <div className="min-w-0 space-y-0.5">
                                                    <p className="truncate text-[11px] font-black text-gray-900 dark:text-white" title={file.name}>
                                                        {file.name}
                                                    </p>
                                                    <p className="truncate text-[10px] font-bold text-gray-400">
                                                        {formatSize(file.size)} • {formatDate(file.modifiedAt)}
                                                    </p>
                                                </div>
                                                {isActive
                                                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                                    : <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">Set</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            Files seedhe <span className="font-black">frontend/public/loading gif</span> folder me save hoti hain aur
                            <span className="font-black"> /api/lms-update/files/</span> URL se serve hoti hain.
                        </div>
                    </div>
                )}
            </div>

            {/* ── Social Media Links ── */}
            <div className="rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                <button
                    onClick={() => setOpenSocial(o => !o)}
                    className="w-full flex items-center gap-3 p-3 sm:p-5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <Save className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                        <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Social Media Links</span>
                        <p className="text-[11px] font-bold text-gray-400">Company aur Academy ke icons yahan add / update karein.</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openSocial ? 'rotate-180' : ''}`} />
                </button>
                {openSocial && (
                    <div className="px-3 sm:px-5 pb-4 sm:pb-5">
                        <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                            <button
                                onClick={saveSocial}
                                disabled={socialSaving || !socialDraft}
                                className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95 disabled:opacity-50"
                            >
                                {socialSaving
                                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    : <Save className="h-3.5 w-3.5" />}
                                {socialSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                        {!socialDraft ? (
                            <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-6 text-[11px] font-bold text-gray-400 dark:bg-slate-800">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                                Loading social links...
                            </div>
                        ) : (
                            <div className="grid gap-4 lg:grid-cols-2">
                                {socialDraft.map(group => (
                                    <div key={group.id} className="rounded-xl border border-gray-100 p-3 dark:border-slate-700">
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <input
                                                value={group.title}
                                                onChange={event => updateGroup(group.id, previous => ({ ...previous, title: event.target.value }))}
                                                className="min-w-0 flex-1 rounded-lg border border-transparent bg-gray-50 px-2 py-1.5 text-xs font-black text-gray-900 outline-none transition-colors hover:border-gray-200 focus:border-primary dark:bg-slate-800 dark:text-white dark:hover:border-slate-600"
                                                placeholder="Group title"
                                            />
                                            {group.badge && (
                                                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-primary">
                                                    {group.badge}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                            {group.links.length === 0 && <span className="text-[11px] font-bold text-gray-400">Koi link nahi — neeche Add Link karein.</span>}
                                            {group.links.map((link, index) => (
                                                <span
                                                    key={`${link.platform}-${index}`}
                                                    title={link.label || link.platform}
                                                    className={`flex h-7 w-7 items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-gray-500 dark:border-slate-700 dark:bg-slate-800 ${PLATFORM_HOVER[link.platform] || ''}`}
                                                >
                                                    <SocialIcon platform={link.platform} className="h-3.5 w-3.5" />
                                                </span>
                                            ))}
                                        </div>

                                        <div className="space-y-2">
                                            {group.links.map((link, index) => (
                                                <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/70 p-2 dark:border-slate-700 dark:bg-slate-800/60">
                                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm dark:bg-slate-900">
                                                        <SocialIcon platform={link.platform} className="h-3.5 w-3.5" />
                                                    </span>
                                                    <select
                                                        value={link.platform}
                                                        onChange={event => updateLink(group.id, index, { platform: event.target.value })}
                                                        className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-black text-gray-700 outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200"
                                                    >
                                                        {PLATFORM_OPTIONS.map(platform => (
                                                            <option key={platform} value={platform}>{platform}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        value={link.label}
                                                        onChange={event => updateLink(group.id, index, { label: event.target.value })}
                                                        placeholder="Label"
                                                        className="w-24 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200"
                                                    />
                                                    <input
                                                        value={link.href}
                                                        onChange={event => updateLink(group.id, index, { href: event.target.value })}
                                                        placeholder="https://... ya mailto:"
                                                        className="min-w-[140px] flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-gray-200"
                                                    />
                                                    <button
                                                        onClick={() => removeLink(group.id, index)}
                                                        title="Remove link"
                                                        className="rounded-lg p-1.5 text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={() => addLink(group.id)}
                                            className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-[11px] font-black text-primary transition-colors hover:bg-primary/20"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Link
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Mouse Cursor ── */}
            <div className="rounded-2xl border border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
                <button
                    onClick={() => setOpenCursor(o => !o)}
                    className="w-full flex items-center gap-3 p-3 sm:p-5 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex-shrink-0">
                        <MousePointerClick className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                        <span className="text-sm font-black text-gray-900 dark:text-white tracking-tight">Mouse Cursor</span>
                        <p className="text-[11px] font-bold text-gray-400">{cursorActive ? `Active: ${cursorActive.name}` : 'Default browser cursor'}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${openCursor ? 'rotate-180' : ''}`} />
                </button>
                {openCursor && (
                    <div className="px-3 sm:px-5 pb-4 sm:pb-5">
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                            <input
                                value={cursorDraft.cssUrl}
                                onChange={event => setCursorDraft(previous => ({ ...previous, cssUrl: event.target.value }))}
                                placeholder='<link rel="stylesheet" href="https://.../cursor.css">  ya  https://.../cursor.css'
                                className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[11px] font-bold text-gray-700 outline-none transition-colors focus:border-primary dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
                            />
                            <input
                                value={cursorDraft.name}
                                onChange={event => setCursorDraft(previous => ({ ...previous, name: event.target.value }))}
                                placeholder="Cursor name (optional)"
                                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[11px] font-bold text-gray-700 outline-none transition-colors focus:border-primary lg:w-48 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200"
                            />
                            <button
                                onClick={addAndApplyCursor}
                                disabled={cursorSaving || !cursorDraft.cssUrl.trim()}
                                className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-95 disabled:opacity-50"
                            >
                                {cursorSaving
                                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    : <MousePointerClick className="h-3.5 w-3.5" />}
                                Add &amp; Apply
                            </button>
                            {cursorActive && (
                                <button
                                    onClick={resetCursor}
                                    disabled={cursorSaving}
                                    className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-500 transition-colors hover:border-rose-300 hover:text-rose-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-400"
                                >
                                    Reset
                                </button>
                            )}
                        </div>

                        <div className="mt-4">
                            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-bold text-gray-400">
                                    Card par <span className="font-black text-gray-600 dark:text-gray-300">hover</span> karein — live preview dikhega; apply karne ke liye card ke bottom row par click karein.
                                </p>
                                <button
                                    onClick={() => setCursorDraft({ name: CURSOR_PRESET.name, cssUrl: CURSOR_PRESET.cssUrl })}
                                    className="rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-black text-primary transition-colors hover:bg-primary/20"
                                >
                                    Preset: Azure Chrome Aura fill karein
                                </button>
                            </div>

                            {cursorLibrary.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
                                    <MousePointerClick className="h-6 w-6 text-gray-300" />
                                    <p className="text-xs font-bold text-gray-400">
                                        Library khali hai — upar URL paste karke <span className="font-black text-gray-600 dark:text-gray-300">Add &amp; Apply</span> dabayein.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {cursorLibrary.map(item => {
                                        const isActive = cursorActive?.cssUrl === item.cssUrl;
                                        const isSelecting = selectingCursor === item.cssUrl;
                                        const isDeleting = deletingCursor === item.cssUrl;
                                        return (
                                            <div
                                                key={item.cssUrl}
                                                className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all dark:bg-slate-900 ${isActive
                                                    ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                                                    : 'border-gray-100 hover:border-primary/30 dark:border-slate-700'}`}
                                            >
                                                <div className="relative">
                                                    <iframe
                                                        srcDoc={previewDoc(item.cssUrl)}
                                                        title={item.name || item.cssUrl}
                                                        sandbox=""
                                                        loading="lazy"
                                                        className="block h-24 w-full border-0 bg-white"
                                                    />
                                                    {isActive && (
                                                        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Active
                                                        </span>
                                                    )}
                                                    {isSelecting && (
                                                        <span className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60">
                                                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(event) => { event.stopPropagation(); removeCursorItem(item); }}
                                                        disabled={isDeleting || Boolean(selectingCursor)}
                                                        title="Delete cursor"
                                                        className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 p-1.5 text-rose-500 opacity-0 shadow-sm transition-all hover:bg-rose-500 hover:text-white group-hover:opacity-100 disabled:opacity-40 dark:bg-slate-800/90"
                                                    >
                                                        {isDeleting
                                                            ? <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                                                            : <Trash2 className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                                <div
                                                    onClick={() => selectCursor(item)}
                                                    title={isActive ? 'Active cursor' : 'Is cursor ko apply karein'}
                                                    className="flex cursor-pointer items-center justify-between gap-1.5 border-t border-gray-100 p-2.5 dark:border-slate-700"
                                                >
                                                    <div className="min-w-0 space-y-0.5">
                                                        <p className="truncate text-[11px] font-black text-gray-900 dark:text-white" title={item.name}>
                                                            {item.name || 'Custom Cursor'}
                                                        </p>
                                                        <p className="truncate text-[10px] font-bold text-gray-400">Hover karein — live preview</p>
                                                    </div>
                                                    {isActive
                                                        ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                                        : <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-gray-300 opacity-0 transition-opacity group-hover:opacity-100">Apply</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LmsUpdate;

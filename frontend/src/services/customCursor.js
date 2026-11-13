import api from './api';

const STORAGE_KEY = 'customCursor';
const LINK_ID = 'custom-cursor-css';

let cached = null;
let inflight = null;

const loadStored = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && parsed.cssUrl ? parsed : null;
    } catch {
        return null;
    }
};

cached = loadStored();

export const getCustomCursor = () => cached;

export const applyCustomCursor = (cursor) => {
    const cssUrl = cursor?.cssUrl || '';
    let link = document.getElementById(LINK_ID);
    if (cssUrl) {
        if (!link) {
            link = document.createElement('link');
            link.id = LINK_ID;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        if (link.getAttribute('href') !== cssUrl) link.setAttribute('href', cssUrl);
    } else if (link) {
        link.remove();
    }
    document.documentElement.classList.toggle('custom-cursor', Boolean(cssUrl));
};

export const refreshCustomCursor = () => {
    if (inflight) return inflight;
    inflight = api.get('/lms-update/cursor')
        .then((res) => {
            const data = res.data?.data;
            cached = data && data.cssUrl ? data : null;
            try {
                if (cached) localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
                else localStorage.removeItem(STORAGE_KEY);
            } catch {
                // localStorage unavailable — keep in-memory cache
            }
            applyCustomCursor(cached);
            return cached;
        })
        .catch(() => {
            applyCustomCursor(cached);
            return cached;
        })
        .finally(() => {
            inflight = null;
        });
    return inflight;
};

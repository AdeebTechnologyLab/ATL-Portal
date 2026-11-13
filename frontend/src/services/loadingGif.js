import api from './api';

const STORAGE_KEY = 'activeLoadingGif';
let cachedUrl = '';
let inflight = null;

try {
    cachedUrl = localStorage.getItem(STORAGE_KEY) || '';
} catch {
    cachedUrl = '';
}

export const getLoadingGifUrl = () => cachedUrl || '/loading.gif';

export const refreshLoadingGifUrl = () => {
    if (inflight) return inflight;
    inflight = api.get('/lms-update/active')
        .then((res) => {
            const data = res.data?.data;
            cachedUrl = (data && data.url) || '';
            try {
                if (cachedUrl) localStorage.setItem(STORAGE_KEY, cachedUrl);
                else localStorage.removeItem(STORAGE_KEY);
            } catch {
                // localStorage unavailable — keep in-memory cache
            }
            return getLoadingGifUrl();
        })
        .catch(() => getLoadingGifUrl())
        .finally(() => {
            inflight = null;
        });
    return inflight;
};

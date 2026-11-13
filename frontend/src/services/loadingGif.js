import { useEffect, useState } from 'react';
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

export const useLoadingGifUrl = () => {
    const [url, setUrl] = useState(getLoadingGifUrl());
    useEffect(() => {
        let mounted = true;
        const sync = () => {
            refreshLoadingGifUrl().then((resolved) => {
                if (mounted) setUrl(resolved || getLoadingGifUrl());
            });
        };
        sync();
        const onUpdated = () => sync();
        window.addEventListener('loading-gif-updated', onUpdated);
        return () => {
            mounted = false;
            window.removeEventListener('loading-gif-updated', onUpdated);
        };
    }, []);
    return url;
};

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
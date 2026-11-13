import api from './api';
import { SOCIAL_LINK_GROUPS } from '../constants/socialLinks';

const STORAGE_KEY = 'socialLinkGroups';
let cached = null;
let inflight = null;

const loadStored = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch {
        return null;
    }
};

cached = loadStored() || SOCIAL_LINK_GROUPS;

export const getSocialLinkGroups = () => cached;

export const refreshSocialLinkGroups = () => {
    if (inflight) return inflight;
    inflight = api.get('/lms-update/social-links')
        .then((res) => {
            const data = res.data?.data;
            cached = Array.isArray(data) && data.length ? data : SOCIAL_LINK_GROUPS;
            try {
                if (Array.isArray(res.data?.data)) {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.data));
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch {
                // localStorage unavailable — keep in-memory cache
            }
            return cached;
        })
        .catch(() => cached)
        .finally(() => {
            inflight = null;
        });
    return inflight;
};

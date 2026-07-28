/** Hostinger backend — direct URL */
export const PRODUCTION_API = 'https://darksalmon-grasshopper-335002.hostingersite.com/api';
export const PRODUCTION_SOCKET = 'https://darksalmon-grasshopper-335002.hostingersite.com';

const isLocalHost = (host) => host === 'localhost' || host === '127.0.0.1';

/**
 * Localhost / dev: Vite proxy (/api) in dev mode, direct http://localhost:5000/api in prod builds.
 * Production: Direct Hostinger backend URL.
 */
export const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;

        // Localhost / 127.0.0.1 — development
        if (isLocalHost(host)) {
            return import.meta.env.DEV ? '/api' : 'http://localhost:5000/api';
        }

        // Production deployment
        return PRODUCTION_API;
    }

    // SSR / build-time fallback
    if (import.meta.env.PROD) {
        return PRODUCTION_API;
    }

    return import.meta.env.DEV ? '/api' : 'http://localhost:5000/api';
};

/** Socket / uploads origin without /api suffix */
export const getBackendOrigin = () => {
    const base = getApiBaseUrl();
    if (base === '/api') {
        if (typeof window !== 'undefined' && isLocalHost(window.location.hostname)) {
            return 'http://localhost:5000';
        }
        return PRODUCTION_SOCKET;
    }
    return base.replace(/\/api\/?$/, '');
};

/** Socket URL for io() connections */
export const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && !isLocalHost(window.location.hostname) ? PRODUCTION_API : 'http://localhost:5000/api');
    return rawUrl === '/api' ? PRODUCTION_SOCKET : rawUrl.replace(/\/api\/?$/, '');
};

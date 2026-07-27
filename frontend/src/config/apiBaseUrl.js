/** Hostinger backend — direct URL */
export const PRODUCTION_API = 'https://mediumslateblue-wolf-946223.hostingersite.com/api';

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
        // Fallback for production
        return 'https://mediumslateblue-wolf-946223.hostingersite.com';
    }
    return base.replace(/\/api\/?$/, '');
};

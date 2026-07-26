/** Render backend — direct URL fallback */
export const PRODUCTION_API = 'https://lms-adeeb-technology-lab.onrender.com/api';

const isLocalHost = (host) => host === 'localhost' || host === '127.0.0.1';

const isVercelHost = (host) => host.includes('vercel.app');

/**
 * Live Vercel site (including custom domains): same-origin /api (proxied to Render via vercel.json).
 * Avoids CORS and wrong baked-in VITE_API_URL on production builds.
 *
 * Localhost / dev: Vite proxy (/api) in dev mode, direct http://localhost:5000/api in prod builds.
 * Any other host (Vercel, custom domains): /api — Vercel rewrites handle the rest.
 */
export const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;

        // Localhost / 127.0.0.1 — development
        if (isLocalHost(host)) {
            return import.meta.env.DEV ? '/api' : 'http://localhost:5000/api';
        }

        // Everything else is production (Vercel main deploy, preview deploys, custom domains)
        // Let vercel.json rewrites proxy /api/* → Render backend
        return '/api';
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
        // All production hosts (Vercel, custom domains) → Render backend
        return 'https://lms-adeeb-technology-lab.onrender.com';
    }
    return base.replace(/\/api\/?$/, '');
};

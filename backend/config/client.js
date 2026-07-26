/** Live frontend (Vercel) — used in password-reset emails and notification links */
const PRODUCTION_CLIENT_URL = 'https://lms-adeeb-technology-lab.vercel.app';

/**
 * Dynamically resolve the frontend URL.
 *
 * Priority:
 *  1. Origin / Referer / X-Forwarded-Host from the incoming request
 *     (so the reset link matches the domain the user is actually on).
 *  2. CLIENT_URL environment variable.
 *  3. Hardcoded PRODUCTION_CLIENT_URL fallback.
 *
 * @param {import('express').Request} [req] - Express request object (optional).
 */
const getClientUrl = (req) => {
    if (req) {
        // Try Origin header first (e.g. "https://myapp.vercel.app")
        const origin = req.get('origin');
        if (origin && /^https?:\/\//i.test(origin)) {
            return origin.replace(/\/+$/, '');
        }

        // Try Referer header (e.g. "https://myapp.vercel.app/forgot-password")
        const referer = req.get('referer');
        if (referer) {
            try {
                const parsed = new URL(referer);
                return `${parsed.protocol}//${parsed.host}`;
            } catch (_) { /* ignore parse errors */ }
        }

        // Try X-Forwarded-Host (set by Vercel / reverse proxies)
        const fwdHost = req.get('x-forwarded-host');
        if (fwdHost) {
            const proto = req.get('x-forwarded-proto') || 'https';
            return `${proto}://${fwdHost.split(',')[0].trim()}`;
        }
    }

    // Fallback to env var or hardcoded URL
    const url = (process.env.CLIENT_URL || PRODUCTION_CLIENT_URL).replace(/\/+$/, '');
    return url;
};

module.exports = { getClientUrl, PRODUCTION_CLIENT_URL };

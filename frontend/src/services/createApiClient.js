import axios from 'axios';

// Retry reads only: a timed-out write may already have reached the server.
export const waitForRetry = (milliseconds, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new axios.CanceledError());
    const abort = () => {
        clearTimeout(timer);
        reject(new axios.CanceledError());
    };
    const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
    }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
});

export const createApiClient = ({ getBaseURL, getToken, onUnauthorized, wait = waitForRetry }) => {
    const api = axios.create({ timeout: 45000, headers: { 'Content-Type': 'application/json' } });
    api.interceptors.request.use(config => {
        config.baseURL = getBaseURL();
        const token = getToken();
        config.__sessionToken = token;
        if (token) config.headers.set('Authorization', `Bearer ${token}`);
        else config.headers.delete('Authorization');
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            config.headers.delete('Content-Type');
            // Uploads need more time on mobile connections; respect explicit overrides.
            if (config.timeout === api.defaults.timeout) config.timeout = 180000;
        }
        return config;
    });
    api.interceptors.response.use(response => response, async error => {
        const config = error.config;
        if (!config || axios.isCancel(error) || config.signal?.aborted) throw error;
        // A delayed response from a previous account must not log out the current one.
        if (config.__sessionToken !== getToken()) throw error;
        const status = error.response?.status;
        const login = config.url?.split('?')[0]?.endsWith('/auth/login');
        if (status === 401 && !login && config.__sessionToken) onUnauthorized();
        const transient = status === 502 || status === 503 || status === 504
            || (!error.response && ['ECONNABORTED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(error.code));
        const attempts = config.__retryCount || 0;
        if (config.method?.toLowerCase() !== 'get' || !transient || attempts >= 2 || config.retry === false) throw error;
        // Pause rather than spin when completely offline; an explicit retry is needed.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) throw error;
        const retryAfter = error.response?.headers?.['retry-after'];
        const seconds = Number(retryAfter);
        const requestedDelay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
        const delay = Math.min(10000, Math.max(requestedDelay, 1000 * (2 ** attempts) + Math.random() * 250));
        await wait(delay, config.signal);
        if (config.__sessionToken !== getToken()) throw error;
        config.__retryCount = attempts + 1;
        return api.request(config);
    });
    return api;
};

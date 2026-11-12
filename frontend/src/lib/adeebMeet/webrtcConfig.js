/** ICE servers — STUN + TURN for NAT/firewall traversal.
 *
 *  NOTE: the old public `openrelay.metered.ca` host is dead (DNS now points to
 *  192.0.2.1), so it is no longer used. Prefer setting a working TURN server:
 *      VITE_TURN_URL=turn:your-host:3478,turns:your-host:443?transport=tcp
 *      VITE_TURN_USERNAME=...
 *      VITE_TURN_CREDENTIAL=...
 *  If those are not set we fall back to Metered's static-auth relay (best
 *  effort, generated client-side with time-limited credentials).
 */
const BASE_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
];

/** @deprecated use getIceServers() so TURN credentials are included */
export const ICE_SERVERS = BASE_ICE_SERVERS;

const STATIC_TURN_HOST = 'staticauth.openrelay.metered.ca';
const STATIC_TURN_SECRET = 'openrelayprojectsecret';
const TURN_TTL_SECONDS = 12 * 60 * 60;

let cachedIceServers = null;
let cachedIceServersExpiresAt = 0;

const base64FromBytes = (bytes) => {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
};

async function buildStaticTurnCredentials() {
    const expires = Math.floor(Date.now() / 1000) + TURN_TTL_SECONDS;
    const username = `${expires}:adeebmeet`;
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(STATIC_TURN_SECRET),
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(username)
    );
    return {
        username,
        credential: base64FromBytes(new Uint8Array(signature)),
        expires,
    };
}

export async function getIceServers() {
    if (cachedIceServers && Date.now() / 1000 < cachedIceServersExpiresAt - 60) {
        return cachedIceServers;
    }

    const servers = [...BASE_ICE_SERVERS];
    const env = import.meta.env || {};
    const envUrl = env.VITE_TURN_URL;
    const envUsername = env.VITE_TURN_USERNAME;
    const envCredential = env.VITE_TURN_CREDENTIAL;

    if (envUrl) {
        servers.push({
            urls: envUrl
                .split(',')
                .map((url) => url.trim())
                .filter(Boolean),
            username: envUsername || undefined,
            credential: envCredential || undefined,
        });
    } else if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const { username, credential, expires } = await buildStaticTurnCredentials();
            servers.push(
                { urls: `turn:${STATIC_TURN_HOST}:80`, username, credential },
                { urls: `turn:${STATIC_TURN_HOST}:443`, username, credential },
                { urls: `turns:${STATIC_TURN_HOST}:443?transport=tcp`, username, credential }
            );
            cachedIceServersExpiresAt = expires;
        } catch {
            /* Web Crypto unavailable — continue with STUN only */
        }
    }

    cachedIceServers = servers;
    if (!cachedIceServersExpiresAt) {
        cachedIceServersExpiresAt = Math.floor(Date.now() / 1000) + 300;
    }
    return servers;
}

export { getSocketURL } from '../../config/apiBaseUrl';

export const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
};

/** Lightweight camera capture — mesh mein har peer video dobara encode karta hai,
 *  is liye heavy constraints poora computer hang karwa deti hain. 480p@15 kaafi hai. */
export const VIDEO_CONSTRAINTS = {
    width: { ideal: 640, max: 960 },
    height: { ideal: 360, max: 540 },
    frameRate: { ideal: 15, max: 15 },
};

export const isMobileDevice = () =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

export const isIOSDevice = () => /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

export const isAndroidDevice = () => /Android/i.test(navigator.userAgent || '');

/** Bound getDisplayMedia — some mobile browsers only expose it on mediaDevices */
export const getDisplayMediaFn = () => {
    if (typeof navigator === 'undefined') return null;
    if (navigator.mediaDevices?.getDisplayMedia) {
        return navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    }
    if (typeof navigator.getDisplayMedia === 'function') {
        return navigator.getDisplayMedia.bind(navigator);
    }
    return null;
};

export const isDisplayMediaSupported = () => {
    if (typeof window === 'undefined') return false;
    if (!window.isSecureContext) return false;
    return !!getDisplayMediaFn();
};

/** Prefer entire screen (monitor) in the browser picker — Chrome pre-selects "Entire Screen" */
const ENTIRE_SCREEN_VIDEO = {
    displaySurface: 'monitor',
    width: { max: 1280 },
    height: { max: 720 },
    frameRate: { max: 10 },
};

/** Constraint sets tried in order (entire screen first, then fallbacks) */
export const getDisplayMediaAttempts = () => {
    const isIOS = isIOSDevice();
    const isMobile = isMobileDevice();

    if (isIOS) {
        return [
            { video: { displaySurface: 'monitor' }, audio: false },
            { video: true, audio: false },
        ];
    }

    if (isMobile) {
        return [
            { video: ENTIRE_SCREEN_VIDEO, audio: false },
            { video: { displaySurface: 'monitor' }, audio: false },
            { video: true, audio: false },
        ];
    }

    return [
        { video: ENTIRE_SCREEN_VIDEO, audio: false },
        { video: { displaySurface: 'monitor' }, audio: false },
        { video: true, audio: false },
    ];
};

/** @deprecated use acquireDisplayStream */
export const getDisplayMediaOptions = () => getDisplayMediaAttempts()[0];

export const getScreenShareUnsupportedReason = () => {
    if (typeof window === 'undefined') return 'Screen sharing is unavailable.';
    if (!window.isSecureContext) {
        return 'Screen sharing on phone requires a secure link (HTTPS). Open the class using https:// not http://.';
    }
    if (isIOSDevice() && !getDisplayMediaFn()) {
        return 'Screen sharing on iPhone needs Safari 17.4+ or iOS 18+. Try Android Chrome, or share from a laptop.';
    }
    if (!getDisplayMediaFn()) {
        return 'Screen sharing is not available in this browser. Use Chrome on Android, or Chrome/Edge on desktop.';
    }
    return null;
};

export async function acquireDisplayStream() {
    const getDisplayMedia = getDisplayMediaFn();
    const blockedReason = getScreenShareUnsupportedReason();
    if (!getDisplayMedia) {
        throw new Error(blockedReason || 'Screen sharing is not supported on this device.');
    }

    const attempts = getDisplayMediaAttempts();
    let lastError = null;

    for (const constraints of attempts) {
        try {
            return await getDisplayMedia(constraints);
        } catch (err) {
            lastError = err;
            if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
                throw err;
            }
        }
    }

    const msg =
        lastError?.message ||
        'Could not start screen sharing. On phone Chrome, allow tab/screen when prompted.';
    throw new Error(msg);
}

export const createDummyVideoTrack = () => {
    try {
        const canvas = Object.assign(document.createElement('canvas'), {
            width: 320,
            height: 180,
        });
        const ctx = canvas.getContext('2d');
        ctx?.fillRect(0, 0, 320, 180);
        const stream = canvas.captureStream?.(5) ?? canvas.webkitCaptureStream?.(5);
        const track = stream?.getVideoTracks()[0];
        if (track) track.enabled = false;
        if (track) track._isDummy = true;
        return track ?? null;
    } catch {
        return null;
    }
};

export async function enumerateMediaDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
        return { audioInputs: [], videoInputs: [], audioOutputs: [] };
    }
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return {
            audioInputs: devices.filter((d) => d.kind === 'audioinput'),
            videoInputs: devices.filter((d) => d.kind === 'videoinput'),
            audioOutputs: devices.filter((d) => d.kind === 'audiooutput'),
        };
    } catch {
        return { audioInputs: [], videoInputs: [], audioOutputs: [] };
    }
}

export async function acquireMicrophoneTrack(deviceId) {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const audio = deviceId
        ? { ...AUDIO_CONSTRAINTS, deviceId: { exact: deviceId } }
        : AUDIO_CONSTRAINTS;
    const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video: false,
    });
    const track = stream.getAudioTracks()[0];
    if (!track) return null;
    track.enabled = true;
    return track;
}

export async function acquireCameraTrack(deviceId) {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const video = deviceId
        ? { ...VIDEO_CONSTRAINTS, deviceId: { exact: deviceId } }
        : VIDEO_CONSTRAINTS;
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video,
    });
    const track = stream.getVideoTracks()[0];
    if (!track) return null;
    track.enabled = true;
    return track;
}

export const buildLocalMediaStream = async () => {
    const tryGetMedia = async (constraints) => {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
            return null;
        }
    };

    // IMPORTANT: acquire sequentially, not with Promise.race. Concurrent
    // getUserMedia calls fight over the same mic/camera and can hand back a
    // silent audio track (or fail) on Windows/Android. Try the combined
    // request first, then fall back to audio-only, then video-only.
    let raw = await tryGetMedia({ audio: AUDIO_CONSTRAINTS, video: VIDEO_CONSTRAINTS });
    if (!raw) raw = await tryGetMedia({ audio: AUDIO_CONSTRAINTS });
    if (!raw) raw = await tryGetMedia({ video: VIDEO_CONSTRAINTS });

    const stream = new MediaStream();
    let hasAudio = false;
    let hasVideo = false;

    let audio = raw?.getAudioTracks()[0];
    if (!audio) {
        try {
            audio = await acquireMicrophoneTrack();
        } catch {
            audio = null;
        }
    }
    if (audio) {
        audio.enabled = true;
        stream.addTrack(audio);
        hasAudio = true;
    }

    const video = raw?.getVideoTracks()[0];
    if (video) {
        try {
            await video.applyConstraints(VIDEO_CONSTRAINTS);
        } catch {
            /* use device default */
        }
        stream.addTrack(video);
        hasVideo = true;
    } else {
        const dummy = createDummyVideoTrack();
        if (dummy) stream.addTrack(dummy);
    }

    // Release any extra tracks from the raw capture that we didn't keep.
    const used = new Set(stream.getTracks());
    raw?.getTracks().forEach((track) => {
        if (!used.has(track)) {
            try {
                track.stop();
            } catch {
                /* ignore */
            }
        }
    });

    return { stream, hasAudio, hasVideo };
};

export const resolveAvatarUrl = (photo, name, serverUrl) => {
    if (photo) {
        return photo.startsWith('http') ? photo : `${serverUrl}/${photo.replace(/^\//, '')}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=ff8e01&color=fff`;
};

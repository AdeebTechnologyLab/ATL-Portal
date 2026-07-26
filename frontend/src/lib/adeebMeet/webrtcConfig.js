/** ICE servers — STUN + public TURN for NAT/firewall traversal */
export const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

export const getSocketURL = () => {
    const rawUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? 'https://lms-adeeb-technology-lab.onrender.com/api' : 'http://localhost:5000/api');
    return rawUrl === '/api' ? 'https://lms-adeeb-technology-lab.onrender.com' : rawUrl.replace(/\/api\/?$/, '');
};

export const AUDIO_CONSTRAINTS = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
};

/** Full HD camera capture for clear video in meet */
export const VIDEO_CONSTRAINTS = {
    width: { ideal: 1920, max: 1920 },
    height: { ideal: 1080, max: 1080 },
    frameRate: { ideal: 24, max: 30 },
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
    width: { max: 1920 },
    height: { max: 720 },
    frameRate: { max: 30 },
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
    let raw = null;

    const tryGetMedia = async (constraints) => {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
            return null;
        }
    };

    raw = await Promise.race([
        tryGetMedia({ audio: AUDIO_CONSTRAINTS, video: VIDEO_CONSTRAINTS }),
        tryGetMedia({ audio: AUDIO_CONSTRAINTS }),
        tryGetMedia({ video: VIDEO_CONSTRAINTS }),
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);

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

    return { stream, hasAudio, hasVideo };
};

export const resolveAvatarUrl = (photo, name, serverUrl) => {
    if (photo) {
        return photo.startsWith('http') ? photo : `${serverUrl}/${photo.replace(/^\//, '')}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=ff8e01&color=fff`;
};

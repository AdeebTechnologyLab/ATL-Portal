/** Lightweight audio level monitor (single AudioContext, throttled updates) */
export class AudioLevelMonitor {
    constructor(onLevels, intervalMs = 120) {
        this.onLevels = onLevels;
        this.intervalMs = intervalMs;
        this.sources = new Map();
        this.ctx = null;
        this.timer = null;
        this.dataArray = null;
    }

    _ensureContext() {
        if (this.ctx) return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
    }

    addStream(id, stream) {
        if (!stream) return;
        const audioTracks = stream.getAudioTracks();
        if (!audioTracks.length || !audioTracks[0].enabled) {
            this.removeStream(id);
            return;
        }

        this._ensureContext();
        if (!this.ctx) return;

        this.removeStream(id);

        try {
            const source = this.ctx.createMediaStreamSource(stream);
            const analyser = this.ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.65;
            source.connect(analyser);
            this.sources.set(id, { analyser, source });
            if (!this.dataArray) {
                this.dataArray = new Uint8Array(analyser.frequencyBinCount);
            }
        } catch {
            /* stream may not be playable yet */
        }
    }

    removeStream(id) {
        const entry = this.sources.get(id);
        if (!entry) return;
        try {
            entry.source.disconnect();
        } catch {
            /* ignore */
        }
        this.sources.delete(id);
    }

    resumeContext() {
        if (this.ctx?.state === 'suspended') {
            return this.ctx.resume();
        }
        return Promise.resolve();
    }

    start() {
        if (this.timer) return;
        this.timer = setInterval(() => this._tick(), this.intervalMs);
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        for (const id of [...this.sources.keys()]) {
            this.removeStream(id);
        }
        if (this.ctx?.state !== 'closed') {
            this.ctx?.close().catch(() => {});
        }
        this.ctx = null;
    }

    _tick() {
        if (!this.sources.size) {
            this.onLevels?.({}, null);
            return;
        }

        const levels = {};
        let loudestId = null;
        let loudest = 0.05;

        for (const [id, { analyser }] of this.sources) {
            const buf = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) sum += buf[i];
            const level = sum / (buf.length * 255);
            levels[id] = level;
            if (level > loudest) {
                loudest = level;
                loudestId = id;
            }
        }

        this.onLevels?.(levels, loudestId);
    }
}

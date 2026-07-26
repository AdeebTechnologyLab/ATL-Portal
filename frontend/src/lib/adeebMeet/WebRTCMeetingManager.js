import {
    ICE_SERVERS,
    VIDEO_CONSTRAINTS,
    acquireCameraTrack,
    acquireDisplayStream,
    acquireMicrophoneTrack,
    getScreenShareUnsupportedReason,
    isDisplayMediaSupported,
} from './webrtcConfig';

const VIDEO_SEND_BITRATE = 2_500_000;

async function applyVideoSenderBitrate(pc) {
    for (const sender of pc.getSenders()) {
        if (sender.track?.kind !== 'video') continue;
        try {
            const params = sender.getParameters();
            if (!params.encodings?.length) params.encodings = [{}];
            params.encodings[0].maxBitrate = VIDEO_SEND_BITRATE;
            await sender.setParameters(params);
        } catch {
            /* browser may reject before negotiation completes */
        }
    }
}

let emitPeersTimer = null;

/**
 * Mesh WebRTC manager with perfect negotiation.
 */
export class WebRTCMeetingManager {
    constructor({
        socket,
        mySocketId,
        myUserDetails,
        localStream,
        onPeersChange,
        onParticipantsChange,
        onScreenShareChange,
    }) {
        this.socket = socket;
        this.mySocketId = mySocketId;
        this.myUserDetails = myUserDetails;
        this.localStream = localStream;
        this.onPeersChange = onPeersChange;
        this.onParticipantsChange = onParticipantsChange;
        this.onScreenShareChange = onScreenShareChange;

        this.peers = new Map();
        this.cameraVideoTrack = localStream?.getVideoTracks()[0] ?? null;
        this.cameraAudioTrack = localStream?.getAudioTracks()[0] ?? null;
        this.screenTrack = null;
        this.destroyed = false;

        this._bindSocket();
    }

    _bindSocket() {
        this.socket.on('existing_classroom_users', (users) => {
            users.forEach(({ socketId, userDetails }) => {
                this._connectToPeer(socketId, userDetails, true);
            });
        });

        this.socket.on('user_joined_classroom', ({ socketId, userDetails }) => {
            if (!socketId || socketId === this.mySocketId) return;
            this._connectToPeer(socketId, userDetails, true);
        });

        this.socket.on('classroom_signal', async ({ signal, from, userDetails }) => {
            if (!from || from === this.mySocketId) return;
            await this._handleSignal(from, signal, userDetails);
        });

        this.socket.on('user_left_classroom', (socketId) => {
            this._removePeer(socketId);
            this.onScreenShareChange?.({ socketId, active: false });
        });

        this.socket.on('room_users_update', (users) => {
            this.onParticipantsChange?.(users);
        });

        this.socket.on('classroom_screen_share', ({ socketId, active }) => {
            if (!socketId || socketId === this.mySocketId) return;
            const entry = this.peers.get(socketId);
            if (entry) {
                entry.isScreenSharing = !!active;
                this._scheduleEmitPeers();
            }
            this.onScreenShareChange?.({ socketId, active: !!active });
        });

        this.socket.on('teacher_action', (data) => {
            if (data.action === 'kicked') this.onKicked?.();
            else if (data.action === 'force_mute') this.onForceMute?.();
        });

        this.socket.on('class_ended_by_teacher', () => {
            this.onClassEnded?.();
        });
    }

    _scheduleEmitPeers() {
        if (emitPeersTimer) clearTimeout(emitPeersTimer);
        emitPeersTimer = setTimeout(() => this._emitPeers(), 80);
    }

    _isPolite(remoteSocketId) {
        return this.mySocketId < remoteSocketId;
    }

    _emitPeers() {
        const list = Array.from(this.peers.entries()).map(([peerId, data]) => ({
            peerId,
            userDetails: data.userDetails,
            remoteStream: data.remoteStream,
            connectionState: data.pc.connectionState,
            isScreenSharing: data.isScreenSharing,
        }));
        this.onPeersChange?.(list);
    }

    _getOrCreatePeer(remoteSocketId, userDetails) {
        if (this.peers.has(remoteSocketId)) {
            return this.peers.get(remoteSocketId);
        }

        const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            bundlePolicy: 'max-bundle',
        });
        const remoteStream = new MediaStream();

        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                pc.addTrack(track, this.localStream);
            });
        }

        const entry = {
            pc,
            userDetails: userDetails || { name: 'Guest' },
            remoteStream,
            makingOffer: false,
            iceQueue: [],
            isScreenSharing: false,
        };

        pc.ontrack = (event) => {
            const track = event.track;
            const existing = remoteStream.getTracks().find((t) => t.kind === track.kind);
            if (existing) remoteStream.removeTrack(existing);
            remoteStream.addTrack(track);

            if (track.kind === 'video') {
                const label = (track.label || '').toLowerCase();
                entry.isScreenSharing =
                    label.includes('screen') ||
                    label.includes('window') ||
                    label.includes('display');
                this._scheduleEmitPeers();
            }

            this._scheduleEmitPeers();
        };

        pc.onicecandidate = (event) => {
            if (!event.candidate) return;
            this.socket.emit('classroom_signal', {
                to: remoteSocketId,
                signal: { type: 'ice', candidate: event.candidate.toJSON() },
                userDetails: this.myUserDetails,
            });
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') {
                try {
                    pc.restartIce?.();
                } catch {
                    /* ignore */
                }
            }
            this._scheduleEmitPeers();
        };

        this.peers.set(remoteSocketId, entry);
        applyVideoSenderBitrate(pc);
        this._scheduleEmitPeers();
        return entry;
    }

    async _flushIceQueue(entry) {
        const { pc, iceQueue } = entry;
        while (iceQueue.length > 0) {
            const candidate = iceQueue.shift();
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {
                /* ignore */
            }
        }
    }

    async _handleSignal(from, signal, userDetails) {
        if (this.destroyed) return;

        const entry = this._getOrCreatePeer(from, userDetails);
        const { pc } = entry;
        const polite = this._isPolite(from);

        if (signal?.type === 'ice' && signal.candidate) {
            if (!pc.remoteDescription) {
                entry.iceQueue.push(signal.candidate);
                return;
            }
            try {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch {
                /* ignore */
            }
            return;
        }

        if (signal?.type === 'offer') {
            const offerCollision = entry.makingOffer || pc.signalingState !== 'stable';
            if (offerCollision && !polite) return;

            if (offerCollision && polite) {
                try {
                    await pc.setLocalDescription({ type: 'rollback' });
                } catch {
                    /* ignore */
                }
            }

            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            await this._flushIceQueue(entry);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.socket.emit('classroom_signal', {
                to: from,
                signal: pc.localDescription,
                userDetails: this.myUserDetails,
            });
            return;
        }

        if (signal?.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            await this._flushIceQueue(entry);
        }
    }

    async _connectToPeer(remoteSocketId, userDetails, asInitiator) {
        if (this.destroyed || remoteSocketId === this.mySocketId) return;
        if (this.peers.has(remoteSocketId)) return;

        const entry = this._getOrCreatePeer(remoteSocketId, userDetails);
        const { pc } = entry;

        if (!asInitiator) return;

        try {
            entry.makingOffer = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket.emit('classroom_signal', {
                to: remoteSocketId,
                signal: pc.localDescription,
                userDetails: this.myUserDetails,
            });
        } catch (err) {
            console.error('Offer failed:', err);
            this._removePeer(remoteSocketId);
        } finally {
            entry.makingOffer = false;
        }
    }

    _removePeer(socketId) {
        const entry = this.peers.get(socketId);
        if (!entry) return;
        try {
            entry.pc.close();
        } catch {
            /* ignore */
        }
        this.peers.delete(socketId);
        this._scheduleEmitPeers();
    }

    async _replaceLocalAudioTrack(newTrack) {
        if (!newTrack || !this.localStream) return;

        const old = this.localStream.getAudioTracks()[0];
        if (old) {
            this.localStream.removeTrack(old);
            try {
                old.stop();
            } catch {
                /* ignore */
            }
        }
        this.localStream.addTrack(newTrack);
        this.cameraAudioTrack = newTrack;

        for (const [, { pc }] of this.peers) {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
            if (sender) await sender.replaceTrack(newTrack);
            else pc.addTrack(newTrack, this.localStream);
        }
        await this._renegotiateAllPeers();
    }

    async _replaceLocalVideoTrack(newTrack) {
        if (!newTrack || !this.localStream || this.screenTrack) return;

        const old = this.localStream.getVideoTracks()[0];
        if (old && old !== newTrack) {
            this.localStream.removeTrack(old);
            if (old !== this.screenTrack) {
                try {
                    old.stop();
                } catch {
                    /* ignore */
                }
            }
        }
        if (!this.localStream.getVideoTracks().includes(newTrack)) {
            this.localStream.addTrack(newTrack);
        }
        this.cameraVideoTrack = newTrack;

        for (const [, { pc }] of this.peers) {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) await sender.replaceTrack(newTrack);
            else pc.addTrack(newTrack, this.localStream);
            await applyVideoSenderBitrate(pc);
        }
        await this._renegotiateAllPeers();
    }

    async _renegotiateAllPeers() {
        for (const socketId of this.peers.keys()) {
            await this._renegotiatePeer(socketId);
        }
    }

    async _renegotiatePeer(remoteSocketId) {
        const entry = this.peers.get(remoteSocketId);
        if (!entry || this.destroyed) return;
        const { pc } = entry;
        if (pc.signalingState !== 'stable' || entry.makingOffer) return;

        try {
            entry.makingOffer = true;
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this.socket.emit('classroom_signal', {
                to: remoteSocketId,
                signal: pc.localDescription,
                userDetails: this.myUserDetails,
            });
        } catch (err) {
            console.error('Renegotiation failed:', err);
        } finally {
            entry.makingOffer = false;
        }
    }

    async setMuted(muted) {
        if (!muted) {
            let track = this.localStream?.getAudioTracks()[0];
            const needsNew =
                !track ||
                track.readyState === 'ended' ||
                track.muted ||
                track.label === 'MediaStreamAudioDestinationNode';
            if (needsNew) {
                try {
                    const fresh = await acquireMicrophoneTrack();
                    if (fresh) await this._replaceLocalAudioTrack(fresh);
                    track = fresh;
                } catch (err) {
                    console.error('Microphone access failed:', err);
                    throw new Error('Could not access microphone. Check browser permissions.');
                }
            }
            if (track) track.enabled = true;
        } else {
            const track = this.localStream?.getAudioTracks()[0];
            if (track) track.enabled = false;
        }
    }

    setVideoEnabled(enabled) {
        const track = this.screenTrack || this.localStream?.getVideoTracks()[0];
        if (track && track.readyState === 'live' && track !== this.screenTrack) track.enabled = enabled;
    }

    async switchAudioDevice(deviceId) {
        const fresh = await acquireMicrophoneTrack(deviceId);
        if (!fresh) throw new Error('Could not access selected microphone');
        const wasMuted = !this.localStream?.getAudioTracks()[0]?.enabled;
        await this._replaceLocalAudioTrack(fresh);
        if (!wasMuted) fresh.enabled = true;
        return fresh;
    }

    async switchVideoDevice(deviceId) {
        if (this.screenTrack) throw new Error('Stop screen sharing before switching camera');
        const fresh = await acquireCameraTrack(deviceId);
        if (!fresh) throw new Error('Could not access selected camera');
        const wasOff = !this.localStream?.getVideoTracks()[0]?.enabled;
        await this._replaceLocalVideoTrack(fresh);
        if (!wasOff) fresh.enabled = true;
        return fresh;
    }

    async startScreenShare() {
        if (!isDisplayMediaSupported()) {
            throw new Error(
                getScreenShareUnsupportedReason() ||
                    'Screen sharing is not supported on this browser. Use HTTPS and Chrome on Android or desktop.'
            );
        }

        const displayStream = await acquireDisplayStream();
        const screenTrack = displayStream.getVideoTracks()[0];
        if (!screenTrack) throw new Error('No screen track');

        this.screenTrack = screenTrack;
        if (!this.cameraVideoTrack) {
            this.cameraVideoTrack = this.localStream?.getVideoTracks()[0] ?? null;
        }
        this.cameraWasEnabledBeforeShare = Boolean(this.cameraVideoTrack?.enabled);

        try {
            await screenTrack.applyConstraints({
                width: { ideal: 1920, max: 1920 },
                height: { ideal: 720, max: 720 },
                frameRate: { ideal: 30, max: 30 },
            });
        } catch {
            /* use capture defaults */
        }

        for (const [peerId, { pc }] of this.peers) {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) await sender.replaceTrack(screenTrack);
            else pc.addTrack(screenTrack, this.localStream);
            const entry = this.peers.get(peerId);
            if (entry) entry.isScreenSharing = true;
            await applyVideoSenderBitrate(pc);
        }

        const localVideo = this.localStream?.getVideoTracks()[0];
        if (localVideo && localVideo !== screenTrack) {
            this.localStream.removeTrack(localVideo);
        }
        if (!this.localStream.getVideoTracks().includes(screenTrack)) {
            this.localStream.addTrack(screenTrack);
        }

        screenTrack.onended = () => {
            this.stopScreenShare().catch(() => {});
        };

        this.socket.emit('classroom_screen_share', {
            roomId: this.roomId,
            active: true,
        });
        this.onScreenShareChange?.({ socketId: this.mySocketId, active: true });
        this._scheduleEmitPeers();
        await this._renegotiateAllPeers();

        return displayStream;
    }

    async stopScreenShare() {
        const screenTrack = this.screenTrack;
        this.screenTrack = null;

        let cameraTrack = this.cameraVideoTrack;
        if (!cameraTrack || cameraTrack.readyState === 'ended') {
            if (this.cameraWasEnabledBeforeShare) {
                try {
                    const cam = await navigator.mediaDevices.getUserMedia({
                        video: VIDEO_CONSTRAINTS,
                    });
                    cameraTrack = cam.getVideoTracks()[0];
                    this.cameraVideoTrack = cameraTrack;
                } catch {
                    cameraTrack = null;
                }
            } else {
                cameraTrack = null;
            }
        }
        if (cameraTrack) cameraTrack.enabled = Boolean(this.cameraWasEnabledBeforeShare);

        for (const [peerId, { pc }] of this.peers) {
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
            const entry = this.peers.get(peerId);
            if (entry) entry.isScreenSharing = false;
            await applyVideoSenderBitrate(pc);
        }

        if (screenTrack) {
            try {
                screenTrack.stop();
            } catch {
                /* ignore */
            }
            if (this.localStream?.getVideoTracks().includes(screenTrack)) {
                this.localStream.removeTrack(screenTrack);
            }
        }

        if (cameraTrack && this.localStream && !this.localStream.getVideoTracks().includes(cameraTrack)) {
            this.localStream.addTrack(cameraTrack);
        }

        this.socket.emit('classroom_screen_share', {
            roomId: this.roomId,
            active: false,
        });
        this.onScreenShareChange?.({ socketId: this.mySocketId, active: false });
        this._scheduleEmitPeers();
        await this._renegotiateAllPeers();
    }

    kickUser(targetSocketId) {
        this.socket.emit('teacher_control', {
            roomId: this.roomId,
            action: 'kick_user',
            targetSocketId,
        });
    }

    muteUser(targetSocketId) {
        this.socket.emit('teacher_control', {
            roomId: this.roomId,
            action: 'mute_user',
            targetSocketId,
        });
    }

    endClassForEveryone() {
        this.socket.emit('teacher_control', {
            roomId: this.roomId,
            action: 'end_class',
        });
    }

    sendChatMessage(roomId, message) {
        this.socket.emit('classroom_message', message);
    }

    joinRoom(roomId) {
        this.roomId = roomId;
        this.socket.emit('join_classroom', roomId, this.myUserDetails);
    }

    leaveRoom() {
        if (this.roomId) {
            this.socket.emit('leave_classroom', this.roomId);
        }
    }

    destroy() {
        this.destroyed = true;
        this.leaveRoom();
        for (const [id] of this.peers) {
            this._removePeer(id);
        }
        this.peers.clear();
        this.socket.off('existing_classroom_users');
        this.socket.off('user_joined_classroom');
        this.socket.off('classroom_signal');
        this.socket.off('user_left_classroom');
        this.socket.off('room_users_update');
        this.socket.off('classroom_screen_share');
        this.socket.off('teacher_action');
        this.socket.off('class_ended_by_teacher');
    }
}

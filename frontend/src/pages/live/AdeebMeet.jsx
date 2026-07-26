import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Video,
    VideoOff,
    Mic,
    MicOff,
    MessageSquare,
    Users,
    LogOut,
    ShieldCheck,
    Send,
    Monitor,
    UserMinus,
    VolumeX,
    Volume2,
    LayoutGrid,
    Maximize2,
    Minimize2,
    Sidebar as SidebarIcon,
    X,
    ChevronDown,
    Hand,
    Pin,
} from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { WebRTCMeetingManager } from '../../lib/adeebMeet/WebRTCMeetingManager';
import {
    buildLocalMediaStream,
    enumerateMediaDevices,
    getScreenShareUnsupportedReason,
    getSocketURL,
    isDisplayMediaSupported,
    resolveAvatarUrl,
} from '../../lib/adeebMeet/webrtcConfig';
import { AudioLevelMonitor } from '../../lib/adeebMeet/audioLevelMonitor';
import { playChatNotificationSound } from '../../lib/adeebMeet/chatNotify';
import { enrollmentAPI } from '../../services/api';

const SOCKET_URL = getSocketURL();

const attachStreamToVideo = (videoEl, stream) => {
    if (!videoEl || !stream) return;
    if (videoEl.srcObject !== stream) videoEl.srcObject = stream;
    const playPromise = videoEl.play();
    if (playPromise?.catch) playPromise.catch(() => {});
};

const AdeebMeet = () => {
    const { roomName } = useParams();
    const navigate = useNavigate();
    const { user, role } = useSelector((state) => state.auth);

    const [isLoading, setIsLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(true);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [layout, setLayout] = useState('grid');
    const [peers, setPeers] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [myCourses, setMyCourses] = useState('');
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);
    const [audioLevels, setAudioLevels] = useState({});
    const [peerScreenShare, setPeerScreenShare] = useState({});
    const [screenFocusOn, setScreenFocusOn] = useState(true);
    const [pinnedScreenSharerId, setPinnedScreenSharerId] = useState(null);
    const [unreadChat, setUnreadChat] = useState(0);
    const [audioDevices, setAudioDevices] = useState([]);
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
    const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
    const [showAudioMenu, setShowAudioMenu] = useState(false);
    const [showVideoMenu, setShowVideoMenu] = useState(false);
    const [speakerDevices, setSpeakerDevices] = useState([]);
    const [selectedSpeakerDevice, setSelectedSpeakerDevice] = useState('');
    const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
    const [speakerMuted, setSpeakerMuted] = useState(false);
    const [focusedTileId, setFocusedTileId] = useState(null);
    const [handRaised, setHandRaised] = useState(false);
    const [raisedHands, setRaisedHands] = useState({});
    const myUserId = user?._id || user?.id;
    const socketRef = useRef(null);
    const audioMonitorRef = useRef(null);
    const managerRef = useRef(null);
    const userVideoRef = useRef(null);
    const userStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const chatEndRef = useRef(null);
    const mainContainerRef = useRef(null);
    const showChatRef = useRef(showChat);
    showChatRef.current = showChat;

    const isTeacher = role === 'teacher' || role === 'admin';

    const leaveClass = useCallback(() => {
        managerRef.current?.destroy();
        managerRef.current = null;
        socketRef.current?.disconnect();
        socketRef.current = null;
        userStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        userStreamRef.current = null;
        screenStreamRef.current = null;
        audioMonitorRef.current?.stop();
        setHandRaised(false);
        setRaisedHands({});
        navigate(`/${role}/dashboard`);
    }, [navigate, role]);

    const appendMessage = useCallback((data) => {
        if (!data?.messageId) return;
        setMessages((prev) => {
            if (prev.some((m) => m.messageId === data.messageId)) return prev;
            return [...prev, data];
        });
    }, []);

    useEffect(() => {
        if (!user || !roomName) return;

        let cancelled = false;

        const init = async () => {
            try {
                const { stream, hasAudio, hasVideo } = await buildLocalMediaStream();
                if (cancelled) return;

                userStreamRef.current = stream;
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = stream;
                }
                setIsMuted(!hasAudio);
                setIsVideoOff(!hasVideo);
                if (!hasAudio && !hasVideo) {
                    toast('Camera/mic unavailable — you can still listen and chat', { icon: 'ℹ️' });
                }

                const { audioInputs, videoInputs } = await enumerateMediaDevices();
                if (!cancelled) {
                    setAudioDevices(audioInputs);
                    setVideoDevices(videoInputs);
                    const audioTrack = stream.getAudioTracks()[0];
                    const videoTrack = stream.getVideoTracks()[0];
                    if (audioTrack?.getSettings?.().deviceId) {
                        setSelectedAudioDevice(audioTrack.getSettings().deviceId);
                    } else if (audioInputs[0]) {
                        setSelectedAudioDevice(audioInputs[0].deviceId);
                    }
                    if (videoTrack?.getSettings?.().deviceId) {
                        setSelectedVideoDevice(videoTrack.getSettings().deviceId);
                    } else if (videoInputs[0]) {
                        setSelectedVideoDevice(videoInputs[0].deviceId);
                    }
                }

                let courseNames = '';
                if (role === 'student' || role === 'intern') {
                    try {
                        const res = await enrollmentAPI.getMy();
                        const activeEnrollments = (res.data?.data || []).filter(e => e.isActive || e.status === 'enrolled');
                        if (activeEnrollments.length > 0) {
                            courseNames = activeEnrollments.map(e => e.course?.title).filter(Boolean).join(', ');
                            setMyCourses(courseNames);
                        }
                    } catch (err) {
                        console.error('Error fetching enrollments for meeting:', err);
                    }
                }

                const userDetails = {
                    id: user?._id || user?.id,
                    name: user?.name || 'Guest',
                    photo: user?.photo || null,
                    role: role || 'student',
                    rollNo: user?.rollNo || user?.rollNumber || null,
                    course: courseNames || null,
                    isMuted: !hasAudio,
                    isVideoOff: !hasVideo
                };

                const onClassEnded = () => {
                    toast.error('Teacher ended the class');
                    leaveClass();
                };

                const onKicked = () => {
                    toast.error('You were removed from the class');
                    leaveClass();
                };

                const onForceMute = () => {
                    managerRef.current?.setMuted(true);
                    setIsMuted(true);
                    toast('Teacher muted your microphone', { icon: '🔇' });
                };

                const socket = io(SOCKET_URL, {
                    withCredentials: true,
                    transports: ['websocket', 'polling'],
                });
                socketRef.current = socket;

                const startMeeting = () => {
                    if (cancelled || managerRef.current) return;
                    setConnectionStatus('connected');
                    const manager = new WebRTCMeetingManager({
                        socket,
                        mySocketId: socket.id,
                        myUserDetails: userDetails,
                        localStream: stream,
                        onPeersChange: setPeers,
                        onParticipantsChange: setParticipants,
                        onScreenShareChange: ({ socketId, active }) => {
                            if (!socketId) return;
                            setPeerScreenShare((prev) => ({
                                ...prev,
                                [socketId]: active,
                            }));
                            if (active) setScreenFocusOn(true);
                        },
                    });
                    manager.onClassEnded = onClassEnded;
                    manager.onKicked = onKicked;
                    manager.onForceMute = onForceMute;
                    managerRef.current = manager;
                    manager.joinRoom(roomName);
                };

                if (socket.connected) startMeeting();
                else socket.on('connect', startMeeting);

                socket.on('connect_error', () => {
                    setConnectionStatus('error');
                    toast.error('Could not connect to meeting server');
                });

                socket.on('classroom_message', (data) => {
                    appendMessage(data);
                    const fromSelf = data.senderId === myUserId;
                    if (!fromSelf && !showChatRef.current) {
                        setUnreadChat((n) => n + 1);
                        playChatNotificationSound();
                    }
                });

                socket.on('classroom_media_state', ({ socketId, isMuted, isVideoOff }) => {
                    setPeers((prevPeers) =>
                        prevPeers.map((peer) =>
                            peer.peerId === socketId
                                ? { ...peer, mediaState: { isMuted, isVideoOff } }
                                : peer
                        )
                    );
                });

                socket.on('classroom_hand_raise', ({ socketId, raised, userDetails }) => {
                    if (!socketId) return;
                    setRaisedHands((prev) => {
                        const next = { ...prev };
                        if (raised) next[socketId] = userDetails?.name || 'Participant';
                        else delete next[socketId];
                        return next;
                    });
                    if (socketId === socket.id) setHandRaised(!!raised);
                    else if (raised && userDetails?.name) {
                        toast(`${userDetails.name} raised hand`, { icon: '🖐️', duration: 2500 });
                    }
                });

                socket.on('user_left_classroom', (leftSocketId) => {
                    setRaisedHands((prev) => {
                        if (!prev[leftSocketId]) return prev;
                        const next = { ...prev };
                        delete next[leftSocketId];
                        return next;
                    });
                });

                socket.io.on('reconnect', () => {
                    toast.success('Reconnected to meeting');
                    managerRef.current?.joinRoom(roomName);
                });

                setIsLoading(false);
            } catch (err) {
                console.error('Meet init error:', err);
                toast.error('Failed to start meeting');
                setIsLoading(false);
            }
        };

        init();

        return () => {
            cancelled = true;
            managerRef.current?.destroy();
            socketRef.current?.disconnect();
            userStreamRef.current?.getTracks().forEach((t) => t.stop());
            audioMonitorRef.current?.stop();
        };
    }, [roomName, user, role, leaveClass, appendMessage, myUserId]);

    useEffect(() => {
        const unlockPlayback = () => {
            audioMonitorRef.current?.resumeContext?.().catch(() => {});
            document.querySelectorAll('.adeeb-meet video').forEach((el) => {
                el.play?.().catch(() => {});
            });
        };
        document.addEventListener('click', unlockPlayback, { once: true });
        document.addEventListener('keydown', unlockPlayback, { once: true });
        return () => {
            document.removeEventListener('click', unlockPlayback);
            document.removeEventListener('keydown', unlockPlayback);
        };
    }, []);

    const applySpeakerSink = useCallback(
        async (deviceId) => {
            if (speakerMuted) return;
            const videos = document.querySelectorAll('.adeeb-meet video[data-remote="true"]');
            for (const video of videos) {
                if (!video.setSinkId) continue;
                try {
                    await video.setSinkId(deviceId || '');
                } catch {
                    /* browser may not support setSinkId */
                }
            }
        },
        [speakerMuted]
    );

    useEffect(() => {
        if (!speakerMuted) applySpeakerSink(selectedSpeakerDevice);
    }, [peers, selectedSpeakerDevice, speakerMuted, applySpeakerSink]);

    useEffect(() => {
        if (!showAudioMenu && !showVideoMenu && !showSpeakerMenu) return;
        const close = () => {
            setShowAudioMenu(false);
            setShowVideoMenu(false);
            setShowSpeakerMenu(false);
        };
        const timer = setTimeout(() => document.addEventListener('click', close), 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', close);
        };
    }, [showAudioMenu, showVideoMenu, showSpeakerMenu]);

    useEffect(() => {
        const refreshDevices = async () => {
            const { audioInputs, videoInputs, audioOutputs } = await enumerateMediaDevices();
            setAudioDevices(audioInputs);
            setVideoDevices(videoInputs);
            setSpeakerDevices(audioOutputs);
        };
        refreshDevices();
        navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
        return () => navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
    }, []);

    useEffect(() => {
        if (!peers.length) return;
        const timer = setTimeout(() => {
            document.querySelectorAll('.adeeb-meet video:not([muted])').forEach((el) => {
                el.play?.().catch(() => {});
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [peers]);

    useEffect(() => {
        if (!userStreamRef.current && !peers.length) return;

        if (!audioMonitorRef.current) {
            audioMonitorRef.current = new AudioLevelMonitor((levels, loudestId) => {
                setAudioLevels(levels);
                setActiveSpeakerId(loudestId);
            });
        }

        const monitor = audioMonitorRef.current;
        const localStream = userStreamRef.current;
        const localAudio = localStream?.getAudioTracks()[0];
        if (localAudio?.enabled) {
            monitor.addStream('local', localStream);
        } else {
            monitor.removeStream('local');
        }
        peers.forEach((p) => monitor.addStream(p.peerId, p.remoteStream));
        monitor.start();

        return () => {};
    }, [peers]);

    useEffect(
        () => () => {
            audioMonitorRef.current?.stop();
            audioMonitorRef.current = null;
        },
        []
    );

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const toggleMute = async () => {
        const next = !isMuted;
        try {
            await managerRef.current?.setMuted(next);
            setIsMuted(next);
            socketRef.current?.emit('classroom_media_state', {
                roomId: roomName,
                isMuted: next,
                isVideoOff,
            });
        } catch (err) {
            toast.error(err.message || 'Microphone unavailable');
        }
    };

    const toggleVideo = () => {
        const next = !isVideoOff;
        managerRef.current?.setVideoEnabled(!next);
        setIsVideoOff(next);
        socketRef.current?.emit('classroom_media_state', {
            roomId: roomName,
            isMuted,
            isVideoOff: next
        });
    };

    const switchMicrophone = async (deviceId) => {
        if (!deviceId || !managerRef.current) return;
        try {
            await managerRef.current.switchAudioDevice(deviceId);
            setSelectedAudioDevice(deviceId);
            setIsMuted(false);
            socketRef.current?.emit('classroom_media_state', {
                roomId: roomName,
                isMuted: false,
                isVideoOff,
            });
            setShowAudioMenu(false);
        } catch (err) {
            toast.error(err.message || 'Could not switch microphone');
        }
    };

    const switchCamera = async (deviceId) => {
        if (!deviceId || !managerRef.current) return;
        try {
            await managerRef.current.switchVideoDevice(deviceId);
            setSelectedVideoDevice(deviceId);
            if (userVideoRef.current && userStreamRef.current) {
                attachStreamToVideo(userVideoRef.current, userStreamRef.current);
            }
            setIsVideoOff(false);
            socketRef.current?.emit('classroom_media_state', {
                roomId: roomName,
                isMuted,
                isVideoOff: false,
            });
            setShowVideoMenu(false);
        } catch (err) {
            toast.error(err.message || 'Could not switch camera');
        }
    };

    const toggleHandRaise = () => {
        const next = !handRaised;
        setHandRaised(next);
        socketRef.current?.emit('classroom_hand_raise', {
            roomId: roomName,
            raised: next,
        });
        if (next) toast('Hand raised — everyone can see', { icon: '🖐️', duration: 2000 });
    };

    const toggleScreenShare = async () => {
        if (!managerRef.current) return;
        try {
            if (!isScreenSharing) {
                if (!isDisplayMediaSupported()) {
                    toast.error(
                        getScreenShareUnsupportedReason() ||
                            'Screen sharing is not available on this device.',
                        { duration: 6000 }
                    );
                    return;
                }
                const displayStream = await managerRef.current.startScreenShare();
                screenStreamRef.current = displayStream;
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = displayStream;
                }
                setIsScreenSharing(true);
                setScreenFocusOn(true);
                socketRef.current?.emit('classroom_media_state', {
                    roomId: roomName,
                    isMuted,
                    isVideoOff,
                });
                toast.success('Screen sharing started');
            } else {
                await managerRef.current.stopScreenShare();
                screenStreamRef.current = null;
                if (userVideoRef.current) {
                    userVideoRef.current.srcObject = userStreamRef.current;
                }
                setIsScreenSharing(false);
                setScreenFocusOn(false);
                socketRef.current?.emit('classroom_media_state', {
                    roomId: roomName,
                    isMuted,
                    isVideoOff,
                });
            }
        } catch (err) {
            console.error(err);
            if (err?.name === 'NotAllowedError') {
                toast.error('Screen share cancelled or permission denied.');
            } else if (err?.name === 'AbortError') {
                toast.error('Screen share was cancelled.');
            } else {
                toast.error(err.message || 'Screen share failed', { duration: 5000 });
            }
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !managerRef.current) return;
        const data = {
            messageId: `${socketRef.current?.id || 'local'}-${Date.now()}`,
            roomId: roomName,
            text: newMessage.trim(),
            senderId: myUserId,
            senderName: user?.name,
            senderPhoto: user?.photo,
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        };
        managerRef.current.sendChatMessage(roomName, data);
        appendMessage(data);
        setNewMessage('');
    };

    const endClassForEveryone = () => {
        if (!isTeacher || !window.confirm('End class for everyone?')) return;
        managerRef.current?.endClassForEveryone();
        leaveClass();
    };

    const toggleFullscreen = () => {
        const el = mainContainerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) {
            el.requestFullscreen?.().catch(() => toast.error('Fullscreen not supported'));
        } else {
            document.exitFullscreen?.();
        }
    };

    const mySocketId = socketRef.current?.id;
    const activeScreenSharerIds = [
        ...(isScreenSharing && mySocketId ? [mySocketId] : []),
        ...peers
            .filter((peer) => peerScreenShare[peer.peerId] || peer.isScreenSharing)
            .map((peer) => peer.peerId),
    ];
    const screenSharerId = activeScreenSharerIds.includes(pinnedScreenSharerId)
        ? pinnedScreenSharerId
        : activeScreenSharerIds[0] ?? null;

    const showScreenLayout = screenSharerId && screenFocusOn;

    useEffect(() => {
        if (pinnedScreenSharerId && !activeScreenSharerIds.includes(pinnedScreenSharerId)) {
            setPinnedScreenSharerId(null);
        }
    }, [pinnedScreenSharerId, activeScreenSharerIds.join('|')]);

    const displayTiles = [
        { key: 'local', isLocal: true },
        ...peers.map((p) => ({ key: p.peerId, isLocal: false, peer: p })),
    ];

    const gridTileClass = 'meet-tile-fixed !aspect-square !min-h-0';
    const fullTileClass = 'meet-tile-fullwidth w-full h-full flex-1 min-h-0';
    const focusedTileClass = 'h-full min-h-0 !aspect-auto w-full';
    const screenStageClass = 'meet-screen-stage';

    /** Audio wave only on the large main DP — not strip thumbnails or grid cells */
    const showDpWaveForTile = (tileId, className = '') => {
        if (className.includes('min-w-[120px]')) return false;
        if (focusedTileId) return focusedTileId === tileId;
        return (
            className.includes('meet-tile-fullwidth') ||
            className.includes('meet-screen-stage') ||
            className.includes('h-full min-h-0 !aspect-auto')
        );
    };

    const localLevel = audioLevels.local ?? 0;

    const isHandRaised = (tileId) =>
        tileId === 'local' ? handRaised : !!raisedHands[tileId];

    const isTileSpeaking = (tileId) => {
        if (isMuted && tileId === 'local') return false;
        const level = tileId === 'local' ? localLevel : audioLevels[tileId] ?? 0;
        return activeSpeakerId === tileId || level > 0.07;
    };

    const avatar = (photo, name) => resolveAvatarUrl(photo, name, SOCKET_URL);

    const studentCount = participants.filter(
        (p) => p.userDetails?.role === 'student' || p.userDetails?.role === 'intern'
    ).length;

    const toggleSpeakerMute = () => {
        const next = !speakerMuted;
        setSpeakerMuted(next);
        document.querySelectorAll('.adeeb-meet video[data-remote="true"]').forEach((v) => {
            v.muted = next;
        });
        if (!next) applySpeakerSink(selectedSpeakerDevice);
    };

    const switchSpeaker = async (deviceId) => {
        setSelectedSpeakerDevice(deviceId);
        setSpeakerMuted(false);
        await applySpeakerSink(deviceId);
        setShowSpeakerMenu(false);
    };

    const toggleTileFocus = (tileId) => {
        setFocusedTileId((prev) => (prev === tileId ? null : tileId));
    };

    const toggleScreenPin = (screenOwnerId) => {
        setPinnedScreenSharerId((current) => current === screenOwnerId ? null : screenOwnerId);
        setScreenFocusOn(true);
    };

    const renderLocalTile = (className = '', tileOptions = {}) => (
        <VideoTile
            stream={isScreenSharing ? screenStreamRef.current : userStreamRef.current}
            name={`You${isTeacher ? ' (Teacher)' : ''}`}
            isMuted={isMuted}
            isVideoOff={isVideoOff && !isScreenSharing}
            isLocal
            isScreenShare={isScreenSharing}
            videoRef={userVideoRef}
            avatarUrl={avatar(user?.photo, user?.name)}
            rollNo={user?.rollNo || user?.rollNumber || null}
            course={isTeacher ? null : myCourses}
            isSpeaking={isTileSpeaking('local')}
            audioLevel={localLevel}
            handRaised={handRaised}
            className={className}
            tileId="local"
            isTileFocused={focusedTileId === 'local'}
            onToggleFocus={toggleTileFocus}
            showTileControls={tileOptions.showTileControls !== false}
            showDpWave={showDpWaveForTile('local', className)}
            onPinScreen={isScreenSharing ? () => toggleScreenPin(mySocketId) : undefined}
            isScreenPinned={pinnedScreenSharerId === mySocketId}
        />
    );

    const renderTileWrapper = (tileId, children, className = '') => {
        const isFocused = focusedTileId === tileId;
        const isHidden = focusedTileId && focusedTileId !== tileId;

        if (isHidden) return null;

        return (
            <div
                key={tileId}
                className={`relative min-h-0 h-full ${isFocused ? 'col-span-full row-span-full z-10' : ''} ${className}`}
            >
                {!isFocused && (
                    <button
                        type="button"
                        onClick={() => toggleTileFocus(tileId)}
                        className="absolute top-2 right-2 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-primary/80 border border-white/20 flex items-center justify-center transition-colors"
                        title="Full screen"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                )}
                {children}
            </div>
        );
    };

    return (
        <motion.div
            ref={mainContainerRef}
            className="fixed inset-0 bg-[#0f0f0f] text-white flex flex-col font-sans select-none adeeb-meet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <header className="h-14 bg-black/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 md:px-6 z-30 shrink-0">
                <motion.div
                    className="flex items-center gap-3"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                >
                    <motion.img
                        src="/logo.png"
                        alt="LMS"
                        className="h-10 w-10 object-contain"
                        whileHover={{ scale: 1.05 }}
                    />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <h2 className="text-sm font-black uppercase tracking-tighter italic flex items-center gap-2">
                            Adeeb Meet
                            <span className="bg-red-500 text-[9px] px-1.5 py-0.5 rounded-full not-italic animate-pulse">
                                LIVE
                            </span>
                        </h2>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                            Room: {roomName} · {participants.length} joined
                        </p>
                    </motion.div>
                </motion.div>

                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                        <ShieldCheck
                            className={`w-4 h-4 ${connectionStatus === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`}
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                            {connectionStatus === 'connected' ? 'Connected' : 'Connecting…'}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={leaveClass}
                        className="px-3 py-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Leave
                    </button>
                    {isTeacher && (
                        <button
                            type="button"
                            onClick={endClassForEveryone}
                            className="px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            End Class
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden min-h-0 h-0">
                <div className="flex-1 flex flex-col min-h-0 p-2 md:p-3 overflow-hidden">
                    {showScreenLayout ? (
                        <div className="flex flex-col lg:flex-row gap-2 md:gap-3 flex-1 min-h-0 h-full">
                            <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center overflow-hidden">
                                {screenSharerId === mySocketId
                                    ? renderLocalTile(screenStageClass)
                                    : (() => {
                                          const sp = peers.find((p) => p.peerId === screenSharerId);
                                          return sp ? (
                                              <RemoteVideoTile
                                                  peer={sp}
                                                  avatarUrl={avatar(sp.userDetails?.photo, sp.userDetails?.name)}
                                                  isSpeaking={isTileSpeaking(screenSharerId)}
                                                  audioLevel={audioLevels[screenSharerId] ?? 0}
                                                  handRaised={isHandRaised(screenSharerId)}
                                                  className={screenStageClass}
                                                  isScreenShare
                                                  showDpWave={false}
                                                  onPinScreen={() => toggleScreenPin(screenSharerId)}
                                                  isScreenPinned={pinnedScreenSharerId === screenSharerId}
                                              />
                                          ) : null;
                                      })()}
                            </div>
                            <div className="lg:w-48 xl:w-52 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto shrink-0 max-h-full">
                                {displayTiles
                                    .filter((t) => (t.isLocal ? mySocketId : t.key) !== screenSharerId)
                                    .map((tile) =>
                                        tile.isLocal ? (
                                            <div key="local-strip" className="shrink-0">
                                                {renderLocalTile(
                                                    '!aspect-video min-w-[120px] lg:min-w-0 shrink-0 max-h-[120px] lg:max-h-none'
                                                )}
                                            </div>
                                        ) : (
                                            <RemoteVideoTile
                                                key={tile.peer.peerId}
                                                peer={tile.peer}
                                                avatarUrl={avatar(
                                                    tile.peer.userDetails?.photo,
                                                    tile.peer.userDetails?.name
                                                )}
                                                isSpeaking={isTileSpeaking(tile.peer.peerId)}
                                                audioLevel={audioLevels[tile.peer.peerId] ?? 0}
                                                handRaised={isHandRaised(tile.peer.peerId)}
                                                className="!aspect-video min-w-[120px] lg:min-w-0 shrink-0 max-h-[120px] lg:max-h-none"
                                                showDpWave={false}
                                                onPinScreen={
                                                    peerScreenShare[tile.peer.peerId] || tile.peer.isScreenSharing
                                                        ? () => toggleScreenPin(tile.peer.peerId)
                                                        : undefined
                                                }
                                                isScreenPinned={pinnedScreenSharerId === tile.peer.peerId}
                                            />
                                        )
                                    )}
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`flex-1 min-h-0 h-full w-full ${
                                focusedTileId
                                    ? 'flex flex-col'
                                    : layout === 'grid'
                                      ? 'meet-tiles-grid'
                                      : 'meet-tiles-full'
                            }`}
                        >
                            {displayTiles.map((tile) => {
                                const tileId = tile.isLocal ? 'local' : tile.peer.peerId;
                                const sizeClass =
                                    focusedTileId === tileId
                                        ? focusedTileClass
                                        : layout === 'grid'
                                          ? gridTileClass
                                          : fullTileClass;
                                const wrapperClass =
                                    focusedTileId === tileId
                                        ? 'min-h-0 w-full h-full flex-1'
                                        : layout === 'grid'
                                          ? 'shrink-0'
                                          : 'w-full flex-1 min-h-0 flex flex-col';

                                if (tile.isLocal) {
                                    return renderTileWrapper(
                                        tileId,
                                        renderLocalTile(sizeClass),
                                        wrapperClass
                                    );
                                }
                                const peerSharing =
                                    peerScreenShare[tile.peer.peerId] || tile.peer.isScreenSharing;
                                return renderTileWrapper(
                                    tileId,
                                    <RemoteVideoTile
                                        peer={tile.peer}
                                        avatarUrl={avatar(
                                            tile.peer.userDetails?.photo,
                                            tile.peer.userDetails?.name
                                        )}
                                        isSpeaking={isTileSpeaking(tile.peer.peerId)}
                                        audioLevel={audioLevels[tile.peer.peerId] ?? 0}
                                        handRaised={isHandRaised(tile.peer.peerId)}
                                        className={sizeClass}
                                        isScreenShare={peerSharing}
                                        tileId={tileId}
                                        isTileFocused={focusedTileId === tileId}
                                        onToggleFocus={toggleTileFocus}
                                        showDpWave={showDpWaveForTile(tileId, sizeClass)}
                                    />,
                                    wrapperClass
                                );
                            })}
                        </div>
                    )}
                </div>

                <AnimatePresence>
                    {(showChat || showParticipants) && (
                        <motion.aside
                            initial={{ x: 320, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 320, opacity: 0 }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            className="w-full max-w-[320px] bg-black/50 backdrop-blur-3xl border-l border-white/5 flex flex-col shrink-0"
                        >
                            <motion.div
                                className="flex border-b border-white/5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowChat(true);
                                        setShowParticipants(false);
                                    }}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${showChat ? 'text-primary border-b-2 border-primary' : 'text-white/40'}`}
                                >
                                    Chat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowChat(false);
                                        setShowParticipants(true);
                                    }}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${showParticipants ? 'text-primary border-b-2 border-primary' : 'text-white/40'}`}
                                >
                                    Students ({studentCount || participants.length})
                                </button>
                            </motion.div>

                            <motion.div
                                className="flex-1 overflow-y-auto p-4 custom-scrollbar min-h-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.05 }}
                            >
                                {showChat && (
                                    <div className="space-y-3">
                                        {messages.length === 0 && (
                                            <p className="text-xs text-white/30 text-center py-8">
                                                No messages yet. Say hello!
                                            </p>
                                        )}
                                        {messages.map((msg) => (
                                            <motion.div
                                                key={msg.messageId || `${msg.senderId}-${msg.time}-${msg.text}`}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex flex-col ${msg.senderId === (user?._id || user?.id) ? 'items-end' : 'items-start'}`}
                                            >
                                                <span className="text-[9px] text-white/40 mb-1">
                                                    {msg.senderName} · {msg.time}
                                                </span>
                                                <motion.div
                                                    whileHover={{ scale: 1.01 }}
                                                    className={`px-3 py-2 rounded-2xl text-xs max-w-[95%] whitespace-pre-wrap ${
                                                        msg.senderId === (user?._id || user?.id)
                                                            ? 'bg-primary text-white rounded-tr-sm'
                                                            : 'bg-white/5 border border-white/10 rounded-tl-sm'
                                                    }`}
                                                >
                                                    {msg.text}
                                                </motion.div>
                                            </motion.div>
                                        ))}
                                        <motion.div ref={chatEndRef} />
                                    </div>
                                )}

                                {showParticipants && (
                                    <div className="meet-students-panel space-y-2 select-text">
                                        {participants.map((p) => (
                                            <ParticipantRow
                                                key={p.socketId}
                                                name={p.userDetails?.name || 'Guest'}
                                                role={p.userDetails?.role || 'student'}
                                                photo={p.userDetails?.photo}
                                                rollNo={p.userDetails?.rollNo}
                                                course={p.userDetails?.course}
                                                isSelf={p.socketId === socketRef.current?.id}
                                                isSpeaking={isTileSpeaking(p.socketId)}
                                                handRaised={isHandRaised(p.socketId)}
                                                isTeacher={isTeacher}
                                                onKick={() => {
                                                    if (window.confirm(`Remove ${p.userDetails?.name}?`)) {
                                                        managerRef.current?.kickUser(p.socketId);
                                                    }
                                                }}
                                                onMute={() => managerRef.current?.muteUser(p.socketId)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>

                            {showChat && (
                                <motion.form
                                    onSubmit={sendMessage}
                                    className="p-3 border-t border-white/5 flex gap-2 shrink-0"
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                >
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Message everyone…"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
                                    />
                                    <motion.button
                                        type="submit"
                                        whileTap={{ scale: 0.95 }}
                                        className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"
                                    >
                                        <Send className="w-4 h-4" />
                                    </motion.button>
                                </motion.form>
                            )}
                        </motion.aside>
                    )}
                </AnimatePresence>
            </main>

            <footer className="h-[72px] md:h-20 bg-black/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-center px-4 z-30 shrink-0">
                <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-center">
                    <DeviceControl
                        onMainClick={toggleMute}
                        active={!isMuted}
                        icon={isMuted ? MicOff : Mic}
                        danger={isMuted}
                        label={isMuted ? 'Unmute' : 'Mute'}
                        menuOpen={showAudioMenu}
                        onMenuToggle={() => {
                            setShowAudioMenu((v) => !v);
                            setShowVideoMenu(false);
                        }}
                        devices={audioDevices}
                        selectedDeviceId={selectedAudioDevice}
                        onSelectDevice={switchMicrophone}
                        emptyLabel="No microphones found"
                    />
                    <DeviceControl
                        onMainClick={toggleVideo}
                        active={!isVideoOff}
                        icon={isVideoOff ? VideoOff : Video}
                        danger={isVideoOff}
                        label={isVideoOff ? 'Camera on' : 'Camera off'}
                        menuOpen={showVideoMenu}
                        onMenuToggle={() => {
                            setShowVideoMenu((v) => !v);
                            setShowAudioMenu(false);
                        }}
                        devices={videoDevices}
                        selectedDeviceId={selectedVideoDevice}
                        onSelectDevice={switchCamera}
                        emptyLabel="No cameras found"
                        disabled={isScreenSharing}
                    />
                    <DeviceControl
                        onMainClick={toggleSpeakerMute}
                        active={!speakerMuted}
                        icon={speakerMuted ? VolumeX : Volume2}
                        danger={speakerMuted}
                        label={speakerMuted ? 'Unmute speaker' : 'Speaker'}
                        menuOpen={showSpeakerMenu}
                        onMenuToggle={() => {
                            setShowSpeakerMenu((v) => !v);
                            setShowAudioMenu(false);
                            setShowVideoMenu(false);
                        }}
                        devices={speakerDevices}
                        selectedDeviceId={selectedSpeakerDevice}
                        onSelectDevice={switchSpeaker}
                        emptyLabel="Default speaker"
                    />
                    <ControlBtn
                        onClick={toggleScreenShare}
                        active={isScreenSharing}
                        icon={isScreenSharing ? X : Monitor}
                        accent={isScreenSharing}
                        label={isScreenSharing ? 'Stop share' : 'Share screen'}
                    />
                    <ControlBtn
                        onClick={toggleHandRaise}
                        active={handRaised}
                        icon={Hand}
                        accent={handRaised}
                        label={handRaised ? 'Lower hand' : 'Raise hand'}
                    />
                    {screenSharerId && (
                        <ControlBtn
                            onClick={() => setScreenFocusOn((v) => !v)}
                            active={screenFocusOn}
                            icon={Monitor}
                            label={screenFocusOn ? 'Grid view' : 'Focus screen'}
                        />
                    )}
                    <div className="w-px h-8 bg-white/10 mx-1 hidden sm:block" />
                    <ControlBtn
                        onClick={() => setLayout(layout === 'grid' ? 'full' : 'grid')}
                        icon={layout === 'grid' ? LayoutGrid : SidebarIcon}
                        label={layout === 'grid' ? 'Grid' : 'Full width'}
                    />
                    <div className="relative">
                        <ControlBtn
                            onClick={() => {
                                setShowChat((c) => !c);
                                if (!showChat) {
                                    setShowParticipants(false);
                                    setUnreadChat(0);
                                }
                            }}
                            active={showChat}
                            icon={MessageSquare}
                            label="Chat"
                        />
                        {unreadChat > 0 && !showChat && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                                {unreadChat > 9 ? '9+' : unreadChat}
                            </span>
                        )}
                    </div>
                    <ControlBtn
                        onClick={() => {
                            setShowParticipants((p) => !p);
                            if (!showParticipants) setShowChat(false);
                        }}
                        active={showParticipants}
                        icon={Users}
                        label="Students"
                    />
                    <ControlBtn onClick={toggleFullscreen} icon={Maximize2} label="Fullscreen" />
                </div>
            </footer>

            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[#0f0f0f] z-[100] flex flex-col items-center justify-center"
                    >
                        <motion.div
                            className="w-20 h-20 flex items-center justify-center mb-6 relative"
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <img src="/logo.png" alt="LMS" className="w-16 h-16 object-contain" />
                            <motion.div
                                className="absolute inset-0 border-2 border-primary rounded-3xl"
                                animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                            />
                        </motion.div>
                        <h2 className="text-lg font-black uppercase italic tracking-tight">
                            Joining Adeeb Meet
                        </h2>
                        <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">
                            Setting up camera & microphone…
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const AudioWave = ({ active, large = false }) =>
    active ? (
        <div className={`${large ? 'audio-wave-lg' : 'audio-wave'} shrink-0`} aria-hidden>
            <span />
            <span />
            <span />
            <span />
            {large && <span />}
        </div>
    ) : null;

const SpeakingAvatar = ({ src, alt, sizeClass, isSpeaking, audioLevel, isMuted, showDpWave = false }) => {
    const active = (isSpeaking || audioLevel > 0.07) && !isMuted;
    const showWave = active && showDpWave;
    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`speaking-avatar-wrap ${showWave ? 'is-speaking' : ''}`}>
                <img
                    src={src}
                    alt={alt}
                    className={`${sizeClass} rounded-full object-cover border-4 shadow-2xl ${
                        showWave ? 'border-emerald-400' : 'border-white/10'
                    }`}
                />
            </div>
            {showWave && (
                <>
                    <AudioWave active large />
                    <span className="meet-speaking-badge text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        Speaking
                    </span>
                </>
            )}
        </div>
    );
};

const HandRaisedBadge = ({ className = '' }) => (
    <div
        className={`meet-hand-badge flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/90 border border-amber-300/80 text-white shadow-lg z-20 pointer-events-none ${className}`}
        title="Hand raised"
    >
        <span className="text-base leading-none" aria-hidden>
            🖐️
        </span>
        <span className="text-[8px] font-black uppercase tracking-wider">Hand</span>
    </div>
);

const VideoTile = ({
    stream,
    name,
    isMuted,
    isVideoOff,
    isLocal,
    isScreenShare,
    videoRef,
    avatarUrl,
    rollNo,
    course,
    isSpeaking = false,
    audioLevel = 0,
    handRaised = false,
    className = '',
    tileId,
    isTileFocused = false,
    onToggleFocus,
    onPinScreen,
    isScreenPinned = false,
    showTileControls = true,
    showDpWave = false,
}) => {
    const internalRef = useRef(null);
    const ref = videoRef || internalRef;

    useEffect(() => {
        if (ref.current && stream) {
            attachStreamToVideo(ref.current, stream);
        }
    }, [stream, ref]);

    useEffect(() => {
        if (!ref.current || isLocal || !stream) return;
        const video = ref.current;
        const onTrack = () => attachStreamToVideo(video, stream);
        stream.addEventListener('addtrack', onTrack);
        stream.addEventListener('removetrack', onTrack);
        return () => {
            stream.removeEventListener('addtrack', onTrack);
            stream.removeEventListener('removetrack', onTrack);
        };
    }, [stream, ref, isLocal]);

    const isSpeakingActive = (isSpeaking || audioLevel > 0.07) && !isMuted;
    const isCompactTile = className.includes('min-w-[120px]');
    /** Main center DP (camera off) — wave on grid/full tiles, not strip thumbnails */
    const showMainDpWaveOnAvatar = !isCompactTile;
    const showMainDpWave = isSpeakingActive && showMainDpWaveOnAvatar && !isScreenShare;
    const isFixedTile = className.includes('meet-tile-fixed');
    const isFullTile = className.includes('meet-tile-fullwidth');
    const isScreenStage = className.includes('meet-screen-stage');

    return (
        <div
            className={`relative bg-white/5 rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 group shadow-lg ${
                isFixedTile || isFullTile || isScreenStage ? '' : 'aspect-video min-h-[180px]'
            } ${showMainDpWave ? 'meet-tile-speaking' : ''} ${isTileFocused ? 'ring-2 ring-primary/60' : ''} ${className}`}
            onClick={isTileFocused && onToggleFocus ? () => onToggleFocus(tileId) : undefined}
            role={isTileFocused ? 'button' : undefined}
            tabIndex={isTileFocused ? 0 : undefined}
            onKeyDown={
                isTileFocused && onToggleFocus
                    ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') onToggleFocus(tileId);
                      }
                    : undefined
            }
        >
            {isScreenShare && onPinScreen && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onPinScreen();
                    }}
                    className={`absolute top-2 left-2 z-30 h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                        isScreenPinned
                            ? 'bg-primary text-white border-primary shadow-lg'
                            : 'bg-black/65 hover:bg-primary/90 text-white border-white/20'
                    }`}
                    title={isScreenPinned ? 'Unpin this screen' : 'Pin this screen'}
                >
                    <Pin className={`w-3.5 h-3.5 ${isScreenPinned ? 'fill-current' : ''}`} />
                    {isScreenPinned ? 'Pinned' : 'Pin'}
                </button>
            )}
            {handRaised && (
                <HandRaisedBadge className="absolute top-2 right-2" />
            )}
            {isTileFocused && showTileControls && onToggleFocus && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFocus(tileId);
                    }}
                    className={`absolute top-2 z-20 w-8 h-8 rounded-lg bg-black/60 hover:bg-primary/80 border border-white/20 flex items-center justify-center transition-colors ${handRaised ? 'right-24' : 'right-2'}`}
                    title="Exit full screen"
                >
                    <Minimize2 className="w-4 h-4" />
                </button>
            )}
            <video
                ref={ref}
                autoPlay
                playsInline
                muted={isLocal}
                data-remote={!isLocal ? 'true' : undefined}
                disablePictureInPicture
                className={`bg-[#1a1a1a] ${isFullTile && !isScreenShare ? '' : 'w-full h-full'} ${isLocal && !isScreenShare ? 'mirror object-cover' : ''} ${isScreenShare || isScreenStage ? 'object-contain' : 'object-cover'}`}
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 z-10 pointer-events-none">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border min-w-0 pointer-events-auto bg-black/50 border-white/10">
                    <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <span className="text-[10px] font-bold truncate max-w-[120px]">{name}</span>
                    {isMuted && <MicOff className="w-3 h-3 text-red-400 shrink-0" />}
                    {isScreenShare && (
                        <span className="text-[8px] bg-emerald-500/80 px-1 rounded uppercase font-black shrink-0">
                            Screen
                        </span>
                    )}
                </div>
            </div>
            <AnimatePresence>
                {isVideoOff && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#141414] flex flex-col items-center justify-center p-4 z-[5]"
                    >
                        <SpeakingAvatar
                            src={avatarUrl}
                            alt={name}
                            sizeClass="w-24 h-24 md:w-28 md:h-28"
                            isSpeaking={isSpeaking}
                            audioLevel={audioLevel}
                            isMuted={isMuted}
                            showDpWave={showMainDpWaveOnAvatar}
                        />
                        <div className="flex flex-col items-center text-center max-w-[90%] mt-1">
                            <span className="text-xs md:text-sm font-extrabold text-white tracking-tight drop-shadow-md">
                                {name}
                            </span>
                            {rollNo && (
                                <span className="text-[10px] font-black uppercase tracking-wider text-primary mt-0.5">
                                    Roll No: {rollNo}
                                </span>
                            )}
                            {course && (
                                <span className="text-[10px] font-bold text-white/50 mt-0.5 truncate max-w-[200px]" title={course}>
                                    {course}
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const RemoteVideoTile = ({
    peer,
    avatarUrl,
    isSpeaking = false,
    audioLevel = 0,
    handRaised = false,
    className = '',
    isScreenShare = false,
    tileId,
    isTileFocused = false,
    onToggleFocus,
    onPinScreen,
    isScreenPinned = false,
    showDpWave = false,
}) => {
    if (!peer) return null;

    const videoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoOff, setIsVideoOff] = useState(false);

    useEffect(() => {
        const stream = peer.remoteStream;
        if (!stream || !videoRef.current) return;

        attachStreamToVideo(videoRef.current, stream);

        const updateTracks = () => {
            attachStreamToVideo(videoRef.current, stream);
            const audio = stream.getAudioTracks()[0];
            const video = stream.getVideoTracks()[0];
            setIsMuted(!audio || !audio.enabled);
            setIsVideoOff(!video || !video.enabled || video.readyState !== 'live');
        };

        updateTracks();
        stream.addEventListener('addtrack', updateTracks);
        stream.addEventListener('removetrack', updateTracks);

        const interval = setInterval(updateTracks, 1000);
        return () => {
            stream.removeEventListener('addtrack', updateTracks);
            stream.removeEventListener('removetrack', updateTracks);
            clearInterval(interval);
        };
    }, [peer.remoteStream, peer.peerId]);

    const name = peer.userDetails?.name || 'Guest';
    const isTeacherPeer = peer.userDetails?.role === 'teacher' || peer.userDetails?.role === 'admin';

    const isSharing = isScreenShare || peer.isScreenSharing;
    const displayIsVideoOff = isSharing
        ? false
        : peer.mediaState?.isVideoOff !== undefined
          ? peer.mediaState.isVideoOff
          : peer.userDetails?.isVideoOff !== undefined
            ? peer.userDetails.isVideoOff
            : isVideoOff;

    const displayIsMuted =
        peer.mediaState?.isMuted !== undefined
            ? peer.mediaState.isMuted
            : peer.userDetails?.isMuted !== undefined
              ? peer.userDetails.isMuted
              : isMuted;

    return (
        <VideoTile
            stream={peer.remoteStream}
            name={`${name}${isTeacherPeer ? ' (Teacher)' : ''}`}
            isMuted={displayIsMuted}
            isVideoOff={displayIsVideoOff}
            isScreenShare={isSharing}
            videoRef={videoRef}
            avatarUrl={avatarUrl}
            rollNo={peer.userDetails?.rollNo}
            course={peer.userDetails?.course}
            isSpeaking={isSpeaking}
            audioLevel={audioLevel}
            handRaised={handRaised}
            className={className}
            tileId={tileId || peer.peerId}
            isTileFocused={isTileFocused}
            onToggleFocus={onToggleFocus}
            onPinScreen={onPinScreen}
            isScreenPinned={isScreenPinned}
            showDpWave={showDpWave}
        />
    );
};

const DeviceControl = ({
    onMainClick,
    active,
    icon: Icon,
    danger,
    label,
    menuOpen,
    onMenuToggle,
    devices,
    selectedDeviceId,
    onSelectDevice,
    emptyLabel,
    disabled,
}) => (
    <div className="relative flex flex-col items-center gap-0.5">
        <div className="flex items-center">
            <motion.button
                type="button"
                onClick={onMainClick}
                whileTap={{ scale: 0.92 }}
                className={`w-11 h-11 md:w-12 md:h-12 rounded-l-xl md:rounded-l-2xl flex items-center justify-center transition-colors ${
                    danger
                        ? 'bg-rose-500 text-white'
                        : active
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
                }`}
            >
                <Icon className="w-5 h-5" />
            </motion.button>
            <motion.button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onMenuToggle();
                }}
                disabled={disabled}
                whileTap={{ scale: 0.92 }}
                className={`w-6 h-11 md:h-12 rounded-r-xl md:rounded-r-2xl flex items-center justify-center border-l border-white/10 transition-colors ${
                    disabled
                        ? 'opacity-40 cursor-not-allowed bg-white/5'
                        : menuOpen
                          ? 'bg-primary/80 text-white'
                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
                aria-label="Select device"
            >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </motion.button>
        </div>
        <span className="text-[7px] md:text-[8px] font-bold uppercase text-white/30 hidden sm:block">
            {label}
        </span>
        {menuOpen && (
            <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 max-h-48 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 py-1"
                onClick={(e) => e.stopPropagation()}
            >
                {devices.length === 0 ? (
                    <button
                        type="button"
                        onClick={() => onSelectDevice('')}
                        className="w-full text-left px-3 py-2 text-[10px] text-primary font-bold hover:bg-white/10"
                    >
                        {emptyLabel}
                    </button>
                ) : (
                    devices.map((d) => (
                        <button
                            key={d.deviceId}
                            type="button"
                            onClick={() => onSelectDevice(d.deviceId)}
                            className={`w-full text-left px-3 py-2 text-[10px] truncate hover:bg-white/10 ${
                                d.deviceId === selectedDeviceId ? 'text-primary font-bold' : 'text-white/80'
                            }`}
                        >
                            {d.label || `Device ${d.deviceId.slice(0, 6)}`}
                        </button>
                    ))
                )}
            </div>
        )}
    </div>
);

const ControlBtn = ({ onClick, active, icon: Icon, danger, accent, label }) => (
    <motion.div className="flex flex-col items-center gap-0.5" whileHover={{ y: -2 }}>
        <motion.button
            type="button"
            onClick={onClick}
            whileTap={{ scale: 0.92 }}
            className={`w-11 h-11 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-colors ${
                danger
                    ? 'bg-rose-500 text-white'
                    : accent
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
            }`}
        >
            <Icon className="w-5 h-5" />
        </motion.button>
        <span className="text-[7px] md:text-[8px] font-bold uppercase text-white/30 hidden sm:block">
            {label}
        </span>
    </motion.div>
);

const ParticipantRow = ({
    name,
    role,
    photo,
    rollNo,
    course,
    isSelf,
    isSpeaking = false,
    handRaised = false,
    isTeacher,
    onKick,
    onMute,
}) => {
    const avatarUrl = resolveAvatarUrl(photo, name, SOCKET_URL);

    return (
        <motion.div
            layout
            className={`flex items-center justify-between p-2.5 rounded-xl border group ${
                handRaised
                    ? 'bg-amber-500/20 border-amber-400/50'
                    : isSpeaking
                      ? 'bg-emerald-500/15 border-emerald-500/40'
                      : 'bg-white/5 border-white/5'
            }`}
        >
            <motion.div className="flex items-center gap-2 min-w-0 flex-1" whileHover={{ x: 2 }}>
                <img
                    src={avatarUrl}
                    alt=""
                    className={`w-8 h-8 rounded-lg object-cover pointer-events-none shrink-0 ${
                        handRaised ? 'border-2 border-amber-400' : ''
                    }`}
                />
                {handRaised && (
                    <span className="meet-hand-badge text-lg shrink-0" title="Hand raised">
                        🖐️
                    </span>
                )}
                <div className="min-w-0 flex-1 student-row-text">
                    <p className="text-xs font-bold break-words">
                        {name} {isSelf && '(You)'}
                    </p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                        <span className="text-[9px] text-white/40 uppercase font-medium">{role}</span>
                        {rollNo && (
                            <span className="text-[9px] text-primary font-bold select-all">
                                Roll No: {rollNo}
                            </span>
                        )}
                        {course && (
                            <span
                                className="text-[9px] text-white/60 break-words select-all"
                                title={course}
                            >
                                Course: {course}
                            </span>
                        )}
                    </div>
                </div>
            </motion.div>
            {!isSelf && isTeacher && (
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                        type="button"
                        onClick={onMute}
                        title="Mute participant"
                        className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-400"
                    >
                        <VolumeX className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onKick}
                        title="Remove participant"
                        className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-400"
                    >
                        <UserMinus className="w-4 h-4" />
                    </button>
                </div>
            )}
        </motion.div>
    );
};

export default AdeebMeet;

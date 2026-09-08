import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, X, Send } from 'lucide-react';
import { chatAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const VoiceRecorder = ({ onVoiceUploaded, disabled = false }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioPreviewRef = useRef(null);
    const streamRef = useRef(null);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                setPreviewMode(true);

                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setIsPaused(false);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Microphone access denied:', err);
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsRecording(false);
        setIsPaused(false);
    }, []);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setIsRecording(false);
        setIsPaused(false);
        setDuration(0);
        setAudioBlob(null);
        setAudioUrl(null);
        setPreviewMode(false);
        setPlaybackTime(0);
        setPlaybackDuration(0);
    }, [audioUrl]);

    const sendVoice = useCallback(async () => {
        if (!audioBlob) return;
        setUploading(true);
        try {
            const ext = audioBlob.type.includes('webm') ? 'webm' : 'mp3';
            const fileName = `voice-${Date.now()}.${ext}`;
            const file = new File([audioBlob], fileName, { type: audioBlob.type });

            const formData = new FormData();
            formData.append('files', file);

            const response = await chatAPI.uploadFiles(formData);
            const mediaItems = (response.data.files || []).map((f, i) => ({
                url: f.url || '',
                name: f.name || fileName,
                type: f.type || audioBlob.type || 'audio/webm',
                size: Number(f.size || file.size || 0),
                thumbnail: f.thumbnail || ''
            }));

            onVoiceUploaded(mediaItems);
            cancelRecording();
        } catch (err) {
            console.error('Voice upload failed:', err);
        } finally {
            setUploading(false);
        }
    }, [audioBlob, onVoiceUploaded, cancelRecording]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);

    useEffect(() => {
        const audio = audioPreviewRef.current;
        if (!audio) return;
        const onTime = () => setPlaybackTime(audio.currentTime);
        const onDuration = () => setPlaybackDuration(audio.duration || 0);
        const onEnded = () => { setPlaybackTime(0); };
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onDuration);
        audio.addEventListener('ended', onEnded);
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onDuration);
            audio.removeEventListener('ended', onEnded);
        };
    }, [audioUrl]);

    if (disabled) return null;

    return (
        <div className="flex items-center gap-1.5">
            {audioUrl && <audio ref={audioPreviewRef} src={audioUrl} preload="metadata" />}

            <AnimatePresence mode="wait">
                {isRecording && !previewMode && (
                    <motion.div
                        key="recording"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                    >
                        <button
                            type="button"
                            onClick={cancelRecording}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                            title="Cancel"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold text-red-600 font-mono tabular-nums">
                                {formatTime(duration)}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={stopRecording}
                            className="p-2 rounded-lg bg-primary text-white hover:bg-orange-700 transition-colors"
                            title="Stop recording"
                        >
                            <Square className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}

                {previewMode && !isRecording && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex items-center gap-2"
                    >
                        <button
                            type="button"
                            onClick={cancelRecording}
                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                            title="Discard"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                            <button
                                type="button"
                                onClick={() => {
                                    const audio = audioPreviewRef.current;
                                    if (audio) {
                                        if (audio.paused) audio.play();
                                        else audio.pause();
                                    }
                                }}
                                className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center"
                            >
                                {audioPreviewRef.current && !audioPreviewRef.current.paused ? (
                                    <Square className="w-2.5 h-2.5" />
                                ) : (
                                    <Mic className="w-3 h-3" />
                                )}
                            </button>
                            {playbackDuration > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-24 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${(playbackTime / playbackDuration) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-500 font-mono tabular-nums">
                                        {formatTime(playbackTime)} / {formatTime(playbackDuration)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={sendVoice}
                            disabled={uploading}
                            className="p-2 rounded-lg bg-primary text-white hover:bg-orange-700 transition-colors disabled:opacity-50"
                            title="Send voice message"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}

                {!isRecording && !previewMode && (
                    <motion.button
                        key="mic"
                        type="button"
                        onClick={startRecording}
                        disabled={uploading}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                        title="Record voice message"
                        whileTap={{ scale: 0.9 }}
                    >
                        {uploading ? (
                            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Mic className="w-5 h-5" />
                        )}
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VoiceRecorder;

import { useState, useRef, useEffect } from 'react';
import { ExternalLink, FileText, Image, Film, Music, File, Play, Pause } from 'lucide-react';

const getFileIcon = (mimeType) => {
    if (!mimeType) return File;
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return Film;
    if (mimeType.startsWith('audio/')) return Music;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return FileText;
    return File;
};

const formatSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const isImageFile = (mimeType) => mimeType?.startsWith('image/');
const isAudioFile = (mimeType) => mimeType?.startsWith('audio/');

const formatDuration = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ file, isMine }) => {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onTime = () => setCurrentTime(audio.currentTime);
        const onDur = () => setDuration(audio.duration || 0);
        const onEnd = () => { setPlaying(false); setCurrentTime(0); };
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onDur);
        audio.addEventListener('ended', onEnd);
        return () => {
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onDur);
            audio.removeEventListener('ended', onEnd);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) { audio.pause(); } else { audio.play(); }
        setPlaying(!playing);
    };

    return (
        <div className={`flex items-center gap-2.5 p-2 rounded-lg ${isMine ? 'bg-white/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <audio ref={audioRef} src={file.url} preload="metadata" />
            <button
                type="button"
                onClick={togglePlay}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/10 hover:bg-primary/20'
                }`}
            >
                {playing ? (
                    <Pause className={`w-3.5 h-3.5 ${isMine ? 'text-white' : 'text-primary'}`} />
                ) : (
                    <Play className={`w-3.5 h-3.5 ml-0.5 ${isMine ? 'text-white' : 'text-primary'}`} />
                )}
            </button>
            <div className="flex-1 min-w-0">
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isMine ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <div
                        className={`h-full rounded-full transition-all ${isMine ? 'bg-white' : 'bg-primary'}`}
                        style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                    />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                    <span className={`text-[9px] font-mono tabular-nums ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                        {formatDuration(currentTime)}
                    </span>
                    <span className={`text-[9px] font-mono tabular-nums ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                        {formatDuration(duration)}
                    </span>
                </div>
            </div>
            <span className={`text-[9px] shrink-0 ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                {formatSize(file.size)}
            </span>
        </div>
    );
};

const ChatMediaDisplay = ({ media = [], isMine = false }) => {
    if (!media || media.length === 0) return null;

    return (
        <div className="flex flex-col gap-1.5 mt-1.5">
            {media.map((file, index) => {
                const Icon = getFileIcon(file.type);
                const isImage = isImageFile(file.type);
                const isAudio = isAudioFile(file.type);

                return (
                    <div key={index}>
                        {isImage && file.thumbnail ? (
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded-lg overflow-hidden border border-white/10 hover:opacity-90 transition-opacity"
                            >
                                <img
                                    src={file.thumbnail || file.url}
                                    alt={file.name}
                                    className="max-w-[220px] max-h-[160px] object-cover rounded-lg"
                                    loading="lazy"
                                />
                            </a>
                        ) : null}

                        {isAudio ? (
                            <AudioPlayer file={file} isMine={isMine} />
                        ) : (
                            <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors ${
                                    isMine
                                        ? 'bg-white/10 hover:bg-white/20'
                                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isMine ? 'bg-white/20' : 'bg-primary/10'
                                }`}>
                                    <Icon className={`w-4 h-4 ${isMine ? 'text-white' : 'text-primary'}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-[11px] font-bold truncate ${isMine ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                        {file.name || 'File'}
                                    </p>
                                    <p className={`text-[9px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                                        {formatSize(file.size)}
                                    </p>
                                </div>
                                <ExternalLink className={`w-3.5 h-3.5 shrink-0 ${isMine ? 'text-white/70' : 'text-gray-400'}`} />
                            </a>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default ChatMediaDisplay;

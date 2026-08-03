import { ExternalLink, FileText, Image, Film, Music, File } from 'lucide-react';

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

const ChatMediaDisplay = ({ media = [], isMine = false }) => {
    if (!media || media.length === 0) return null;

    return (
        <div className="flex flex-col gap-1.5 mt-1.5">
            {media.map((file, index) => {
                const Icon = getFileIcon(file.type);
                const isImage = isImageFile(file.type);

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
                    </div>
                );
            })}
        </div>
    );
};

export default ChatMediaDisplay;

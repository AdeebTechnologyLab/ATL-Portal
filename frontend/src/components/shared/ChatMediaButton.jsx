import { useState, useRef } from 'react';
import { Paperclip, Upload, X } from 'lucide-react';
import { chatAPI } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const ChatMediaButton = ({ onMediaUploaded, disabled = false }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;

        setUploading(true);
        setProgress(0);
        setError('');

        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            const response = await chatAPI.uploadFiles(formData, event => {
                if (event.total) setProgress(Math.round((event.loaded * 100) / event.total));
            });
            const mediaItems = (response.data.files || []).map((f, i) => ({
                url: f.url || '',
                name: f.name || files[i]?.name || 'file',
                type: f.type || files[i]?.type || 'file',
                size: Number(f.size || files[i]?.size || 0),
                thumbnail: f.thumbnail || ''
            }));
            setSelectedFiles(prev => {
                const updated = [...prev, ...mediaItems];
                onMediaUploaded(updated);
                return updated;
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Upload failed');
            setTimeout(() => setError(''), 4000);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    const removeFile = (index) => {
        const updated = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updated);
        onMediaUploaded(updated);
    };

    return (
        <div className="flex items-center gap-1.5">
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={disabled || uploading}
            />

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className="relative p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                title="Attach file"
            >
                {uploading ? (
                    <div className="relative w-5 h-5">
                        <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-200 dark:text-gray-700" />
                            <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeDasharray={`${2 * Math.PI * 8}`}
                                strokeDashoffset={`${2 * Math.PI * 8 * (1 - progress / 100)}`}
                                className="text-primary transition-all duration-300" />
                        </svg>
                    </div>
                ) : (
                    <Paperclip className="w-5 h-5" />
                )}
            </button>

            <AnimatePresence>
                {error && (
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-red-500 font-semibold"
                    >
                        {error}
                    </motion.span>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedFiles.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1"
                    >
                        {selectedFiles.map((file, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full max-w-[120px]"
                            >
                                <span className="truncate">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => removeFile(i)}
                                    className="shrink-0 hover:text-red-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatMediaButton;

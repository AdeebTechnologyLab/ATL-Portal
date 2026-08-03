import { motion } from 'framer-motion';
import { Upload, Check, AlertCircle } from 'lucide-react';

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const UploadProgress = ({ progress = 0, status = 'idle', fileName = '', totalSize = 0, error = '' }) => {
    const isUploading = status === 'uploading';
    const isDone = status === 'done';
    const isError = status === 'error';

    return (
        <div className="w-full">
            {isUploading && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                            <Upload className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
                            <span className="font-semibold text-gray-700 dark:text-gray-300 truncate">
                                {fileName || 'Uploading...'}
                            </span>
                        </div>
                        <span className="font-black text-primary shrink-0 ml-2">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-primary to-orange-400 rounded-full"
                        />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>{formatBytes(totalSize * progress / 100)} of {formatBytes(totalSize)}</span>
                        <span>Please wait, file uploading...</span>
                    </div>
                </div>
            )}

            {isDone && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">Upload Complete</p>
                        {fileName && <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate">{fileName}</p>}
                    </div>
                </div>
            )}

            {isError && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50">
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black text-red-700 dark:text-red-300 uppercase tracking-wide">Upload Failed</p>
                        <p className="text-[10px] text-red-600 dark:text-red-400 truncate">{error || 'Something went wrong'}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UploadProgress;

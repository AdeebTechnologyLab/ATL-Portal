import { RefreshCw, WifiOff } from 'lucide-react';

const DataLoadError = ({ error, onRetry }) => {
    const status = error?.response?.status;
    const message = navigator.onLine === false
        ? 'Internet disconnected. Reconnect and try again.'
        : status === 503 ? 'The server is reconnecting. Please try again shortly.'
            : status === 403 ? 'The server denied this request. Please contact support if it continues.'
                : 'Data could not be loaded. Your connection may be slow or the server unavailable.';
    return (
        <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 sm:flex-row sm:items-center">
            <WifiOff className="h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm">{message}</p>
            <button type="button" onClick={onRetry} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 px-4 text-sm font-bold hover:bg-amber-100 dark:border-amber-500/40 dark:hover:bg-amber-500/10">
                <RefreshCw className="h-4 w-4" /> Retry
            </button>
        </div>
    );
};

export default DataLoadError;

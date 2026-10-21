import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

const NetworkStatus = () => {
    const [offline, setOffline] = useState(() => !navigator.onLine);
    useEffect(() => {
        const update = () => setOffline(!navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);
    if (!offline) return null;
    return (
        <div role="status" className="fixed inset-x-0 top-0 z-[10000] flex items-center justify-center gap-2 bg-amber-100 px-4 py-3 text-center text-xs font-semibold text-amber-900 shadow-sm sm:text-sm">
            <WifiOff className="h-4 w-4 shrink-0" />
            Internet disconnected. Reconnect, then try again.
        </div>
    );
};

export default NetworkStatus;

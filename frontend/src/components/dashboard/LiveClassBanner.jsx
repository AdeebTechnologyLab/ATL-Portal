import { Video, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const getSecondsLeft = (liveClass) => {
    if (!liveClass?.autoEndMinutes) return null;
    if (liveClass._secondsLeft != null) return liveClass._secondsLeft;
    const expiresAt = new Date(liveClass.startTime).getTime() + liveClass.autoEndMinutes * 60 * 1000;
    return Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
};

const LiveClassBanner = ({ liveClass, children, className = '' }) => {
    const { t } = useTranslation();

    const hasTimer = !!liveClass?.autoEndMinutes;
    const secondsLeft = getSecondsLeft(liveClass);
    const mins = hasTimer ? Math.floor(secondsLeft / 60) : 0;
    const secs = hasTimer ? secondsLeft % 60 : 0;
    const isExpiringSoon = hasTimer && secondsLeft <= 60;
    const totalSeconds = hasTimer ? liveClass.autoEndMinutes * 60 : 0;
    const progress = totalSeconds > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;

    const hostName = liveClass.createdBy?.name || 'Teacher';
    const hostPhoto = liveClass.createdBy?.photo;
    const hostInitials = hostName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0))
        .join('')
        .toUpperCase() || 'T';

    return (
        <div className={`group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#111827] via-[#1f1a2e] to-[#450a0a] p-5 sm:p-6 text-white shadow-2xl shadow-red-900/20 ring-1 ring-white/10 ${className}`}>
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-red-500/25 blur-3xl"></div>
            <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-primary/20 blur-3xl"></div>

            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                    <div className="relative shrink-0">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md sm:h-16 sm:w-16">
                            <Video className="h-6 w-6 sm:h-7 sm:w-7" />
                        </div>
                        <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-900/40 ring-2 ring-[#1f1a2e]">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span>
                            Live
                        </span>
                    </div>

                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/50 sm:text-[11px]">
                            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                            {t('dashboard.liveClassInProgress')}
                        </p>
                        <h2 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
                            {liveClass.title}
                        </h2>

                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                            {hasTimer && secondsLeft !== null && (
                                <span className={`inline-flex items-center gap-1.5 text-xs ${isExpiringSoon ? 'text-red-300 animate-pulse' : 'text-white/60'}`}>
                                    <Timer className="h-3.5 w-3.5 text-red-400" />
                                    <span className="font-semibold uppercase tracking-wide">Ends in</span>
                                    <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-white">
                                        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                                    </span>
                                </span>
                            )}
                            <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-white/85">
                                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-[9px] font-black text-white">
                                    {hostInitials}
                                    {hostPhoto && (
                                        <img
                                            src={hostPhoto}
                                            alt={hostName}
                                            className="absolute inset-0 h-full w-full object-cover"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )}
                                </span>
                                <span className="truncate">{hostName}</span>
                            </span>
                        </div>

                        {liveClass.description && (
                            <p className="mt-2 line-clamp-2 text-sm text-white/55">{liveClass.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2.5 lg:pl-4">
                    {children}
                </div>
            </div>

            {hasTimer && totalSeconds > 0 && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
                    <div
                        className={`h-full rounded-r-full transition-[width] duration-1000 ease-linear ${isExpiringSoon ? 'bg-red-400' : 'bg-gradient-to-r from-red-500 to-primary'}`}
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};

export const liveClassPrimaryButtonClass = 'group/btn flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-gray-900 shadow-lg shadow-black/20 transition-all hover:bg-gray-100 active:scale-[0.98] sm:flex-none';
export const liveClassDisabledButtonClass = 'flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-xs font-bold text-white/50 ring-1 ring-white/10 cursor-not-allowed sm:flex-none';
export const liveClassGhostButtonClass = 'flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-xs font-bold text-white ring-1 ring-white/15 backdrop-blur-sm transition-all hover:bg-red-500/20 hover:text-red-100 hover:ring-red-400/40 active:scale-[0.98] sm:flex-none';

export default LiveClassBanner;

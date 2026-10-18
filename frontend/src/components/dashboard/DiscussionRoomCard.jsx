import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowRight } from 'lucide-react';

const DiscussionRoomCard = ({ role }) => {
    const navigate = useNavigate();
    return (
<div className="group relative flex items-center gap-3 sm:gap-4 overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-400/20 bg-gradient-to-r from-indigo-50/80 via-white to-white dark:from-indigo-500/10 dark:via-[#141418] dark:to-[#141418] px-4 py-3 sm:px-5 shadow-sm transition-shadow hover:shadow-md">
                            <span aria-hidden="true" className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-indigo-500" />
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/20">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">Discussion Room</p>
                                <p className="mt-0.5 text-[11px] sm:text-xs leading-relaxed text-gray-500 dark:text-gray-400">Ask, share &amp; connect</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate(`/${role}/discussion-room`)}
                                aria-label="Open Discussion Room"
                                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-100 dark:border-indigo-400/20 bg-white dark:bg-indigo-500/10 px-3 sm:px-4 text-xs font-bold text-indigo-600 dark:text-indigo-300 transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                            >
                                Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
                            </button>
                        </div>
    );
};

export default DiscussionRoomCard;

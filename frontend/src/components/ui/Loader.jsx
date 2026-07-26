import React from 'react';
import { motion } from 'framer-motion';

const Loader = ({ message = 'Loading...', size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-24 h-24',
        md: 'w-28 h-28',
        lg: 'w-28 h-28',
        xl: 'w-32 h-32'
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[60vh] w-full h-full flex-1">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
            >
                <img 
                    src="/loading.gif" 
                    alt="Loading..." 
                    className={`${sizeClasses[size] || sizeClasses.md} object-contain`}
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJueXp4YnlpNXJueXp4YnlpNXJueXp4YnlpNXJueXp4YnlpNXJueSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7bu3XilJ5BOiSGic/giphy.gif';
                    }}
                />
            </motion.div>
            {message && (
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 text-gray-500 dark:text-gray-400 font-black uppercase tracking-[0.2em] text-xs animate-pulse"
                >
                    {message}
                </motion.p>
            )}
        </div>
    );
};

export const FullScreenLoader = ({ message = 'Loading Data...' }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-[#0f1117]/80 backdrop-blur-sm">
            <Loader message={message} size="lg" />
        </div>
    );
};

export const ButtonLoader = ({ isLoading, icon, children, className = "w-5 h-5", white = true }) => {
    if (!isLoading) return (
        <>
            {icon && <span className="inline-block mr-2">{icon}</span>}
            {children}
        </>
    );
    
    return (
        <div className="flex items-center justify-center gap-2">
            <svg 
                className={`animate-spin ${className} text-current inline-block transition-all`} 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
            >
                <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                />
                <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
            </svg>
            {children && <span className="opacity-70">{children}</span>}
        </div>
    );
};

export default Loader;



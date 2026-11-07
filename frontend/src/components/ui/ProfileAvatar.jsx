import { User } from 'lucide-react';
import { getBackendOrigin } from '../../config/apiBaseUrl';

/**
 * Consistent profile avatar component used across the app.
 * Ensures all profile pictures have the same shape, aspect ratio, and fallback.
 *
 * @param {string} src - Image URL
 * @param {string} name - User name (used for fallback initial)
 * @param {string} size - 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
 * @param {string} className - Additional classes
 * @param {string} fallbackColor - Tailwind bg class for fallback (e.g. 'bg-orange-500')
 */
const SIZE_MAP = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-28 h-28 text-4xl',
};

const ProfileAvatar = ({
    src,
    name = '',
    size = 'md',
    className = '',
    fallbackColor = 'bg-gradient-to-br from-primary to-[#ffab40]',
    shape = 'rounded-full',
    border = 'border border-gray-200',
}) => {
    const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
    const initial = (name || '?').charAt(0).toUpperCase();
    const resolvedSrc = src
        ? (src.startsWith('http') ? src : `${getBackendOrigin()}${src.startsWith('/') ? '' : '/'}${src}`)
        : null;
    const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=FF6B00&color=fff`;

    return (
        <div
            className={`${sizeClass} ${shape} overflow-hidden flex-shrink-0 flex items-center justify-center ${border} ${className} ${!resolvedSrc ? fallbackColor : 'bg-gray-100'}`}
        >
            {resolvedSrc ? (
                <img
                    src={resolvedSrc}
                    alt={name}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = fallbackUrl;
                    }}
                />
            ) : (
                <img
                    src={fallbackUrl}
                    alt={name}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                />
            )}
        </div>
    );
};

export default ProfileAvatar;



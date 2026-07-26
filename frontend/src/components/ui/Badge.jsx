const Badge = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    const variants = {
        default: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
        success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        primary: 'bg-primary text-white dark:bg-primary/40 dark:text-white',
    };

    const sizes = {
        xxs: 'px-1.5 py-0.5 text-[8px] font-black tracking-wider uppercase',
        xs: 'px-2 py-0.5 text-[10px] font-bold tracking-tight',
        sm: 'px-2 py-0.5 text-xs font-bold',
        md: 'px-2.5 py-1 text-xs font-bold',
        lg: 'px-3 py-1.5 text-sm font-bold',
    };

    return (
        <span
            className={`inline-flex items-center font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}
        >
            {children}
        </span>
    );
};

export default Badge;



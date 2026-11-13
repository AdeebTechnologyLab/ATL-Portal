const PageHeader = ({
    title,
    subtitle,
    icon: Icon,
    actions,
    className = '',
    children,
}) => (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#141418] ${className}`}>
        {/* Top accent strip */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500" />
        {/* Soft decorative glow */}
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-300/10 blur-2xl" />

        <div className="relative flex flex-col gap-4 p-4 pt-5 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
                {Icon && (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/25">
                        <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="text-lg font-black tracking-tight text-gray-900 dark:text-white sm:text-xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 sm:text-[13px]">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div>
            )}
        </div>

        {children && <div className="relative px-4 pb-4 sm:px-5 sm:pb-5">{children}</div>}
    </div>
);

export default PageHeader;

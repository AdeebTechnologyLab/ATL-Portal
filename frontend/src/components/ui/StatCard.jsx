import { motion } from 'framer-motion';

const StatCard = ({
    title,
    value,
    change,
    changeType = 'positive',
    icon: Icon,
    iconBg = 'bg-primary',
    iconColor = 'text-primary',
    className = '',
    valueClassName = '',
    onClick,
    subValue,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onClick={onClick}
            className={`bg-white dark:bg-[#1a1f2e] rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-800/50 transition-all duration-300 hover:shadow-lg ${className} ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] sm:text-sm font-black text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">{title}</p>
                    <p className={`text-lg sm:text-3xl font-black leading-none ${valueClassName || 'text-gray-900 dark:text-gray-100'}`}>{value}</p>
                    {/* Optional Subvalue (e.g., fee amount) */}
                    {subValue && <p className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 mt-1.5">{subValue}</p>}
                    {change && (
                        <div className="flex items-center mt-2">
                            <span
                                className={`text-sm font-medium ${changeType === 'positive' ? 'text-primary dark:text-primary' : 'text-red-500 dark:text-red-400'
                                    }`}
                            >
                                {changeType === 'positive' ? '+' : ''}{change}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">vs last month</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${iconBg}`}>
                        <Icon className={`w-4 h-4 sm:w-6 h-6 ${iconColor}`} />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default StatCard;


